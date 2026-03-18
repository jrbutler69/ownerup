'use client'

import { useState } from 'react'
import { createProject } from '@/actions/projects'
import { createClient } from '@/lib/supabase-browser'

const ROLES = [
  { value: 'architect', label: 'Architect' },
  { value: 'designer', label: 'Designer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'developer', label: 'Developer' },
  { value: 'owner', label: 'Owner' },
  { value: 'other', label: 'Other' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleStep1(e: React.FormEvent<HTMLFormElement>) {
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
        // 23505 = unique violation (profile already exists), safe to ignore
        throw new Error(profileError.message)
      }

      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      // Pass role through so createProject can set project_members.role correctly
      formData.append('role', role)
      await createProject(formData)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>METALOG</div>

        {step === 1 && (
          <>
            <p style={styles.heading}>About you</p>
            <p style={styles.subtitle}>Tell us who you are. You can update this later.</p>

            <form onSubmit={handleStep1} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>YOUR NAME <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
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
          </>
        )}

        {step === 2 && (
          <>
            <p style={styles.heading}>Set up your project</p>
            <p style={styles.subtitle}>This takes 30 seconds. You can edit everything later.</p>

            <form onSubmit={handleStep2} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>PROJECT NAME <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  style={styles.input}
                  placeholder="e.g. Germantown House"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>ADDRESS <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  name="address"
                  required
                  style={styles.input}
                  placeholder="e.g. 123 Main St, Germantown, NY"
                />
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>START DATE</label>
                  <input
                    type="date"
                    name="startDate"
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>TARGET COMPLETION</label>
                  <input
                    type="date"
                    name="targetCompletion"
                    style={styles.input}
                  />
                </div>
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(1) }}
                  style={styles.backButton}
                >
                  ← Back
                </button>
                <button type="submit" disabled={loading} style={{ ...styles.button, flex: 1 }}>
                  {loading ? 'Creating project...' : 'Create project'}
                </button>
              </div>
            </form>
          </>
        )}

        <div style={styles.stepIndicator}>
          <div style={{ ...styles.dot, backgroundColor: step === 1 ? '#C9B99A' : '#DDD5C8' }} />
          <div style={{ ...styles.dot, backgroundColor: step === 2 ? '#C9B99A' : '#DDD5C8' }} />
        </div>
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
    color: '#151412',
    margin: '0 0 8px 0',
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
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
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
    width: '100%',
    boxSizing: 'border-box',
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
  backButton: {
    fontFamily: '"DM Mono", monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid #DDD5C8',
    cursor: 'pointer',
    marginTop: '8px',
    borderRadius: '2px',
  },
  stepIndicator: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginTop: '32px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
}