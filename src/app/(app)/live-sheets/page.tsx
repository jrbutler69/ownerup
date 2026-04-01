'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface LiveSheet {
  id: string
  title: string
  url: string
  created_at: string
}

export default function LiveSheetsPage() {
  const [sheets, setSheets] = useState<LiveSheet[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [activeSheet, setActiveSheet] = useState<LiveSheet | null>(null)
  const [editingSheet, setEditingSheet] = useState<LiveSheet | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (!memberRows?.length) return
    const pid = memberRows[0].project_id
    setProjectId(pid)

    const { data } = await supabase
      .from('live_sheets')
      .select('*')
      .eq('project_id', pid)
      .order('created_at', { ascending: false })

    setSheets(data || [])
    setLoading(false)
  }

  async function addSheet() {
    if (!projectId || !newTitle || !newUrl) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('live_sheets')
      .insert({ project_id: projectId, title: newTitle, url: newUrl, created_by: user.id })
      .select()
      .single()

    if (data) {
      setSheets([data, ...sheets])
      setNewTitle('')
      setNewUrl('')
      setShowAddModal(false)
    }
  }

  async function deleteSheet(id: string) {
    await supabase.from('live_sheets').delete().eq('id', id)
    setSheets(sheets.filter(s => s.id !== id))
    if (activeSheet?.id === id) setActiveSheet(null)
    setConfirmDeleteId(null)
  }

  async function renameSheet() {
    if (!editingSheet || !editTitle.trim()) return
    const { data } = await supabase
      .from('live_sheets')
      .update({ title: editTitle.trim() })
      .eq('id', editingSheet.id)
      .select()
      .single()

    if (data) {
      setSheets(sheets.map(s => s.id === data.id ? data : s))
      setEditingSheet(null)
      setEditTitle('')
    }
  }

  function getEmbedUrl(url: string) {
    return url.replace('/edit', '/preview').replace('/edit?usp=sharing', '/preview')
  }

  if (activeSheet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setActiveSheet(null)}
              style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6A6358', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              ← Back
            </button>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#1C1A17' }}>{activeSheet.title}</span>
          </div>
          <button
            onClick={() => setConfirmDeleteId(activeSheet.id)}
            style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#999', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Delete
          </button>
        </div>
        <iframe
          src={getEmbedUrl(activeSheet.url)}
          style={{ flex: 1, width: '100%', border: '1px solid #D8D2C8', borderRadius: '2px', minHeight: '600px' }}
          allowFullScreen
        />
        {confirmDeleteId === activeSheet.id && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', padding: '32px', borderRadius: '4px', width: '360px' }}>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#1C1A17', marginTop: 0 }}>Delete this sheet? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDeleteId(null)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '8px 16px', background: 'none', border: '1px solid #D8D2C8', borderRadius: '2px', cursor: 'pointer', color: '#6A6358' }}>Cancel</button>
                <button onClick={() => deleteSheet(activeSheet.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '8px 16px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 400, color: '#1C1A17', margin: 0 }}>
          Live Sheets
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#1C1A17', background: 'none', border: '1px solid #D8D2C8', borderRadius: '2px', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          + Add Sheet
        </button>
      </div>

      {loading ? (
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#6A6358' }}>Loading...</p>
      ) : sheets.length === 0 ? (
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#6A6358' }}>No sheets yet. Add a Google Sheet to get started.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {sheets.map(sheet => (
            <div
              key={sheet.id}
              style={{ background: '#fff', border: '1px solid #D8D2C8', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}
              onMouseEnter={() => setHoveredId(sheet.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Thumbnail — clickable */}
              <div
                onClick={() => setActiveSheet(sheet)}
                style={{ height: '220px', background: '#F5F5F5', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
              >
                <iframe
                  src={getEmbedUrl(sheet.url)}
                  style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                  scrolling="no"
                />
                <div style={{ position: 'absolute', inset: 0 }} />
              </div>

              {/* Title bar */}
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#1C1A17' }}>{sheet.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => { setEditingSheet(sheet); setEditTitle(sheet.title) }}
                    title="Rename"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#6A6358', fontSize: '13px', lineHeight: 1 }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(sheet.id)}
                    title="Delete"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#6A6358', fontSize: '14px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename modal */}
      {editingSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '4px', width: '400px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 400, marginTop: 0, marginBottom: '20px' }}>Rename Sheet</h2>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && renameSheet()}
              autoFocus
              style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: '13px', padding: '10px', border: '1px solid #DDD5C8', borderRadius: '2px', boxSizing: 'border-box', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingSheet(null)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '8px 16px', background: 'none', border: '1px solid #D8D2C8', borderRadius: '2px', cursor: 'pointer', color: '#6A6358' }}>Cancel</button>
              <button onClick={renameSheet} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '8px 16px', background: '#1C1A17', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && !activeSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '4px', width: '360px' }}>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#1C1A17', marginTop: 0 }}>Delete this sheet? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '8px 16px', background: 'none', border: '1px solid #D8D2C8', borderRadius: '2px', cursor: 'pointer', color: '#6A6358' }}>Cancel</button>
              <button onClick={() => deleteSheet(confirmDeleteId)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '8px 16px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add sheet modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '4px', width: '480px', maxWidth: '90vw' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 400, marginTop: 0, marginBottom: '24px' }}>Add a Live Sheet</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6A6358', display: 'block', marginBottom: '6px' }}>Title</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. GC Budget Tracker"
                style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: '13px', padding: '10px', border: '1px solid #DDD5C8', borderRadius: '2px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6A6358', display: 'block', marginBottom: '6px' }}>Google Sheets URL</label>
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                style={{ width: '100%', fontFamily: 'DM Mono, monospace', fontSize: '13px', padding: '10px', border: '1px solid #DDD5C8', borderRadius: '2px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 20px', background: 'none', border: '1px solid #D8D2C8', borderRadius: '2px', cursor: 'pointer', color: '#6A6358' }}>Cancel</button>
              <button onClick={addSheet} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 20px', background: '#1C1A17', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}>Add Sheet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}