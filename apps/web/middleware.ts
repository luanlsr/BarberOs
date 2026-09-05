import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { parseServerEnv } from '@barberos/config';

export async function middleware(request: NextRequest) {
  const env = parseServerEnv(process.env);
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
  const publicPath =
    request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/auth');
  if (!user && !publicPath) return NextResponse.redirect(new URL('/login', request.url));
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
