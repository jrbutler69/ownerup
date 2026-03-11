import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Admin client — bypasses RLS
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
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

    const { token } = await request.json()

    // Look up the invite using admin client
    const { data: invite } = await adminSupabase
      .from('project_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (invite.status !== 'pending' && invite.status !== 'invited') return NextResponse.json({ error: 'Invite already used' }, { status: 400 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 400 })

    // Update project_members
    const { error: memberError } = await adminSupabase
      .from('project_members')
      .update({ user_id: user.id, status: 'active' })
      .eq('project_id', invite.project_id)
      .eq('invited_email', invite.invited_email)
      .eq('status', 'invited')

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

    // Update permissions — set user_id now that we know who accepted
    await adminSupabase
      .from('project_permissions')
      .update({ user_id: user.id })
      .eq('project_id', invite.project_id)
      .eq('invited_email', invite.invited_email)

    // Mark invite as accepted
    await adminSupabase
      .from('project_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    // Set as selected project cookie
    cookieStore.set('selected_project_id', invite.project_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}