'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const SECTIONS = [
  { key: 'documents_contracts', label: 'Documents — Contracts' },
  { key: 'documents_drawings', label: 'Documents — Drawings' },
  { key: 'documents_budgets', label: 'Documents — Budgets' },
  { key: 'documents_invoices', label: 'Documents — Invoices' },
  { key: 'documents_permits', label: 'Documents — Permits' },
  { key: 'documents_insurance', label: 'Documents — Insurance' },
  { key: 'documents_specs', label: 'Documents — Specs' },
  { key: 'documents_other', label: 'Documents — Other' },
  { key: 'photos', label: 'Photos' },
  { key: 'renderings', label: 'Renderings' },
  { key: 'notes', label: 'Notes' },
  { key: 'budget', label: 'Budget' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'team', label: 'Team' },
]

const ROLES = ['co-owner', 'architect', 'contractor', 'other']

type AccessLevel = 'none' | 'view' | 'edit'
type Permissions = Record<string, AccessLevel>

interface Member {
  id: string
  user_id: string | null
  invited_email: string
  role: string
  status: string
  created_at: string
}

export default function TeamPage() {
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [hasAnyAccess, setHasAnyAccess] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('contractor')
  const [permissions, setPermissions] = useState<Permissions>(() =>
    Object.fromEntries(SECTIONS.map(s => [s.key, 'none' as AccessLevel]))
  )
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cookieValue = document.cookie.split('; ').find(r => r.startsWith('selected_project_id='))?.split('=')[1]
      const { data: memberRows } = await supabase
        .from('project_members').select('project_id, role').eq('user_id', user.id).eq('status', 'active')
      if (!memberRows?.length) return
      const memberRow = memberRows.find(m => m.project_id === cookieValue) ?? memberRows[0]
      if (!memberRow) return

      setProjectId(memberRow.project_id)
      const role = memberRow.role
      const ownerOrCo = role === 'owner' || role === 'co-owner'
      setIsOwner(ownerOrCo)

      if (ownerOrCo) {
        setHasAnyAccess(true)
      } else {
        const { data: perms } = await supabase.rpc('get_my_permissions', { p_project_id: memberRow.project_id })
        const level = perms?.find((p: any) => p.section === 'team')?.access_level ?? 'none'
        setHasAnyAccess(level !== 'none')
      }

      const { data: allMembers, error: membersError } = await supabase
        .from('project_members').select('*').eq('project_id', memberRow.project_id).order('created_at')
      console.log('DEBUG team:', { projectId: memberRow.project_id, allMembers, membersError })
      setMembers(allMembers ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function setPermission(section: string, level: AccessLevel) {
    setPermissions(prev => ({ ...prev, [section]: level }))
  }

  function handleRoleChange(role: string) {
    setInviteRole(role)
    if (role === 'co-owner') {
      setPermissions(Object.fromEntries(SECTIONS.map(s => [s.key, 'edit' as AccessLevel])))
    } else {
      setPermissions(Object.fromEntries(SECTIONS.map(s => [s.key, 'none' as AccessLevel])))
    }
  }

  async function handleInvite() {
    if (!projectId || !inviteEmail.trim()) return
    setInviteLoading(true); setInviteError(''); setInviteSuccess('')
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, email: inviteEmail.trim().toLowerCase(), role: inviteRole, permissions }),
    })
    const json = await res.json()
    if (!res.ok) {
      setInviteError(json.error ?? 'Something went wrong')
    } else {
      setInviteSuccess(`Invite sent to ${inviteEmail}`)
      setInviteEmail(''); setInviteRole('contractor')
      setPermissions(Object.fromEntries(SECTIONS.map(s => [s.key, 'none' as AccessLevel])))
      setShowInvite(false)
      const { data: allMembers } = await supabase.from('project_members').select('*').eq('project_id', projectId).order('created_at')
      setMembers(allMembers ?? [])
    }
    setInviteLoading(false)
  }

  async function handleRevoke(memberId: string) {
    if (!confirm('Remove this person from the project?')) return
    await supabase.from('project_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const statusLabel: Record<string, string> = { active: 'Active', pending: 'Invite pending', declined: 'Declined' }

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
    <div style={{ maxWidth: 720 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300;400&display=swap');
        .team-member-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #EDE8E1; gap: 16px; }
        .team-member-row:last-child { border-bottom: none; }
        .access-toggle { display: flex; border: 1px solid #DDD5C8; border-radius: 2px; overflow: hidden; }
        .access-btn { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; padding: 4px 8px; border: none; background: none; color: #9A8F82; cursor: pointer; transition: all 0.12s; white-space: nowrap; }
        .access-btn.active-none { background: #1C1A17; color: #F5F2EE; }
        .access-btn.active-view { background: #6B8C6B; color: #fff; }
        .access-btn.active-edit { background: #8B6F47; color: #fff; }
        .access-btn:not([class*="active"]):hover { background: #F5F2EE; }
        .invite-panel { background: #fff; border: 1px solid #E8E0D5; border-radius: 4px; padding: 28px 32px; margin-bottom: 32px; }
        .field-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #9A8F82; display: block; margin-bottom: 6px; }
        .field-input { font-family: 'DM Mono', monospace; font-size: 12px; border: 1px solid #DDD5C8; border-radius: 2px; padding: 8px 12px; color: #1C1A17; background: #FAF8F5; outline: none; width: 100%; box-sizing: border-box; }
        .field-input:focus { border-color: #C9B99A; }
        .role-select { font-family: 'DM Mono', monospace; font-size: 12px; border: 1px solid #DDD5C8; border-radius: 2px; padding: 8px 12px; color: #1C1A17; background: #FAF8F5; outline: none; width: 100%; box-sizing: border-box; }
        .btn-primary { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em; padding: 9px 20px; background: #1C1A17; color: #F5F2EE; border: none; border-radius: 2px; cursor: pointer; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em; padding: 9px 18px; background: none; color: #6B6359; border: 1px solid #E8E0D5; border-radius: 2px; cursor: pointer; }
        .btn-ghost:hover { border-color: #C9B99A; color: #1C1A17; }
        .permissions-grid { border: 1px solid #EDE8E1; border-radius: 3px; overflow: hidden; margin-top: 8px; }
        .perm-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #EDE8E1; }
        .perm-row:last-child { border-bottom: none; }
        .perm-row:nth-child(even) { background: #FAFAF8; }
        .perm-label { font-family: 'DM Mono', monospace; font-size: 11px; color: #4A4540; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#1C1A17', margin: '0 0 6px' }}>Team</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', margin: 0 }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isOwner && !showInvite && (
          <button className="btn-ghost" onClick={() => setShowInvite(true)}>+ Invite someone</button>
        )}
      </div>

      {inviteSuccess && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6B8C6B', marginBottom: 20, padding: '10px 16px', background: '#F0F5F0', borderRadius: 3 }}>
          {inviteSuccess}
        </div>
      )}

      {showInvite && (
        <div className="invite-panel">
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
            Invite someone
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="field-label">Email *</label>
              <input className="field-input" type="email" placeholder="their@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select className="role-select" value={inviteRole} onChange={e => handleRoleChange(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {inviteRole !== 'co-owner' && (
            <div style={{ marginBottom: 24 }}>
              <label className="field-label" style={{ marginBottom: 8 }}>Permissions</label>
              <div className="permissions-grid">
                {SECTIONS.map(section => (
                  <div key={section.key} className="perm-row">
                    <span className="perm-label">{section.label}</span>
                    <div className="access-toggle">
                      {(['none', 'view', 'edit'] as AccessLevel[]).map(level => (
                        <button key={level} className={`access-btn ${permissions[section.key] === level ? `active-${level}` : ''}`} onClick={() => setPermission(section.key, level)}>
                          {level === 'none' ? 'None' : level === 'view' ? 'View' : 'View+Edit'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inviteRole === 'co-owner' && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6B8C6B', marginBottom: 24, padding: '10px 16px', background: '#F0F5F0', borderRadius: 3 }}>
              Co-owners have full access to all sections.
            </div>
          )}
          {inviteError && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#C0532A', marginBottom: 16 }}>{inviteError}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? 'Sending…' : 'Send invite'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowInvite(false); setInviteError('') }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#9A8F82' }}>Loading…</div>
      ) : members.length === 0 ? (
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#B0A89E', padding: '60px 0', textAlign: 'center' }}>No team members yet.</div>
      ) : (
        <div>
          {members.map(member => (
            <div key={member.id} className="team-member-row">
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: '#1C1A17', marginBottom: 2 }}>{member.invited_email}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#9A8F82', letterSpacing: '0.08em' }}>
                  {member.role} · {statusLabel[member.status] ?? member.status}
                </div>
              </div>
              {isOwner && member.role !== 'owner' && (
                <button onClick={() => handleRevoke(member.id)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#C0532A', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
