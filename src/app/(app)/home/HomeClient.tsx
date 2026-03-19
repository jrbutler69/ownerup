'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/actions/projects'

export default function HomeClient({ project, members, permissions, data, projectId, userRole }: {
  project: any
  members: any[]
  permissions: Record<string, string>
  projectId: string
  userRole: string
  data: {
    documents: any[]
    photos: any[]
    renderings: any[]
    notes: any[]
    timeline: any[]
  }
}) {
  const [view, setView] = useState<'overview' | 'timeline'>('overview')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const isOwner = userRole === 'admin'

  const allEmpty =
    data.documents.length === 0 &&
    data.photos.length === 0 &&
    data.renderings.length === 0 &&
    data.notes.length === 0

  async function handleDelete() {
    setDeleting(true)
    await deleteProject(projectId)
  }

  return (
    <div className="home">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: allEmpty ? '0' : '40px' }}>
        {!allEmpty && (
          <div className="view-toggle">
            <button className={`toggle-btn ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
            <button className={`toggle-btn ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>Timeline</button>
          </div>
        )}
        {isOwner && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B0A898', cursor: 'pointer', padding: '0', marginLeft: 'auto' }}
          >
            Delete project
          </button>
        )}
        {isOwner && confirming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', color: '#7A7468' }}>Delete this project and all its data?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C0392B', cursor: 'pointer', padding: '0' }}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B0A898', cursor: 'pointer', padding: '0' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {view === 'overview'
        ? <OverviewContent data={data} router={router} permissions={permissions} project={project} members={members} allEmpty={allEmpty} />
        : <TimelineContent items={data.timeline} permissions={permissions} />
      }

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=DM+Mono:wght@300;400&display=swap');
        .home { font-family: 'DM Mono', monospace; animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .view-toggle { display: flex; align-items: center; gap: 24px; }
        .toggle-btn {
          background: none; border: none; border-bottom: 1px solid transparent;
          font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em;
          text-transform: uppercase; color: #B0A898; cursor: pointer; padding: 0 0 4px; transition: all 0.15s;
        }
        .toggle-btn:hover:not(.active) { color: #7A7468; }
        .toggle-btn.active { color: #1A1814; border-bottom-color: #1A1814; }
      `}</style>
    </div>
  )
}

function OverviewContent({ data, router, permissions, project, members, allEmpty }: {
  data: any; router: any
  permissions: Record<string, string>
  project: any
  members: any[]
  allEmpty: boolean
}) {
  function formatDate(s: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function formatFullDate(s: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (allEmpty) {
    return (
      <div style={{ padding: '48px 0' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 300, fontStyle: 'italic', color: '#7A7468', margin: 0, lineHeight: 1.6 }}>
          Add documents, photos, renderings and notes or invite team members at left.
        </p>
      </div>
    )
  }

  type Tile = { id: string; el: React.ReactNode }
  const contentTiles: Tile[] = []

  if (permissions.documents !== 'none') {
    contentTiles.push({
      id: 'documents',
      el: (
        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A7468", fontWeight: 400 }}>Documents</span>
            <button style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "#B0A898", cursor: "pointer", padding: "0", flexShrink: 0, whiteSpace: "nowrap" as const }} onClick={() => router.push('/documents')}>View all →</button>
          </div>
          {data.documents.length === 0 ? <p className="empty-state">No documents yet</p>
            : data.documents.map((doc: any) => (
              <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EBE4", gap: "16px", textDecoration: "none", color: "inherit" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "17px", fontWeight: 400, color: "#1A1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", color: "#B0A898", whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(doc.upload_date)}</span>
              </a>
            ))}
        </div>
      )
    })
  }

  if (permissions.photos !== 'none') {
    contentTiles.push({
      id: 'photos',
      el: (
        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A7468", fontWeight: 400 }}>Recent Photos</span>
            <button style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "#B0A898", cursor: "pointer", padding: "0", flexShrink: 0, whiteSpace: "nowrap" as const }} onClick={() => router.push('/photos')}>View all →</button>
          </div>
          {data.photos.length === 0 ? <p className="empty-state">No photos yet</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', width: '100%' }}>
                {data.photos.map((photo: any) => (
                  <div key={photo.id} style={{ aspectRatio: '1', overflow: 'hidden', background: '#E8E3DC', cursor: 'pointer', minWidth: 0 }} onClick={() => router.push('/photos')}>
                    <img src={photo.image_url} alt={photo.caption || 'Site photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
        </div>
      )
    })
  }

  if (permissions.notes !== 'none') {
    contentTiles.push({
      id: 'notes',
      el: (
        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A7468", fontWeight: 400 }}>Notes</span>
            <button style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "#B0A898", cursor: "pointer", padding: "0", flexShrink: 0, whiteSpace: "nowrap" as const }} onClick={() => router.push('/notes')}>View all →</button>
          </div>
          {data.notes.length === 0 ? <p className="empty-state">No notes yet</p>
            : data.notes.map((note: any) => (
              <div key={note.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EBE4", gap: "16px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "17px", fontWeight: 400, color: "#1A1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{note.body}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", color: "#B0A898", whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(note.created_at)}</span>
              </div>
            ))}
        </div>
      )
    })
  }

  if (permissions.renderings !== 'none') {
    contentTiles.push({
      id: 'renderings',
      el: (
        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A7468", fontWeight: 400 }}>Recent Renderings</span>
            <button style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "#B0A898", cursor: "pointer", padding: "0", flexShrink: 0, whiteSpace: "nowrap" as const }} onClick={() => router.push('/renderings')}>View all →</button>
          </div>
          {data.renderings.length === 0 ? <p className="empty-state">No renderings yet</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', width: '100%' }}>
                {data.renderings.map((r: any) => (
                  <div key={r.id} style={{ aspectRatio: '1', overflow: 'hidden', background: '#E8E3DC', cursor: 'pointer', minWidth: 0 }} onClick={() => router.push('/renderings')}>
                    <img src={r.image_url} alt={r.caption || 'Rendering'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
        </div>
      )
    })
  }

  const fallbackTiles: Tile[] = [
    {
      id: 'project-info',
      el: (
        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A7468", fontWeight: 400 }}>Project</span>
          </div>
          {!project ? null : (
            <div>
              {[
                { label: 'Address', value: project.address || '—' },
                { label: 'Start date', value: formatFullDate(project.start_date) },
                { label: 'Target completion', value: formatFullDate(project.target_completion) },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid #F0EBE4' }}>
                  <span style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B0A898', marginBottom: '4px' }}>{label}</span>
                  <span style={{ display: 'block', fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontWeight: 400, color: '#1A1814' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'team',
      el: (
        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A7468", fontWeight: 400 }}>Team</span>
            <button style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "#B0A898", cursor: "pointer", padding: "0", flexShrink: 0, whiteSpace: "nowrap" as const }} onClick={() => router.push('/team')}>View all →</button>
          </div>
          {members.length === 0 ? <p className="empty-state">No team members yet</p>
            : members.slice(0, 4).map((m: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0EBE4', gap: '16px' }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontWeight: 400, color: '#1A1814', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.invited_email}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', color: '#B0A898', whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'capitalize' }}>{m.role}</span>
              </div>
            ))}
        </div>
      )
    }
  ]

  const allTiles = [...contentTiles]
  for (const fb of fallbackTiles) {
    if (allTiles.length >= 4) break
    allTiles.push(fb)
  }

  const [tl, tr, bl, br] = allTiles

  return (
    <div className="overview">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '32px 48px 32px 0', borderRight: '1px solid #E8E3DC', borderBottom: '1px solid #E8E3DC' }}>{tl?.el}</div>
        <div style={{ padding: '32px 0 32px 48px', borderBottom: '1px solid #E8E3DC' }}>{tr?.el}</div>
        <div style={{ padding: '32px 48px 32px 0', borderRight: '1px solid #E8E3DC' }}>{bl?.el}</div>
        <div style={{ padding: '32px 0 32px 48px' }}>{br?.el}</div>
      </div>

      <style jsx>{`
        .overview { animation: fadeUp 0.3s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .empty-state { font-family: 'Cormorant Garamond', serif; font-size: 15px; font-style: italic; font-weight: 300; color: #C0B8AE; margin: 0; }
        .row {
          display: flex; align-items: baseline; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #F0EBE4; gap: 16px;
          text-decoration: none; color: inherit;
        }
        .row:last-child { border-bottom: none; }
        .row-name { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 400; color: #1A1814; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        a.row:hover .row-name { color: #8B6F4E; }
        .row-meta { font-size: 9px; letter-spacing: 0.08em; color: #B0A898; white-space: nowrap; flex-shrink: 0; }
        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
        .photo-thumb { aspect-ratio: 1; overflow: hidden; background: #E8E3DC; cursor: pointer; min-width: 0; }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
        .photo-thumb:hover img { transform: scale(1.04); }
      `}</style>
    </div>
  )
}

function TimelineContent({ items, permissions }: { items: any[]; permissions: Record<string, string> }) {
  function formatDate(s: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    document:      { label: 'Document',  color: '#6B8C6B' },
    photo:         { label: 'Photo',     color: '#8B6F47' },
    rendering:     { label: 'Rendering', color: '#7A6B8C' },
    note:          { label: 'Note',      color: '#8C7A6B' },
    decision:      { label: 'Decision',  color: '#6B7A8C' },
    budget_update: { label: 'Budget',    color: '#8C6B6B' },
  }

  const allowedTypes = new Set<string>()
  if (permissions.documents !== 'none') allowedTypes.add('document')
  if (permissions.photos !== 'none') allowedTypes.add('photo')
  if (permissions.renderings !== 'none') allowedTypes.add('rendering')
  if (permissions.notes !== 'none') allowedTypes.add('note')
  if (permissions.documents === 'edit') { allowedTypes.add('decision'); allowedTypes.add('budget_update') }

  const filtered = Object.keys(permissions).length === 0
    ? items
    : items.filter(item => allowedTypes.has(item.event_type))

  return (
    <div className="timeline">
      {filtered.length === 0 ? (
        <p className="empty">No activity yet — start by uploading a document or photo.</p>
      ) : (
        <div className="feed">
          {filtered.map((item: any, i: number) => {
            const cfg = typeConfig[item.event_type] ?? { label: item.event_type, color: '#9a8e7e' }
            const title = item.title || (item.event_type === 'photo' ? 'Photo' : 'Untitled')
            return (
              <div key={item.source_id ?? i} className="feed-item">
                <div className="feed-line">
                  <div className="feed-dot" style={{ background: cfg.color }} />
                  {i < filtered.length - 1 && <div className="feed-connector" />}
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