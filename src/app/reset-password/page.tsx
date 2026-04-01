'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-callback`,
})

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.box}>
          <div style={styles.logo}>OWNERUP</div>
          <p style={styles.confirmTitle}>Check your email</p>
          <p style={styles.confirmBody}>
            We sent a password reset link to <strong>{email}</strong>.<br />
            Click it to set a new password.
          </p>
          <a href="/login" style={styles.link}>Back to login</a>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>OWNERUP</div>
        <p style={styles.heading}>Reset your password</p>
        <p style={styles.subtitle}>Enter your email and we'll send you a reset link.</p>

        <form onSubmit={handleReset} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p style={styles.footer}>
          <a href="/login" style={styles.link}>Back to login</a>
        </p>
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
    maxWidth: '400px',
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
  input: {
    fontFamily: '"DM Mono", monospace',
    fontSize: '13px',
    padding: '10px 12px',
    border: '1px solid #DDD5C8',
    backgroundColor: '#FFFFFF',
    color: '#151412',
    outline: 'none',
    borderRadius: '2px',
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
  footer: {
    fontSize: '11px',
    color: '#888',
    marginTop: '24px',
    textAlign: 'center',
  },
  link: {
    color: '#C9B99A',
    textDecoration: 'none',
  },
  confirmTitle: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '24px',
    color: '#151412',
    marginBottom: '12px',
  },
  confirmBody: {
    fontSize: '12px',
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
}