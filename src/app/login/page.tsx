'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="brand">
          <span className="brand-mark">O</span>
          <span className="brand-name">OwnerUp</span>
        </div>
        <div className="tagline">
          <p>Every decision.</p>
          <p>Every document.</p>
          <p>Every dollar.</p>
        </div>
        <div className="floor-plan" aria-hidden="true">
          <svg viewBox="0 0 300 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer walls */}
            <rect x="20" y="20" width="260" height="220" stroke="#c9b99a" strokeWidth="3" fill="none"/>
            {/* Interior walls */}
            <line x1="20" y1="130" x2="160" y2="130" stroke="#c9b99a" strokeWidth="1.5"/>
            <line x1="160" y1="20" x2="160" y2="180" stroke="#c9b99a" strokeWidth="1.5"/>
            <line x1="160" y1="180" x2="280" y2="180" stroke="#c9b99a" strokeWidth="1.5"/>
            <line x1="100" y1="130" x2="100" y2="240" stroke="#c9b99a" strokeWidth="1.5"/>
            {/* Door arcs */}
            <path d="M160 80 Q185 80 185 55" stroke="#c9b99a" strokeWidth="1" fill="none" strokeDasharray="3,3"/>
            <path d="M100 165 Q125 165 125 140" stroke="#c9b99a" strokeWidth="1" fill="none" strokeDasharray="3,3"/>
            {/* Room labels */}
            <text x="80" y="80" fill="#c9b99a" fontSize="9" fontFamily="monospace" opacity="0.7" textAnchor="middle">LIVING</text>
            <text x="220" y="100" fill="#c9b99a" fontSize="9" fontFamily="monospace" opacity="0.7" textAnchor="middle">PRIMARY</text>
            <text x="60" y="185" fill="#c9b99a" fontSize="9" fontFamily="monospace" opacity="0.7" textAnchor="middle">KITCHEN</text>
            <text x="220" y="210" fill="#c9b99a" fontSize="9" fontFamily="monospace" opacity="0.7" textAnchor="middle">GARAGE</text>
            {/* Compass */}
            <text x="265" y="38" fill="#c9b99a" fontSize="10" fontFamily="monospace" opacity="0.5">N</text>
            <line x1="268" y1="40" x2="268" y2="50" stroke="#c9b99a" strokeWidth="1" opacity="0.5"/>
          </svg>
        </div>
      </div>

      <div className="login-right">
        <div className="form-container">
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your project</p>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <span className="spinner" />
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');

        :global(body) {
          margin: 0;
          padding: 0;
        }

        .login-root {
          display: flex;
          min-height: 100vh;
          font-family: 'DM Mono', monospace;
        }

        /* ── Left panel ── */
        .login-left {
          flex: 1;
          background-color: #1c1a17;
          background-image:
            radial-gradient(ellipse at 20% 80%, rgba(180,150,90,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 10%, rgba(180,150,90,0.07) 0%, transparent 50%);
          padding: 48px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 36px;
          height: 36px;
          border: 2px solid #c9b99a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          color: #c9b99a;
          font-weight: 300;
        }

        .brand-name {
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          font-weight: 400;
          color: #c9b99a;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .tagline {
          margin-top: auto;
          margin-bottom: 48px;
        }

        .tagline p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #f0e8d8;
          margin: 0;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }

        .floor-plan {
          position: absolute;
          bottom: -20px;
          right: -20px;
          width: 280px;
          opacity: 0.35;
        }

        /* ── Right panel ── */
        .login-right {
          width: 480px;
          background: #faf8f5;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .form-container {
          width: 100%;
          max-width: 340px;
        }

        h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 400;
          color: #1c1a17;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #9a8e7e;
          margin: 0 0 40px 0;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .field {
          margin-bottom: 24px;
        }

        label {
          display: block;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6b6055;
          margin-bottom: 8px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #ddd5c8;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: #1c1a17;
          outline: none;
          transition: border-color 0.15s;
        }

        input:focus {
          border-color: #8b6f47;
        }

        input::placeholder {
          color: #c5bbb0;
        }

        .error-msg {
          font-size: 11px;
          color: #b84040;
          margin: -8px 0 16px;
          padding: 10px 12px;
          background: #fdf0f0;
          border-left: 2px solid #b84040;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #1c1a17;
          color: #f0e8d8;
          border: none;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2e2a24;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(240,232,216,0.3);
          border-top-color: #f0e8d8;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { width: 100%; padding: 32px 24px; }
        }
      `}</style>
    </div>
  )
}
