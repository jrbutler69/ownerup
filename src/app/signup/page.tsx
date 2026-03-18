'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (inviteToken) {
      try {
        const res = await fetch('/api/invite/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        })
        const data = await res.json()
        if (!res.ok) {
          console.error('Invite accept error:', data.error)
        }
        router.push('/home')
      } catch (err) {
        console.error('Failed to accept invite:', err)
        router.push('/home')
      }
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: members } = await supabase
        .from('project_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)

      if (!members || members.length === 0) {
        router.push('/onboarding')
      } else {
        router.push('/home')
      }
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.box}>
          <div style={styles.logo}>METALOG</div>
          <p style={styles.confirmTitle}>Check your email</p>
          <p style={styles.confirmBody}>
            We sent a confirmation link to <strong>{email}</strong>.<br />
            Click it to activate your account.
          </p>
          <a href="/login" style={styles.link}>Back to login</a>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>METALOG</div>
        <p style={styles.subtitle}>
          {inviteToken ? 'Create your account to accept your invitation' : 'Create your account'}
        </p>

        <form onSubmit={handleSignup} style={styles.form}>
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

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>CONFIRM PASSWORD</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Repeat password"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <a href={inviteToken ? `/login?invite=${inviteToken}` : '/login'} style={styles.link}>Sign in</a>
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
  subtitle: {
    fontSize: '11px',
    letterSpacing: '0.1em',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: '32px',
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

export default function SignupPageWrapper() {
  return <Suspense><SignupPage /></Suspense>
}