'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

export async function switchProject(projectId: string) {
  const cookieStore = await cookies()
  cookieStore.set('selected_project_id', projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}

export async function createProject(formData: FormData) {
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
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const startDate = formData.get('startDate') as string
  const targetCompletion = formData.get('targetCompletion') as string

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name,
      address,
      start_date: startDate || null,
      target_completion: targetCompletion || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    })

  // Set as selected project
  cookieStore.set('selected_project_id', project.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  redirect('/home')
}
