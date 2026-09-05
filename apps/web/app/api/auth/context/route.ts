import { NextResponse } from 'next/server';
import { getSessionContext } from '../../../../lib/auth/server';

export async function GET() {
  const session = await getSessionContext();
  return session
    ? NextResponse.json({ session })
    : NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
}
