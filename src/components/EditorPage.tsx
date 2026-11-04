import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { JSONContent } from '@tiptap/react'
import { ArrowLeft, Check, ChevronDown, CloudOff, Share2, ShieldCheck } from 'lucide-react'
import { getDocumentPeople, updateDocument } from '../lib/documents'
import { validateDocumentTitle } from '../lib/documentUtils'
import type { DocumentPerson, DocumentRecord } from '../types'
import { RichTextEditor } from './RichTextEditor'
import { ShareDialog } from './ShareDialog'

type Props = {
  document: DocumentRecord
  user: User
  onBack: () => void
  onShareUpdate: () => void
}
type SaveState = 'saved' | 'saving' | 'failed'

export function EditorPage({ document, user, onBack, onShareUpdate }: Props) {
  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState<JSONContent>(document.content_json)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [shareOpen, setShareOpen] = useState(false)
  const [permission, setPermission] = useState<'owner' | 'editor' | 'viewer' | null>(document.owner_id === user.id ? 'owner' : null)
  const [permissionError, setPermissionError] = useState('')
  const [titleError, setTitleError] = useState('')
  const titleRef = useRef(title)
  const contentRef = useRef(content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveVersion = useRef(0)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const canEdit = permission === 'owner' || permission === 'editor'

  useEffect(() => {
    if (document.owner_id === user.id) return
    let cancelled = false
    void getDocumentPeople(document.id).then((people: DocumentPerson[]) => {
      if (!cancelled) setPermission(people.find((person) => person.user_id === user.id)?.permission ?? 'viewer')
    }).catch((caught: unknown) => {
      if (!cancelled) {
        setPermissionError(caught instanceof Error ? caught.message : 'Could not verify document access.')
        setPermission('viewer')
      }
    })
    return () => { cancelled = true }
  }, [document.id, document.owner_id, user.id])

  const save = useCallback(async () => {
    const currentTitle = titleRef.current
    const titleValidation = validateDocumentTitle(currentTitle)
    if (titleValidation) {
      setTitleError(titleValidation)
      setSaveState('failed')
      return false
    }
    setTitleError('')
    const version = saveVersion.current
    setSaveState('saving')
    const request = saveQueue.current.catch(() => undefined).then(() => updateDocument(document.id, {
      title: currentTitle,
      content_json: contentRef.current,
    }))
    saveQueue.current = request
    try {
      await request
      if (version === saveVersion.current) {
        setDirty(false)
        setSaveState('saved')
        setPermissionError('')
      }
      return true
    } catch (caught) {
      if (version === saveVersion.current) setSaveState('failed')
      setPermissionError(caught instanceof Error ? caught.message : 'Your changes could not be saved.')
      return false
    }
  }, [document.id])

  useEffect(() => {
    if (!dirty || !canEdit) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void save() }, 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [dirty, title, content, canEdit, save])

  const changeTitle = (nextTitle: string) => {
    saveVersion.current += 1
    titleRef.current = nextTitle
    setTitle(nextTitle)
    setDirty(true)
    setTitleError(validateDocumentTitle(nextTitle) ?? '')
  }
  const changeContent = (nextContent: JSONContent) => {
    saveVersion.current += 1
    contentRef.current = nextContent
    setContent(nextContent)
    setDirty(true)
  }
  const goBack = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (dirty && canEdit) {
      const saved = await save()
      if (!saved) return
    }
    onBack()
  }

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div className="editor-brand-area">
          <button className="icon-button back-button" aria-label="Back to documents" onClick={() => void goBack()}><ArrowLeft size={19} /></button>
          <span className="brand-mark editor-brand-mark"><span className="brand-glyph">a</span></span>
          <div className="title-wrap"><input className="document-title-input" aria-label="Document title" value={title} onChange={(event) => changeTitle(event.target.value)} disabled={!canEdit} maxLength={120} /><div className="document-subtitle">{permission === 'owner' ? 'Owned by you' : permission === 'editor' ? 'Shared with you · Editor access' : 'Shared with you · View only'} <ChevronDown size={12} /></div></div>
        </div>
        <div className="editor-top-actions">
          <div className={`save-indicator ${saveState}`} role="status">{saveState === 'saving' ? <><span className="tiny-spinner" /> Saving...</> : saveState === 'failed' ? <><CloudOff size={15} /> Save failed</> : <><Check size={15} /> Saved</>}</div>
          <button className="button button-secondary share-button" onClick={() => setShareOpen(true)}><Share2 size={16} /><span>Share</span></button>
          <span className="avatar">{(user.email ?? 'A').slice(0, 1).toUpperCase()}</span>
        </div>
      </header>
      {(permissionError || titleError) && <div role="alert" className="editor-alert">{titleError || permissionError}</div>}
      <div className="editor-context-row"><span><ShieldCheck size={14} /> Private to you and invited collaborators</span>{permission === 'viewer' && <span className="viewer-badge">View only</span>}</div>
      {permission === null ? <div className="editor-loading"><span className="spinner" />Verifying access...</div> : <RichTextEditor content={content} editable={canEdit} onChange={changeContent} />}
      {shareOpen && <ShareDialog document={document} userId={user.id} onClose={() => setShareOpen(false)} onShareUpdate={onShareUpdate} />}
    </main>
  )
}
