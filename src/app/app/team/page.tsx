'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Person {
  id: string
  project_id: string
  name: string
  role: string
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

const ROLES = ['Architect', 'Contractor', 'Engineer', 'Designer', 'Vendor', 'Other']

export default function TeamPage() {
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('Contractor')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

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
        .from('people')
        .select('*')
        .eq('project_id', project.id)
        .order('name')

      if (data) setPeople(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleAdd() {
    if (!projectId || !name.trim()) return
    setError(null)

    const { data, error: err } = await supabase
      .from('people')
      .insert({
        project_id: projectId,
        name: name.trim(),
        role,
        company: company.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (err) { setError(err.message); return }

    setPeople(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    resetForm()
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this person?')) return
    await supabase.from('people').delete().eq('id', id)
    setPeople(prev => prev.filter(p => p.id !== id))
    if (expanded === id) setExpanded(null)
  }

  function resetForm() {
    setName(''); setRole('Contractor'); setCompany('')
    setEmail(''); setPhone(''); setNotes('')
  }

  const rolesPresent = [...new Set(people.map(p => p.role))].sort()
  const filtered = filterRole ? people.filter(p => p.role === filterRole) : people

  // Group by role
  const grouped = ROLES.reduce<Record<string, Person[]>>((acc, r) => {
    const group = filtered.filter(p => p.role === r)
    if (group.length > 0) acc[r] = group
    return acc
  }, {})
  // Add any roles not in the predefined list
  filtered.forEach(p => {
    if (!ROLES.includes(p.role) && !grouped[p.role]) {
      grouped[p.role] = filtered.filter(pp => pp.role === p.role)
    }
  })

  return (
    <div style={{ padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        .person-card {
          background: #fff;
          border: 1px solid #E8E0D5;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .person-card:hover { border-color: #C9B99A; }
        .person-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          cursor: pointer;
          gap: 16px;
        }
        .person-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 400;
          color: #1C1A17;
        }
        .person-company {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #9A8F82;
          margin-top: 2px;
        }
        .person-body {
          padding: 16px 24px 20px;
          border-top: 1px solid #F0EBE3;
        }
        .contact-link {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #6B6359;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-right: 20px;
          margin-bottom: 8px;
        }
        .contact-link:hover { color: #1C1A17; }
        .role-group-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #9A8F82;
          margin: 28px 0 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E8E0D5;
        }
        .role-group-label:first-child { margin-top: 0; }
        .role-filter {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .filter-btn {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 2px;
          border: 1px solid #E8E0D5;
          background: none;
          color: #6B6359;
          cursor: pointer;
          transition: all 0.15s;
        }
        .filter-btn:hover { border-color: #C9B99A; color: #1C1A17; }
        .filter-btn.active { background: #1C1A17; color: #F5F2EE; border-color: #1C1A17; }
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
        input, textarea, select {
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
        input:focus, textarea:focus, select:focus { border-color: #C9B99A; }
        textarea { resize: vertical; min-height: 72px; }
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
        .avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: #EDE9E3;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: #6B6359;
          flex-shrink: 0;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px',
          }}>Team</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82', margin: 0 }}>
            {people.length} contact{people.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setShowForm(v => !v)}>
          + Add Person
        </button>
      </div>

      {/* Role filters */}
      {rolesPresent.length > 1 && (
        <div className="role-filter">
          <button
            className={`filter-btn ${filterRole === null ? 'active' : ''}`}
            onClick={() => setFilterRole(null)}
          >All</button>
          {rolesPresent.map(r => (
            <button
              key={r}
              className={`filter-btn ${filterRole === r ? 'active' : ''}`}
              onClick={() => setFilterRole(r)}
            >{r}</button>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #E8E0D5', borderRadius: 6,
          padding: '24px 28px', marginBottom: 24,
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Add Person
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="form-label">Name *</label>
              <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Company</label>
            <input type="text" placeholder="Company or firm name" value={company} onChange={e => setCompany(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="form-label">Email</label>
              <input type="text" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input type="text" placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea placeholder="Any useful context…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && (
            <div style={{ color: '#C0532A', fontFamily: "'DM Mono', monospace", fontSize: 11, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={handleAdd}>Save</button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); resetForm(); setError(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* People list grouped by role */}
      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading…</div>
      ) : people.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E' }}>
          No contacts yet. Add your architect, contractor, or vendor above.
        </div>
      ) : (
        Object.entries(grouped).map(([groupRole, members]) => (
          <div key={groupRole}>
            <div className="role-group-label">{groupRole}s</div>
            {members.map(person => {
              const isOpen = expanded === person.id
              const initials = person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

              return (
                <div key={person.id} className="person-card">
                  <div className="person-header" onClick={() => setExpanded(isOpen ? null : person.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div className="avatar">{initials}</div>
                      <div>
                        <div className="person-name">{person.name}</div>
                        {person.company && <div className="person-company">{person.company}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {person.email && (
                        <a
                          href={`mailto:${person.email}`}
                          className="contact-link"
                          onClick={e => e.stopPropagation()}
                        >
                          ✉ {person.email}
                        </a>
                      )}
                      <span style={{ color: '#C9B99A', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="person-body">
                      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 12 }}>
                        {person.phone && (
                          <a href={`tel:${person.phone}`} className="contact-link">
                            ✆ {person.phone}
                          </a>
                        )}
                        {person.email && (
                          <a href={`mailto:${person.email}`} className="contact-link">
                            ✉ {person.email}
                          </a>
                        )}
                      </div>
                      {person.notes && (
                        <p style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 12,
                          color: '#6B6359', lineHeight: 1.7, margin: '0 0 12px',
                        }}>{person.notes}</p>
                      )}
                      <button className="btn-danger" onClick={() => handleDelete(person.id)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
