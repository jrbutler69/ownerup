'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Photo {
  id: string
  project_id: string
  taken_at: string
  uploaded_at: string
  image_url: string
  caption: string | null
  uploaded_by: string | null
}

interface Episode {
  id: string
  project_id: string
  episode_date: string
  type: string
  title: string | null
}

interface GroupedPhotos {
  key: string
  label: string
  sublabel: string
  photos: Photo[]
  episode?: Episode
}

function groupByWeek(photos: Photo[]): GroupedPhotos[] {
  const groups: Record<string, Photo[]> = {}
  for (const photo of photos) {
    const date = new Date(photo.taken_at || photo.uploaded_at)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const key = monday.toISOString()
    if (!groups[key]) groups[key] = []
    groups[key].push(photo)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, photos]) => {
      const monday = new Date(key)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      const start = monday.toLocaleDateString('en-US', opts)
      const end = sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
      return { key, label: `Week of ${start} – ${end}`, sublabel: `${photos.length} photo${photos.length !== 1 ? 's' : ''}`, photos }
    })
}

function groupByDay(photos: Photo[], episodes: Episode[]): GroupedPhotos[] {
  const groups: Record<string, Photo[]> = {}
  for (const photo of photos) {
    const date = new Date(photo.taken_at || photo.uploaded_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(photo)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, photos]) => {
      const [year, month, day] = key.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const episode = episodes.find(e => e.episode_date === key)
      return { key, label: dateLabel, sublabel: `${photos.length} photo${photos.length !== 1 ? 's' : ''}`, photos, episode }
    })
}

type ViewMode = 'grid' | 'episodes'

