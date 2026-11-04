import { describe, expect, it } from 'vitest'
import { readJwtIdentity } from './jwtIdentity'

function encodePayload(payload: object) {
  return btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

describe('readJwtIdentity', () => {
  it('reads only subject and role claims from a JWT', () => {
    const payload = encodePayload({
      sub: 'user-id',
      role: 'authenticated',
      email: 'private@example.test',
      secret: 'must-not-be-returned',
    })
    expect(readJwtIdentity(`header.${payload}.signature`)).toEqual({
      subject: 'user-id',
      role: 'authenticated',
    })
  })

  it('rejects malformed or incomplete JWT payloads', () => {
    expect(readJwtIdentity('not-a-jwt')).toBeNull()
    expect(readJwtIdentity(`header.${encodePayload({ role: 'authenticated' })}.signature`)).toBeNull()
  })
})
