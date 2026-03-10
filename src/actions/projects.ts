'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function switchProject(projectId: string) {
  const cookieStore = await cookies()
  cookieStore.set('selected_project_id', projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}