'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function switchProject(projectId: string) {
  const cookieStore = await cookies()
  cookieStore.set('selected_project_id', projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}

// Accepts YYYY-MM-DD (from date input) or DD/MM/YYYY or MM/DD/YYYY
// Returns YYYY-MM-DD string or null if unparseable
function sanitizeDate(value: string | null): string | null {
  if (!value || value.trim() === '') return null

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim()

  // DD/MM/YYYY or MM/DD/YYYY — try both, prefer the one that produces a valid date
  const parts = value.trim().split('/')
  if (parts.length === 3) {
    const [a, b, year] = parts
    if (year.length === 4) {
      // Try DD/MM/YYYY first (more common internationally)
      const ddmm = new Date(`${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`)
      if (!isNaN(ddmm.getTime())) {
        return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
      }
      // Fall back to MM/DD/YYYY
      const mmdd = new Date(`${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`)
      if (!isNaN(mmdd.getTime())) {
        return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
      }
    }
  }

  return null
}

export async function createProject(formData: FormData) {
  const cookieStore = await cookies()

  // Anon client — just for getting the current user
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await anonClient.auth.getUser()
  if (!user) redirect('/login')

  // Service role client — bypasses RLS for project + member creation
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const startDate = sanitizeDate(formData.get('startDate') as string)
  const targetCompletion = sanitizeDate(formData.get('targetCompletion') as string)

  const { data: project, error } = await adminClient
    .from('projects')
    .insert({
      user_id: user.id,
      name,
      address,
      start_date: startDate,
      target_completion: targetCompletion,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await adminClient
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    })

  cookieStore.set('selected_project_id', project.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  redirect('/home')
}
