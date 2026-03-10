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

interface GroupedRenderings {
  label: string
  renderings: Rendering[]
}

function groupByWeek(renderings: Rendering[]): GroupedRenderings[] {
  const groups: Record<string, Rendering[]> = {}

  for (const rendering of renderings) {
    const date = new Date(rendering.taken_at || rendering.uploaded_at)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const key = monday.toISOString()
    if (!groups[key]) groups[key] = []
    groups[key].push(rendering)
  }

  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, renderings]) => ({
      label: formatWeekLabel(new Date(key)),
      renderings,
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

export default function RenderingsPage() {
  const supabase = createClient()
  const [renderings, setRenderings] = useState<Rendering[]>([])
  const [grouped, setGrouped] = useState<GroupedRenderings[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Rendering | null>(null)
  const [caption, setCaption] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)

      if (!memberRows?.length) return
      const pid = memberRows[0].project_id
      setProjectId(pid)

      const { data } = await supabase
        .from('renderings')
        .select('*')
        .eq('project_id', pid)
        .order('taken_at', { ascending: false })

      if (data) {
        setRenderings(data)
        setGrouped(groupByWeek(data))
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
        .from('renderings')
        .upload(filename, file)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('renderings')
        .getPublicUrl(filename)

      const { data: newRendering, error: dbError } = await supabase
        .from('renderings')
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
      } else if (newRendering) {
        setRenderings(prev => {
          const updated = [newRendering, ...prev]
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

  async function handleDelete(rendering: Rendering) {
    if (!confirm('Delete this rendering?')) return

    const urlParts = rendering.image_url.split('/renderings/')
    if (urlParts.length > 1) {
      await supabase.storage.from('renderings').remove([urlParts[1]])
    }

    await supabase.from('renderings').delete().eq('id', rendering.id)

    setRenderings(prev => {
      const updated = prev.filter(r => r.id !== rendering.id)
      setGrouped(groupByWeek(updated))
      return updated
    })
    setLightbox(null)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .rendering-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .rendering-thumb {
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          background: #EDE9E3;
        }
        .rendering-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }
        .rendering-thumb:hover img { transform: scale(1.04); }
        .rendering-thumb .caption-overlay {
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
        .rendering-thumb:hover .caption-overlay { opacity: 1; }
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

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px' }}>Renderings</h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0 }}>
          {renderings.length} rendering{renderings.length !== 1 ? 's' : ''} · grouped by week
        </p>
      </div>

      <div className="upload-zone" onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
          onChange={e => e.target.files && handleUpload(e.target.files)} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#6B6359', marginBottom: 6 }}>
          {uploading ? 'Uploading…' : 'Drop renderings here or click to upload'}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#B0A89E' }}>
          JPG, PNG, PDF · multiple files supported
        </div>
      </div>

      {error && (
        <div style={{ background: '#FDF0ED', border: '1px solid #E8856A', borderRadius: 4, padding: '10px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#C0532A', marginBottom: 24 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading renderings…</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>
          No renderings yet. Upload your first rendering above.
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.label}>
            <div className="week-label">{group.label}</div>
            <div className="rendering-grid">
              {group.renderings.map(rendering => (
                <div key={rendering.id} className="rendering-thumb" onClick={() => setLightbox(rendering)}>
                  <img src={rendering.image_url} alt={rendering.caption || 'Rendering'} />
                  {rendering.caption && <div className="caption-overlay">{rendering.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <button className="lightbox-delete" onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}>Delete</button>
          <img className="lightbox-img" src={lightbox.image_url} alt={lightbox.caption || 'Rendering'} onClick={e => e.stopPropagation()} />
          {lightbox.caption && <div className="lightbox-caption">{lightbox.caption}</div>}
        </div>
      )}
    </div>
  )
}
