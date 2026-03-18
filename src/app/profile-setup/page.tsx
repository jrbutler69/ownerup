'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const ROLES = [
  { value: 'architect', label: 'Architect' },
  { value: 'designer', label: 'Designer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'developer', label: 'Developer' },
  { value: 'owner', label: 'Owner' },
  { value: 'other', label: 'Other' },
]

export default function ProfileSetupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) { setError('Please enter your name.'); return }
    if (!role) { setError('Please select a role.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: fullName.trim(), role })

      if (profileError && profileError.code !== '23505') {
        throw new Error(profileError.message)
      }

      router.push('/home')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>METALOG</div>
        <h1 style={styles.heading}>About you</h1>
        <p style={styles.subtitle}>Before you continue, tell us a bit about yourself.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>YOUR NAME <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
              style={styles.input}
              placeholder="e.g. James Butler"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>YOUR ROLE <span style={styles.required}>*</span></label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              required
              style={styles.input}
            >
              <option value="">Select a role...</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F0EDE8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"DM Mono", monospace',
  },
  box: {
    width: '100%',
    maxWidth: '480px',
    padding: '48px 40px',
  },
  logo: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '22px',
    letterSpacing: '0.15em',
    color: '#151412',
    marginBottom: '32px',
  },
  heading: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '28px',
    fontWeight: 400,
    color: '#151412',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: '#888',
  },
  required: {
    color: '#C9B99A',
  },
  input: {
    fontFamily: '"DM Mono", monospace',
    fontSize: '13px',
    padding: '10px 12px',
    border: '1px solid #DDD5C8',
    backgroundColor: '#FFFFFF',
    color: '#151412',
    outline: 'none',
    borderRadius: '2px',
    boxSizing: 'border-box',
    width: '100%',
  },
  error: {
    fontSize: '11px',
    color: '#c0392b',
    margin: 0,
  },
  button: {
    fontFamily: '"DM Mono", monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    padding: '12px',
    backgroundColor: '#151412',
    color: '#F0EDE8',
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
    borderRadius: '2px',
  },
}