import { describe, expect, it, vi } from 'vitest'
import { getShareUserMessage, getSupabaseFailureDetails, getSupabaseUserMessage, logSupabaseFailure } from './supabaseErrors'

describe('Supabase failure diagnostics', () => {
  it('distinguishes RLS, SQL privilege, and authentication failures', () => {
    expect(getSupabaseFailureDetails({ code: '42501', message: 'new row violates row-level security policy' }).category).toBe('row_level_security')
    expect(getSupabaseFailureDetails({ code: '42501', message: 'permission denied for table documents' }).category).toBe('database_privilege')
    expect(getSupabaseFailureDetails({ status: 401, message: 'Invalid JWT' }).category).toBe('authentication')
  })

  it('maps an RLS rejection to a clear user-facing message', () => {
    expect(getSupabaseUserMessage({
      code: '42501',
      message: 'new row violates row-level security policy for table "documents"',
    })).toBe('You do not have permission to create this document. Please check the document access policies.')
    expect(getSupabaseUserMessage({
      code: '42501',
      message: 'permission denied for table documents',
    })).toBeUndefined()
  })

  it('maps safe sharing errors to useful messages', () => {
    expect(getShareUserMessage({ message: 'Only the document owner can manage access.' }))
      .toBe('Only the document owner can grant or revoke access.')
    expect(getShareUserMessage({ message: 'No registered Ajaia Docs user was found with that email.' }))
      .toBe('No registered Ajaia Docs user was found with that email.')
    expect(getShareUserMessage({ message: 'You already own this document.' }))
      .toBe('You cannot share a document with your own account.')
    expect(getShareUserMessage({ message: 'new row violates row-level security policy' }))
      .toBe('You do not have permission to share this document.')
  })

  it('redacts credentials and logs only safe error metadata', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature'
    const details = getSupabaseFailureDetails({ code: '42501', message: `Failure Bearer secret ${token} sb_secret_private` })
    expect(details.message).not.toContain('secret')
    expect(details.message).not.toContain(token)
    logSupabaseFailure('create_document.insert', {
      code: '42501',
      message: 'permission denied for table documents',
      hint: `Authorization: Bearer ${token}`,
    })
    expect(log).toHaveBeenCalledWith('[Ajaia Docs] Supabase operation failed', expect.objectContaining({
      operation: 'create_document.insert',
      category: 'database_privilege',
      code: '42501',
      hint: 'Authorization: Bearer [redacted]',
    }))
  })
})
