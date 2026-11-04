import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JSONContent } from '@tiptap/react'
import { documentToMarkdown, downloadMarkdown, markdownFilename } from './markdownExport'

const formattedDocument: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Important', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' detail', marks: [{ type: 'italic' }] },
        { type: 'text', text: ' underline', marks: [{ type: 'underline' }] },
      ],
    },
    {
      type: 'orderedList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] }],
    },
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] }],
    },
  ],
}

afterEach(() => vi.restoreAllMocks())

describe('Markdown export', () => {
  it('preserves headings, paragraphs, inline formatting, and ordered and unordered lists', () => {
    expect(documentToMarkdown('Project notes', formattedDocument)).toBe(
      '# Project notes\n\n## Overview\n\n**Important** _detail_ <u>underline</u>\n\n1. First\n\n- Second\n',
    )
  })

  it('exports an empty document as a title-only Markdown file', () => {
    expect(documentToMarkdown('Empty', { type: 'doc', content: [{ type: 'paragraph' }] }))
      .toBe('# Empty\n')
  })

  it('sanitizes the download filename', () => {
    expect(markdownFilename('Notes: Q4 / Draft?')).toBe('Notes-Q4-Draft.md')
  })

  it('downloads the generated Markdown as a .md file', () => {
    const createObjectURL = vi.fn((blob: Blob | MediaSource) => blob ? 'blob:markdown' : '')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    downloadMarkdown('Project notes', formattedDocument)

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:markdown')
  })
})
