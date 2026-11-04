import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser, getSession: mocks.getSession },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

import {
  createDocument,
  deleteDocument,
  getDocumentPeople,
  listDocuments,
  revokeDocumentShare,
  shareDocument,
  updateDocument,
} from './documents'

describe('createDocument', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    const payload = btoa(JSON.stringify({ sub: 'verified-user', role: 'authenticated' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: `header.${payload}.signature` } },
      error: null,
    })
  })

  it('uses the verified Supabase user id in the insert and returns the saved row', async () => {
    const accessToken = `header.${btoa(JSON.stringify({ sub: 'verified-user', role: 'authenticated' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`
    const savedDocument = {
      id: 'doc-1',
      title: 'Notes',
      content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
      owner_id: 'verified-user',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
    const single = vi.fn().mockResolvedValue({ data: savedDocument, error: null })
    const select = vi.fn(() => ({ single }))
    const setHeader = vi.fn(() => ({ select }))
    const insert = vi.fn(() => ({ setHeader }))
    mocks.from.mockReturnValue({ insert })

    await expect(createDocument(' Notes ')).resolves.toEqual(savedDocument)
    expect(mocks.from).toHaveBeenCalledWith('documents')
    expect(insert).toHaveBeenCalledWith({
      title: 'Notes',
      content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
      owner_id: 'verified-user',
    })
    expect(setHeader).toHaveBeenCalledWith('Authorization', `Bearer ${accessToken}`)
    expect(select).toHaveBeenCalledWith('id,title,content_json,owner_id,created_at,updated_at')
  })

  it('keeps a caller-supplied content owner id from overriding the authenticated owner', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
    const content = {
      type: 'doc',
      attrs: { owner_id: 'untrusted-owner' },
      content: [{ type: 'paragraph' }],
    }
    const single = vi.fn().mockResolvedValue({
      data: { id: 'doc-1', title: 'Notes', content_json: content, owner_id: 'verified-user' },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const setHeader = vi.fn(() => ({ select }))
    const insert = vi.fn(() => ({ setHeader }))
    mocks.from.mockReturnValue({ insert })

    await createDocument('Notes', content)

    expect(insert).toHaveBeenCalledWith({
      title: 'Notes',
      content_json: content,
      owner_id: 'verified-user',
    })
  })

  it('does not attempt an insert when Supabase has no authenticated user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(createDocument('Notes')).rejects.toThrow('Sign in before creating a document.')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('rejects creation client-side when there is no session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(createDocument('Notes')).rejects.toThrow('Your sign-in session could not be verified.')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('maps a 42501 RLS insert rejection to a clear message', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        message: 'new row violates row-level security policy for table "documents"',
      },
    })
    const select = vi.fn(() => ({ single }))
    const setHeader = vi.fn(() => ({ select }))
    const insert = vi.fn(() => ({ setHeader }))
    mocks.from.mockReturnValue({ insert })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(createDocument('Notes')).rejects.toThrow(
      'You do not have permission to create this document. Please check the document access policies.',
    )
  })

  it('blocks an insert when the JWT subject differs from the verified Supabase user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
    const payload = btoa(JSON.stringify({ sub: 'different-user', role: 'authenticated' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: `header.${payload}.signature` } },
      error: null,
    })

    await expect(createDocument('Notes')).rejects.toThrow('Your sign-in session could not be verified.')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('fetches owned and shared document lists through the authenticated client query', async () => {
    const result = [{ id: 'doc-1', owner_id: 'user-1' }]
    const order = vi.fn().mockResolvedValue({ data: result, error: null })
    const eq = vi.fn(() => ({ order }))
    const neq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq, neq }))
    mocks.from.mockReturnValue({ select })

    await expect(listDocuments('user-1', 'mine')).resolves.toEqual(result)
    expect(eq).toHaveBeenCalledWith('owner_id', 'user-1')
    await expect(listDocuments('user-1', 'shared')).resolves.toEqual(result)
    expect(neq).toHaveBeenCalledWith('owner_id', 'user-1')
  })

  it('updates and deletes documents through the Supabase table client', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const deleteRows = vi.fn(() => ({ eq }))
    mocks.from.mockReturnValue({ update, delete: deleteRows })

    await expect(updateDocument('doc-1', {
      title: 'Renamed',
      content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
    })).resolves.toBeUndefined()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Renamed' }))
    expect(eq).toHaveBeenCalledWith('id', 'doc-1')

    await expect(deleteDocument('doc-1')).resolves.toBeUndefined()
    expect(deleteRows).toHaveBeenCalledOnce()
  })

  it('grants Editor access to a different registered user through the secured RPC', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-1', email: 'owner@example.test' } },
      error: null,
    })
    mocks.rpc.mockResolvedValue({ data: null, error: null })

    await expect(shareDocument('doc-1', 'editor@example.test', 'editor')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('share_document_with_email', {
      p_document_id: 'doc-1',
      p_email: 'editor@example.test',
      p_permission: 'editor',
    })
  })

  it('grants Viewer access to a different registered user through the secured RPC', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-1', email: 'owner@example.test' } },
      error: null,
    })
    mocks.rpc.mockResolvedValue({ data: null, error: null })

    await expect(shareDocument('doc-1', 'viewer@example.test', 'viewer')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('share_document_with_email', {
      p_document_id: 'doc-1',
      p_email: 'viewer@example.test',
      p_permission: 'viewer',
    })
  })

  it('rejects self-sharing before calling the RPC', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-1', email: 'Owner@Example.test' } },
      error: null,
    })

    await expect(shareDocument('doc-1', ' owner@example.test ', 'editor'))
      .rejects.toThrow('You cannot share a document with your own account.')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('handles a repeated share through the RPC upsert, allowing permission changes', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-1', email: 'owner@example.test' } },
      error: null,
    })
    mocks.rpc.mockResolvedValue({ data: null, error: null })

    await expect(shareDocument('doc-1', 'person@example.test', 'editor')).resolves.toBeUndefined()
    await expect(shareDocument('doc-1', 'person@example.test', 'viewer')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'share_document_with_email', {
      p_document_id: 'doc-1',
      p_email: 'person@example.test',
      p_permission: 'viewer',
    })
  })

  it('reports unauthorized sharing attempts without bypassing server authorization', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'collaborator-1', email: 'collaborator@example.test' } },
      error: null,
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Only the document owner can manage access.' },
    })

    await expect(shareDocument('doc-1', 'other@example.test', 'editor'))
      .rejects.toThrow('Only the document owner can grant or revoke access.')
    expect(mocks.rpc).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      '[Ajaia Docs] Supabase operation failed',
      expect.objectContaining({ operation: 'share_document.grant_access' }),
    )
  })

  it('uses the database RPC for collaborator listing and owner-filtered share revocation', async () => {
    const collaborators = [{ user_id: 'user-1', email: 'owner@example.test', permission: 'owner', is_owner: true }]
    mocks.rpc.mockResolvedValue({ data: collaborators, error: null })
    await expect(getDocumentPeople('doc-1')).resolves.toEqual(collaborators)
    expect(mocks.rpc).toHaveBeenCalledWith('get_document_people', { p_document_id: 'doc-1' })

    mocks.rpc.mockResolvedValue({ data: null, error: null })
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-1', email: 'owner@example.test' } },
      error: null,
    })
    await expect(shareDocument('doc-1', 'reader@example.test', 'viewer')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('share_document_with_email', {
      p_document_id: 'doc-1',
      p_email: 'reader@example.test',
      p_permission: 'viewer',
    })

    const recipientFilter = vi.fn().mockResolvedValue({ error: null })
    const documentFilter = vi.fn(() => ({ eq: recipientFilter }))
    const deleteRows = vi.fn(() => ({ eq: documentFilter }))
    mocks.from.mockReturnValue({ delete: deleteRows })
    await expect(revokeDocumentShare('doc-1', 'user-2')).resolves.toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith('document_shares')
    expect(documentFilter).toHaveBeenCalledWith('document_id', 'doc-1')
    expect(recipientFilter).toHaveBeenCalledWith('shared_with_user_id', 'user-2')
  })

})
