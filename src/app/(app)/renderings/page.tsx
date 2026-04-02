'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Rendering {
  id: string
  project_id: string
  taken_at: string
  uploaded_at: string
  image_url: string
  caption: string | null
}

interface Episode {
  id: string
  project_id: string
  episode_date: string
  type: string
  title: string | null
}

interface GroupedRenderings {
  key: string
  label: string
  sublabel: string
  renderings: Rendering[]
  episode?: Episode
}

interface QueuedRendering {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function groupByWeek(renderings: Rendering[]): GroupedRenderings[] {
  const groups: Record<string, Rendering[]> = {}
  for (const rendering of renderings) {
    const raw = rendering.taken_at || rendering.uploaded_at
    const [year, month, day] = raw.slice(0, 10).split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const dow = date.getDay()
    const diff = date.getDate() - dow + (dow === 0 ? -6 : 1)
    const monday = new Date(year, month - 1, diff)
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(rendering)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, renderings]) => {
      const [y, m, d] = key.split('-').map(Number)
      const monday = new Date(y, m - 1, d)
      const sunday = new Date(y, m - 1, d + 6)
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      const start = monday.toLocaleDateString('en-US', opts)
      const end = sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
      return { key, label: `Week of ${start} – ${end}`, sublabel: `${renderings.length} rendering${renderings.length !== 1 ? 's' : ''}`, renderings }
    })
}

function groupByDay(renderings: Rendering[], episodes: Episode[]): GroupedRenderings[] {
  const groups: Record<string, Rendering[]> = {}
  for (const rendering of renderings) {
    const key = (rendering.taken_at || rendering.uploaded_at).slice(0, 10)
    if (!groups[key]) groups[key] = []
    groups[key].push(rendering)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, renderings]) => {
      const [year, month, day] = key.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const episode = episodes.find(e => e.episode_date === key)
      return { key, label: dateLabel, sublabel: `${renderings.length} rendering${renderings.length !== 1 ? 's' : ''}`, renderings, episode }
    })
}

type ViewMode = 'grid' | 'episodes'

