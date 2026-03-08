'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'

const CATEGORIES = ['Contracts', 'Drawings', 'Budgets', 'Invoices', 'Permits', 'Specs', 'Other']
const SUBCATEGORY_CATEGORIES = ['Contracts', 'Drawings', 'Budgets', 'Invoices']
const SUBCATEGORIES = ['Architect', 'Engineers', 'Designers', 'Contractors', 'Other']

type Document = {
  id: string
  title: string
  category: string
  subcategory: string | null
  version_label: string
  document_date: string
  upload_date: string
  file_url: string
  is_current: boolean
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    category: 'Contracts',
    subcategory: 'Architect',
    version_label: 'v1',
    document_date: '',
  })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!projects?.length) return
      const pid = projects[0].id
      setProjectId(pid)

      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', pid)
        .order('upload_date', { ascending: false })

      setDocuments(docs ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const needsSubcategory = SUBCATEGORY_CATEGORIES.includes(form.category)

  async function handleUpload(e?: React.FormEvent) {
    e?.preventDefault()
    if (!fileRef.current?.files?.[0] || !projectId) return
    setUploading(true)
    setUploadError(null)

    const file = fileRef.current.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${projectId}/${fileName}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (storageError) {
      setUploadError('Storage upload failed: ' + JSON.stringify(storageError))
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

    const { data: newDoc, error: dbError } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        title: form.title,
        category: form.category,
        subcategory: needsSubcategory ? form.subcategory : null,
        version_label: form.version_label,
        version_group: crypto.randomUUID(),
        document_date: form.document_date || null,
        upload_date: new Date().toISOString(),
        file_url: publicUrl,
        is_current: true,
      })
      .select()
      .single()

    if (dbError) {
      setUploadError('Database error: ' + JSON.stringify(dbError))
      setUploading(false)
      return
    }

    if (newDoc) {
      setDocuments(prev => [newDoc, ...prev])
    }

    setUploading(false)
    setShowUpload(false)
    setForm({ title: '', category: 'Contracts', subcategory: 'Architect', version_label: 'v1', document_date: '' })
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    setDeletingId(doc.id)

    // Remove from storage
    const urlParts = doc.file_url.split('/documents/')
    if (urlParts.length > 1) {
      await supabase.storage.from('documents').remove([urlParts[1]])
    }

    // Remove from database
    await supabase.from('documents').delete().eq('id', doc.id)

    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    setDeletingId(null)
  }

  const filtered = activeCategory === 'All'
    ? documents
    : documents.filter(d => d.category === activeCategory)

  function groupDocuments(docs: Document[]) {
    const category = activeCategory
    if (category !== 'All' && SUBCATEGORY_CATEGORIES.includes(category)) {
      const groups: Record<string, Document[]> = {}
      for (const sub of SUBCATEGORIES) {
        const subDocs = docs.filter(d => d.subcategory === sub)
        if (subDocs.length > 0) groups[sub] = subDocs
      }
      const unsorted = docs.filter(d => !d.subcategory)
      if (unsorted.length > 0) groups['General'] = unsorted
      return groups
    } else {
      const groups: Record<string, Document[]> = {}
      for (const cat of CATEGORIES) {
        const catDocs = docs.filter(d => d.category === cat)
        if (catDocs.length > 0) groups[cat] = catDocs
      }
      return groups
    }
  }

  const grouped = groupDocuments(filtered)

  return (
    <div className="docs-root">
      <aside className="cat-sidebar">
        <p className="cat-heading">Categories</p>
        <button
          className={`cat-item ${activeCategory === 'All' ? 'active' : ''}`}
          onClick={() => setActiveCategory('All')}
        >
          All
          <span className="cat-count">{documents.length}</span>
        </button>
        {CATEGORIES.map(cat => {
          const count = documents.filter(d => d.category === cat).length
          return (
            <button
              key={cat}
              className={`cat-item ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              {count > 0 && <span className="cat-count">{count}</span>}
            </button>
          )
        })}
      </aside>

      <div className="docs-main">
        <div className="docs-header">
          <h1 className="docs-title">
            {activeCategory === 'All' ? 'Documents' : activeCategory}
          </h1>
          <button className="upload-btn" onClick={() => setShowUpload(true)}>
            + Upload
          </button>
        </div>

        {loading ? (
          <p className="state-msg">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No documents yet</p>
            <p className="empty-sub">Upload your first document to get started.</p>
            <button className="upload-btn" onClick={() => setShowUpload(true)}>+ Upload document</button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="state-msg">No documents in this category.</p>
        ) : (
          <div className="doc-groups">
            {Object.entries(grouped).map(([groupName, docs]) => (
              <div key={groupName} className="doc-group">
                <h2 className="group-title">{groupName}</h2>
                <div className="doc-list">
                  {docs.map(doc => (
                    <div key={doc.id} className="doc-row-wrapper">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-row"
                      >
                        <span className="doc-icon">◻</span>
                        <span className="doc-title">{doc.title}</span>
                        <span className="doc-version">{doc.version_label}</span>
                        {doc.is_current && <span className="doc-current">current</span>}
                        <span className="doc-date">
                          {doc.document_date
                            ? new Date(doc.document_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </span>
                        <span className="doc-arrow">→</span>
                      </a>
                      <button
                        className="doc-delete"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        title="Delete document"
                      >
                        {deletingId === doc.id ? '…' : '✕'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Document</h2>
              <button className="modal-close" onClick={() => setShowUpload(false)}>✕</button>
            </div>

            {uploadError && (
              <div style={{
                background: '#FDF0ED',
                border: '1px solid #E8856A',
                borderRadius: 4,
                padding: '10px 16px',
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                color: '#C0532A',
                marginBottom: 20,
              }}>{uploadError}</div>
            )}

            <form onSubmit={handleUpload}>
              <div className="field">
                <label>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. General Contract"
                  required
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value, subcategory: 'Architect' }))}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Version</label>
                  <input
                    type="text"
                    value={form.version_label}
                    onChange={e => setForm(f => ({ ...f, version_label: e.target.value }))}
                    placeholder="v1"
                  />
                </div>
              </div>

              {needsSubcategory && (
                <div className="field">
                  <label>Subcategory</label>
                  <select
                    value={form.subcategory}
                    onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                  >
                    {SUBCATEGORIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="field">
                <label>Document Date (optional)</label>
                <input
                  type="date"
                  value={form.document_date}
                  onChange={e => setForm(f => ({ ...f, document_date: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>File</label>
                <input type="file" ref={fileRef} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowUpload(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');

        .docs-root {
          display: flex;
          gap: 48px;
          font-family: 'DM Mono', monospace;
        }

        .cat-sidebar {
          width: 160px;
          min-width: 160px;
          padding-top: 4px;
        }

        .cat-heading {
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #9a8e7e;
          margin: 0 0 12px;
        }

        .cat-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 10px;
          background: none;
          border: none;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #7a7060;
          cursor: pointer;
          text-align: left;
          border-radius: 2px;
          transition: all 0.15s;
          letter-spacing: 0.05em;
        }

        .cat-item:hover { color: #1c1a17; background: rgba(0,0,0,0.04); }
        .cat-item.active { color: #1c1a17; background: rgba(0,0,0,0.06); font-weight: 400; }

        .cat-count {
          font-size: 10px;
          color: #bbb0a0;
          background: #f0ebe4;
          padding: 1px 6px;
          border-radius: 10px;
        }

        .docs-main { flex: 1; min-width: 0; }

        .docs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .docs-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #1c1a17;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .upload-btn {
          padding: 10px 20px;
          background: #1c1a17;
          color: #f0e8d8;
          border: none;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.15s;
        }

        .upload-btn:hover { background: #2e2a24; }

        .state-msg { font-size: 13px; color: #bbb0a0; font-style: italic; }

        .empty-state {
          padding: 60px 0;
          text-align: center;
        }

        .empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 300;
          color: #1c1a17;
          margin: 0 0 8px;
        }

        .empty-sub { font-size: 12px; color: #9a8e7e; margin: 0 0 24px; }

        .doc-groups { display: flex; flex-direction: column; gap: 40px; }

        .group-title {
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #9a8e7e;
          margin: 0 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e8e0d5;
        }

        .doc-list { display: flex; flex-direction: column; gap: 2px; }

        .doc-row-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .doc-row {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #fff;
          border: 1px solid #e8e0d5;
          border-radius: 2px;
          text-decoration: none;
          color: inherit;
          transition: all 0.15s;
        }

        .doc-row:hover { border-color: #c9b99a; background: #faf8f5; }

        .doc-delete {
          opacity: 0;
          background: none;
          border: none;
          color: #c0532a;
          font-size: 11px;
          cursor: pointer;
          padding: 6px 8px;
          transition: opacity 0.15s;
          font-family: 'DM Mono', monospace;
        }

        .doc-row-wrapper:hover .doc-delete { opacity: 1; }
        .doc-delete:hover { color: #a03010; }

        .doc-icon { font-size: 12px; color: #9a8e7e; }
        .doc-title { flex: 1; font-size: 13px; color: #1c1a17; }
        .doc-version { font-size: 10px; color: #9a8e7e; letter-spacing: 0.08em; }

        .doc-current {
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6b8c6b;
          background: #eef4ee;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .doc-date { font-size: 11px; color: #bbb0a0; min-width: 100px; text-align: right; }
        .doc-arrow { font-size: 12px; color: #bbb0a0; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(28,26,23,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal {
          background: #faf8f5;
          border-radius: 3px;
          width: 480px;
          max-width: 90vw;
          padding: 32px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 400;
          color: #1c1a17;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 14px;
          color: #9a8e7e;
          cursor: pointer;
          padding: 4px;
        }

        .field { margin-bottom: 20px; }
        .field-row { display: flex; gap: 16px; }
        .field-row .field { flex: 1; }

        label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6b6055;
          margin-bottom: 7px;
        }

        input, select {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          background: #fff;
          border: 1px solid #ddd5c8;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #1c1a17;
          outline: none;
        }

        input:focus, select:focus { border-color: #8b6f47; }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 28px;
        }

        .cancel-btn {
          padding: 10px 20px;
          background: none;
          border: 1px solid #ddd5c8;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #6b6055;
          cursor: pointer;
        }

        .submit-btn {
          padding: 10px 24px;
          background: #1c1a17;
          color: #f0e8d8;
          border: none;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.15s;
        }

        .submit-btn:hover:not(:disabled) { background: #2e2a24; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
