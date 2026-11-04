export type JwtIdentity = {
  subject: string
  role: string
}

export function readJwtIdentity(accessToken: string): JwtIdentity | null {
  const encodedPayload = accessToken.split('.')[1]
  if (!encodedPayload) return null

  try {
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      sub?: unknown
      role?: unknown
    }
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') return null
    return { subject: payload.sub, role: payload.role }
  } catch {
    return null
  }
}