export default function RenderingsPage() {
  const supabase = createClient()
  const [renderings, setRenderings] = useState<Rendering[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [queue, setQueue] = useState<QueuedRendering[]>([])
  const [lightbox, setLightbox] = useState<Rendering | null>(null)
  const [lightboxGroup, setLightboxGroup] = useState<Rendering[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [openEpisode, setOpenEpisode] = useState<string | null>(null)
  const [episodeDate, setEpisodeDate] = useState(() => new Date().toISOString().split('T')[0])
  const [episodeTitleInput, setEpisodeTitleInput] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [hasAnyAccess, setHasAnyAccess] = useState(true)
  const [editingEpisodeKey, setEditingEpisodeKey] = useState<string | null>(null)
  const [editingEpisodeTitle, setEditingEpisodeTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const cookiePid = document.cookie.split('; ').find(r => r.startsWith('selected_project_id='))?.split('=')[1]
      const { data: memberRows } = await supabase
        .from('project_members').select('project_id, role').eq('user_id', user.id).eq('status', 'active')
      if (!memberRows?.length) return
      const pid = cookiePid && memberRows.some(r => r.project_id === cookiePid) ? cookiePid : memberRows[0].project_id
      setProjectId(pid)

      const { data: renderingData } = await supabase.from('renderings').select('*').eq('project_id', pid).order('taken_at', { ascending: false })
      if (renderingData) setRenderings(renderingData)

      const { data: episodeData } = await supabase.from('episodes').select('*').eq('project_id', pid).eq('type', 'renderings')
      if (episodeData) setEpisodes(episodeData)

      setLoading(false)

      const memberRow = memberRows.find(r => r.project_id === pid)
      const role = memberRow?.role ?? 'other'
      if (['owner', 'co-owner', 'admin', 'co-admin'].includes(role)) {
        setHasAnyAccess(true); setCanEdit(true)
      } else {
        const { data: perms } = await supabase.rpc('get_my_permissions', { p_project_id: pid })
        const level = perms?.find((p: any) => p.section === 'renderings')?.access_level ?? 'none'
        setHasAnyAccess(level !== 'none')
        setCanEdit(level === 'edit')
      }
    }
    load()
  }, [])

  function addFilesToQueue(files: FileList | File[]) {
    const newItems: QueuedRendering[] = Array.from(files).map(f => ({ id: crypto.randomUUID(), file: f, status: 'pending' }))
    setQueue(prev => [...prev, ...newItems])
  }

  function removeFromQueue(id: string) { setQueue(prev => prev.filter(f => f.id !== id)) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files.length > 0) addFilesToQueue(e.dataTransfer.files)
  }

  async function getOrCreateEpisode(pid: string, date: string, title: string): Promise<Episode | null> {
    const existing = episodes.find(e => e.episode_date === date && e.type === 'renderings')
    if (existing) {
      if (title && !existing.title) {
        const { data: updated } = await supabase.from('episodes').update({ title }).eq('id', existing.id).select().single()
        if (updated) { setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e)); return updated }
      }
      return existing
    }
    const { data: newEpisode } = await supabase.from('episodes').insert({
      project_id: pid, episode_date: date, type: 'renderings', title: title || null,
    }).select().single()
    if (newEpisode) { setEpisodes(prev => [...prev, newEpisode]); return newEpisode }
    return null
  }

  async function handleUploadAll() {
    if (!projectId || !currentUserId || queue.filter(f => f.status === 'pending').length === 0) return
    setUploading(true); setError(null)
    await getOrCreateEpisode(projectId, episodeDate, episodeTitleInput.trim())
    const newRenderings: Rendering[] = []
    for (const item of queue) {
      if (item.status !== 'pending') continue
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f))
      const ext = item.file.name.split('.').pop()
      const filename = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('renderings').upload(filename, item.file)
      if (uploadError) { setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: uploadError.message } : f)); continue }
      const { data: { publicUrl } } = supabase.storage.from('renderings').getPublicUrl(filename)
      const { data: newRendering, error: dbError } = await supabase.from('renderings').insert({
        project_id: projectId, image_url: publicUrl,
        taken_at: new Date(episodeDate + 'T12:00:00').toISOString(),
        uploaded_at: new Date().toISOString(), caption: null, uploaded_by: currentUserId,
      }).select().single()
      if (dbError) { setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: dbError.message } : f)) }
      else if (newRendering) { newRenderings.push(newRendering); setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' } : f)) }
    }
    if (newRenderings.length) setRenderings(prev => [...newRenderings, ...prev])
    setUploading(false)
    if (!queue.some(f => f.status === 'error')) setTimeout(() => { setQueue([]); setEpisodeTitleInput('') }, 800)
  }

  async function handleDelete(rendering: Rendering) {
    if (!confirm('Delete this rendering?')) return
    const urlParts = rendering.image_url.split('/renderings/')
    if (urlParts.length > 1) await supabase.storage.from('renderings').remove([urlParts[1]])
    await supabase.from('renderings').delete().eq('id', rendering.id)
    setRenderings(prev => prev.filter(r => r.id !== rendering.id))
    setLightbox(null)
  }

  async function saveEpisodeTitle(key: string, title: string) {
    if (!projectId) return
    const existing = episodes.find(e => e.episode_date === key && e.type === 'renderings')
    if (existing) {
      const { data: updated } = await supabase.from('episodes').update({ title: title || null }).eq('id', existing.id).select().single()
      if (updated) setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e))
    } else {
      const { data: newEpisode } = await supabase.from('episodes').insert({
        project_id: projectId, episode_date: key, type: 'renderings', title: title || null,
      }).select().single()
      if (newEpisode) setEpisodes(prev => [...prev, newEpisode])
    }
    setEditingEpisodeKey(null)
  }

  function startEditingEpisode(key: string, currentTitle: string | null) {
    setEditingEpisodeKey(key); setEditingEpisodeTitle(currentTitle ?? '')
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  function openLightbox(rendering: Rendering, group: Rendering[]) { setLightbox(rendering); setLightboxGroup(group) }

  function lightboxNav(dir: 1 | -1) {
    if (!lightbox) return
    const idx = lightboxGroup.findIndex(r => r.id === lightbox.id)
    const next = lightboxGroup[idx + dir]
    if (next) setLightbox(next)
  }

  function episodeDisplayTitle(group: GroupedRenderings): string {
    return group.episode?.title || group.label
  }

  const weekGroups = groupByWeek(renderings)
  const dayGroups = groupByDay(renderings, episodes)
  const openEpisodeGroup = dayGroups.find(g => g.key === openEpisode)
  const pendingCount = queue.filter(f => f.status === 'pending').length
  const doneCount = queue.filter(f => f.status === 'done').length

  if (!loading && !hasAnyAccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#1C1A17', margin: '0 0 12px' }}>No access</h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', letterSpacing: '0.08em', margin: 0 }}>
          You don't have access to this section. Contact the project owner if you need access.
        </p>
      </div>
    )
  }

  // ─── MOBILE VIEW ────────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileFileInputRef = fileInputRef
    const mobilePendingCount = queue.filter(f => f.status === 'pending').length
    const mobileDoneCount = queue.filter(f => f.status === 'done').length

    return (
      <div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300;400&display=swap');
          .mobile-rendering { width: 100%; border-radius: 4px; display: block; object-fit: cover; cursor: pointer; }
          .mobile-group-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #9A8F82; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #E8E0D5; }
          .mobile-group-label:first-child { margin-top: 0; }
          .lightbox-overlay { position: fixed; inset: 0; background: rgba(28,26,23,0.96); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .lightbox-img { max-width: 96vw; max-height: 82vh; border-radius: 4px; object-fit: contain; }
          .lightbox-close { position: absolute; top: 20px; right: 20px; color: #F5F2EE; font-size: 28px; cursor: pointer; background: none; border: none; line-height: 1; padding: 8px; }
          .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.5); font-size: 36px; cursor: pointer; padding: 16px; font-family: 'DM Mono', monospace; }
          .lightbox-nav--prev { left: 0; }
          .lightbox-nav--next { right: 0; }
          .mobile-queue-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #E8E0D5; }
          .mobile-queue-item:last-child { border-bottom: none; }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 400, color: '#1C1A17', margin: '0 0 4px' }}>Renderings</h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', margin: 0 }}>
              {renderings.length} rendering{renderings.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => mobileFileInputRef.current?.click()}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 18px', backgroundColor: '#151412', color: '#F0EDE8', border: 'none', borderRadius: 2, cursor: 'pointer' }}
            >
              + Add
            </button>
          )}
          <input
            ref={mobileFileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFilesToQueue(e.target.files)}
          />
        </div>

        {/* Mobile upload panel */}
        {queue.length > 0 && (
          <div style={{ backgroundColor: '#fff', border: '1px solid #D8D2C8', borderRadius: 4, padding: 16, marginBottom: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6055', display: 'block', marginBottom: 6 }}>
                Series name (optional)
              </label>
              <input
                type="text"
                value={episodeTitleInput}
                onChange={e => setEpisodeTitleInput(e.target.value)}
                placeholder="e.g. Exterior elevations v2"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: '#F8F6F3', border: '1px solid #D8D2C8', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#1C1A17', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              {queue.map(item => (
                <div key={item.id} className="mobile-queue-item">
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: item.status === 'done' ? '#eef4ee' : item.status === 'error' ? '#fdf0ed' : item.status === 'uploading' ? '#e8f0e8' : '#e8e0d5', color: item.status === 'done' ? '#4a7a4a' : item.status === 'error' ? '#c0532a' : item.status === 'uploading' ? '#4a7a4a' : 'transparent' }}>
                    {item.status === 'done' ? '✓' : item.status === 'error' ? '!' : item.status === 'uploading' ? '↑' : ''}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3a3530', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</span>
                  {item.status === 'pending' && !uploading && (
                    <button onClick={() => removeFromQueue(item.id)} style={{ background: 'none', border: 'none', color: '#bbb0a0', fontSize: 14, cursor: 'pointer', padding: '2px 4px', fontFamily: "'DM Mono', monospace" }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setQueue([]); setEpisodeTitleInput('') }}
                disabled={uploading}
                style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '10px', background: 'none', border: '1px solid #D8D2C8', borderRadius: 2, color: '#6b6055', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAll}
                disabled={uploading || mobilePendingCount === 0}
                style={{ flex: 2, fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em', padding: '10px', background: '#151412', color: '#F0EDE8', border: 'none', borderRadius: 2, cursor: uploading || mobilePendingCount === 0 ? 'not-allowed' : 'pointer', opacity: uploading || mobilePendingCount === 0 ? 0.5 : 1 }}
              >
                {uploading ? `Uploading… (${mobileDoneCount}/${queue.length})` : `Upload ${mobilePendingCount} rendering${mobilePendingCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading…</p>
        ) : renderings.length === 0 ? (
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#B0A89E', textAlign: 'center', padding: '40px 0' }}>No renderings yet.</p>
        ) : (
          weekGroups.map(group => (
            <div key={group.key}>
              <div className="mobile-group-label">{group.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.renderings.map(rendering => (
                  <img
                    key={rendering.id}
                    className="mobile-rendering"
                    src={rendering.image_url}
                    alt={rendering.caption || 'Rendering'}
                    onClick={() => openLightbox(rendering, group.renderings)}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {lightbox && (
          <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
            {lightboxGroup.findIndex(r => r.id === lightbox.id) > 0 && (
              <button className="lightbox-nav lightbox-nav--prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>‹</button>
            )}
            <img className="lightbox-img" src={lightbox.image_url} alt={lightbox.caption || 'Rendering'} onClick={e => e.stopPropagation()} />
            {lightboxGroup.findIndex(r => r.id === lightbox.id) < lightboxGroup.length - 1 && (
              <button className="lightbox-nav lightbox-nav--next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>›</button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── DESKTOP VIEW ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300;400&display=swap');
        .rendering-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .rendering-thumb { aspect-ratio: 1; overflow: hidden; border-radius: 4px; cursor: pointer; position: relative; background: #EDE9E3; }
        .rendering-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s ease; }
        .rendering-thumb:hover img { transform: scale(1.04); }
        .rendering-thumb .caption-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(28,26,23,0.7)); color: #F5F2EE; font-family: 'DM Mono', monospace; font-size: 11px; padding: 20px 10px 8px; opacity: 0; transition: opacity 0.2s; }
        .rendering-thumb:hover .caption-overlay { opacity: 1; }
        .upload-zone { border: 1.5px dashed #C9B99A; border-radius: 6px; padding: 28px; text-align: center; cursor: pointer; background: #FAF8F5; transition: background 0.2s; }
        .upload-zone:hover, .upload-zone.drag-over { background: #F0EBE3; border-color: #8b6f47; }
        .group-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9A8F82; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #E8E0D5; }
        .group-label:first-child { margin-top: 0; }
        .episodes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .episode-folder { background: #fff; border: 1px solid #E8E0D5; border-radius: 4px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; overflow: hidden; }
        .episode-folder:hover { border-color: #C9B99A; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .episode-thumb-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; height: 120px; background: #EDE9E3; overflow: hidden; }
        .episode-thumb-strip > div { position: relative; overflow: hidden; height: 120px; }
        .episode-thumb-strip img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .episode-thumb-blank { background: #EDE9E3; }
        .episode-info { padding: 14px 16px; }
        .episode-title { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 400; color: #1C1A17; margin: 0 0 4px; }
        .episode-date-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: #B0A89E; margin: 0 0 4px; }
        .episode-info-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-top: 4px; }
        .episode-count { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #9A8F82; margin: 0; white-space: nowrap; }
        .episode-back { display: flex; align-items: center; gap: 8px; background: none; border: none; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #9A8F82; cursor: pointer; padding: 0; margin-bottom: 24px; transition: color 0.15s; }
        .episode-back:hover { color: #1C1A17; }
        .episode-edit-btn { background: none; border: none; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #C9B99A; cursor: pointer; padding: 0; white-space: nowrap; transition: color 0.15s; }
        .episode-edit-btn:hover { color: #8b6f47; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(28,26,23,0.92); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .lightbox-img { max-width: 90vw; max-height: 85vh; border-radius: 4px; object-fit: contain; }
        .lightbox-close { position: absolute; top: 24px; right: 32px; color: #F5F2EE; font-size: 28px; cursor: pointer; font-family: 'DM Mono', monospace; background: none; border: none; line-height: 1; }
        .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.5); font-size: 28px; cursor: pointer; padding: 16px; transition: color 0.15s; font-family: 'DM Mono', monospace; }
        .lightbox-nav:hover { color: #fff; }
        .lightbox-nav--prev { left: 16px; }
        .lightbox-nav--next { right: 16px; }
        .view-toggle { display: flex; gap: 0; border: 1px solid #E8E0D5; border-radius: 3px; overflow: hidden; }
        .toggle-btn { padding: 7px 16px; background: none; border: none; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #9A8F82; transition: all 0.15s; }
        .toggle-btn:first-child { border-right: 1px solid #E8E0D5; }
        .toggle-btn.active { background: #1C1A17; color: #F0E8D8; }
        .toggle-btn:hover:not(.active) { background: #F5F2EE; color: #3A3530; }
        .queue-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fff; border: 1px solid #e8e0d5; border-radius: 2px; }
        .queue-item--done { opacity: 0.6; }
        .queue-item--error { border-color: #e8856a; background: #fdf5f2; }
        .queue-status { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: bold; flex-shrink: 0; }
        .queue-status--pending { background: #e8e0d5; }
        .queue-status--uploading { background: #e8f0e8; color: #4a7a4a; animation: pulse 1s infinite; }
        .queue-status--done { background: #eef4ee; color: #4a7a4a; }
        .queue-status--error { background: #fdf0ed; color: #c0532a; }
        .queue-filename { font-family: 'DM Mono', monospace; font-size: 11px; color: #3a3530; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .queue-remove { background: none; border: none; color: #bbb0a0; font-size: 10px; cursor: pointer; padding: 2px 4px; flex-shrink: 0; font-family: 'DM Mono', monospace; }
        .queue-remove:hover { color: #c0532a; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px' }}>
            {openEpisodeGroup ? (openEpisodeGroup.episode?.title || openEpisodeGroup.label) : 'Renderings'}
          </h1>
          {openEpisodeGroup && openEpisodeGroup.episode?.title && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{openEpisodeGroup.label}</p>
          )}
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0 }}>
            {openEpisodeGroup
              ? `${openEpisodeGroup.renderings.length} rendering${openEpisodeGroup.renderings.length !== 1 ? 's' : ''}`
              : `${renderings.length} rendering${renderings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!openEpisodeGroup && (
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
            <button className={`toggle-btn ${viewMode === 'episodes' ? 'active' : ''}`} onClick={() => setViewMode('episodes')}>Episodes</button>
          </div>
        )}
        {openEpisodeGroup && canEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingEpisodeKey === openEpisodeGroup.key ? (
              <>
                <input ref={editInputRef} value={editingEpisodeTitle} onChange={e => setEditingEpisodeTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEpisodeTitle(openEpisodeGroup.key, editingEpisodeTitle); if (e.key === 'Escape') setEditingEpisodeKey(null) }}
                  placeholder="Episode title…"
                  style={{ padding: '6px 10px', background: '#fff', border: '1px solid #C9B99A', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none', width: 200 }} />
                <button className="episode-edit-btn" onClick={() => saveEpisodeTitle(openEpisodeGroup.key, editingEpisodeTitle)}>Save</button>
                <button className="episode-edit-btn" style={{ color: '#9A8F82' }} onClick={() => setEditingEpisodeKey(null)}>Cancel</button>
              </>
            ) : (
              <button className="episode-edit-btn" onClick={() => startEditingEpisode(openEpisodeGroup.key, openEpisodeGroup.episode?.title ?? null)}>
                {openEpisodeGroup.episode?.title ? 'Edit title' : '+ Add title'}
              </button>
            )}
          </div>
        )}
      </div>

      {!openEpisodeGroup && canEdit && (
        <div style={{ marginBottom: 40 }}>
          <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()} style={{ marginBottom: queue.length > 0 ? 16 : 0 }}>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
              onChange={e => e.target.files && addFilesToQueue(e.target.files)} />
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#6B6359', marginBottom: 12 }}>Drop renderings here or click to select</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#B0A89E', marginBottom: 16 }}>JPG, PNG, PDF · multiple files supported</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6055' }}>Episode date</span>
                <input type="date" value={episodeDate} onChange={e => setEpisodeDate(e.target.value)}
                  style={{ padding: '6px 10px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6055' }}>Episode title</span>
                <input type="text" value={episodeTitleInput} onChange={e => setEpisodeTitleInput(e.target.value)} placeholder="Optional"
                  style={{ padding: '6px 10px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none', width: 180 }} />
              </div>
            </div>
          </div>
          {queue.length > 0 && (
            <div style={{ border: '1px solid #e8e0d5', borderRadius: 4, overflow: 'hidden', background: '#faf8f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e8e0d5' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b6055' }}>
                  {queue.length} file{queue.length !== 1 ? 's' : ''}{doneCount > 0 ? ` · ${doneCount} uploaded` : ''}
                </span>
                {!uploading && <button onClick={() => setQueue([])} style={{ background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#9a8e7e', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Clear all</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8 }}>
                {queue.map(item => (
                  <div key={item.id} className={`queue-item queue-item--${item.status}`}>
                    <span className={`queue-status queue-status--${item.status}`}>
                      {item.status === 'pending' ? '' : item.status === 'uploading' ? '↑' : item.status === 'done' ? '✓' : '!'}
                    </span>
                    <span className="queue-filename">{item.file.name}</span>
                    {item.error && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#c0532a' }}>{item.error}</span>}
                    {item.status === 'pending' && !uploading && <button className="queue-remove" onClick={() => removeFromQueue(item.id)}>✕</button>}
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e0d5', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setQueue([]); setEpisodeTitleInput('') }} disabled={uploading}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '8px 16px', background: 'none', border: '1px solid #ddd5c8', borderRadius: 2, color: '#6b6055', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleUploadAll} disabled={uploading || pendingCount === 0}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em', padding: '8px 20px', background: '#1c1a17', color: '#f0e8d8', border: 'none', borderRadius: 2, cursor: uploading || pendingCount === 0 ? 'not-allowed' : 'pointer', opacity: uploading || pendingCount === 0 ? 0.5 : 1 }}>
                  {uploading ? `Uploading… (${doneCount}/${queue.length})` : `Upload ${pendingCount} rendering${pendingCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div style={{ background: '#FDF0ED', border: '1px solid #E8856A', borderRadius: 4, padding: '10px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#C0532A', marginBottom: 24 }}>{error}</div>}

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading renderings…</div>
      ) : renderings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>No renderings yet.</div>
      ) : openEpisodeGroup ? (
        <div>
          <button className="episode-back" onClick={() => setOpenEpisode(null)}>← All episodes</button>
          <div className="rendering-grid">
            {openEpisodeGroup.renderings.map(rendering => (
              <div key={rendering.id} className="rendering-thumb" onClick={() => openLightbox(rendering, openEpisodeGroup.renderings)}>
                <img src={rendering.image_url} alt={rendering.caption || 'Rendering'} />
                {rendering.caption && <div className="caption-overlay">{rendering.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        weekGroups.map(group => (
          <div key={group.key}>
            <div className="group-label">{group.label}</div>
            <div className="rendering-grid">
              {group.renderings.map(rendering => (
                <div key={rendering.id} className="rendering-thumb" onClick={() => openLightbox(rendering, group.renderings)}>
                  <img src={rendering.image_url} alt={rendering.caption || 'Rendering'} />
                  {rendering.caption && <div className="caption-overlay">{rendering.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="episodes-grid">
          {dayGroups.map(group => {
            const thumbs = group.renderings.slice(0, 3)
            const displayTitle = episodeDisplayTitle(group)
            const hasCustomTitle = !!group.episode?.title
            return (
              <div key={group.key} className="episode-folder" onClick={() => setOpenEpisode(group.key)}>
                <div className="episode-thumb-strip">
                  {thumbs.map(r => <div key={r.id}><img src={r.image_url} alt="" /></div>)}
                  {Array.from({ length: 3 - thumbs.length }).map((_, i) => <div key={i} className="episode-thumb-blank" />)}
                </div>
                <div className="episode-info">
                  <p className="episode-title">{displayTitle}</p>
                  {hasCustomTitle && <p className="episode-date-sub">{group.label}</p>}
                  <div className="episode-info-row"><p className="episode-count">{group.sublabel}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          {lightboxGroup.findIndex(r => r.id === lightbox.id) > 0 && (
            <button className="lightbox-nav lightbox-nav--prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>‹</button>
          )}
          <img className="lightbox-img" src={lightbox.image_url} alt={lightbox.caption || 'Rendering'} onClick={e => e.stopPropagation()} />
          {lightboxGroup.findIndex(r => r.id === lightbox.id) < lightboxGroup.length - 1 && (
            <button className="lightbox-nav lightbox-nav--next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>›</button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}>
            {lightbox.caption && <div style={{ color: '#C9B99A', fontFamily: "'DM Mono', monospace", fontSize: 13, textAlign: 'center' }}>{lightbox.caption}</div>}
            {canEdit && (
              <button onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px 16px' }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#E8856A'; (e.target as HTMLButtonElement).style.borderColor = '#E8856A' }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}>
                Delete rendering
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
