'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function HomePage() {
  const [view, setView] = useState<'overview' | 'timeline'>('overview')
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    documents: any[]
    photos: any[]
    budget: any[]
    decisions: any[]
    timeline: any[]
  }>({ documents: [], photos: [], budget: [], decisions: [], timeline: [] })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (!projects?.length) { setLoading(false); return }
      const proj = projects[0]
      setProject(proj)
      const pid = proj.id

      const [docsRes, photosRes, budgetRes, decisionsRes, timelineRes] = await Promise.all([
        supabase.from('documents').select('*').eq('project_id', pid).eq('is_current', true).order('upload_date', { ascending: false }).limit(4),
        supabase.from('photos').select('*').eq('project_id', pid).order('taken_at', { ascending: false }).limit(4),
        supabase.from('current_budget').select('*').eq('project_id', pid),
        supabase.from('decisions').select('*').eq('project_id', pid).order('date', { ascending: false }).limit(4),
        supabase.from('timeline_feed').select('*').eq('project_id', pid).order('event_timestamp', { ascending: false }).limit(20),
      ])

      setData({
        documents: docsRes.data ?? [],
        photos: photosRes.data ?? [],
        budget: budgetRes.data ?? [],
        decisions: decisionsRes.data ?? [],
        timeline: timelineRes.data ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="home">
      <header className="page-header">
        <div className="header-left">
          <p className="project-label">Current project</p>
          <h1 className="project-name">
            {loading ? '...' : project?.name ?? 'My Project'}
          </h1>
          {project?.address && <p className="project-address">{project.address}</p>}
        </div>
        <div className="view-toggle">
          <button className={`toggle-btn ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
          <button className={`toggle-btn ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>Timeline</button>
        </div>
      </header>

      <div className="divider" />

      {view === 'overview'
        ? <OverviewContent data={data} loading={loading} router={router} />
        : <TimelineContent items={data.timeline} loading={loading} />
      }

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');
        .home { font-family: 'DM Mono', monospace; }
        .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
        .project-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #9a8e7e; margin: 0 0 6px; }
        .project-name { font-family: 'Cormorant Garamond', serif; font-size: 40px; font-weight: 300; color: #1c1a17; margin: 0; letter-spacing: -0.02em; line-height: 1; }
        .project-address { font-size: 11px; color: #9a8e7e; margin: 6px 0 0; }
        .view-toggle { display: flex; border: 1px solid #ddd5c8; border-radius: 2px; overflow: hidden; }
        .toggle-btn { padding: 8px 20px; background: none; border: none; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #9a8e7e; cursor: pointer; transition: all 0.15s; }
        .toggle-btn.active { background: #1c1a17; color: #f0e8d8; }
        .divider { height: 1px; background: #ddd5c8; margin-bottom: 40px; }
      `}</style>
    </div>
  )
}

function OverviewContent({ data, loading, router }: { data: any; loading: boolean; router: any }) {
  const totalBudget = data.budget.reduce((sum: number, row: any) => sum + (row.amount ?? 0), 0)

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="overview">
      <div className="cards-grid">

        <div className="card">
          <div className="card-header">
            <span className="card-icon">◻</span>
            <h2 className="card-title">Documents</h2>
            <button className="card-action" onClick={() => router.push('/documents')}>View all →</button>
          </div>
          <div className="card-body">
            {loading ? <p className="empty-state">Loading…</p>
              : data.documents.length === 0 ? <p className="empty-state">No documents yet</p>
              : data.documents.map((doc: any) => (
                <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="item-row">
                  <span className="item-label">{doc.title}</span>
                  <span className="item-meta">{doc.version_label} · {doc.category}</span>
                </a>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">◈</span>
            <h2 className="card-title">Recent Photos</h2>
            <button className="card-action" onClick={() => router.push('/photos')}>View all →</button>
          </div>
          <div className="card-body photo-grid-body">
            {loading ? <p className="empty-state">Loading…</p>
              : data.photos.length === 0 ? <p className="empty-state">No photos yet</p>
              : (
                <div className="photo-grid">
                  {data.photos.map((photo: any) => (
                    <div key={photo.id} className="photo-thumb" onClick={() => router.push('/photos')}>
                      <img src={photo.image_url} alt={photo.caption || 'Site photo'} />
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">◇</span>
            <h2 className="card-title">Budget</h2>
            <button className="card-action" onClick={() => router.push('/budget')}>View all →</button>
          </div>
          <div className="card-body">
            {loading ? <p className="empty-state">Loading…</p>
              : data.budget.length === 0 ? <p className="empty-state">No budget entries yet</p>
              : (
                <>
                  <div className="budget-total">{formatCurrency(totalBudget)}</div>
                  <div className="budget-lines">
                    {data.budget.slice(0, 4).map((row: any) => (
                      <div key={row.id} className="item-row">
                        <span className="item-label">{row.name}</span>
                        <span className="item-meta">{formatCurrency(row.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">◎</span>
            <h2 className="card-title">Recent Decisions</h2>
            <button className="card-action" onClick={() => router.push('/decisions')}>View all →</button>
          </div>
          <div className="card-body">
            {loading ? <p className="empty-state">Loading…</p>
              : data.decisions.length === 0 ? <p className="empty-state">No decisions logged yet</p>
              : data.decisions.map((d: any) => (
                <div key={d.id} className="item-row">
                  <span className="item-label">{d.title}</span>
                  <span className="item-meta">
                    {formatDate(d.date)}
                    {d.cost_impact ? ` · ${d.cost_impact > 0 ? '+' : ''}${formatCurrency(d.cost_impact)}` : ''}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

      </div>

      <style jsx>{`
        .overview { animation: fadeUp 0.3s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .card { background: #fff; border: 1px solid #e8e0d5; border-radius: 3px; }
        .card-header { display: flex; align-items: center; gap: 10px; padding: 18px 24px; border-bottom: 1px solid #e8e0d5; }
        .card-icon { font-size: 14px; color: #9a8e7e; }
        .card-title { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 400; letter-spacing: 0.12em; text-transform: uppercase; color: #1c1a17; margin: 0; flex: 1; }
        .card-action { background: none; border: none; font-family: 'DM Mono', monospace; font-size: 10px; color: #9a8e7e; cursor: pointer; padding: 0; transition: color 0.15s; }
        .card-action:hover { color: #1c1a17; }
        .card-body { padding: 16px 24px; min-height: 120px; }
        .empty-state { font-size: 12px; color: #bbb0a0; margin: 0; font-style: italic; }
        .item-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid #f0ebe4; gap: 12px; text-decoration: none; color: inherit; }
        .item-row:last-child { border-bottom: none; }
        a.item-row:hover .item-label { color: #8b6f47; }
        .item-label { font-size: 12px; color: #1c1a17; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%; }
        .item-meta { font-size: 10px; color: #9a8e7e; white-space: nowrap; }
        .budget-total { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: #1c1a17; margin-bottom: 12px; }
        .budget-lines { display: flex; flex-direction: column; }
        .photo-grid-body { padding: 16px 24px; }
        .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .photo-thumb { aspect-ratio: 1; overflow: hidden; border-radius: 2px; cursor: pointer; background: #ede9e3; }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
        .photo-thumb:hover img { transform: scale(1.05); }
      `}</style>
    </div>
  )
}

function TimelineContent({ items, loading }: { items: any[]; loading: boolean }) {
  function formatDate(s: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
    document:      { icon: '◻', color: '#6B8C6B', label: 'Document' },
    photo:         { icon: '◈', color: '#8B6F47', label: 'Photo' },
    decision:      { icon: '◎', color: '#6B7A8C', label: 'Decision' },
    budget_update: { icon: '◇', color: '#8C6B6B', label: 'Budget' },
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
            const cfg = typeConfig[item.event_type] ?? { icon: '·', color: '#9a8e7e', label: item.event_type }
            const title = item.title || (item.event_type === 'photo' ? 'Photo' : 'Untitled')
            return (
              <div key={item.source_id ?? i} className="feed-item">
                <div className="feed-line">
                  <div className="feed-dot" style={{ background: cfg.color }} />
                  {i < items.length - 1 && <div className="feed-connector" />}
                </div>
                <div className="feed-content">
                  <div className="feed-meta">
                    <span className="feed-type" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                    <span className="feed-date">{formatDate(item.event_date)}</span>
                  </div>
                  <div className="feed-title">{title}</div>
                  {item.subtitle && <div className="feed-desc">{item.subtitle}</div>}
                  {item.media_url && item.event_type === 'photo' && (
                    <img src={item.media_url} alt={title} style={{ marginTop: 10, width: 120, height: 80, objectFit: 'cover', borderRadius: 3 }} />
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
        .empty { font-size: 13px; color: #bbb0a0; font-style: italic; }
        .feed { display: flex; flex-direction: column; max-width: 680px; }
        .feed-item { display: flex; gap: 20px; }
        .feed-line { display: flex; flex-direction: column; align-items: center; width: 16px; flex-shrink: 0; padding-top: 4px; }
        .feed-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .feed-connector { width: 1px; flex: 1; background: #e8e0d5; margin: 4px 0; min-height: 24px; }
        .feed-content { padding-bottom: 28px; flex: 1; }
        .feed-meta { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
        .feed-type { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'DM Mono', monospace; }
        .feed-date { font-size: 10px; color: #9a8e7e; font-family: 'DM Mono', monospace; }
        .feed-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: #1c1a17; line-height: 1.2; }
        .feed-desc { font-size: 11px; color: #6b6359; margin-top: 4px; line-height: 1.6; font-family: 'DM Mono', monospace; }
      `}</style>
    </div>
  )
}