import { useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { BookOpen, Clock3, FilePlus2, FileText, FolderOpen, LogOut, Plus, Search, Share2, Upload, X } from 'lucide-react'
import { deleteDocument } from '../lib/documents'
import { markdownToDocument, validateImportFile, validateDocumentTitle } from '../lib/documentUtils'
import type { DocumentRecord, DocumentView } from '../types'
import { DocumentCard } from './DocumentCard'

type Props = {
  user: User
  documents: DocumentRecord[]
  view: DocumentView
  loading: boolean
  error: string
  onViewChange: (view: DocumentView) => void
  onCreate: (title: string, content?: DocumentRecord['content_json']) => Promise<void>
  onOpen: (document: DocumentRecord) => void
  onSignOut: () => void
  onDocumentsChange: (documents: DocumentRecord[]) => void
}

export function Dashboard({ user, documents, view, loading, error, onViewChange, onCreate, onOpen, onSignOut, onDocumentsChange }: Props) {
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const visibleDocuments = useMemo(() => {
    const list = documents.filter((document) => {
      if (view === 'mine' && document.owner_id !== user.id) return false
      if (view === 'shared' && document.owner_id === user.id) return false
      return document.title.toLowerCase().includes(search.toLowerCase().trim())
    })
    return view === 'recent' ? list.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8) : list
  }, [documents, search, user.id, view])

  const create = async () => {
    setActionError('')
    try {
      await onCreate('Untitled document')
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not create the document.')
    }
  }

  const importFile = async (file?: File) => {
    if (!file) return
    const validationError = validateImportFile(file)
    if (validationError) {
      setActionError(validationError)
      return
    }
    setBusy(true)
    setActionError('')
    try {
      const text = await file.text()
      const title = file.name.replace(/\.(txt|md)$/i, '').trim() || 'Imported document'
      const titleError = validateDocumentTitle(title)
      if (titleError) throw new Error(titleError)
      await onCreate(title, markdownToDocument(text))
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not import this file.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (document: DocumentRecord) => {
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) return
    try {
      await deleteDocument(document.id)
      onDocumentsChange(documents.filter((item) => item.id !== document.id))
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not delete the document.')
    }
  }

  const title = view === 'shared' ? 'Shared with me' : view === 'recent' ? 'Recent documents' : 'My documents'
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark"><FileText size={19} /></span><span>Ajaia <b>Docs</b></span></div>
        <button className="button button-primary sidebar-create" onClick={() => void create()}><Plus size={17} /> New document</button>
        <nav className="side-nav" aria-label="Document navigation">
          <button className={view === 'mine' ? 'active' : ''} onClick={() => onViewChange('mine')}><FolderOpen size={18} /> My documents</button>
          <button className={view === 'shared' ? 'active' : ''} onClick={() => onViewChange('shared')}><Share2 size={18} /> Shared with me</button>
          <button className={view === 'recent' ? 'active' : ''} onClick={() => onViewChange('recent')}><Clock3 size={18} /> Recent</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="storage-note"><BookOpen size={17} /><span>Your words, safely<br />in one place.</span></div>
          <div className="profile-row">
            <span className="avatar">{(user.email ?? 'A').slice(0, 1).toUpperCase()}</span>
            <span className="profile-email" title={user.email}>{user.email}</span>
            <button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <main className="dashboard-main" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void importFile(event.dataTransfer.files[0]) }}>
        <header className="dashboard-topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><b>{title}</b></div>
          <div className="topbar-actions">
            <button className="button button-secondary import-button" onClick={() => fileInput.current?.click()} disabled={busy}><Upload size={16} /> Import file</button>
            <button className="button button-primary" onClick={() => void create()} disabled={busy}><Plus size={17} /> New document</button>
            <input ref={fileInput} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(event) => void importFile(event.target.files?.[0])} />
          </div>
        </header>
        <section className="dashboard-content">
          <div className="welcome-row">
            <div><p className="eyebrow">YOUR WORKSPACE</p><h1>{title}</h1><p className="section-subtitle">{view === 'shared' ? 'Documents your collaborators have shared with you.' : 'A thoughtful space for everything you’re working on.'}</p></div>
            <div className="doc-count">{visibleDocuments.length} {visibleDocuments.length === 1 ? 'document' : 'documents'}</div>
          </div>
          {(error || actionError) && <div role="alert" className="inline-alert error dashboard-alert">{error || actionError}<button onClick={() => setActionError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
          <div className="document-tools">
            <label className="search-box"><Search size={17} /><input aria-label="Search documents" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" /></label>
            <span className="format-hint"><FileText size={14} /> Import .txt or .md</span>
          </div>
          {loading || busy ? <div className="loading-state"><span className="spinner" />{busy ? 'Importing your document...' : 'Loading documents...'}</div> : visibleDocuments.length ? (
            <div className="document-grid">
              {visibleDocuments.map((document) => <DocumentCard key={document.id} document={document} currentUserId={user.id} onOpen={onOpen} onDelete={remove} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><FilePlus2 size={26} /></div>
              <h2>{search ? 'No matching documents' : view === 'shared' ? 'Nothing shared with you yet' : 'A fresh page, just for you'}</h2>
              <p>{search ? 'Try another title or clear your search.' : view === 'shared' ? 'When someone shares a document with you, it will appear here.' : 'Create your first document or bring in a .txt or .md file.'}</p>
              {!search && view !== 'shared' && <button className="button button-primary" onClick={() => void create()}><Plus size={17} /> Create a document</button>}
              {!search && view !== 'shared' && <button className="empty-import" onClick={() => fileInput.current?.click()}><Upload size={15} /> Or import a .txt or .md file</button>}
            </div>
          )}
        </section>
        <footer className="dashboard-footer"><span>Made for clear thinking.</span><span>Changes are saved to your workspace</span></footer>
      </main>
    </div>
  )
}
