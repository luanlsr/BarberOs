import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { parseServerEnv } from '@barberos/config';

const PUBLIC_FILE_PATTERN = /\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|webmanifest|txt|xml)$/i;

function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname === '/robots.txt' ||
    PUBLIC_FILE_PATTERN.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const publicPath = isPublicPath(request.nextUrl.pathname);

  let env: ReturnType<typeof parseServerEnv>;
  try {
    env = parseServerEnv(process.env);
  } catch (error) {
    if (publicPath) return NextResponse.next();
    console.error('[BarberOS auth] Invalid Supabase environment:', error);
    return NextResponse.redirect(new URL('/login', request.url));
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
    data: { user },
  } = await client.auth.getUser();
  if (!user && !publicPath) return NextResponse.redirect(new URL('/login', request.url));
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|robots.txt).*)',
  ],
};
