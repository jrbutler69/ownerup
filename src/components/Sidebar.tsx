'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '⌂', href: '/' },
  { id: 'documents', label: 'Documents', icon: '◻', href: '/documents' },
  { id: 'photos', label: 'Photos', icon: '◈', href: '/photos' },
  { id: 'budget', label: 'Budget', icon: '◇', href: '/budget' },
  { id: 'decisions', label: 'Decisions', icon: '◎', href: '/decisions' },
  { id: 'team', label: 'Team', icon: '◉', href: '/team' },
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
        <span className="brand-mark">O</span>
        <span className="brand-name">OwnerUp</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => router.push(item.href)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <button className="sign-out" onClick={handleSignOut}>
        Sign out
      </button>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');

        .sidebar {
          width: 200px;
          min-width: 200px;
          background: #1c1a17;
          display: flex;
          flex-direction: column;
          padding: 32px 0;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 10;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 24px 32px;
          border-bottom: 1px solid rgba(201,185,154,0.15);
        }

        .brand-mark {
          width: 28px; height: 28px;
          border: 1.5px solid #c9b99a;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; color: #c9b99a;
        }

        .brand-name {
          font-size: 11px; color: #c9b99a;
          letter-spacing: 0.18em; text-transform: uppercase;
          font-family: 'DM Mono', monospace;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 24px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          color: #7a7060;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-left: 2px solid transparent;
        }

        .nav-item:hover {
          background: rgba(201,185,154,0.08);
          color: #c9b99a;
        }

        .nav-item.active {
          color: #f0e8d8;
          background: rgba(201,185,154,0.12);
          border-left: 2px solid #c9b99a;
        }

        .nav-icon { font-size: 14px; width: 16px; text-align: center; }

        .sign-out {
          margin: 0 24px 8px;
          padding: 10px;
          background: none;
          border: 1px solid rgba(201,185,154,0.2);
          color: #7a7060;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          border-radius: 2px;
        }

        .sign-out:hover {
          border-color: rgba(201,185,154,0.5);
          color: #c9b99a;
        }
      `}</style>
    </aside>
  )
}
