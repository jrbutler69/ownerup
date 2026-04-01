import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'

export default async function RootPage({ searchParams }: { searchParams: Promise<{ code?: string, type?: string }> }) {
  const params = await searchParams
  
  // If there's a code in the URL, redirect to auth callback to handle it
  if (params.code) {
    const type = params.type ? `&type=${params.type}` : ''
    redirect(`/auth/callback?code=${params.code}${type}`)
  }

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

  if (user) {
    redirect('/home')
  }

  return <LandingPage />
}