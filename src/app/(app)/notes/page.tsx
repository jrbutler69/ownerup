'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Note {
  id: string
  project_id: string
  body: string
  created_at: string
}

export default function NotesPage() {
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const cookiePid = document.cookie.split('; ').find(r => r.startsWith('selected_project_id='))?.split('=')[1]
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
      if (!memberRows?.length) return
      const pid = cookiePid && memberRows.some(r => r.project_id === cookiePid)
        ? cookiePid
        : memberRows[0].project_id
      setProjectId(pid)
      const { data } = await supabase
        .from('notes').select('*').eq('project_id', pid)
        .order('created_at', { ascending: false })
      setNotes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleAdd() {
    if (!body.trim() || !projectId) return
    setSaving(true)
    const { data: newNote, error } = await supabase
      .from('notes')
      .insert({ project_id: projectId, body: body.trim() })
      .select().single()
    if (!error && newNote) {
      setNotes(prev => [newNote, ...prev])
      setBody('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
    setSaving(false)
  }

  async function handleDelete(note: Note) {
    if (!confirm('Delete this note?')) return
    setDeletingId(note.id)
    await supabase.from('notes').delete().eq('id', note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    setDeletingId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="notes-root">
      <div className="notes-header">
        <h1 className="notes-title">Notes</h1>
      </div>

      {/* Compose */}
      <div className="compose">
        <textarea
          ref={textareaRef}
          className="compose-input"
          placeholder="Write a note…"
          value={body}
          onChange={autoResize}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <div className="compose-footer">
          <span className="compose-hint">⌘ + Return to save</span>
          <button className="save-btn" onClick={handleAdd} disabled={saving || !body.trim()}>
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="state-msg">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="state-msg">No notes yet.</p>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-row">
              <div className="note-body">{note.body}</div>
              <div className="note-footer">
                <span className="note-date">{formatDate(note.created_at)}</span>
                <button
                  className="note-delete"
                  onClick={() => handleDelete(note)}
                  disabled={deletingId === note.id}
                >
                  {deletingId === note.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');

        .notes-root { font-family: 'DM Mono', monospace; max-width: 680px; }

        .notes-header { margin-bottom: 32px; }
        .notes-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px; font-weight: 300; color: #1c1a17;
          margin: 0; letter-spacing: -0.02em;
        }

        .compose {
          margin-bottom: 40px;
          border: 1px solid #ddd5c8;
          border-radius: 3px;
          background: #fff;
          overflow: hidden;
        }

        .compose-input {
          width: 100%; box-sizing: border-box;
          padding: 16px 18px;
          border: none; outline: none; resize: none;
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 300; color: #1c1a17;
          line-height: 1.6;
          background: transparent;
          min-height: 88px;
        }

        .compose-input::placeholder { color: #c0b8ae; }

        .compose-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px;
          border-top: 1px solid #f0ebe4;
          background: #faf8f5;
        }

        .compose-hint {
          font-size: 10px; letter-spacing: 0.08em; color: #c0b8ae;
        }

        .save-btn {
          padding: 7px 16px; background: #1c1a17; color: #f0e8d8;
          border: none; border-radius: 2px;
          font-family: 'DM Mono', monospace; font-size: 10px;
          letter-spacing: 0.1em; cursor: pointer; transition: background 0.15s;
        }
        .save-btn:hover:not(:disabled) { background: #2e2a24; }
        .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .state-msg { font-size: 13px; color: #bbb0a0; font-style: italic; }

        .notes-list { display: flex; flex-direction: column; gap: 2px; }

        .note-row {
          background: #fff; border: 1px solid #e8e0d5;
          border-radius: 2px; padding: 16px 18px;
          transition: border-color 0.15s;
        }
        .note-row:hover { border-color: #c9b99a; }

        .note-body {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 300; color: #1c1a17;
          line-height: 1.6; white-space: pre-wrap;
          margin-bottom: 12px;
        }

        .note-footer {
          display: flex; align-items: center; justify-content: space-between;
        }

        .note-date {
          font-size: 10px; letter-spacing: 0.08em; color: #b0a898;
        }

        .note-delete {
          background: none; border: none;
          font-family: 'DM Mono', monospace; font-size: 10px;
          letter-spacing: 0.08em; color: #c0b8ae;
          cursor: pointer; padding: 0; opacity: 0;
          transition: opacity 0.15s, color 0.15s;
        }
        .note-row:hover .note-delete { opacity: 1; }
        .note-delete:hover { color: #c0532a; }
      `}</style>
    </div>
  )
}
