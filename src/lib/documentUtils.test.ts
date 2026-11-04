import { describe, expect, it } from 'vitest'
import { canEditDocument, createDocumentInput, createDocumentInsertPayload, markdownToDocument, validateDocumentTitle, validateImportFile } from './documentUtils'

describe('document creation', () => {
  it('creates a normalized document payload with an empty rich-text document', () => {
    expect(createDocumentInput('  Meeting notes  ')).toEqual({
      title: 'Meeting notes',
      content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
    })
  })

  it('rejects blank and overlong titles', () => {
    expect(validateDocumentTitle('  ')).toBe('Give your document a name.')
    expect(validateDocumentTitle('x'.repeat(121))).toContain('120 characters')
    expect(() => createDocumentInput('')).toThrow('Give your document a name.')
  })

  it('builds only schema-supported insert fields with the authenticated owner id', () => {
    const content = { type: 'doc' as const, content: [{ type: 'paragraph' as const }] }
    expect(createDocumentInsertPayload('Notes', 'authenticated-user-id', content)).toEqual({
      title: 'Notes',
      content_json: content,
      owner_id: 'authenticated-user-id',
    })
  })
})

describe('file import validation', () => {
  it('accepts supported text files and rejects other formats and oversized files', () => {
    expect(validateImportFile(new File(['hello'], 'notes.md'))).toBeNull()
    expect(validateImportFile(new File(['hello'], 'notes.docx'))).toContain('.txt or .md')
    const oversized = new File(['x'], 'large.txt')
    Object.defineProperty(oversized, 'size', { value: 5 * 1024 * 1024 + 1 })
    expect(validateImportFile(oversized)).toContain('5 MB')
  })

  it('preserves basic Markdown headings, lists, and paragraphs', () => {
    expect(markdownToDocument('# Plans\n\n- First\n- Second')).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Plans' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
        ] },
      ],
    })
  })
})

describe('document permissions', () => {
  const document = { owner_id: 'owner-1' }

  it('allows owners and editors but not viewers to edit', () => {
    expect(canEditDocument(document, 'owner-1', 'viewer')).toBe(true)
    expect(canEditDocument(document, 'member-2', 'editor')).toBe(true)
    expect(canEditDocument(document, 'member-2', 'viewer')).toBe(false)
  })
})
