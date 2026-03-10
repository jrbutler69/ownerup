'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function HomePage() {
  const [view, setView] = useState<'overview' | 'timeline'>('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    documents: any[]
    photos: any[]
    renderings: any[]
    notes: any[]
    timeline: any[]
  }>({ documents: [], photos: [], renderings: [], notes: [], timeline: [] })

  const supabase = createClient()
  const router = useRouter()

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

if (!memberRows?.length) {
  router.push('/onboarding')
  return
}
const pid = memberRows[0].project_id

      const [docsRes, photosRes, renderingsRes, notesRes, timelineRes] = await Promise.all([
        supabase.from('documents').select('*').eq('project_id', pid).eq('is_current', true).order('upload_date', { ascending: false }).limit(4),
        supabase.from('photos').select('*').eq('project_id', pid).order('taken_at', { ascending: false }).limit(6),
        supabase.from('renderings').select('*').eq('project_id', pid).order('uploaded_at', { ascending: false }).limit(6),
        supabase.from('notes').select('*').eq('project_id', pid).order('created_at', { ascending: false }).limit(4),
        supabase.from('timeline_feed').select('*').eq('project_id', pid).order('event_timestamp', { ascending: false }).limit(20),
      ])

      setData({
        documents: docsRes.data ?? [],
        photos: photosRes.data ?? [],
        renderings: renderingsRes.data ?? [],
        notes: notesRes.data ?? [],
        timeline: timelineRes.data ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="home">
      <div className="view-toggle">
        <button className={`toggle-btn ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        <button className={`toggle-btn ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>Timeline</button>
      </div>

      {view === 'overview'
        ? <OverviewContent data={data} loading={loading} router={router} />
        : <TimelineContent items={data.timeline} loading={loading} />
      }

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=DM+Mono:wght@300;400&display=swap');

        .home { font-family: 'DM Mono', monospace; animation: fadeIn 0.35s ease; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .view-toggle { display: flex; align-items: center; gap: 24px; margin-bottom: 40px; }

        .toggle-btn {
          background: none; border: none; border-bottom: 1px solid transparent;
          font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em;
          text-transform: uppercase; color: #B0A898; cursor: pointer; padding: 0 0 4px;
          transition: all 0.15s;
        }
        .toggle-btn:hover:not(.active) { color: #7A7468; }
        .toggle-btn.active { color: #1A1814; border-bottom-color: #1A1814; }
      `}</style>
    </div>
  )
}

function OverviewContent({ data, loading, router }: { data: any; loading: boolean; router: any }) {
  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="overview">
      <div className="sections">

        {/* DOCUMENTS */}
        <div className="section section-left">
          <div className="section-header">
            <span className="section-title">Documents</span>
            <button className="view-all" onClick={() => router.push('/documents')}>View all →</button>
          </div>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : data.documents.length === 0 ? (
            <p className="empty-state">No documents yet</p>
          ) : data.documents.map((doc: any) => (
            <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="row">
              <span className="row-name">{doc.title}</span>
              <span className="row-meta">{formatDate(doc.upload_date)}</span>
            </a>
          ))}
        </div>

        {/* RECENT PHOTOS */}
        <div className="section section-right">
          <div className="section-header">
            <span className="section-title">Recent Photos</span>
            <button className="view-all" onClick={() => router.push('/photos')}>View all →</button>
          </div>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : data.photos.length === 0 ? (
            <p className="empty-state">No photos yet</p>
          ) : (
            <div className="photo-grid">
              {data.photos.map((photo: any) => (
                <div key={photo.id} className="photo-thumb" onClick={() => router.push('/photos')}>
                  <img src={photo.image_url} alt={photo.caption || 'Site photo'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NOTES */}
        <div className="section section-left">
          <div className="section-header">
            <span className="section-title">Notes</span>
            <button className="view-all" onClick={() => router.push('/notes')}>View all →</button>
          </div>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : data.notes.length === 0 ? (
            <p className="empty-state">No notes yet</p>
          ) : data.notes.map((note: any) => (
            <div key={note.id} className="row">
              <span className="row-name note-body">{note.body}</span>
              <span className="row-meta">{formatDate(note.created_at)}</span>
            </div>
          ))}
        </div>

        {/* RECENT RENDERINGS */}
        <div className="section section-right">
          <div className="section-header">
            <span className="section-title">Recent Renderings</span>
            <button className="view-all" onClick={() => router.push('/renderings')}>View all →</button>
          </div>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : data.renderings.length === 0 ? (
            <p className="empty-state">No renderings yet</p>
          ) : (
            <div className="photo-grid">
              {data.renderings.map((r: any) => (
                <div key={r.id} className="photo-thumb" onClick={() => router.push('/renderings')}>
                  <img src={r.image_url} alt={r.caption || 'Rendering'} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .overview { animation: fadeUp 0.3s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .sections { display: grid; grid-template-columns: 1fr 1fr; }
        .section { padding: 32px 0; border-bottom: 1px solid #E8E3DC; }
        .section-left { padding-right: 48px; border-right: 1px solid #E8E3DC; }
        .section-right { padding-left: 48px; }
        .section:nth-last-child(-n+2) { border-bottom: none; }

        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7A7468; }

        .view-all {
          background: none; border: none; font-family: 'DM Mono', monospace;
          font-size: 9px; letter-spacing: 0.1em; color: #B0A898; cursor: pointer;
          padding: 0; transition: color 0.15s;
        }
        .view-all:hover { color: #1A1814; }

        .empty-state {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px; font-style: italic; font-weight: 300; color: #C0B8AE; margin: 0;
        }

        .row {
          display: flex; align-items: baseline; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #F0EBE4; gap: 16px;
          text-decoration: none; color: inherit;
        }
        .row:last-child { border-bottom: none; }

        .row-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px; font-weight: 400; color: #1A1814;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        a.row:hover .row-name { color: #8B6F4E; }

        .note-body {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .row-meta { font-size: 9px; letter-spacing: 0.08em; color: #B0A898; white-space: nowrap; flex-shrink: 0; }

        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .photo-thumb { aspect-ratio: 1; overflow: hidden; background: #E8E3DC; cursor: pointer; }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
        .photo-thumb:hover img { transform: scale(1.04); }
      `}</style>
    </div>
  )
}

function TimelineContent({ items, loading }: { items: any[]; loading: boolean }) {
  function formatDate(s: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    document:      { label: 'Document',  color: '#6B8C6B' },
    photo:         { label: 'Photo',     color: '#8B6F47' },
    decision:      { label: 'Decision',  color: '#6B7A8C' },
    budget_update: { label: 'Budget',    color: '#8C6B6B' },
  }

  return (
    <div className="timeline">
      {loading ? (
        <p className="empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="empty">No activity yet — start by uploading a document or photo.</p>
      ) : (
        <div className="feed">
          {items.map((item: any, i: number) => {
            const cfg = typeConfig[item.event_type] ?? { label: item.event_type, color: '#9a8e7e' }
            const title = item.title || (item.event_type === 'photo' ? 'Photo' : 'Untitled')
            return (
              <div key={item.source_id ?? i} className="feed-item">
                <div className="feed-line">
                  <div className="feed-dot" style={{ background: cfg.color }} />
                  {i < items.length - 1 && <div className="feed-connector" />}
                </div>
                <div className="feed-content">
                  <div className="feed-meta">
                    <span className="feed-type" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="feed-date">{formatDate(item.event_date)}</span>
                  </div>
                  <div className="feed-title">{title}</div>
                  {item.subtitle && <div className="feed-desc">{item.subtitle}</div>}
                  {item.media_url && item.event_type === 'photo' && (
                    <img src={item.media_url} alt={title} className="feed-photo" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .timeline { animation: fadeUp 0.3s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .empty { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-style: italic; font-weight: 300; color: #C0B8AE; }
        .feed { display: flex; flex-direction: column; max-width: 640px; }
        .feed-item { display: flex; gap: 20px; }
        .feed-line { display: flex; flex-direction: column; align-items: center; width: 14px; flex-shrink: 0; padding-top: 5px; }
        .feed-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .feed-connector { width: 1px; flex: 1; background: #E8E3DC; margin: 5px 0; min-height: 20px; }
        .feed-content { padding-bottom: 28px; flex: 1; }
        .feed-meta { display: flex; align-items: center; gap: 14px; margin-bottom: 5px; }
        .feed-type { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; }
        .feed-date { font-size: 9px; color: #B0A898; letter-spacing: 0.08em; }
        .feed-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: #1A1814; line-height: 1.2; }
        .feed-desc { font-size: 10px; color: #7A7468; margin-top: 4px; line-height: 1.7; letter-spacing: 0.04em; }
        .feed-photo { margin-top: 10px; width: 120px; height: 80px; object-fit: cover; }
      `}</style>
    </div>
  )
}
