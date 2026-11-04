type SupabaseErrorLike = {
  code?: unknown
  status?: unknown
  message?: unknown
  hint?: unknown
}

export type SupabaseFailureCategory =
  | 'row_level_security'
  | 'database_privilege'
  | 'authentication'
  | 'other'

export function getSupabaseFailureDetails(error: unknown) {
  const candidate = (typeof error === 'object' && error !== null ? error : {}) as SupabaseErrorLike
  const code = typeof candidate.code === 'string' ? candidate.code : undefined
  const status = typeof candidate.status === 'number' ? candidate.status : undefined
  const message = typeof candidate.message === 'string' ? redactCredentials(candidate.message) : 'Unknown Supabase error'
  const hint = typeof candidate.hint === 'string' ? redactCredentials(candidate.hint) : undefined
  const normalizedMessage = message.toLowerCase()

  let category: SupabaseFailureCategory = 'other'
  if (normalizedMessage.includes('row-level security')) {
    category = 'row_level_security'
  } else if (normalizedMessage.includes('permission denied') || code === '42501') {
    category = 'database_privilege'
  } else if (
    status === 401
    || code === 'PGRST301'
    || normalizedMessage.includes('jwt')
    || normalizedMessage.includes('invalid api key')
  ) {
    category = 'authentication'
  }

  return { category, code, status, message, hint }
}

export function getSupabaseUserMessage(error: unknown): string | undefined {
  const { category } = getSupabaseFailureDetails(error)
  if (category === 'row_level_security') {
    return 'You do not have permission to create this document. Please check the document access policies.'
  }
  return undefined
}

export function getShareUserMessage(error: unknown): string {
  const { message } = getSupabaseFailureDetails(error)
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('only the document owner can manage access')) {
    return 'Only the document owner can grant or revoke access.'
  }
  if (normalizedMessage.includes('no registered ajaia docs user was found')) {
    return 'No registered Ajaia Docs user was found with that email.'
  }
  if (normalizedMessage.includes('you already own this document')) {
    return 'You cannot share a document with your own account.'
  }
  if (normalizedMessage.includes('choose editor or viewer access')) {
    return 'Choose Editor or Viewer access and try again.'
  }
  if (normalizedMessage.includes('row-level security')) {
    return 'You do not have permission to share this document.'
  }
  return 'Could not share this document. Please try again.'
}

export function logSupabaseFailure(
  operation: string,
  error: unknown,
  context?: Record<string, boolean>,
) {
  const details = getSupabaseFailureDetails(error)
  console.error('[Ajaia Docs] Supabase operation failed', { operation, ...details, ...context })
}

function redactCredentials(value: string) {
  return value
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted JWT]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/g, '[redacted Supabase key]')
}
