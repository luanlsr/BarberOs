import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { parseServerEnv } from '@barberos/config';
import {
  BARBEROS_SESSION_EXPIRES_AT_COOKIE,
  BARBEROS_SESSION_ID_COOKIE,
  expiredSessionCookieOptions,
  readJwtSessionMetadata,
  sessionCookieOptions,
} from './lib/auth/jwt-session';

const PUBLIC_FILE_PATTERN = /\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|webmanifest|txt|xml)$/i;

function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/forgotpassword' ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/checkout') ||
    pathname === '/api/webhooks/asaas' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname === '/robots.txt' ||
    PUBLIC_FILE_PATTERN.test(pathname)
  );
}

function redirectToPublicHome(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(BARBEROS_SESSION_ID_COOKIE, '', expiredSessionCookieOptions());
  response.cookies.set(BARBEROS_SESSION_EXPIRES_AT_COOKIE, '', expiredSessionCookieOptions());
  return response;
}

export async function middleware(request: NextRequest) {
  const publicPath = isPublicPath(request.nextUrl.pathname);

  let env: ReturnType<typeof parseServerEnv>;
  try {
    env = parseServerEnv(process.env);
  } catch (error) {
    if (publicPath) return NextResponse.next();
    console.error('[BarberOS auth] Invalid Supabase environment:', error);
    return redirectToPublicHome(request);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return NextResponse.next();
  const response = NextResponse.next({ request });
  const client = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { session },
  } = await client.auth.getSession();
  const {
    data: { user },
  } = await client.auth.getUser();
  const metadata = readJwtSessionMetadata(session?.access_token);

  if ((!user || !metadata) && !publicPath) return redirectToPublicHome(request);

  if (user && metadata) {
    const options = sessionCookieOptions(metadata.maxAgeSeconds);
    request.cookies.set(BARBEROS_SESSION_ID_COOKIE, metadata.sessionId);
    request.cookies.set(BARBEROS_SESSION_EXPIRES_AT_COOKIE, metadata.sessionExpiresAt);
    response.cookies.set(BARBEROS_SESSION_ID_COOKIE, metadata.sessionId, options);
    response.cookies.set(BARBEROS_SESSION_EXPIRES_AT_COOKIE, metadata.sessionExpiresAt, options);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|robots.txt).*)',
  ],
};
