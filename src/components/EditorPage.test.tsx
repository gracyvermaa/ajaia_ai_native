import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentPerson, DocumentRecord } from '../types'
import { EditorPage } from './EditorPage'

const mocks = vi.hoisted(() => ({
  downloadMarkdown: vi.fn(),
  getDocumentPeople: vi.fn(),
  updateDocument: vi.fn(),
}))

vi.mock('../lib/documents', () => ({
  getDocumentPeople: mocks.getDocumentPeople,
  updateDocument: mocks.updateDocument,
}))

vi.mock('../lib/markdownExport', () => ({
  downloadMarkdown: mocks.downloadMarkdown,
}))

vi.mock('./RichTextEditor', () => ({
  RichTextEditor: () => <div data-testid="rich-text-editor" />,
}))

vi.mock('./ShareDialog', () => ({
  ShareDialog: () => null,
}))

const owner: User = {
  id: 'owner-1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'owner@example.test',
}

const documentRecord: DocumentRecord = {
  id: 'document-1',
  title: 'Untitled document',
  content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
  owner_id: owner.id,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderEditor(document = documentRecord, user = owner) {
  return render(<EditorPage document={document} user={user} onBack={vi.fn()} onShareUpdate={vi.fn()} />)
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateDocument.mockResolvedValue(undefined)
  mocks.getDocumentPeople.mockResolvedValue([] satisfies DocumentPerson[])
})

describe('EditorPage document title', () => {
  it('opens an inline input prepopulated with the current title and saves on Enter', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Edit document title' }))
    const input = screen.getByRole('textbox', { name: 'Document title' })
    expect(input).toHaveValue('Untitled document')

    await user.clear(input)
    await user.type(input, '  Project notes  ')
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledWith('document-1', {
      title: 'Project notes',
      content_json: documentRecord.content_json,
    }))
    expect(screen.getByRole('button', { name: 'Edit document title' })).toHaveTextContent('Project notes')
    expect(screen.queryByRole('textbox', { name: 'Document title' })).not.toBeInTheDocument()
  })

  it('saves on blur and shows a saving indicator while the update is pending', async () => {
    const user = userEvent.setup()
    let finishUpdate: (() => void) | undefined
    mocks.updateDocument.mockReturnValue(new Promise<void>((resolve) => { finishUpdate = resolve }))
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Edit document title' }))
    const input = screen.getByRole('textbox', { name: 'Document title' })
    await user.clear(input)
    await user.type(input, 'Renamed on blur')
    fireEvent.blur(input)

    expect(await screen.findByText('Saving')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Document title' })).toHaveValue('Renamed on blur')
    finishUpdate?.()

    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Document title' })).not.toBeInTheDocument())
    expect(mocks.updateDocument).toHaveBeenCalledWith('document-1', expect.objectContaining({ title: 'Renamed on blur' }))
  })

  it('cancels the draft on Escape without saving', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Edit document title' }))
    const input = screen.getByRole('textbox', { name: 'Document title' })
    await user.clear(input)
    await user.type(input, 'Discard this')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByRole('button', { name: 'Edit document title' })).toHaveTextContent('Untitled document')
    expect(mocks.updateDocument).not.toHaveBeenCalled()
  })

  it('rejects an empty title and leaves the input available for correction', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Edit document title' }))
    const input = screen.getByRole('textbox', { name: 'Document title' })
    await user.clear(input)
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Give your document a name.')
    expect(screen.getByRole('textbox', { name: 'Document title' })).toBeInTheDocument()
    expect(mocks.updateDocument).not.toHaveBeenCalled()
  })

  it('uses the saved title when the document is reopened', async () => {
    const user = userEvent.setup()
    const { unmount } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Edit document title' }))
    const input = screen.getByRole('textbox', { name: 'Document title' })
    await user.clear(input)
    await user.type(input, 'Persistent title')
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalled())

    unmount()
    renderEditor({ ...documentRecord, title: 'Persistent title' })
    expect(screen.getByRole('button', { name: 'Edit document title' })).toHaveTextContent('Persistent title')
  })

  it('prints the current document when Export as PDF is clicked', async () => {
    const user = userEvent.setup()
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Export as PDF' }))

    expect(print).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Untitled document' })).toHaveClass('print-document-title')
    print.mockRestore()
  })

  it('exports the current title and content as Markdown with a local-only presence indicator', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Export as Markdown' }))

    expect(mocks.downloadMarkdown).toHaveBeenCalledWith(documentRecord.title, documentRecord.content_json)
    expect(screen.getByLabelText('Local presence: one session, you')).toHaveTextContent('1 local session · You')
  })

  it('lets an authorized editor rename but keeps viewer titles non-editable', async () => {
    const editorUser: User = { ...owner, id: 'editor-1' }
    mocks.getDocumentPeople.mockResolvedValue([
      { user_id: editorUser.id, email: 'editor@example.test', permission: 'editor', is_owner: false },
    ] satisfies DocumentPerson[])
    const user = userEvent.setup()
    const { rerender } = renderEditor({ ...documentRecord, owner_id: 'another-owner' }, editorUser)

    await user.click(await screen.findByRole('button', { name: 'Edit document title' }))
    expect(screen.getByRole('textbox', { name: 'Document title' })).toBeInTheDocument()

    const viewer: User = { ...owner, id: 'viewer-1' }
    mocks.getDocumentPeople.mockResolvedValue([
      { user_id: viewer.id, email: 'viewer@example.test', permission: 'viewer', is_owner: false },
    ] satisfies DocumentPerson[])
    rerender(<EditorPage document={{ ...documentRecord, owner_id: 'another-owner' }} user={viewer} onBack={vi.fn()} onShareUpdate={vi.fn()} />)
    expect(await screen.findByText('Untitled document')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit document title' })).not.toBeInTheDocument()
  })
})
