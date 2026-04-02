'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { switchProject } from '@/actions/projects'

interface Project {
  id: string
  name: string
  address: string
}

interface MobileLayoutProps {
  allProjects: Project[]
  selectedProjectId: string
  userRole: string
  permissions: Record<string, string>
  children: React.ReactNode
  projectName: string
  projectAddress: string
}

const NAV_ITEMS = [
  { label: 'Overview', path: '/home', section: 'home' },
  { label: 'Documents', path: '/documents', section: 'documents' },
  { label: 'Photos', path: '/photos', section: 'photos' },
  { label: 'Renderings', path: '/renderings', section: 'renderings' },
  { label: 'Notes', path: '/notes', section: 'notes' },
  { label: 'Live Sheets', path: '/live-sheets', section: 'live_sheets', live: true },
  { label: 'Team', path: '/team', section: 'team' },
]

export default function MobileLayout({
  allProjects,
  selectedProjectId,
  userRole,
  permissions,
  children,
  projectName,
  projectAddress,
}: MobileLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showMenu, setShowMenu] = useState(true)
  const [showSwitcher, setShowSwitcher] = useState(false)

  const isOwnerOrCoOwner = ['admin', 'co-admin'].includes(userRole)
  const isOnMenu = pathname === '/home'

  function getAccess(section: string): string {
    if (isOwnerOrCoOwner) return 'edit'
    if (section === 'home' || section === 'live_sheets') return 'view'
    return permissions[section] ?? 'none'
  }

  function getDocAccess(): boolean {
    if (isOwnerOrCoOwner) return true
    const docSections = ['documents_contracts', 'documents_drawings', 'documents_budgets',
      'documents_invoices', 'documents_permits', 'documents_insurance',
      'documents_meeting_notes', 'documents_specs', 'documents_other']
    return docSections.some(s => (permissions[s] ?? 'none') !== 'none')
  }

  function hasAccess(section: string): boolean {
    if (section === 'documents') return getDocAccess()
    return getAccess(section) !== 'none'
  }

  // Current section label for header
  const currentNav = NAV_ITEMS.find(n => pathname === n.path)
  const sectionLabel = currentNav?.label ?? ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSwitchProject(projectId: string) {
    await switchProject(projectId)
    setShowSwitcher(false)
    setShowMenu(false)
    await new Promise(resolve => setTimeout(resolve, 300))
    router.refresh()
  }

  function handleNavTap(path: string) {
    setShowMenu(false)
    router.push(path)
  }

  // Menu screen
  if (showMenu) {
    return (
        <div style={styles.root}>
          {/* Menu header */}
          <div style={styles.menuHeader}>
            <div style={styles.menuBrand}>
              <div style={styles.brandMark}>
                <svg viewBox="0 0 10 10" fill="none" stroke="#C9B99A" strokeWidth="1.2" width="14" height="14">
                  <rect x="1" y="1" width="8" height="8"/>
                </svg>
              </div>
              <span style={styles.brandName}>METALOG</span>
            </div>
            <button style={styles.closeBtn} onClick={() => setShowMenu(false)}>✕</button>
          </div>

          {/* Project name */}
          <div style={styles.menuProject}>
            <p style={styles.menuProjectLabel}>CURRENT PROJECT</p>
            <button
              style={styles.menuProjectNameBtn}
              onClick={() => allProjects.length > 1 && setShowSwitcher(!showSwitcher)}
            >
              <span style={styles.menuProjectName}>{projectName}</span>
              {allProjects.length > 1 && (
                <span style={styles.menuProjectChevron}>{showSwitcher ? '▲' : '▾'}</span>
              )}
            </button>
            {projectAddress && <p style={styles.menuProjectAddress}>{projectAddress}</p>}
            {showSwitcher && (
              <div style={styles.projectDropdown}>
                {allProjects.map(p => (
                  <button
                    key={p.id}
                    style={{ ...styles.projectOption, ...(p.id === selectedProjectId ? styles.projectOptionActive : {}) }}
                    onClick={() => handleSwitchProject(p.id)}
                  >
                    {p.name}
                    {p.id === selectedProjectId && <span style={{ marginLeft: 'auto', color: '#C9B99A' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={styles.menuDivider} />

          {/* Nav items */}
          <nav style={styles.menuNav}>
            {NAV_ITEMS.map(item => {
              const accessible = hasAccess(item.section)
              return (
                <button
                  key={item.path}
                  style={{
                    ...styles.menuNavItem,
                    ...(item.live ? styles.menuNavItemLive : {}),
                    ...(!accessible ? styles.menuNavItemDisabled : {}),
                  }}
                  onClick={() => accessible && handleNavTap(item.path)}
                  disabled={!accessible}
                >
                  {item.live && (
                    <span style={styles.liveDot} />
                  )}
                  {item.label}
                  {accessible && <span style={styles.menuNavArrow}>→</span>}
                </button>
              )
            })}
          </nav>

          <div style={styles.menuBottom}>
            <button style={styles.signOut} onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      )
  }

  // Content screen (any non-menu screen, or /home when menu is closed)
  return (
    <div style={styles.root}>
      {/* Content header with back arrow */}
      <div style={styles.contentHeader}>
        <button style={styles.backBtn} onClick={() => setShowMenu(true)}>
          ← Home
        </button>
        <span style={styles.contentHeaderLabel}>{sectionLabel}</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Project title */}
      <div style={styles.contentProjectBar}>
        <p style={styles.contentProjectLabel}>CURRENT PROJECT</p>
        <p style={styles.contentProjectName}>{projectName}</p>
        {projectAddress && <p style={styles.contentProjectAddress}>{projectAddress}</p>}
        <div style={styles.contentDivider} />
      </div>

      {/* Page content */}
      <main style={styles.contentMain}>
        {children}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#F0EDE8',
    fontFamily: "'DM Mono', monospace",
    display: 'flex',
    flexDirection: 'column',
  },

  // Menu styles
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: '#151412',
  },
  menuBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 22,
    height: 22,
    border: '1px solid rgba(201,185,154,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    boxSizing: 'border-box' as const,
  },
  brandName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    letterSpacing: '0.2em',
    color: '#E8E3DC',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6A6358',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  menuProject: {
    padding: '24px 24px 20px',
    backgroundColor: '#151412',
  },
  menuProjectLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.2em',
    color: 'rgba(201,185,154,0.5)',
    margin: '0 0 8px',
  },
  menuProjectNameBtn: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left' as const,
    margin: '0 0 4px',
  },
  menuProjectName: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 300,
    color: '#E8E3DC',
    letterSpacing: '-0.01em',
  },
  menuProjectChevron: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: '#C9B99A',
    flexShrink: 0,
  },
  menuProjectAddress: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: 'rgba(201,185,154,0.5)',
    letterSpacing: '0.08em',
    margin: 0,
  },
  projectDropdown: {
    marginTop: 8,
    backgroundColor: '#1E1C19',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 2,
  },
  projectOption: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'left' as const,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: '#6A6358',
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
  projectOptionActive: {
    color: '#C9B99A',
  },
  menuDivider: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: '#151412',
  },
  menuNav: {
    flex: 1,
    backgroundColor: '#151412',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 0',
  },
  menuNavItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '18px 24px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'left' as const,
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: '#9E9890',
    cursor: 'pointer',
  },
  menuNavItemLive: {
    color: '#C0392B',
  },
  menuNavItemDisabled: {
    color: '#3A3630',
    cursor: 'default',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#C0392B',
    display: 'inline-block',
    marginRight: 10,
    flexShrink: 0,
  },
  menuNavArrow: {
    marginLeft: 'auto',
    color: '#3A3630',
    fontSize: 16,
  },
  menuBottom: {
    backgroundColor: '#151412',
    padding: '24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  signOut: {
    background: 'none',
    border: 'none',
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: 'rgba(106,99,88,0.5)',
    cursor: 'pointer',
    padding: 0,
  },

  // Content screen styles
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #E0D9D0',
    backgroundColor: '#151412',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: 'none',
    border: '1px solid rgba(201,185,154,0.4)',
    borderRadius: 2,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#C9B99A',
    cursor: 'pointer',
    padding: '8px 14px',
    textAlign: 'left' as const,
  },
  contentHeaderLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(201,185,154,0.5)',
  },
  contentProjectBar: {
    padding: '24px 24px 0',
  },
  contentProjectLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#B0A898',
    margin: '0 0 8px',
  },
  contentProjectName: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 32,
    fontWeight: 300,
    color: '#1A1814',
    margin: '0 0 4px',
    letterSpacing: '-0.01em',
    lineHeight: 1,
  },
  contentProjectAddress: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.1em',
    color: '#B0A898',
    margin: '6px 0 0',
  },
  contentDivider: {
    borderBottom: '1px solid #D8D2C8',
    marginTop: 20,
  },
  contentMain: {
    flex: 1,
    padding: '28px 20px 48px',
  },
}
