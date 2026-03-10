'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { switchProject } from '@/actions/projects'

const DOC_CATEGORIES = ['Contracts', 'Drawings', 'Budgets', 'Invoices', 'Permits', 'Insurance', 'Specs', 'Other']

interface Project {
  id: string
  name: string
  address: string
}

interface SidebarProps {
  allProjects: Project[]
  selectedProjectId: string
}

export default function Sidebar({ allProjects, selectedProjectId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [showSwitcher, setShowSwitcher] = useState(false)

  const isDocuments = pathname.startsWith('/documents')
  const activeCategory = searchParams.get('category')
  const currentProject = allProjects.find(p => p.id === selectedProjectId) ?? allProjects[0]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSwitchProject(projectId: string) {
    await switchProject(projectId)
    setShowSwitcher(false)
    router.push('/home')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <svg viewBox="0 0 10 10" fill="none" stroke="#C9B99A" strokeWidth="1.2">
            <rect x="1" y="1" width="8" height="8"/>
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-name">OwnerUp</span>
          <span className="brand-tagline">Construction Dashboard</span>
        </div>
      </div>

      {/* Project switcher */}
      <div className="project-switcher">
        <button
          className="project-current"
          onClick={() => setShowSwitcher(!showSwitcher)}
        >
          <span className="project-current-name">{currentProject?.name ?? 'No project'}</span>
          <span className="project-chevron">{showSwitcher ? '▲' : '▼'}</span>
        </button>

        {showSwitcher && (
          <div className="project-dropdown">
            {allProjects.map(p => (
              <button
                key={p.id}
                className={`project-option ${p.id === selectedProjectId ? 'project-option-active' : ''}`}
                onClick={() => handleSwitchProject(p.id)}
              >
                {p.name}
              </button>
            ))}
            <div className="project-divider" />
            <button
              className="project-new"
              onClick={() => { setShowSwitcher(false); window.location.href = '/onboarding' }}
            >
              + New project
            </button>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {/* Home */}
        <button
          className={`nav-item ${pathname === '/home' ? 'active' : ''}`}
          onClick={() => router.push('/home')}
        >
          <span className="nav-label">Home</span>
        </button>

        {/* Documents */}
        <button
          className={`nav-item ${isDocuments && !activeCategory ? 'active' : ''}`}
          onClick={() => router.push('/documents')}
        >
          <span className="nav-label">Documents</span>
        </button>

        {/* Document categories */}
        <div className="doc-categories">
          {DOC_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`doc-cat-item ${activeCategory === cat ? 'cat-active' : ''}`}
              onClick={() => router.push(`/documents?category=${encodeURIComponent(cat)}`)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Photos */}
        <button
          className={`nav-item ${pathname === '/photos' ? 'active' : ''}`}
          onClick={() => router.push('/photos')}
        >
          <span className="nav-label">Photos</span>
        </button>

        {/* Renderings */}
        <button
          className={`nav-item ${pathname === '/renderings' ? 'active' : ''}`}
          onClick={() => router.push('/renderings')}
        >
          <span className="nav-label">Renderings</span>
        </button>

        {/* Notes */}
        <button
          className={`nav-item ${pathname === '/notes' ? 'active' : ''}`}
          onClick={() => router.push('/notes')}
        >
          <span className="nav-label">Notes</span>
        </button>

        {/* Team */}
        <button
          className={`nav-item ${pathname === '/team' ? 'active' : ''}`}
          onClick={() => router.push('/team')}
        >
          <span className="nav-label">Team</span>
        </button>
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
          padding: 32px 24px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .brand-mark {
          width: 22px; height: 22px;
          border: 1px solid rgba(201,185,154,0.4);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          padding: 4px;
        }

        .brand-mark svg { width: 100%; height: 100%; }

        .brand-name {
          font-size: 12px;
          color: #E8E3DC;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
          font-weight: 400;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .brand-tagline {
          font-size: 10px;
          color: rgba(201,185,154,0.5);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
          font-weight: 300;
          line-height: 1.4;
        }

        /* Project switcher */
        .project-switcher {
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .project-current {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        }

        .project-current-name {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #C9B99A;
          letter-spacing: 0.08em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }

        .project-chevron {
          font-size: 8px;
          color: rgba(201,185,154,0.4);
          flex-shrink: 0;
        }

        .project-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #1E1C19;
          border: 1px solid rgba(255,255,255,0.08);
          z-index: 20;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }

        .project-option {
          display: block;
          width: 100%;
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #6A6358;
          letter-spacing: 0.08em;
          transition: color 0.15s;
        }

        .project-option:hover { color: #E8E3DC; }

        .project-option-active {
          color: #C9B99A;
        }

        .project-divider {
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 4px 0;
        }

        .project-new {
          display: block;
          width: 100%;
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(201,185,154,0.5);
          letter-spacing: 0.08em;
          transition: color 0.15s;
        }

        .project-new:hover { color: #C9B99A; }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 0;
          flex: 1;
          overflow-y: auto;
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
          margin-top: 8px;
        }

        .nav-item:hover { color: #9E9890; }

        .nav-item.active {
          color: #E8E3DC;
          background: rgba(201,185,154,0.07);
          border-left-color: #C9B99A;
        }

        .doc-categories {
          display: flex;
          flex-direction: column;
          padding: 0 0 8px 0;
        }

        .doc-cat-item {
          display: block;
          padding: 6px 24px 6px 36px;
          background: none;
          border: none;
          border-left: 2px solid transparent;
          cursor: pointer;
          text-align: left;
          color: #4A4540;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          width: 100%;
          transition: color 0.15s;
        }

        .doc-cat-item:hover { color: #7A7268; }

        .doc-cat-item.cat-active {
          color: #C9B99A;
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

        .sign-out:hover { color: #6A6358; }
      `}</style>
    </aside>
  )
}