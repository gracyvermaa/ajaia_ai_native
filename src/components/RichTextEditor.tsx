import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import type { JSONContent } from '@tiptap/react'
import { FormattingToolbar } from './FormattingToolbar'

type Props = {
  content: JSONContent
  editable: boolean
  onChange: (content: JSONContent) => void
}

export function RichTextEditor({ content, editable, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON()),
    editorProps: {
      attributes: {
        'aria-label': 'Document editor',
        class: 'ProseMirror document-prose',
      },
    },
  }, [content.type])

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable)
  }, [editor, editable])
  return (
    <div className={`editor-workspace ${editable ? '' : 'editor-readonly'}`}>
      <FormattingToolbar editor={editor} disabled={!editable} />
      <div className="page-scroll"><div className="editor-page">
        <EditorContent editor={editor} />
      </div></div>
    </div>
  )
}
