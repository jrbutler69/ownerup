'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const CATEGORIES = ['Contracts', 'Drawings', 'Budgets', 'Invoices', 'Permits', 'Insurance', 'Specs', 'Other']
const SUBCATEGORY_CATEGORIES = ['Contracts', 'Drawings', 'Budgets', 'Invoices', 'Insurance']
const SUBCATEGORIES = ['Architect', 'Engineers', 'Designers', 'Contractors', 'Other']

type Document = {
  id: string; title: string; category: string; subcategory: string | null
  version_label: string; document_date: string; upload_date: string
  file_url: string; is_current: boolean
}

type QueuedFile = {
  id: string; file: File; title: string; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string
}

function cleanTitle(filename: string) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function DocumentsPage() {
  const searchParams = useSearchParams()
  const urlCategory = searchParams.get('category')

  const [documents, setDocuments] = useState<Document[]>([])
  const [activeCategory, setActiveCategory] = useState(urlCategory ?? 'All')
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [hasAnyAccess, setHasAnyAccess] = useState(true)
  const [editableCategories, setEditableCategories] = useState<Set<string>>(new Set())
  const [categoryAccess, setCategoryAccess] = useState<Record<string, string>>({})
  const [batchCategory, setBatchCategory] = useState(urlCategory && CATEGORIES.includes(urlCategory) ? urlCategory : 'Contracts')
  const [batchSubcategory, setBatchSubcategory] = useState('Architect')
  const [batchVersion, setBatchVersion] = useState('v1')
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { setActiveCategory(urlCategory ?? 'All') }, [urlCategory])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const cookiePid = document.cookie.split('; ').find(r => r.startsWith('selected_project_id='))?.split('=')[1]
      const { data: memberRows } = await supabase.from('project_members').select('project_id, role').eq('user_id', user.id).eq('status', 'active')
      if (!memberRows?.length) return
      const pid = cookiePid && memberRows.some(r => r.project_id === cookiePid) ? cookiePid : memberRows[0].project_id
      setProjectId(pid)
      const memberRow = memberRows.find(r => r.project_id === pid)
      const role = memberRow?.role ?? 'other'
      if (['owner', 'co-owner'].includes(role)) {
        setHasAnyAccess(true); setCanEdit(true); setEditableCategories(new Set(CATEGORIES))
        setCategoryAccess(Object.fromEntries(CATEGORIES.map(c => [c, 'edit'])))
      } else {
        const { data: perms } = await supabase.rpc('get_my_permissions', { p_project_id: pid })
        const editableCats = new Set<string>()
        const access: Record<string, string> = {}
        let anyAccess = false
        for (const cat of CATEGORIES) {
          const key = `documents_${cat.toLowerCase()}`
          const level = perms?.find((p: any) => p.section === key)?.access_level ?? 'none'
          access[cat] = level
          if (level !== 'none') anyAccess = true
          if (level === 'edit') editableCats.add(cat)
        }
        setHasAnyAccess(anyAccess)
        setCategoryAccess(access)
        setEditableCategories(editableCats)
        setCanEdit(editableCats.size > 0)
      }
      const { data: docs } = await supabase.from('documents').select('*').eq('project_id', pid).order('upload_date', { ascending: false })
      setDocuments(docs ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function openUploadModal() {
    if (urlCategory && editableCategories.has(urlCategory)) setBatchCategory(urlCategory)
    else { const first = CATEGORIES.find(c => editableCategories.has(c)); if (first) setBatchCategory(first) }
    setShowUpload(true)
  }

  function canEditCategory(cat: string) { return editableCategories.has(cat) }

  function addFiles(files: FileList | File[]) {
    const newItems: QueuedFile[] = Array.from(files).map(f => ({ id: crypto.randomUUID(), file: f, title: cleanTitle(f.name), status: 'pending' }))
    setQueue(prev => [...prev, ...newItems])
  }

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }, [])
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])

  function updateTitle(id: string, title: string) { setQueue(prev => prev.map(f => f.id === id ? { ...f, title } : f)) }
  function removeFromQueue(id: string) { setQueue(prev => prev.filter(f => f.id !== id)) }

  async function handleUploadAll() {
    if (!projectId || queue.filter(f => f.status === 'pending').length === 0) return
    setUploading(true); setUploadError(null)
    const needsSub = SUBCATEGORY_CATEGORIES.includes(batchCategory)
    const newDocs: Document[] = []
    for (const item of queue) {
      if (item.status !== 'pending') continue
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f))
      const ext = item.file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: storageError } = await supabase.storage.from('documents').upload(`${projectId}/${fileName}`, item.file)
      if (storageError) { setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: storageError.message } : f)); continue }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(`${projectId}/${fileName}`)
      const { data: newDoc, error: dbError } = await supabase.from('documents').insert({
        project_id: projectId, title: item.title, category: batchCategory,
        subcategory: needsSub ? batchSubcategory : null, version_label: batchVersion,
        version_group: crypto.randomUUID(), document_date: null,
        upload_date: new Date().toISOString(), file_url: publicUrl, is_current: true,
      }).select().single()
      if (dbError) { setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: JSON.stringify(dbError) } : f)); continue }
      if (newDoc) newDocs.push(newDoc)
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' } : f))
    }
    if (newDocs.length) setDocuments(prev => [...newDocs, ...prev])
    setUploading(false)
    if (!queue.some(f => f.status === 'error')) setTimeout(() => { setShowUpload(false); setQueue([]) }, 800)
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    const urlParts = doc.file_url.split('/documents/')
    if (urlParts.length > 1) await supabase.storage.from('documents').remove([urlParts[1]])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    setDeletingId(null)
  }

  const filtered = activeCategory === 'All' ? documents : documents.filter(d => d.category === activeCategory)

  function groupDocuments(docs: Document[]) {
    if (activeCategory !== 'All' && SUBCATEGORY_CATEGORIES.includes(activeCategory)) {
      const groups: Record<string, Document[]> = {}
      for (const sub of SUBCATEGORIES) { const s = docs.filter(d => d.subcategory === sub); if (s.length) groups[sub] = s }
      const unsorted = docs.filter(d => !d.subcategory); if (unsorted.length) groups['General'] = unsorted
      return groups
    } else {
      const groups: Record<string, Document[]> = {}
      for (const cat of CATEGORIES) { const c = docs.filter(d => d.category === cat); if (c.length) groups[cat] = c }
      return groups
    }
  }

  const grouped = groupDocuments(filtered)
  const pendingCount = queue.filter(f => f.status === 'pending').length
  const doneCount = queue.filter(f => f.status === 'done').length
  const needsSubcategory = SUBCATEGORY_CATEGORIES.includes(batchCategory)
  const uploadableCategories = CATEGORIES.filter(c => editableCategories.has(c))

  function closeModal() { if (uploading) return; setShowUpload(false); setQueue([]); setUploadError(null) }

  if (!loading && !hasAnyAccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#1C1A17', margin: '0 0 12px' }}>No access</h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', letterSpacing: '0.08em', margin: 0 }}>
          You don't have access to this section. Contact the project owner if you need access.
        </p>
      </div>
    )
  }

  if (!loading && activeCategory !== 'All' && Object.keys(categoryAccess).length > 0) {
    const level = categoryAccess[activeCategory] ?? 'none'
    if (level === 'none') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#1C1A17', margin: '0 0 12px' }}>No access</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9A8F82', letterSpacing: '0.08em', margin: 0 }}>
            You don't have access to {activeCategory}. Contact the project owner if you need access.
          </p>
        </div>
      )
    }
  }

  return (
    <div className="docs-root">
      <div className="docs-header">
        <h1 className="docs-title">{activeCategory === 'All' ? 'Documents' : activeCategory}</h1>
        {canEdit && <button className="upload-btn" onClick={openUploadModal}>+ Upload</button>}
      </div>

      {loading ? (
        <p className="state-msg">Loading...</p>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No documents yet</p>
          <p className="empty-sub">Upload your first document to get started.</p>
          {canEdit && <button className="upload-btn" onClick={openUploadModal}>+ Upload document</button>}
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
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="doc-row">
                      <span className="doc-icon">◻</span>
                      <span className="doc-title-text">{doc.title}</span>
                      <span className="doc-version">{doc.version_label}</span>
                      {doc.is_current && <span className="doc-current">current</span>}
                      <span className="doc-date">
                        {doc.document_date ? new Date(doc.document_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                      <span className="doc-arrow">→</span>
                    </a>
                    {canEditCategory(doc.category) && (
                      <button className="doc-delete" onClick={() => handleDelete(doc)} disabled={deletingId === doc.id} title="Delete document">
                        {deletingId === doc.id ? '…' : '✕'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Documents</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="batch-settings">
              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select value={batchCategory} onChange={e => setBatchCategory(e.target.value)} disabled={uploading}>
                    {uploadableCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Version</label>
                  <input type="text" value={batchVersion} onChange={e => setBatchVersion(e.target.value)} placeholder="v1" disabled={uploading} />
                </div>
              </div>
              {needsSubcategory && (
                <div className="field">
                  <label>Subcategory</label>
                  <select value={batchSubcategory} onChange={e => setBatchSubcategory(e.target.value)} disabled={uploading}>
                    {SUBCATEGORIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} onClick={() => fileInputRef.current?.click()}>
              <div className="drop-icon">⬆</div>
              <p className="drop-label">Drop files here or click to browse</p>
              <p className="drop-sub">Select multiple files at once</p>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) addFiles(e.target.files) }} />
            </div>
            {queue.length > 0 && (
              <div className="queue">
                <div className="queue-header-row">
                  <span className="queue-label">{queue.length} file{queue.length !== 1 ? 's' : ''}{doneCount > 0 && ` · ${doneCount} uploaded`}</span>
                  {!uploading && <button className="clear-btn" onClick={() => setQueue([])}>Clear all</button>}
                </div>
                <div className="queue-list">
                  {queue.map(item => (
                    <div key={item.id} className={`queue-item queue-item--${item.status}`}>
                      <div className="queue-status-col">
                        {item.status === 'pending' && <span className="sdot sdot-pending" />}
                        {item.status === 'uploading' && <span className="sdot sdot-uploading">↑</span>}
                        {item.status === 'done' && <span className="sdot sdot-done">✓</span>}
                        {item.status === 'error' && <span className="sdot sdot-error">!</span>}
                      </div>
                      <div className="queue-info">
                        <input className="queue-title-input" value={item.title} onChange={e => updateTitle(item.id, e.target.value)} disabled={item.status !== 'pending'} />
                        <span className="queue-filename">{item.file.name}</span>
                        {item.error && <span className="queue-error-msg">{item.error}</span>}
                      </div>
                      {item.status === 'pending' && !uploading && <button className="queue-remove" onClick={() => removeFromQueue(item.id)}>✕</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {uploadError && <div className="error-box">{uploadError}</div>}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeModal} disabled={uploading}>Cancel</button>
              <button className="submit-btn" onClick={handleUploadAll} disabled={uploading || pendingCount === 0}>
                {uploading ? `Uploading… (${doneCount}/${queue.length})` : pendingCount > 0 ? `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}` : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');
        .docs-root { font-family: 'DM Mono', monospace; }
        .docs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .docs-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: #1c1a17; margin: 0; letter-spacing: -0.02em; }
        .upload-btn { padding: 10px 20px; background: #1c1a17; color: #f0e8d8; border: none; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; cursor: pointer; transition: background 0.15s; }
        .upload-btn:hover { background: #2e2a24; }
        .state-msg { font-size: 13px; color: #bbb0a0; font-style: italic; }
        .empty-state { padding: 60px 0; text-align: center; }
        .empty-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; color: #1c1a17; margin: 0 0 8px; }
        .empty-sub { font-size: 12px; color: #9a8e7e; margin: 0 0 24px; }
        .doc-groups { display: flex; flex-direction: column; gap: 40px; }
        .group-title { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #9a8e7e; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e8e0d5; }
        .doc-list { display: flex; flex-direction: column; gap: 2px; }
        .doc-row-wrapper { display: flex; align-items: center; gap: 4px; }
        .doc-row { flex: 1; display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #fff; border: 1px solid #e8e0d5; border-radius: 2px; text-decoration: none; color: inherit; transition: all 0.15s; }
        .doc-row:hover { border-color: #c9b99a; background: #faf8f5; }
        .doc-delete { opacity: 0; background: none; border: none; color: #c0532a; font-size: 11px; cursor: pointer; padding: 6px 8px; transition: opacity 0.15s; font-family: 'DM Mono', monospace; }
        .doc-row-wrapper:hover .doc-delete { opacity: 1; }
        .doc-delete:hover { color: #a03010; }
        .doc-icon { font-size: 12px; color: #9a8e7e; }
        .doc-title-text { flex: 1; font-size: 13px; color: #1c1a17; }
        .doc-version { font-size: 10px; color: #9a8e7e; letter-spacing: 0.08em; }
        .doc-current { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #6b8c6b; background: #eef4ee; padding: 2px 8px; border-radius: 10px; }
        .doc-date { font-size: 11px; color: #bbb0a0; min-width: 100px; text-align: right; }
        .doc-arrow { font-size: 12px; color: #bbb0a0; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(28,26,23,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal { background: #faf8f5; border-radius: 3px; width: 580px; max-width: 90vw; max-height: 88vh; overflow-y: auto; padding: 32px; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: #1c1a17; margin: 0; }
        .modal-close { background: none; border: none; font-size: 14px; color: #9a8e7e; cursor: pointer; padding: 4px; }
        .batch-settings { margin-bottom: 20px; }
        .field { margin-bottom: 16px; }
        .field-row { display: flex; gap: 16px; }
        .field-row .field { flex: 1; }
        label { display: block; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #6b6055; margin-bottom: 7px; }
        input[type="text"], select { width: 100%; box-sizing: border-box; padding: 10px 12px; background: #fff; border: 1px solid #ddd5c8; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 12px; color: #1c1a17; outline: none; }
        input[type="text"]:focus, select:focus { border-color: #8b6f47; }
        .drop-zone { border: 1.5px dashed #c9b99a; border-radius: 3px; padding: 32px 24px; text-align: center; cursor: pointer; transition: all 0.15s; margin-bottom: 20px; background: #fff; }
        .drop-zone:hover, .drop-zone.drag-over { border-color: #8b6f47; background: #faf5ee; }
        .drop-icon { font-size: 20px; color: #c9b99a; margin-bottom: 8px; }
        .drop-label { font-size: 13px; color: #3a3530; margin: 0 0 4px; }
        .drop-sub { font-size: 11px; color: #9a8e7e; margin: 0; }
        .queue { margin-bottom: 20px; }
        .queue-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .queue-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #6b6055; }
        .clear-btn { background: none; border: none; font-size: 10px; color: #9a8e7e; cursor: pointer; font-family: 'DM Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
        .clear-btn:hover { color: #c0532a; }
        .queue-list { display: flex; flex-direction: column; gap: 4px; }
        .queue-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #fff; border: 1px solid #e8e0d5; border-radius: 2px; }
        .queue-item--done { opacity: 0.6; }
        .queue-item--error { border-color: #e8856a; background: #fdf5f2; }
        .queue-status-col { flex-shrink: 0; width: 20px; text-align: center; }
        .sdot { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: bold; }
        .sdot-pending { background: #e8e0d5; }
        .sdot-uploading { background: #e8f0e8; color: #4a7a4a; animation: pulse 1s infinite; }
        .sdot-done { background: #eef4ee; color: #4a7a4a; }
        .sdot-error { background: #fdf0ed; color: #c0532a; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .queue-info { flex: 1; min-width: 0; }
        .queue-title-input { width: 100%; box-sizing: border-box; background: transparent; border: none; border-bottom: 1px solid transparent; font-family: 'DM Mono', monospace; font-size: 12px; color: #1c1a17; padding: 0 0 2px; outline: none; transition: border-color 0.15s; }
        .queue-title-input:focus { border-bottom-color: #8b6f47; }
        .queue-title-input:disabled { color: #9a8e7e; }
        .queue-filename { display: block; font-size: 10px; color: #bbb0a0; margin-top: 2px; }
        .queue-error-msg { display: block; font-size: 10px; color: #c0532a; margin-top: 2px; }
        .queue-remove { background: none; border: none; color: #bbb0a0; font-size: 10px; cursor: pointer; padding: 2px 4px; flex-shrink: 0; font-family: 'DM Mono', monospace; }
        .queue-remove:hover { color: #c0532a; }
        .error-box { background: #fdf0ed; border: 1px solid #e8856a; border-radius: 2px; padding: 10px 14px; font-size: 11px; color: #c0532a; margin-bottom: 16px; }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
        .cancel-btn { padding: 10px 20px; background: none; border: 1px solid #ddd5c8; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 11px; color: #6b6055; cursor: pointer; }
        .cancel-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .submit-btn { padding: 10px 24px; background: #1c1a17; color: #f0e8d8; border: none; border-radius: 2px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; cursor: pointer; transition: background 0.15s; }
        .submit-btn:hover:not(:disabled) { background: #2e2a24; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
