import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/auth/server';

export async function POST() {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut();
  return NextResponse.json({ ok: true });
}
