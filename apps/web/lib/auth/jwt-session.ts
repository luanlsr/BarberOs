export type JwtSessionMetadata = {
  sessionId: string;
  sessionExpiresAt: string;
  maxAgeSeconds: number;
};

type JwtClaims = {
  exp?: number;
  session_id?: string;
  jti?: string;
  sub?: string;
};

export const BARBEROS_SESSION_ID_COOKIE = 'barberos-session-id';
export const BARBEROS_SESSION_EXPIRES_AT_COOKIE = 'barberos-session-expires-at';

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return globalThis.atob(padded);
}

export function readJwtSessionMetadata(
  accessToken?: string | null,
  nowMs = Date.now(),
): JwtSessionMetadata | null {
  if (!accessToken) return null;
  const [, payload] = accessToken.split('.');
  if (!payload) return null;

  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as JwtClaims;
    if (!claims.exp) return null;
    const expiresAtMs = claims.exp * 1000;
    if (expiresAtMs <= nowMs) return null;
    const maxAgeSeconds = Math.max(1, Math.floor((expiresAtMs - nowMs) / 1000));
    const sessionId = claims.session_id ?? claims.jti ?? claims.sub;
    if (!sessionId) return null;
    return {
      sessionId,
      sessionExpiresAt: new Date(expiresAtMs).toISOString(),
      maxAgeSeconds,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function expiredSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}