export default function PhotosPage() {
  const supabase = createClient()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [lightboxGroup, setLightboxGroup] = useState<Photo[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [openEpisode, setOpenEpisode] = useState<string | null>(null)
  const [episodeDate, setEpisodeDate] = useState(() => new Date().toISOString().split('T')[0])
  const [episodeTitleInput, setEpisodeTitleInput] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [hasAnyAccess, setHasAnyAccess] = useState(true)
  const [editingEpisodeKey, setEditingEpisodeKey] = useState<string | null>(null)
  const [editingEpisodeTitle, setEditingEpisodeTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const cookiePid = document.cookie.split('; ').find(r => r.startsWith('selected_project_id='))?.split('=')[1]
      const { data: memberRows } = await supabase
        .from('project_members').select('project_id, role, user_id, invited_email').eq('status', 'active')
      if (!memberRows?.length) return

      const myRows = memberRows.filter((r: any) => r.user_id === user.id)
      if (!myRows.length) return
      const pid = cookiePid && myRows.some((r: any) => r.project_id === cookiePid) ? cookiePid : myRows[0].project_id
      setProjectId(pid)

      const projectMembers = memberRows.filter((r: any) => r.project_id === pid)
      const emailMap: Record<string, string> = {}
      for (const m of projectMembers) {
        if (m.user_id && m.invited_email) emailMap[m.user_id] = m.invited_email
      }
      const ownerRow = projectMembers.find((r: any) => r.role === 'owner')
      if (ownerRow?.user_id && !emailMap[ownerRow.user_id] && ownerRow.user_id === user.id) {
        emailMap[ownerRow.user_id] = user.email ?? ''
      }
      setMemberEmails(emailMap)

      const { data: photoData } = await supabase.from('photos').select('*').eq('project_id', pid).order('taken_at', { ascending: false })
      if (photoData) setPhotos(photoData)

      const { data: episodeData } = await supabase.from('episodes').select('*').eq('project_id', pid).eq('type', 'photos')
      if (episodeData) setEpisodes(episodeData)

      setLoading(false)

      const memberRow = myRows.find((r: any) => r.project_id === pid)
      const role = memberRow?.role ?? 'other'
      if (['owner', 'co-owner'].includes(role)) {
        setHasAnyAccess(true)
        setCanEdit(true)
      } else {
        const { data: perms } = await supabase.rpc('get_my_permissions', { p_project_id: pid })
        const level = perms?.find((p: any) => p.section === 'photos')?.access_level ?? 'none'
        setHasAnyAccess(level !== 'none')
        setCanEdit(level === 'edit')
      }
    }
    load()
  }, [])

  async function getOrCreateEpisode(pid: string, date: string, title: string): Promise<Episode | null> {
    // Check if episode already exists for this date
    const existing = episodes.find(e => e.episode_date === date && e.type === 'photos')
    if (existing) {
      // If a title was provided and episode has no title yet, update it
      if (title && !existing.title) {
        const { data: updated } = await supabase.from('episodes').update({ title }).eq('id', existing.id).select().single()
        if (updated) {
          setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e))
          return updated
        }
      }
      return existing
    }
    // Create new episode
    const { data: newEpisode } = await supabase.from('episodes').insert({
      project_id: pid,
      episode_date: date,
      type: 'photos',
      title: title || null,
    }).select().single()
    if (newEpisode) {
      setEpisodes(prev => [...prev, newEpisode])
      return newEpisode
    }
    return null
  }

  async function handleUpload(files: FileList) {
    if (!projectId || !currentUserId || files.length === 0) return
    setUploading(true)
    setError(null)

    // Ensure episode record exists for this date
    await getOrCreateEpisode(projectId, episodeDate, episodeTitleInput.trim())

    const newPhotos: Photo[] = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const filename = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('photos').upload(filename, file)
      if (uploadError) { setError(`Upload failed: ${uploadError.message}`); continue }
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filename)
      const { data: newPhoto, error: dbError } = await supabase.from('photos').insert({
        project_id: projectId,
        image_url: publicUrl,
        taken_at: new Date(episodeDate + 'T12:00:00').toISOString(),
        uploaded_at: new Date().toISOString(),
        caption: null,
        uploaded_by: currentUserId,
      }).select().single()
      if (dbError) { setError(`DB error: ${dbError.message}`) }
      else if (newPhoto) newPhotos.push(newPhoto)
    }
    if (newPhotos.length) setPhotos(prev => [...newPhotos, ...prev])
    setUploading(false)
    setEpisodeTitleInput('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo?')) return
    const urlParts = photo.image_url.split('/photos/')
    if (urlParts.length > 1) await supabase.storage.from('photos').remove([urlParts[1]])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setLightbox(null)
  }

  async function saveEpisodeTitle(key: string, title: string) {
    if (!projectId) return
    const existing = episodes.find(e => e.episode_date === key && e.type === 'photos')
    if (existing) {
      const { data: updated } = await supabase.from('episodes').update({ title: title || null }).eq('id', existing.id).select().single()
      if (updated) setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e))
    } else {
      const { data: newEpisode } = await supabase.from('episodes').insert({
        project_id: projectId, episode_date: key, type: 'photos', title: title || null,
      }).select().single()
      if (newEpisode) setEpisodes(prev => [...prev, newEpisode])
    }
    setEditingEpisodeKey(null)
  }

  function startEditingEpisode(key: string, currentTitle: string | null) {
    setEditingEpisodeKey(key)
    setEditingEpisodeTitle(currentTitle ?? '')
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  function openLightbox(photo: Photo, group: Photo[]) { setLightbox(photo); setLightboxGroup(group) }

  function lightboxNav(dir: 1 | -1) {
    if (!lightbox) return
    const idx = lightboxGroup.findIndex(p => p.id === lightbox.id)
    const next = lightboxGroup[idx + dir]
    if (next) setLightbox(next)
  }

  function uploaderLabel(groupPhotos: Photo[]): string | null {
    const uploaderIds = [...new Set(groupPhotos.map(p => p.uploaded_by).filter(Boolean))] as string[]
    if (uploaderIds.length === 0) return null
    const emails = uploaderIds.map(id => memberEmails[id] ?? id)
    if (emails.length === 1) return emails[0]
    if (emails.length === 2) return `${emails[0]} & ${emails[1]}`
    return `${emails[0]} +${emails.length - 1} others`
  }

  function episodeDisplayTitle(group: GroupedPhotos): string {
    return group.episode?.title || group.label
  }

  const weekGroups = groupByWeek(photos)
  const dayGroups = groupByDay(photos, episodes)
  const openEpisodeGroup = dayGroups.find(g => g.key === openEpisode)

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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300;400&display=swap');
        .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .photo-thumb { aspect-ratio: 1; overflow: hidden; border-radius: 4px; cursor: pointer; position: relative; background: #EDE9E3; }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s ease; }
        .photo-thumb:hover img { transform: scale(1.04); }
        .caption-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(28,26,23,0.7)); color: #F5F2EE; font-family: 'DM Mono', monospace; font-size: 11px; padding: 20px 10px 8px; opacity: 0; transition: opacity 0.2s; }
        .photo-thumb:hover .caption-overlay { opacity: 1; }
        .upload-zone { border: 1.5px dashed #C9B99A; border-radius: 6px; padding: 28px; text-align: center; cursor: pointer; background: #FAF8F5; transition: background 0.2s; margin-bottom: 40px; }
        .upload-zone:hover { background: #F0EBE3; }
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
        .episode-uploader { font-family: 'DM Mono', monospace; font-size: 9px; color: #B0A89E; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
        .episode-back { display: flex; align-items: center; gap: 8px; background: none; border: none; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #9A8F82; cursor: pointer; padding: 0; margin-bottom: 24px; transition: color 0.15s; }
        .episode-back:hover { color: #1C1A17; }
        .episode-title-edit { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .episode-title-input { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 400; color: #1C1A17; background: transparent; border: none; border-bottom: 1px solid #C9B99A; outline: none; width: 100%; padding: 0 0 2px; }
        .episode-edit-btn { background: none; border: none; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #C9B99A; cursor: pointer; padding: 0; white-space: nowrap; transition: color 0.15s; }
        .episode-edit-btn:hover { color: #8b6f47; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(28,26,23,0.94); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .lightbox-img { max-width: 86vw; max-height: 85vh; border-radius: 4px; object-fit: contain; }
        .lightbox-close { position: absolute; top: 24px; right: 32px; color: #F5F2EE; font-size: 28px; cursor: pointer; font-family: 'DM Mono', monospace; background: none; border: none; line-height: 1; }
        .lightbox-delete { position: absolute; top: 24px; left: 32px; color: #E8856A; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; background: none; border: none; letter-spacing: 0.05em; }
        .lightbox-caption { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); color: #C9B99A; font-family: 'DM Mono', monospace; font-size: 13px; text-align: center; white-space: nowrap; }
        .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.5); font-size: 28px; cursor: pointer; padding: 16px; transition: color 0.15s; font-family: 'DM Mono', monospace; }
        .lightbox-nav:hover { color: #fff; }
        .lightbox-nav--prev { left: 16px; }
        .lightbox-nav--next { right: 16px; }
        .lightbox-nav:disabled { opacity: 0.15; cursor: default; }
        .view-toggle { display: flex; gap: 0; border: 1px solid #E8E0D5; border-radius: 3px; overflow: hidden; }
        .toggle-btn { padding: 7px 16px; background: none; border: none; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #9A8F82; transition: all 0.15s; }
        .toggle-btn:first-child { border-right: 1px solid #E8E0D5; }
        .toggle-btn.active { background: #1C1A17; color: #F0E8D8; }
        .toggle-btn:hover:not(.active) { background: #F5F2EE; color: #3A3530; }
        .episode-title-field { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .episode-title-field input { padding: '6px 10px'; background: #fff; border: 1px solid #ddd5c8; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 12px; color: #1c1a17; outline: none; width: 220px; padding: 6px 10px; }
        .episode-title-field input:focus { border-color: #8b6f47; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px' }}>
            {openEpisodeGroup
              ? (openEpisodeGroup.episode?.title || openEpisodeGroup.label)
              : 'Photos'}
          </h1>
          {openEpisodeGroup && openEpisodeGroup.episode?.title && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {openEpisodeGroup.label}
            </p>
          )}
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0 }}>
            {openEpisodeGroup
              ? `${openEpisodeGroup.photos.length} photo${openEpisodeGroup.photos.length !== 1 ? 's' : ''}`
              : `${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
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
                <input
                  ref={editInputRef}
                  value={editingEpisodeTitle}
                  onChange={e => setEditingEpisodeTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEpisodeTitle(openEpisodeGroup.key, editingEpisodeTitle); if (e.key === 'Escape') setEditingEpisodeKey(null) }}
                  placeholder="Episode title…"
                  style={{ padding: '6px 10px', background: '#fff', border: '1px solid #C9B99A', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none', width: 200 }}
                />
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

      {/* Upload zone */}
      {!openEpisodeGroup && canEdit && (
        <div className="upload-zone" style={{ marginBottom: 40 }} onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && handleUpload(e.target.files)} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#6B6359', marginBottom: 16 }}>
            {uploading ? 'Uploading…' : 'Drop photos here or click to upload'}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#B0A89E', marginBottom: 16 }}>JPG, PNG, HEIC · multiple files supported</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6055' }}>Episode date</span>
              <input
                type="date"
                value={episodeDate}
                onChange={e => setEpisodeDate(e.target.value)}
                style={{ padding: '6px 10px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6055' }}>Episode title</span>
              <input
                type="text"
                value={episodeTitleInput}
                onChange={e => setEpisodeTitleInput(e.target.value)}
                placeholder="Optional"
                style={{ padding: '6px 10px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none', width: 180 }}
              />
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ background: '#FDF0ED', border: '1px solid #E8856A', borderRadius: 4, padding: '10px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#C0532A', marginBottom: 24 }}>{error}</div>}

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading photos…</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>No photos yet.</div>
      ) : openEpisodeGroup ? (
        <div>
          <button className="episode-back" onClick={() => setOpenEpisode(null)}>← All episodes</button>
          <div className="photo-grid">
            {openEpisodeGroup.photos.map(photo => (
              <div key={photo.id} className="photo-thumb" onClick={() => openLightbox(photo, openEpisodeGroup.photos)}>
                <img src={photo.image_url} alt={photo.caption || 'Site photo'} />
                {photo.caption && <div className="caption-overlay">{photo.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        weekGroups.map(group => (
          <div key={group.key}>
            <div className="group-label">{group.label}</div>
            <div className="photo-grid">
              {group.photos.map(photo => (
                <div key={photo.id} className="photo-thumb" onClick={() => openLightbox(photo, group.photos)}>
                  <img src={photo.image_url} alt={photo.caption || 'Site photo'} />
                  {photo.caption && <div className="caption-overlay">{photo.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="episodes-grid">
          {dayGroups.map(group => {
            const thumbs = group.photos.slice(0, 3)
            const uploader = uploaderLabel(group.photos)
            const displayTitle = episodeDisplayTitle(group)
            const hasCustomTitle = !!group.episode?.title
            return (
              <div key={group.key} className="episode-folder" onClick={() => setOpenEpisode(group.key)}>
                <div className="episode-thumb-strip">
                  {thumbs.map(p => <div key={p.id}><img src={p.image_url} alt="" /></div>)}
                  {Array.from({ length: 3 - thumbs.length }).map((_, i) => <div key={i} className="episode-thumb-blank" />)}
                </div>
                <div className="episode-info">
                  <p className="episode-title">{displayTitle}</p>
                  {hasCustomTitle && <p className="episode-date-sub">{group.label}</p>}
                  <div className="episode-info-row">
                    <p className="episode-count">{group.sublabel}</p>
                    {uploader && <span className="episode-uploader">{uploader}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          {canEdit && <button className="lightbox-delete" onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}>Delete</button>}
          {lightboxGroup.findIndex(p => p.id === lightbox.id) > 0 && (
            <button className="lightbox-nav lightbox-nav--prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>‹</button>
          )}
          <img className="lightbox-img" src={lightbox.image_url} alt={lightbox.caption || 'Site photo'} onClick={e => e.stopPropagation()} />
          {lightboxGroup.findIndex(p => p.id === lightbox.id) < lightboxGroup.length - 1 && (
            <button className="lightbox-nav lightbox-nav--next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>›</button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}>
            {lightbox.caption && <div style={{ color: '#C9B99A', fontFamily: "'DM Mono', monospace", fontSize: 13, textAlign: 'center' }}>{lightbox.caption}</div>}
            {canEdit && (
              <button
                onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px 16px', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#E8856A'; (e.target as HTMLButtonElement).style.borderColor = '#E8856A' }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              >
                Delete photo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}