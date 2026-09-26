import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/auth/server';
import {
  BARBEROS_SESSION_EXPIRES_AT_COOKIE,
  BARBEROS_SESSION_ID_COOKIE,
  expiredSessionCookieOptions,
} from '../../../../lib/auth/jwt-session';

export async function POST() {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut();

  const response = NextResponse.json({ ok: true });
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name === 'barberos-branch-id' ||
      cookie.name === BARBEROS_SESSION_ID_COOKIE ||
      cookie.name === BARBEROS_SESSION_EXPIRES_AT_COOKIE
    ) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      });
    }
  }
  response.cookies.set(BARBEROS_SESSION_ID_COOKIE, '', expiredSessionCookieOptions());
  response.cookies.set(BARBEROS_SESSION_EXPIRES_AT_COOKIE, '', expiredSessionCookieOptions());
  return response;
}
