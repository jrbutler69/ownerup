import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function HomePage() {
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

  const { data: memberRows } = await supabase
    .from('project_members').select('project_id, role').eq('user_id', user.id).eq('status', 'active')
  if (!memberRows?.length) redirect('/onboarding')

const selectedId = cookieStore.get('selected_project_id')?.value
console.log('SERVER: selectedId from cookie:', selectedId)
const pid = (selectedId && memberRows.some(r => r.project_id === selectedId))
    ? selectedId
    : memberRows[0].project_id

  const memberRow = memberRows.find(r => r.project_id === pid)
  const role = memberRow?.role ?? 'other'
  const ownerOrCo = ['owner', 'co-owner'].includes(role)

  let permsMap: Record<string, string> = {}
  if (ownerOrCo) {
    permsMap = { documents: 'edit', photos: 'edit', renderings: 'edit', notes: 'edit' }
  } else {
    const { data: perms } = await supabase.rpc('get_my_permissions', { p_project_id: pid })
    const docAccess = ['documents_contracts','documents_drawings','documents_budgets','documents_invoices',
      'documents_permits','documents_insurance','documents_specs','documents_other']
      .some(k => (perms?.find((p: any) => p.section === k)?.access_level ?? 'none') !== 'none')
    permsMap = {
      documents: docAccess ? 'view' : 'none',
      photos: perms?.find((p: any) => p.section === 'photos')?.access_level ?? 'none',
      renderings: perms?.find((p: any) => p.section === 'renderings')?.access_level ?? 'none',
      notes: perms?.find((p: any) => p.section === 'notes')?.access_level ?? 'none',
    }
  }

  const [docsRes, photosRes, renderingsRes, notesRes, teamRes, timelineRes] = await Promise.all([
    permsMap.documents !== 'none'
      ? supabase.from('documents').select('*').eq('project_id', pid).eq('is_current', true).order('upload_date', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] }),
    permsMap.photos !== 'none'
      ? supabase.from('photos').select('*').eq('project_id', pid).order('taken_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    permsMap.renderings !== 'none'
      ? supabase.from('renderings').select('*').eq('project_id', pid).order('uploaded_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    permsMap.notes !== 'none'
      ? supabase.from('notes').select('*').eq('project_id', pid).order('created_at', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] }),
    supabase.from('project_members').select('invited_email, role, status').eq('project_id', pid).eq('status', 'active'),
    supabase.from('timeline_feed').select('*').eq('project_id', pid).order('event_timestamp', { ascending: false }).limit(20),
  ])

  const { data: projectData } = await supabase
    .from('projects').select('name, address, start_date, target_completion').eq('id', pid).single()

  return (
    <HomeClient
      project={projectData}
      members={teamRes.data ?? []}
      permissions={permsMap}
      projectId={pid}
      userRole={role}
      data={{
        documents: docsRes.data ?? [],
        photos: photosRes.data ?? [],
        renderings: renderingsRes.data ?? [],
        notes: notesRes.data ?? [],
        timeline: timelineRes.data ?? [],
      }}
    />
  )
}