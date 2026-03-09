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
}

interface GroupedPhotos {
  key: string
  label: string
  sublabel: string
  photos: Photo[]
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
      return {
        key,
        label: `Week of ${start} – ${end}`,
        sublabel: `${photos.length} photo${photos.length !== 1 ? 's' : ''}`,
        photos,
      }
    })
}

function groupByDay(photos: Photo[]): GroupedPhotos[] {
  const groups: Record<string, Photo[]> = {}
  for (const photo of photos) {
    const date = new Date(photo.taken_at || photo.uploaded_at)
    // Use local date string as key to avoid timezone shifting
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(photo)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, photos]) => {
      const [year, month, day] = key.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      return {
        key,
        label,
        sublabel: `${photos.length} photo${photos.length !== 1 ? 's' : ''}`,
        photos,
      }
    })
}

type ViewMode = 'grid' | 'visits'

export default function PhotosPage() {
  const supabase = createClient()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [lightboxGroup, setLightboxGroup] = useState<Photo[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [openVisit, setOpenVisit] = useState<string | null>(null)
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: project } = await supabase
        .from('projects').select('id').eq('user_id', user.id).single()
      if (!project) return
      setProjectId(project.id)
      const { data } = await supabase
        .from('photos').select('*').eq('project_id', project.id)
        .order('taken_at', { ascending: false })
      if (data) setPhotos(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpload(files: FileList) {
    if (!projectId || files.length === 0) return
    setUploading(true)
    setError(null)
    const newPhotos: Photo[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const filename = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('photos').upload(filename, file)

      if (uploadError) { setError(`Upload failed: ${uploadError.message}`); continue }

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filename)

      const { data: newPhoto, error: dbError } = await supabase
        .from('photos')
        .insert({
          project_id: projectId,
          image_url: publicUrl,
          taken_at: new Date(visitDate + 'T12:00:00').toISOString(),
          uploaded_at: new Date().toISOString(),
          caption: null,
        })
        .select().single()

      if (dbError) { setError(`DB error: ${dbError.message}`) }
      else if (newPhoto) newPhotos.push(newPhoto)
    }

    if (newPhotos.length) setPhotos(prev => [...newPhotos, ...prev])
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo?')) return
    const urlParts = photo.image_url.split('/photos/')
    if (urlParts.length > 1) {
      await supabase.storage.from('photos').remove([urlParts[1]])
    }
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setLightbox(null)
  }

  function openLightbox(photo: Photo, group: Photo[]) {
    setLightbox(photo)
    setLightboxGroup(group)
  }

  function lightboxNav(dir: 1 | -1) {
    if (!lightbox) return
    const idx = lightboxGroup.findIndex(p => p.id === lightbox.id)
    const next = lightboxGroup[idx + dir]
    if (next) setLightbox(next)
  }

  const weekGroups = groupByWeek(photos)
  const dayGroups = groupByDay(photos)
  const openVisitGroup = dayGroups.find(g => g.key === openVisit)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .photo-thumb {
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          background: #EDE9E3;
        }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s ease; }
        .photo-thumb:hover img { transform: scale(1.04); }
        .caption-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(28,26,23,0.7));
          color: #F5F2EE; font-family: 'DM Mono', monospace; font-size: 11px;
          padding: 20px 10px 8px; opacity: 0; transition: opacity 0.2s;
        }
        .photo-thumb:hover .caption-overlay { opacity: 1; }

        .upload-zone {
          border: 1.5px dashed #C9B99A; border-radius: 6px; padding: 28px;
          text-align: center; cursor: pointer; background: #FAF8F5;
          transition: background 0.2s; margin-bottom: 40px;
        }
        .upload-zone:hover { background: #F0EBE3; }

        .group-label {
          font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
          text-transform: uppercase; color: #9A8F82; margin: 32px 0 12px;
          padding-bottom: 8px; border-bottom: 1px solid #E8E0D5;
        }
        .group-label:first-child { margin-top: 0; }

        /* Visit folders */
        .visits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
        .visit-folder {
          background: #fff; border: 1px solid #E8E0D5; border-radius: 4px;
          cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
          overflow: hidden;
        }
        .visit-folder:hover { border-color: #C9B99A; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .visit-thumb-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          height: 120px;
          background: #EDE9E3;
        }
        .visit-thumb-strip img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .visit-thumb-blank { background: #EDE9E3; }
        .visit-info { padding: 14px 16px; }
        .visit-date {
          font-family: 'Cormorant Garamond', serif; font-size: 16px;
          font-weight: 400; color: #1C1A17; margin: 0 0 4px;
        }
        .visit-count {
          font-family: 'DM Mono', monospace; font-size: 10px;
          letter-spacing: 0.1em; text-transform: uppercase; color: #9A8F82;
        }

        /* Visit detail */
        .visit-back {
          display: flex; align-items: center; gap: 8px; background: none; border: none;
          font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em;
          text-transform: uppercase; color: #9A8F82; cursor: pointer;
          padding: 0; margin-bottom: 24px; transition: color 0.15s;
        }
        .visit-back:hover { color: #1C1A17; }

        /* Lightbox */
        .lightbox-overlay {
          position: fixed; inset: 0; background: rgba(28,26,23,0.94);
          z-index: 1000; display: flex; align-items: center; justify-content: center;
        }
        .lightbox-img {
          max-width: 86vw; max-height: 85vh; border-radius: 4px; object-fit: contain;
        }
        .lightbox-close {
          position: absolute; top: 24px; right: 32px; color: #F5F2EE; font-size: 28px;
          cursor: pointer; font-family: 'DM Mono', monospace; background: none; border: none; line-height: 1;
        }
        .lightbox-delete {
          position: absolute; top: 24px; left: 32px; color: #E8856A;
          font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer;
          background: none; border: none; letter-spacing: 0.05em;
        }
        .lightbox-caption {
          position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
          color: #C9B99A; font-family: 'DM Mono', monospace; font-size: 13px; text-align: center;
          white-space: nowrap;
        }
        .lightbox-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: rgba(255,255,255,0.5);
          font-size: 28px; cursor: pointer; padding: 16px; transition: color 0.15s;
          font-family: 'DM Mono', monospace;
        }
        .lightbox-nav:hover { color: #fff; }
        .lightbox-nav--prev { left: 16px; }
        .lightbox-nav--next { right: 16px; }
        .lightbox-nav:disabled { opacity: 0.15; cursor: default; }

        /* Toggle */
        .view-toggle {
          display: flex; gap: 0; border: 1px solid #E8E0D5; border-radius: 3px; overflow: hidden;
        }
        .toggle-btn {
          padding: 7px 16px; background: none; border: none; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: #9A8F82; transition: all 0.15s;
        }
        .toggle-btn:first-child { border-right: 1px solid #E8E0D5; }
        .toggle-btn.active { background: #1C1A17; color: #F0E8D8; }
        .toggle-btn:hover:not(.active) { background: #F5F2EE; color: #3A3530; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px' }}>
            {openVisitGroup ? openVisitGroup.label : 'Photos'}
          </h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0 }}>
            {openVisitGroup
              ? `${openVisitGroup.photos.length} photo${openVisitGroup.photos.length !== 1 ? 's' : ''}`
              : `${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!openVisitGroup && (
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
            <button className={`toggle-btn ${viewMode === 'visits' ? 'active' : ''}`} onClick={() => setViewMode('visits')}>Visits</button>
          </div>
        )}
      </div>

      {/* Upload zone — always visible unless inside a visit */}
      {!openVisitGroup && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6055' }}>
              Site visit date
            </span>
            <input
              type="date"
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              style={{ padding: '6px 10px', background: '#fff', border: '1px solid #ddd5c8', borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1c1a17', outline: 'none' }}
            />
          </div>
          <div className="upload-zone" onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => e.target.files && handleUpload(e.target.files)} />
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#6B6359', marginBottom: 6 }}>
              {uploading ? 'Uploading…' : 'Drop photos here or click to upload'}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#B0A89E' }}>
              JPG, PNG, HEIC · multiple files supported
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#FDF0ED', border: '1px solid #E8856A', borderRadius: 4, padding: '10px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#C0532A', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading photos…</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>
          No photos yet. Upload your first site photo above.
        </div>

      ) : openVisitGroup ? (
        /* ── Visit detail view ── */
        <div>
          <button className="visit-back" onClick={() => setOpenVisit(null)}>← All visits</button>
          <div className="photo-grid">
            {openVisitGroup.photos.map(photo => (
              <div key={photo.id} className="photo-thumb" onClick={() => openLightbox(photo, openVisitGroup.photos)}>
                <img src={photo.image_url} alt={photo.caption || 'Site photo'} />
                {photo.caption && <div className="caption-overlay">{photo.caption}</div>}
              </div>
            ))}
          </div>
        </div>

      ) : viewMode === 'grid' ? (
        /* ── Grid view ── */
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
        /* ── Visits view ── */
        <div className="visits-grid">
          {dayGroups.map(group => {
            const thumbs = group.photos.slice(0, 3)
            return (
              <div key={group.key} className="visit-folder" onClick={() => setOpenVisit(group.key)}>
                <div className="visit-thumb-strip">
                  {thumbs.map(p => (
                    <img key={p.id} src={p.image_url} alt="" />
                  ))}
                  {Array.from({ length: 3 - thumbs.length }).map((_, i) => (
                    <div key={i} className="visit-thumb-blank" />
                  ))}
                </div>
                <div className="visit-info">
                  <p className="visit-date">{group.label}</p>
                  <p className="visit-count">{group.sublabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <button className="lightbox-delete" onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}>Delete</button>

          {lightboxGroup.findIndex(p => p.id === lightbox.id) > 0 && (
            <button className="lightbox-nav lightbox-nav--prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>‹</button>
          )}

          <img className="lightbox-img" src={lightbox.image_url} alt={lightbox.caption || 'Site photo'} onClick={e => e.stopPropagation()} />

          {lightboxGroup.findIndex(p => p.id === lightbox.id) < lightboxGroup.length - 1 && (
            <button className="lightbox-nav lightbox-nav--next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>›</button>
          )}

          {lightbox.caption && <div className="lightbox-caption">{lightbox.caption}</div>}
        </div>
      )}
    </div>
  )
}
