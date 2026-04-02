'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'error'>('loading')
  const [invite, setInvite] = useState<{ invited_email: string; project_id: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function load() {
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Look up the invite
      const { data, error } = await supabase
        .from('project_invites')
        .select('invited_email, project_id, status, expires_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        setErrorMsg('This invite link is invalid or has expired.')
        setStatus('error')
        return
      }

      if (data.status === 'accepted') {
        setErrorMsg('This invite has already been accepted.')
        setStatus('error')
        return
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setErrorMsg('This invite link has expired. Ask the project owner to send a new one.')
        setStatus('error')
        return
      }

      setInvite({ invited_email: data.invited_email, project_id: data.project_id })
      setStatus('ready')
    }

    load()
  }, [token])

  async function handleAccept() {
    setStatus('accepting')

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Already logged in — accept directly via API
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        router.push('/home')
      } else {
        const json = await res.json()
        setErrorMsg(json.error ?? 'Something went wrong accepting the invite.')
        setStatus('error')
      }
    } else {
      // Not logged in — send to login or signup with token
      if (invite) {
        // We don't know if they have an account, so send to login with token
        // Login page will handle the token and also offer a signup link
        router.push(`/login?invite=${token}`)
      }
    }
  }

  // Styles
  const s: Record<string, React.CSSProperties> = {
    root: {
      minHeight: '100vh',
      backgroundColor: '#F0EDE8',
      fontFamily: "'DM Mono', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    },
    card: {
      width: '100%',
      maxWidth: 480,
      textAlign: 'center' as const,
    },
    logo: {
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 18,
      letterSpacing: '0.2em',
      color: '#151412',
      marginBottom: 48,
      display: 'block',
    },
    eyebrow: {
      fontSize: 10,
      letterSpacing: '0.15em',
      color: '#C9B99A',
      marginBottom: 16,
    },
    headline: {
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 36,
      fontWeight: 400,
      color: '#151412',
      margin: '0 0 12px',
      letterSpacing: '-0.01em',
    },
    sub: {
      fontSize: 12,
      color: '#888',
      lineHeight: 1.8,
      margin: '0 0 36px',
    },
    email: {
      fontSize: 12,
      color: '#555',
      fontFamily: "'DM Mono', monospace",
    },
    btn: {
      display: 'inline-block',
      width: '100%',
      padding: '14px 32px',
      backgroundColor: '#151412',
      color: '#F0EDE8',
      border: 'none',
      borderRadius: 2,
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      cursor: 'pointer',
      marginTop: 8,
    },
    errorText: {
      fontSize: 12,
      color: '#C0392B',
      lineHeight: 1.8,
    },
    loadingText: {
      fontSize: 12,
      color: '#999',
    },
  }

  return (
    <div style={s.root}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
      <div style={s.card}>
        <span style={s.logo}>METALOG</span>

        {status === 'loading' && (
          <p style={s.loadingText}>Checking your invite…</p>
        )}

        {status === 'error' && (
          <>
            <p style={s.eyebrow}>INVITE</p>
            <h1 style={s.headline}>Something went wrong.</h1>
            <p style={s.errorText}>{errorMsg}</p>
          </>
        )}

        {(status === 'ready' || status === 'accepting') && invite && (
          <>
            <p style={s.eyebrow}>YOU'VE BEEN INVITED</p>
            <h1 style={s.headline}>Join your project on Metalog.</h1>
            <p style={s.sub}>
              This invite was sent to{' '}
              <span style={s.email}>{invite.invited_email}</span>.
              {isLoggedIn
                ? ' Click below to accept and join the project.'
                : ' Sign in or create an account to accept.'}
            </p>
            <button
              style={{ ...s.btn, opacity: status === 'accepting' ? 0.6 : 1 }}
              onClick={handleAccept}
              disabled={status === 'accepting'}
            >
              {status === 'accepting' ? 'Accepting…' : isLoggedIn ? 'Accept invite' : 'Sign in to accept'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
