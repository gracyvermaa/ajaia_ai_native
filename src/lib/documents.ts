import type { JSONContent } from '@tiptap/react'
import type { DocumentPerson, DocumentRecord } from '../types'
import { createDocumentInsertPayload } from './documentUtils'
import { getShareUserMessage, getSupabaseUserMessage, logSupabaseFailure } from './supabaseErrors'
import { readJwtIdentity } from './jwtIdentity'
import { supabase } from './supabase'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add the required VITE_SUPABASE variables.')
  return supabase
}

export async function listDocuments(userId: string, view: 'mine' | 'shared'): Promise<DocumentRecord[]> {
  const client = requireSupabase()
  let query = client.from('documents').select('id,title,content_json,owner_id,created_at,updated_at')
  query = view === 'mine' ? query.eq('owner_id', userId) : query.neq('owner_id', userId)
  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) throw error
  return data as DocumentRecord[]
}

export async function createDocument(title: string, content?: JSONContent): Promise<DocumentRecord> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) {
    logSupabaseFailure('create_document.authenticated_user', authError)
    throw authError
  }
  if (!authData.user) throw new Error('Sign in before creating a document.')

  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) {
    logSupabaseFailure('create_document.session', sessionError)
    throw sessionError
  }
  const session = sessionData.session
  const jwtIdentity = session
    ? readJwtIdentity(session.access_token)
    : null
  const jwtSubjectMatchesUser = jwtIdentity?.subject === authData.user.id
  const jwtRoleIsAuthenticated = jwtIdentity?.role === 'authenticated'
  if (!session || !jwtSubjectMatchesUser || !jwtRoleIsAuthenticated) {
    console.error('[Ajaia Docs] Document insert blocked: Supabase session identity check failed', {
      operation: 'create_document.identity_check',
      category: 'authentication',
      authenticated_user_matches_jwt_subject: jwtSubjectMatchesUser,
      jwt_role_is_authenticated: jwtRoleIsAuthenticated,
    })
    throw new Error('Your sign-in session could not be verified. Sign out, sign in again, and retry.')
  }

  const payload = createDocumentInsertPayload(title, authData.user.id, content)
  const ownerMatchesAuthenticatedUser = payload.owner_id === authData.user.id
  if (!ownerMatchesAuthenticatedUser) {
    console.error('[Ajaia Docs] Document insert blocked: verified user and owner_id differ', {
      operation: 'create_document.identity_check',
      category: 'authentication',
      owner_matches_authenticated_user: false,
    })
    throw new Error('Your sign-in changed. Refresh the page and try creating the document again.')
  }

  const { data, error } = await client.from('documents').insert(payload)
    .setHeader('Authorization', `Bearer ${session.access_token}`)
    .select('id,title,content_json,owner_id,created_at,updated_at').single()
  if (error) {
    logSupabaseFailure('create_document.insert', error, {
      authenticated_user_verified: true,
      owner_matches_authenticated_user: ownerMatchesAuthenticatedUser,
      authenticated_user_matches_jwt_subject: jwtSubjectMatchesUser,
      jwt_role_is_authenticated: jwtRoleIsAuthenticated,
    })
    const userMessage = getSupabaseUserMessage(error)
    if (userMessage) throw new Error(userMessage)
    throw error
  }
  return data as DocumentRecord
}

export async function updateDocument(id: string, updates: { title: string; content_json: JSONContent }): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('documents').update({
    title: updates.title.trim(),
    content_json: updates.content_json,
  }).eq('id', id)
  if (error) throw error
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await requireSupabase().from('documents').delete().eq('id', id)
  if (error) throw error
}

export async function getDocumentPeople(documentId: string): Promise<DocumentPerson[]> {
  const { data, error } = await requireSupabase().rpc('get_document_people', { p_document_id: documentId })
  if (error) throw error
  return data as DocumentPerson[]
}

export async function shareDocument(documentId: string, email: string, permission: 'editor' | 'viewer'): Promise<void> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) {
    logSupabaseFailure('share_document.authenticated_user', authError)
    throw new Error('Could not verify your account. Sign in again and retry.')
  }
  if (!authData.user?.email) {
    throw new Error('Sign in with an email account before sharing a document.')
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === authData.user.email.trim().toLowerCase()) {
    throw new Error('You cannot share a document with your own account.')
  }

  const { error } = await client.rpc('share_document_with_email', {
    p_document_id: documentId,
    p_email: normalizedEmail,
    p_permission: permission,
  })
  if (error) {
    logSupabaseFailure('share_document.grant_access', error)
    throw new Error(getShareUserMessage(error))
  }
}

export async function revokeDocumentShare(documentId: string, userId: string): Promise<void> {
  const { error } = await requireSupabase().from('document_shares')
    .delete().eq('document_id', documentId).eq('shared_with_user_id', userId)
  if (error) throw error
}
