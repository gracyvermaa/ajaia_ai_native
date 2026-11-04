import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { JSONContent } from '@tiptap/react'
import { ArrowLeft, Check, ChevronDown, CloudOff, LoaderCircle, Pencil, Share2, ShieldCheck } from 'lucide-react'
import { getDocumentPeople, updateDocument } from '../lib/documents'
import { validateDocumentTitle } from '../lib/documentUtils'
import { logSupabaseFailure } from '../lib/supabaseErrors'
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
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(document.title)
  const [titleSaving, setTitleSaving] = useState(false)
  const [titleSaveError, setTitleSaveError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [permission, setPermission] = useState<'owner' | 'editor' | 'viewer' | null>(document.owner_id === user.id ? 'owner' : null)
  const [permissionError, setPermissionError] = useState('')
  const [titleError, setTitleError] = useState('')
  const titleRef = useRef(title)
  const contentRef = useRef(content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveVersion = useRef(0)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const titleSavingRef = useRef(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
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
      title: titleRef.current,
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

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

  const commitTitle = async () => {
    if (titleSavingRef.current) return
    const nextTitle = titleDraft.trim()
    const validationMessage = validateDocumentTitle(nextTitle)
    if (validationMessage) {
      setTitleSaveError(validationMessage)
      return
    }

    const previousTitle = titleRef.current
    if (nextTitle === previousTitle) {
      setTitleDraft(previousTitle)
      setTitleSaveError('')
      setEditingTitle(false)
      return
    }

    titleSavingRef.current = true
    titleRef.current = nextTitle
    setTitle(nextTitle)
    setTitleDraft(nextTitle)
    setTitleSaveError('')
    setTitleSaving(true)

    const request = saveQueue.current.catch(() => undefined).then(() => updateDocument(document.id, {
      title: titleRef.current,
      content_json: contentRef.current,
    }))
    saveQueue.current = request

    try {
      await request
      setEditingTitle(false)
    } catch (caught) {
      titleRef.current = previousTitle
      setTitle(previousTitle)
      setTitleDraft(previousTitle)
      setTitleSaveError(caught instanceof Error ? caught.message : 'Could not save the document title.')
      const rollback = saveQueue.current.catch(() => undefined).then(() => updateDocument(document.id, {
        title: titleRef.current,
        content_json: contentRef.current,
      }))
      saveQueue.current = rollback
      void rollback.catch((rollbackError: unknown) => {
        logSupabaseFailure('rename_document.restore_previous_title', rollbackError)
      })
    } finally {
      titleSavingRef.current = false
      setTitleSaving(false)
    }
  }

  const cancelTitleEdit = () => {
    setTitleDraft(titleRef.current)
    setTitleSaveError('')
    setEditingTitle(false)
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
          <div className="title-wrap">
            <div className="document-title-row">
              {editingTitle && canEdit ? (
                <input
                  ref={titleInputRef}
                  className="document-title-input"
                  aria-label="Document title"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={() => void commitTitle()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void commitTitle()
                    } else if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelTitleEdit()
                    }
                  }}
                  disabled={titleSaving}
                  maxLength={120}
                />
              ) : canEdit ? (
                <button
                  className="document-title-button"
                  aria-label="Edit document title"
                  title="Edit document title"
                  onClick={() => {
                    setTitleDraft(titleRef.current)
                    setTitleSaveError('')
                    setEditingTitle(true)
                  }}
                >
                  <span>{title}</span>
                  <Pencil size={12} aria-hidden="true" />
                </button>
              ) : (
                <span className="document-title-readonly">{title}</span>
              )}
              {titleSaving && <span className="title-saving" role="status"><LoaderCircle className="spin" size={12} /> Saving</span>}
            </div>
            <div className="document-subtitle">{permission === 'owner' ? 'Owned by you' : permission === 'editor' ? 'Shared with you · Editor access' : 'Shared with you · View only'} <ChevronDown size={12} /></div>
          </div>
        </div>
        <div className="editor-top-actions">
          <div className={`save-indicator ${saveState}`} role="status">{saveState === 'saving' ? <><span className="tiny-spinner" /> Saving...</> : saveState === 'failed' ? <><CloudOff size={15} /> Save failed</> : <><Check size={15} /> Saved</>}</div>
          <button className="button button-secondary share-button" onClick={() => setShareOpen(true)}><Share2 size={16} /><span>Share</span></button>
          <span className="avatar">{(user.email ?? 'A').slice(0, 1).toUpperCase()}</span>
        </div>
      </header>
      {(permissionError || titleError || titleSaveError) && <div role="alert" className="editor-alert">{titleSaveError || titleError || permissionError}</div>}
      <div className="editor-context-row"><span><ShieldCheck size={14} /> Private to you and invited collaborators</span>{permission === 'viewer' && <span className="viewer-badge">View only</span>}</div>
      {permission === null ? <div className="editor-loading"><span className="spinner" />Verifying access...</div> : <RichTextEditor content={content} editable={canEdit} onChange={changeContent} />}
      {shareOpen && <ShareDialog document={document} userId={user.id} onClose={() => setShareOpen(false)} onShareUpdate={onShareUpdate} />}
    </main>
  )
}
