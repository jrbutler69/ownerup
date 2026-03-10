'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error' | 'expired'>('loading')
  const [invite, setInvite] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Look up the invite
      const { data: inv } = await supabase
        .from('project_invites')
        .select('*')
        .eq('token', token)
        .single()

      if (!inv) { setStatus('error'); setError('Invite not found.'); return }
      if (inv.status !== 'pending') { setStatus('error'); setError('This invite has already been used or cancelled.'); return }
      if (new Date(inv.expires_at) < new Date()) { setStatus('expired'); return }

      const { data: proj } = await supabase
        .from('projects')
        .select('name, address')
        .eq('id', inv.project_id)
        .single()

      setInvite(inv)
      setProject(proj)
      setStatus('ready')
    }
    load()
  }, [token])

  async function handleAccept() {
    setStatus('accepting')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Not logged in — send to signup with token in URL
      router.push(`/signup?invite=${token}`)
      return
    }

    // Check email matches
    if (user.email?.toLowerCase() !== invite.invited_email.toLowerCase()) {
      setStatus('error')
      setError(`This invite was sent to ${invite.invited_email}. Please log in with that email address.`)
      return
    }

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    const json = await res.json()
    if (!res.ok) {
      setStatus('error')
      setError(json.error ?? 'Something went wrong')
    } else {
      setStatus('success')
      setTimeout(() => router.push('/home'), 2000)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.logo}>OWNERUP</div>

        {status === 'loading' && (
          <p style={styles.subtitle}>Loading your invitation…</p>
        )}

        {status === 'ready' && invite && (
          <>
            <h1 style={styles.heading}>You've been invited</h1>
            <p style={styles.subtitle}>
              You've been invited to join <strong>{project?.name}</strong> as a <strong>{invite.role}</strong>.
            </p>
            {project?.address && (
              <p style={{ ...styles.subtitle, marginBottom: 32 }}>{project.address}</p>
            )}
            <button style={styles.button} onClick={handleAccept}>
              Accept invitation
            </button>
          </>
        )}

        {status === 'accepting' && (
          <p style={styles.subtitle}>Accepting invitation…</p>
        )}

        {status === 'success' && (
          <>
            <h1 style={styles.heading}>Welcome!</h1>
            <p style={styles.subtitle}>You've been added to the project. Redirecting you now…</p>
          </>
        )}

        {status === 'expired' && (
          <>
            <h1 style={styles.heading}>Invite expired</h1>
            <p style={styles.subtitle}>This invitation has expired. Please ask the project owner to send a new one.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={styles.heading}>Something went wrong</h1>
            <p style={{ ...styles.subtitle, color: '#c0392b' }}>{error}</p>
          </>
        )}
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
    fontSize: '32px',
    fontWeight: 400,
    color: '#151412',
    margin: '0 0 16px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.7,
    marginBottom: '24px',
  },
  button: {
    fontFamily: '"DM Mono", monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    padding: '12px 24px',
    backgroundColor: '#151412',
    color: '#F0EDE8',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '2px',
  },
}
