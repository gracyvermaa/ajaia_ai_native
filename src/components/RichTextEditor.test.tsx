import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import type { JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { FormattingToolbar } from './FormattingToolbar'
import { RichTextEditor } from './RichTextEditor'

let editor: Editor | undefined

afterEach(() => {
  cleanup()
  editor?.destroy()
  editor = undefined
})

function createEditor(content: JSONContent) {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit],
    content,
  })
  return editor
}

function dispatchKey(key: string, keyCode: number, modifiers: { ctrlKey?: boolean; shiftKey?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    keyCode,
    which: keyCode,
    bubbles: true,
    ...modifiers,
  })
  editor?.view.dom.dispatchEvent(event)
}

describe('rich text editor', () => {
  it('renders an editable document surface and formatting toolbar', () => {
    render(<RichTextEditor content={{ type: 'doc', content: [{ type: 'paragraph' }] }} editable onChange={() => undefined} />)
    expect(screen.getByRole('toolbar', { name: 'Formatting toolbar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Document editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })

  it('toggles italic from the toolbar, supports Ctrl+I, and restores the saved mark', () => {
    const activeEditor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Italic text' }] }],
    })
    render(<FormattingToolbar editor={activeEditor} />)

    activeEditor.commands.selectAll()
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }))

    let savedContent = activeEditor.getJSON()
    expect(savedContent.content?.[0].content?.[0].marks).toEqual([{ type: 'italic' }])
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true')

    activeEditor.commands.selectAll()
    dispatchKey('i', 73, { ctrlKey: true })
    savedContent = activeEditor.getJSON()
    expect(savedContent.content?.[0].content?.[0].marks).toBeUndefined()
    expect(activeEditor.isActive('italic')).toBe(false)

    activeEditor.commands.selectAll()
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }))
    savedContent = activeEditor.getJSON()
    cleanup()
    render(<RichTextEditor content={savedContent} editable onChange={() => undefined} />)
    expect(screen.getByLabelText('Document editor').querySelector('em')?.textContent).toBe('Italic text')
  })

  it.each([
    { label: 'Numbered list', type: 'orderedList', selector: 'ol' },
    { label: 'Bulleted list', type: 'bulletList', selector: 'ul' },
  ])('creates a $type, continues on Enter, exits on double Enter, and restores saved JSON', ({ label, type, selector }) => {
    const activeEditor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
    render(<FormattingToolbar editor={activeEditor} />)

    fireEvent.click(screen.getByRole('button', { name: label }))
    activeEditor.commands.insertContent('first')
    dispatchKey('Enter', 13)
    activeEditor.commands.insertContent('second')
    dispatchKey('Enter', 13)
    activeEditor.commands.insertContent('third')

    let savedContent = activeEditor.getJSON()
    expect(savedContent.content?.[0].type).toBe(type)
    expect(savedContent.content?.[0].content).toHaveLength(3)
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true')

    dispatchKey('Enter', 13)
    dispatchKey('Enter', 13)
    savedContent = activeEditor.getJSON()
    expect(savedContent.content?.[0].type).toBe(type)
    expect(savedContent.content?.[1]?.type).toBe('paragraph')

    cleanup()
    render(<RichTextEditor content={savedContent} editable onChange={() => undefined} />)
    const reopenedEditor = screen.getByLabelText('Document editor')
    const list = reopenedEditor.querySelector(selector)
    expect(list?.querySelectorAll('li')).toHaveLength(3)
    expect(list?.textContent).toBe('firstsecondthird')
    expect(reopenedEditor.lastElementChild?.matches('p')).toBe(true)
  })
})
