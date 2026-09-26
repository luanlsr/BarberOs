import { describe, expect, it } from 'vitest';
import { readJwtSessionMetadata } from './jwt-session';

function encodeBase64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function tokenWithPayload(payload: unknown) {
  return ['header', encodeBase64Url(payload), 'signature'].join('.');
}

describe('readJwtSessionMetadata', () => {
  it('extracts the session id and expiration from a valid JWT payload', () => {
    const metadata = readJwtSessionMetadata(
      tokenWithPayload({ exp: 1_700_000_060, session_id: 'session-123', sub: 'user-123' }),
      1_700_000_000_000,
    );

    expect(metadata).toEqual({
      sessionId: 'session-123',
      sessionExpiresAt: '2023-11-14T22:14:20.000Z',
      maxAgeSeconds: 60,
    });
  });

  it('falls back to jti or sub when session_id is not present', () => {
    expect(
      readJwtSessionMetadata(
        tokenWithPayload({ exp: 1_700_000_060, jti: 'jwt-123' }),
        1_700_000_000_000,
      )?.sessionId,
    ).toBe('jwt-123');
    expect(
      readJwtSessionMetadata(
        tokenWithPayload({ exp: 1_700_000_060, sub: 'user-123' }),
        1_700_000_000_000,
      )?.sessionId,
    ).toBe('user-123');
  });

  it('rejects missing, malformed, or expired tokens', () => {
    expect(readJwtSessionMetadata(null)).toBeNull();
    expect(readJwtSessionMetadata('not-a-jwt')).toBeNull();
    expect(
      readJwtSessionMetadata(
        tokenWithPayload({ exp: 1_700_000_000, session_id: 'old' }),
        1_700_000_000_000,
      ),
    ).toBeNull();
  });
});
