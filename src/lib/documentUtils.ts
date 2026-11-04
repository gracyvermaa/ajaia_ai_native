import type { JSONContent } from '@tiptap/react'
import type { DocumentRecord } from '../types'

export const EMPTY_DOCUMENT: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

export function validateDocumentTitle(title: string): string | null {
  const normalized = title.trim()
  if (!normalized) return 'Give your document a name.'
  if (normalized.length > 120) return 'Document names must be 120 characters or fewer.'
  return null
}

export function validateImportFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'txt' && extension !== 'md') return 'Choose a .txt or .md file.'
  if (file.size > 5 * 1024 * 1024) return 'Files must be 5 MB or smaller.'
  return null
}

export function markdownToDocument(markdown: string): JSONContent {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const content: JSONContent[] = []
  for (let index = 0; index < lines.length;) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: [{ type: 'text', text: heading[2] }],
      })
      index += 1
      continue
    }
    const isBullet = /^\s*[-*+]\s+/.test(line)
    const isNumbered = /^\s*\d+[.)]\s+/.test(line)
    if (isBullet || isNumbered) {
      const listType = isBullet ? 'bulletList' : 'orderedList'
      const items: JSONContent[] = []
      while (index < lines.length && (isBullet
        ? /^\s*[-*+]\s+/.test(lines[index])
        : /^\s*\d+[.)]\s+/.test(lines[index]))) {
        const text = lines[index].replace(isBullet ? /^\s*[-*+]\s+/ : /^\s*\d+[.)]\s+/, '')
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
        index += 1
      }
      content.push({ type: listType, content: items })
      continue
    }
    content.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
    index += 1
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

export function canEditDocument(document: Pick<DocumentRecord, 'owner_id'>, userId: string, permission?: string): boolean {
  return document.owner_id === userId || permission === 'editor'
}

export function createDocumentInput(title: string) {
  const error = validateDocumentTitle(title)
  if (error) throw new Error(error)
  return { title: title.trim(), content_json: EMPTY_DOCUMENT }
}

export function createDocumentInsertPayload(
  title: string,
  ownerId: string,
  content?: JSONContent,
) {
  const input = createDocumentInput(title)
  return {
    title: input.title,
    content_json: content ?? input.content_json,
    owner_id: ownerId,
  }
}
