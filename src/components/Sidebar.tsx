'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'documents', label: 'Documents', href: '/documents' },
  { id: 'photos', label: 'Photos', href: '/photos' },
  { id: 'budget', label: 'Budget', href: '/budget' },
  { id: 'decisions', label: 'Decisions', href: '/decisions' },
  { id: 'team', label: 'Team', href: '/team' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <svg viewBox="0 0 10 10" fill="none" stroke="#C9B99A" strokeWidth="1.2">
            <rect x="1" y="1" width="8" height="8"/>
          </svg>
        </div>
        <span className="brand-name">OwnerUp</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-spacer" />
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => router.push(item.href)}
            >
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <button className="sign-out" onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');

        .sidebar {
          width: 200px;
          min-width: 200px;
          background: #151412;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 10;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 170px 24px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .brand-mark {
          width: 22px; height: 22px;
          border: 1px solid rgba(201,185,154,0.4);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          padding: 4px;
        }

        .brand-mark svg {
          width: 100%; height: 100%;
        }

        .brand-name {
          font-size: 12px;
          color: #E8E3DC;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
          font-weight: 400;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 0;
          flex: 1;
        }

        .nav-spacer {
          height: 48px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 10px 24px;
          background: none;
          border: none;
          border-left: 2px solid transparent;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s, background 0.15s;
          color: #6A6358;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          width: 100%;
        }

        .nav-item:hover {
          color: #9E9890;
        }

        .nav-item.active {
          color: #E8E3DC;
          background: rgba(201,185,154,0.07);
          border-left-color: #C9B99A;
        }

        .sidebar-bottom {
          padding: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .sign-out {
          background: none;
          border: none;
          color: rgba(106,99,88,0.5);
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }

        .sign-out:hover {
          color: #6A6358;
        }
      `}</style>
    </aside>
  )
}
