import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Mail, Shield, UserRound, X } from 'lucide-react'
import { getDocumentPeople, revokeDocumentShare, shareDocument } from '../lib/documents'
import type { DocumentPerson, DocumentRecord } from '../types'

type Props = { document: DocumentRecord; userId: string; onClose: () => void; onShareUpdate: () => void }

export function ShareDialog({ document, userId, onClose, onShareUpdate }: Props) {
  const [people, setPeople] = useState<DocumentPerson[]>([])
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'editor' | 'viewer'>('editor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const owner = document.owner_id === userId

  const refresh = useCallback(async () => {
    setPeople(await getDocumentPeople(document.id))
  }, [document.id])
  useEffect(() => {
    void refresh().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load collaborators.'))
  }, [refresh])

  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    try {
      await shareDocument(document.id, email, permission)
      await refresh()
      setEmail('')
      setSuccess('Access granted. They can now find this document in Shared with Me.')
      onShareUpdate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not share this document.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (person: DocumentPerson) => {
    setBusy(true); setError(''); setSuccess('')
    try {
      await revokeDocumentShare(document.id, person.user_id)
      await refresh()
      setSuccess(`Access removed for ${person.email}.`)
      onShareUpdate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove access.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header className="modal-header"><div><div className="modal-symbol"><UserRound size={19} /></div><h2 id="share-title">Share document</h2><p>{document.title}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></header>
        {owner ? <form className="share-form" onSubmit={(event) => void invite(event)}>
          <label htmlFor="share-email">Add people by email</label>
          <div className="share-input-row"><div className="input-with-icon"><Mail size={16} /><input id="share-email" type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div><select aria-label="Permission" value={permission} onChange={(event) => setPermission(event.target.value as 'editor' | 'viewer')}><option value="editor">Editor</option><option value="viewer">Viewer</option></select></div>
          <button className="button button-primary share-submit" disabled={busy || !email.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : null}Grant access</button>
        </form> : <p className="viewer-note"><Shield size={16} /> You can access this document as a collaborator.</p>}
        {(error || success) && <div role={error ? 'alert' : 'status'} className={`inline-alert ${error ? 'error' : 'success'}`}>{error || success}</div>}
        <div className="people-section"><h3>People with access <span>{people.length}</span></h3><div className="people-list">{people.map((person) => <div className="person-row" key={person.user_id}><span className="avatar small">{person.email.slice(0, 1).toUpperCase()}</span><div className="person-details"><strong>{person.email}{person.user_id === userId ? ' (you)' : ''}</strong><span>{person.is_owner ? 'Document owner' : person.permission === 'editor' ? 'Editor' : 'Viewer'}</span></div>{person.is_owner ? <span className="owner-tag">Owner</span> : owner ? <button className="revoke-button" disabled={busy} onClick={() => void revoke(person)}>Remove</button> : null}</div>)}</div></div>
        <p className="share-note">Only invited people can access this document. Sign-in is required.</p>
      </section>
    </div>
  )
}
