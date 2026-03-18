export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  // Lazy profile check — if no profile exists, send to profile setup
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/profile-setup')

  const { data: memberRows } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const projectIds = (memberRows ?? []).map(r => r.project_id)
  if (projectIds.length === 0) redirect('/onboarding')

  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name, address')
    .in('id', projectIds)

  const allProjects = projectsData ?? []
  const selectedId = cookieStore.get('selected_project_id')?.value
  const project = allProjects.find(p => p.id === selectedId) ?? allProjects[0]

  const memberRow = memberRows?.find(r => r.project_id === project?.id)
  const userRole = memberRow?.role ?? 'other'

  let permissions: Record<string, string> = {}
  if (!['owner', 'co-owner'].includes(userRole)) {
    const { data: permRows } = await supabase
      .rpc('get_my_permissions', { p_project_id: project?.id })
    for (const row of permRows ?? []) {
      permissions[row.section] = row.access_level
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        allProjects={allProjects}
        selectedProjectId={project?.id ?? ''}
        userRole={userRole}
        permissions={permissions}
      />
      <div style={{ marginLeft: '200px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '48px 48px 0', fontFamily: "'DM Mono', monospace" }}>
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
          <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B0A898', margin: '0 0 10px', fontFamily: "'DM Mono', monospace" }}>Current Project</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: '#1A1814', margin: 0, letterSpacing: '-0.01em', lineHeight: 1 }}>
            {project?.name ?? '—'}
          </h1>
          {project?.address && (
            <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#B0A898', margin: '10px 0 0', fontFamily: "'DM Mono', monospace" }}>{project.address}</p>
          )}
          <div style={{ borderBottom: '1px solid #D8D2C8', marginTop: 32 }} />
        </header>
        <main style={{ flex: 1, padding: '40px 48px 48px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}