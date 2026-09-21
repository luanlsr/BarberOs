import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/auth/server';

export async function POST() {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut();

  const response = NextResponse.json({ ok: true });
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name === 'barberos-branch-id') {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      });
    }
  }
  return response;
}
