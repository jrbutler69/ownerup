'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Decision {
  id: string
  project_id: string
  title: string
  date: string
  description: string | null
  cost_impact: number | null
}

export default function DecisionsPage() {
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [costImpact, setCostImpact] = useState('')

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

      const { data } = await supabase
        .from('decisions')
        .select('*')
        .eq('project_id', project.id)
        .order('date', { ascending: false })

      if (data) setDecisions(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleAdd() {
    if (!projectId || !title.trim()) return
    setError(null)

    const impact = costImpact ? parseFloat(costImpact) : null
    if (costImpact && isNaN(impact!)) { setError('Cost impact must be a number'); return }

    const { data, error: err } = await supabase
      .from('decisions')
      .insert({
        project_id: projectId,
        title: title.trim(),
        date,
        description: description.trim() || null,
        cost_impact: impact,
      })
      .select()
      .single()

    if (err) { setError(err.message); return }

    setDecisions(prev => [data, ...prev])
    setTitle('')
    setDescription('')
    setCostImpact('')
    setDate(new Date().toISOString().slice(0, 10))
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this decision?')) return
    await supabase.from('decisions').delete().eq('id', id)
    setDecisions(prev => prev.filter(d => d.id !== id))
    if (expanded === id) setExpanded(null)
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(n))
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const totalImpact = decisions.reduce((sum, d) => sum + (d.cost_impact ?? 0), 0)

  return (
    <div style={{ padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        .decision-row {
          background: #fff;
          border: 1px solid #E8E0D5;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .decision-row:hover { border-color: #C9B99A; }
        .decision-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          cursor: pointer;
          gap: 16px;
        }
        .decision-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 400;
          color: #1C1A17;
          flex: 1;
        }
        .decision-date {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #9A8F82;
          white-space: nowrap;
        }
        .cost-pill {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 2px;
          white-space: nowrap;
        }
        .cost-positive { background: #FDF0ED; color: #C0532A; }
        .cost-negative { background: #EDF5F0; color: #2A7A4A; }
        .cost-neutral { background: #F5F2EE; color: #6B6359; }
        .decision-body {
          padding: 0 24px 20px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #6B6359;
          line-height: 1.7;
          border-top: 1px solid #F0EBE3;
        }
        .btn-ghost {
          background: none;
          border: 1px solid #E8E0D5;
          color: #6B6359;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 8px 14px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
        }
        .btn-ghost:hover { border-color: #C9B99A; color: #1C1A17; }
        .btn-primary {
          background: #1C1A17;
          border: none;
          color: #F5F2EE;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 9px 18px;
          cursor: pointer;
          border-radius: 2px;
        }
        .btn-primary:hover { background: #2E2B26; }
        .btn-danger {
          background: none;
          border: none;
          color: #C0532A;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          cursor: pointer;
          padding: 4px 0;
          letter-spacing: 0.05em;
        }
        input, textarea {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          border: 1px solid #DDD5C8;
          border-radius: 3px;
          padding: 8px 12px;
          color: #1C1A17;
          background: #FAF8F5;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        input:focus, textarea:focus { border-color: #C9B99A; }
        textarea { resize: vertical; min-height: 80px; }
        .form-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9A8F82;
          display: block;
          margin-bottom: 6px;
        }
        .form-row { margin-bottom: 16px; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px',
          }}>Decisions</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0 }}>
            {decisions.length} decision{decisions.length !== 1 ? 's' : ''}
            {totalImpact !== 0 && (
              <span style={{ marginLeft: 12, color: totalImpact > 0 ? '#C0532A' : '#2A7A4A' }}>
                · {totalImpact > 0 ? '+' : '-'}{formatCurrency(totalImpact)} total impact
              </span>
            )}
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setShowForm(v => !v)}>
          + Log Decision
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #E8E0D5', borderRadius: 6,
          padding: '24px 28px', marginBottom: 24,
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            New Decision
          </div>

          <div className="form-row">
            <label className="form-label">Title *</label>
            <input
              type="text"
              placeholder="e.g. Switched to white oak flooring"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="form-label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Cost Impact ($)</label>
              <input
                type="number"
                placeholder="e.g. 4500 or -1200"
                value={costImpact}
                onChange={e => setCostImpact(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea
              placeholder="Context, reasoning, or details about this decision…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ color: '#C0532A', fontFamily: "'DM Mono', monospace", fontSize: 11, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={handleAdd}>Save Decision</button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setError(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Decision list */}
      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading…</div>
      ) : decisions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>
          No decisions logged yet. Use the button above to record your first.
        </div>
      ) : (
        decisions.map(decision => {
          const isOpen = expanded === decision.id
          const impact = decision.cost_impact

          return (
            <div key={decision.id} className="decision-row">
              <div className="decision-header" onClick={() => setExpanded(isOpen ? null : decision.id)}>
                <div className="decision-title">{decision.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {impact !== null && (
                    <span className={`cost-pill ${impact > 0 ? 'cost-positive' : impact < 0 ? 'cost-negative' : 'cost-neutral'}`}>
                      {impact > 0 ? '+' : impact < 0 ? '-' : ''}{formatCurrency(impact)}
                    </span>
                  )}
                  <span className="decision-date">{formatDate(decision.date)}</span>
                  <span style={{ color: '#C9B99A', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="decision-body">
                  <div style={{ paddingTop: 16 }}>
                    {decision.description ? (
                      <p style={{ margin: '0 0 16px' }}>{decision.description}</p>
                    ) : (
                      <p style={{ margin: '0 0 16px', color: '#B0A89E', fontStyle: 'italic' }}>No notes added.</p>
                    )}
                    <button className="btn-danger" onClick={() => handleDelete(decision.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
