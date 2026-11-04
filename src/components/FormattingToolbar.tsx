import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import type { ReactNode } from 'react'
import { Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered, RotateCcw, RotateCw, Underline as UnderlineIcon, Pilcrow } from 'lucide-react'

type Props = { editor: Editor | null; disabled?: boolean }

export function FormattingToolbar({ editor, disabled = false }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor ? {
      paragraph: currentEditor.isActive('paragraph'),
      heading1: currentEditor.isActive('heading', { level: 1 }),
      heading2: currentEditor.isActive('heading', { level: 2 }),
      heading3: currentEditor.isActive('heading', { level: 3 }),
      bold: currentEditor.isActive('bold'),
      italic: currentEditor.isActive('italic'),
      underline: currentEditor.isActive('underline'),
      bulletList: currentEditor.isActive('bulletList'),
      orderedList: currentEditor.isActive('orderedList'),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
    } : null,
  })
  if (!editor || !state) return <div className="format-toolbar" aria-label="Formatting toolbar" />
  const run = (action: () => void) => {
    if (!disabled) action()
  }
  const button = (label: string, icon: ReactNode, active: boolean, action: () => void, unavailable = false) => (
    <button
      key={label}
      type="button"
      className={`toolbar-button ${active ? 'is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled || unavailable}
      onClick={() => run(action)}
    >{icon}</button>
  )
  return (
    <div className="format-toolbar" role="toolbar" aria-label="Formatting toolbar">
      {button('Paragraph', <Pilcrow size={17} />, state.paragraph, () => editor.chain().focus().setParagraph().run())}
      <span className="toolbar-divider" />
      {button('Heading 1', <Heading1 size={18} />, state.heading1, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
      {button('Heading 2', <Heading2 size={18} />, state.heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {button('Heading 3', <Heading3 size={18} />, state.heading3, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      <span className="toolbar-divider" />
      {button('Bold', <Bold size={17} />, state.bold, () => editor.chain().focus().toggleBold().run())}
      {button('Italic', <Italic size={17} />, state.italic, () => editor.chain().focus().toggleItalic().run())}
      {button('Underline', <UnderlineIcon size={17} />, state.underline, () => editor.chain().focus().toggleUnderline().run())}
      <span className="toolbar-divider" />
      {button('Bulleted list', <List size={18} />, state.bulletList, () => editor.chain().focus().toggleBulletList().run())}
      {button('Numbered list', <ListOrdered size={18} />, state.orderedList, () => editor.chain().focus().toggleOrderedList().run())}
      <span className="toolbar-spacer" />
      {button('Undo', <RotateCcw size={16} />, false, () => editor.chain().focus().undo().run(), !state.canUndo)}
      {button('Redo', <RotateCw size={16} />, false, () => editor.chain().focus().redo().run(), !state.canRedo)}
    </div>
  )
}
