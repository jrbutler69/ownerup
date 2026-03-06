'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface BudgetCategory {
  id: string
  project_id: string
  name: string
}

interface BudgetUpdate {
  id: string
  project_id: string
  budget_category_id: string
  amount: number
  date: string
}

interface CategoryWithHistory {
  category: BudgetCategory
  updates: BudgetUpdate[]
  current: number | null
  previous: number | null
}

export default function BudgetPage() {
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryWithHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add category form
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  // Add update form
  const [updateTarget, setUpdateTarget] = useState<string | null>(null) // category id
  const [updateAmount, setUpdateAmount] = useState('')
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().slice(0, 10))

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

      const { data: cats } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('project_id', project.id)
        .order('name')

      const { data: updates } = await supabase
        .from('budget_updates')
        .select('*')
        .eq('project_id', project.id)
        .order('date', { ascending: false })

      if (cats && updates) {
        const enriched: CategoryWithHistory[] = cats.map(cat => {
          const catUpdates = updates.filter(u => u.budget_category_id === cat.id)
          const current = catUpdates[0]?.amount ?? null
          const previous = catUpdates[1]?.amount ?? null
          return { category: cat, updates: catUpdates, current, previous }
        })
        setCategories(enriched)
      }

      setLoading(false)
    }
    load()
  }, [])

  const totalBudget = categories.reduce((sum, c) => sum + (c.current ?? 0), 0)
  const totalPrevious = categories.reduce((sum, c) => sum + (c.previous ?? c.current ?? 0), 0)
  const totalDrift = totalBudget - totalPrevious

  async function handleAddCategory() {
    if (!projectId || !newCategoryName.trim()) return
    setError(null)

    const { data, error: err } = await supabase
      .from('budget_categories')
      .insert({ project_id: projectId, name: newCategoryName.trim() })
      .select()
      .single()

    if (err) { setError(err.message); return }

    setCategories(prev => [...prev, { category: data, updates: [], current: null, previous: null }])
    setNewCategoryName('')
    setShowAddCategory(false)
  }

  async function handleAddUpdate(categoryId: string) {
    if (!projectId || !updateAmount) return
    setError(null)

    const amount = parseFloat(updateAmount)
    if (isNaN(amount)) { setError('Please enter a valid number'); return }

    const { data, error: err } = await supabase
      .from('budget_updates')
      .insert({
        project_id: projectId,
        budget_category_id: categoryId,
        amount,
        date: updateDate,
      })
      .select()
      .single()

    if (err) { setError(err.message); return }

    setCategories(prev => prev.map(c => {
      if (c.category.id !== categoryId) return c
      const newUpdates = [data, ...c.updates]
      return {
        ...c,
        updates: newUpdates,
        current: newUpdates[0]?.amount ?? null,
        previous: newUpdates[1]?.amount ?? null,
      }
    }))

    setUpdateAmount('')
    setUpdateTarget(null)
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  }

  function drift(current: number | null, previous: number | null) {
    if (current === null || previous === null) return null
    return current - previous
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .budget-card {
          background: #fff;
          border: 1px solid #E8E0D5;
          border-radius: 6px;
          padding: 24px 28px;
          margin-bottom: 12px;
        }
        .budget-card:hover { border-color: #C9B99A; }
        .category-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 400;
          color: #1C1A17;
          margin: 0 0 4px;
        }
        .amount {
          font-family: 'DM Mono', monospace;
          font-size: 22px;
          color: #1C1A17;
        }
        .drift-pill {
          display: inline-block;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 2px;
          margin-left: 10px;
          vertical-align: middle;
        }
        .drift-up { background: #FDF0ED; color: #C0532A; }
        .drift-down { background: #EDF5F0; color: #2A7A4A; }
        .history-row {
          display: flex;
          justify-content: space-between;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #9A8F82;
          padding: 4px 0;
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
          transition: background 0.15s;
        }
        .btn-primary:hover { background: #2E2B26; }
        input[type="text"], input[type="number"], input[type="date"] {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          border: 1px solid #DDD5C8;
          border-radius: 3px;
          padding: 8px 12px;
          color: #1C1A17;
          background: #FAF8F5;
          outline: none;
        }
        input:focus { border-color: #C9B99A; }
        .summary-card {
          background: #1C1A17;
          border-radius: 6px;
          padding: 28px 32px;
          margin-bottom: 32px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px',
          }}>Budget</h1>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0,
          }}>
            {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setShowAddCategory(v => !v)}>
          + Add Category
        </button>
      </div>

      {/* Add category form */}
      {showAddCategory && (
        <div className="budget-card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            New Category
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="e.g. Framing, Plumbing, Finishes"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleAddCategory}>Add</button>
            <button className="btn-ghost" onClick={() => setShowAddCategory(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: '#FDF0ED', border: '1px solid #E8856A', borderRadius: 4,
          padding: '10px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12,
          color: '#C0532A', marginBottom: 24,
        }}>{error}</div>
      )}

      {/* Total summary */}
      {categories.length > 0 && (
        <div className="summary-card">
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#9A8F82', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Total Budget
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: '#F5F2EE', lineHeight: 1 }}>
              {formatCurrency(totalBudget)}
            </div>
          </div>
          {totalDrift !== 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#9A8F82', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                vs. previous
              </div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 16,
                color: totalDrift > 0 ? '#E8856A' : '#6ABF8A',
              }}>
                {totalDrift > 0 ? '+' : ''}{formatCurrency(totalDrift)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category list */}
      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading…</div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>
          No budget categories yet. Add one above.
        </div>
      ) : (
        categories.map(({ category, updates, current, previous }) => {
          const d = drift(current, previous)
          const isUpdating = updateTarget === category.id

          return (
            <div key={category.id} className="budget-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="category-name">{category.name}</div>
                  <div style={{ marginTop: 6 }}>
                    <span className="amount">
                      {current !== null ? formatCurrency(current) : '—'}
                    </span>
                    {d !== null && d !== 0 && (
                      <span className={`drift-pill ${d > 0 ? 'drift-up' : 'drift-down'}`}>
                        {d > 0 ? '+' : ''}{formatCurrency(d)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => setUpdateTarget(isUpdating ? null : category.id)}
                >
                  {isUpdating ? 'Cancel' : 'Update'}
                </button>
              </div>

              {/* Update form */}
              {isUpdating && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0EBE3', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="New amount"
                    value={updateAmount}
                    onChange={e => setUpdateAmount(e.target.value)}
                    style={{ width: 160 }}
                  />
                  <input
                    type="date"
                    value={updateDate}
                    onChange={e => setUpdateDate(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => handleAddUpdate(category.id)}>
                    Save
                  </button>
                </div>
              )}

              {/* History */}
              {updates.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {updates.slice(0, 4).map((u, i) => (
                    <div key={u.id} className="history-row">
                      <span>{new Date(u.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span style={{ color: i === 0 ? '#1C1A17' : '#9A8F82' }}>{formatCurrency(u.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
