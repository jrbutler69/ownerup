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
  label: string
  photos: Photo[]
}

function groupByWeek(photos: Photo[]): GroupedPhotos[] {
  const groups: Record<string, Photo[]> = {}

  for (const photo of photos) {
    const date = new Date(photo.taken_at || photo.uploaded_at)
    // Get start of week (Monday)
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
    .map(([key, photos]) => ({
      label: formatWeekLabel(new Date(key)),
      photos,
    }))
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = monday.toLocaleDateString('en-US', opts)
  const end = sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `Week of ${start} – ${end}`
}

export default function PhotosPage() {
  const supabase = createClient()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [grouped, setGrouped] = useState<GroupedPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [caption, setCaption] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!project) return
      setProjectId(project.id)

      const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .eq('project_id', project.id)
        .order('taken_at', { ascending: false })

      if (photos) {
        setPhotos(photos)
        setGrouped(groupByWeek(photos))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpload(files: FileList) {
    if (!projectId || files.length === 0) return
    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const filename = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, file)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filename)

      const { data: newPhoto, error: dbError } = await supabase
        .from('photos')
        .insert({
          project_id: projectId,
          image_url: publicUrl,
          taken_at: new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
          caption: caption || null,
        })
        .select()
        .single()

      if (dbError) {
        setError(`DB error: ${dbError.message}`)
      } else if (newPhoto) {
        setPhotos(prev => {
          const updated = [newPhoto, ...prev]
          setGrouped(groupByWeek(updated))
          return updated
        })
      }
    }

    setCaption('')
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo?')) return

    // Extract storage path from URL
    const urlParts = photo.image_url.split('/photos/')
    if (urlParts.length > 1) {
      await supabase.storage.from('photos').remove([urlParts[1]])
    }

    await supabase.from('photos').delete().eq('id', photo.id)

    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== photo.id)
      setGrouped(groupByWeek(updated))
      return updated
    })
    setLightbox(null)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100, margin: '0 auto' }}>
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
        .photo-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }
        .photo-thumb:hover img { transform: scale(1.04); }
        .photo-thumb .caption-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(28,26,23,0.7));
          color: #F5F2EE;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 20px 10px 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .photo-thumb:hover .caption-overlay { opacity: 1; }
        .upload-zone {
          border: 1.5px dashed #C9B99A;
          border-radius: 6px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          background: #FAF8F5;
          transition: background 0.2s;
          margin-bottom: 40px;
        }
        .upload-zone:hover, .upload-zone.dragging { background: #F0EBE3; }
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(28,26,23,0.92);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightbox-img {
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 4px;
          object-fit: contain;
        }
        .lightbox-close {
          position: absolute;
          top: 24px; right: 32px;
          color: #F5F2EE;
          font-size: 28px;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          background: none;
          border: none;
          line-height: 1;
        }
        .lightbox-caption {
          position: absolute;
          bottom: 32px;
          left: 50%; transform: translateX(-50%);
          color: #C9B99A;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          text-align: center;
        }
        .lightbox-delete {
          position: absolute;
          top: 24px; left: 32px;
          color: #E8856A;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          cursor: pointer;
          background: none;
          border: none;
          letter-spacing: 0.05em;
        }
        .week-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9A8F82;
          margin: 32px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E8E0D5;
        }
        .week-label:first-child { margin-top: 0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 32,
          fontWeight: 400,
          color: '#1C1A17',
          margin: '0 0 6px',
        }}>Photos</h1>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          color: '#9A8F82',
          margin: 0,
        }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} · grouped by week
        </p>
      </div>

      {/* Upload zone */}
      <div
        className="upload-zone"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleUpload(e.target.files)}
        />
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20,
          color: '#6B6359',
          marginBottom: 6,
        }}>
          {uploading ? 'Uploading…' : 'Drop photos here or click to upload'}
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: '#B0A89E',
        }}>
          JPG, PNG, HEIC · multiple files supported
        </div>
      </div>

      {error && (
        <div style={{
          background: '#FDF0ED',
          border: '1px solid #E8856A',
          borderRadius: 4,
          padding: '10px 16px',
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          color: '#C0532A',
          marginBottom: 24,
        }}>{error}</div>
      )}

      {/* Photo grid grouped by week */}
      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>
          Loading photos…
        </div>
      ) : grouped.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 0',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20,
          color: '#B0A89E',
        }}>
          No photos yet. Upload your first site photo above.
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.label}>
            <div className="week-label">{group.label}</div>
            <div className="photo-grid">
              {group.photos.map(photo => (
                <div
                  key={photo.id}
                  className="photo-thumb"
                  onClick={() => setLightbox(photo)}
                >
                  <img src={photo.image_url} alt={photo.caption || 'Site photo'} />
                  {photo.caption && (
                    <div className="caption-overlay">{photo.caption}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <button
            className="lightbox-delete"
            onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
          >
            Delete
          </button>
          <img
            className="lightbox-img"
            src={lightbox.image_url}
            alt={lightbox.caption || 'Site photo'}
            onClick={e => e.stopPropagation()}
          />
          {lightbox.caption && (
            <div className="lightbox-caption">{lightbox.caption}</div>
          )}
        </div>
      )}
    </div>
  )
}

