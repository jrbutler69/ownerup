import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Service role client — bypasses RLS for server-side operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()

    // Regular client to verify the logged-in user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { projectId, email, role, permissions } = await request.json()

    // Verify the current user is an owner of this project
    const { data: memberCheck } = await adminSupabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberCheck || !['owner', 'co-owner'].includes(memberCheck.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get project details
    const { data: project } = await adminSupabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    // Check if already invited
    const { data: existing } = await adminSupabase
      .from('project_invites')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('invited_email', email)
      .single()

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ error: 'This person has already been invited' }, { status: 400 })
    }

    // Create invite
    const { data: invite, error: inviteError } = await adminSupabase
      .from('project_invites')
      .insert({
        project_id: projectId,
        invited_email: email,
        role,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

    // Create project_members record with pending status
    const { error: memberError } = await adminSupabase
      .from('project_members')
      .insert({
        project_id: projectId,
        invited_email: email,
        role,
        status: 'invited',
      })

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

    // Store permissions
    const permissionRows = Object.entries(permissions).map(([section, access_level]) => ({
      project_id: projectId,
      user_id: null,
      invited_email: email,
      section,
      access_level,
    }))

    await adminSupabase.from('project_permissions').insert(permissionRows)

    // Send invite email
    const inviteUrl = `https://ownerup.app/invite/${invite.token}`

    await resend.emails.send({
      from: 'OwnerUp <noreply@ownerup.app>',
      to: email,
      subject: `You've been invited to ${project?.name ?? 'a project'} on OwnerUp`,
      html: `
        <div style="font-family: 'DM Mono', monospace; max-width: 480px; margin: 0 auto; padding: 48px 24px; background: #F0EDE8;">
          <div style="font-family: Georgia, serif; font-size: 22px; letter-spacing: 0.15em; color: #151412; margin-bottom: 32px;">OWNERUP</div>
          <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: #151412; margin: 0 0 16px;">You've been invited</h1>
          <p style="font-size: 13px; color: #555; line-height: 1.7; margin: 0 0 8px;">
            You've been invited to join <strong>${project?.name ?? 'a construction project'}</strong> on OwnerUp as a <strong>${role}</strong>.
          </p>
          <p style="font-size: 13px; color: #555; line-height: 1.7; margin: 0 0 32px;">
            Click the link below to accept your invitation. It expires in 7 days.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #151412; color: #F0EDE8; font-size: 12px; letter-spacing: 0.1em; padding: 12px 24px; text-decoration: none; border-radius: 2px;">
            Accept invitation
          </a>
          <p style="font-size: 11px; color: #999; margin-top: 32px; line-height: 1.6;">
            If you don't have an OwnerUp account yet, you'll be asked to create one first.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
