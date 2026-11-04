import { useEffect, useState } from 'react'
import { FileText, Share2, Trash2 } from 'lucide-react'
import { getDocumentPeople } from '../lib/documents'
import type { DocumentPerson, DocumentRecord } from '../types'

type Props = {
  document: DocumentRecord
  currentUserId: string
  onOpen: (document: DocumentRecord) => void
  onDelete: (document: DocumentRecord) => void
}

export function DocumentCard({ document, currentUserId, onOpen, onDelete }: Props) {
  const [people, setPeople] = useState<DocumentPerson[]>([])
  const isOwner = document.owner_id === currentUserId
  useEffect(() => {
    if (!isOwner) {
      void getDocumentPeople(document.id).then(setPeople).catch(() => setPeople([]))
    }
  }, [document.id, isOwner])
  const ownerEmail = people.find((person) => person.is_owner)?.email
  return (
    <article className="document-card">
      <button className="card-open" onClick={() => onOpen(document)} aria-label={`Open ${document.title}`}>
        <div className="card-preview"><div className="preview-paper"><span /><span /><span /><span className="short" /></div><div className="preview-badge"><FileText size={16} /></div></div>
        <div className="card-copy"><h2 title={document.title}>{document.title}</h2><p>{isOwner ? 'Owned by you' : `Shared by ${ownerEmail || 'a collaborator'}`}</p></div>
      </button>
      <div className="card-meta"><span>Edited {formatDate(document.updated_at)}</span><div className="card-actions">
        {!isOwner && <span className="shared-pill"><Share2 size={12} /> Shared</span>}
        {isOwner && <button className="icon-button card-menu" aria-label={`Delete ${document.title}`} title="Delete document" onClick={() => onDelete(document)}><Trash2 size={15} /></button>}
      </div></div>
    </article>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}
