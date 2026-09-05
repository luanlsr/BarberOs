import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionContext } from '../../../../lib/auth/server';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    tenantId?: string;
    branchId?: string;
  } | null;
  if (!body?.tenantId || !body.branchId)
    return NextResponse.json({ code: 'INVALID_WORKSPACE' }, { status: 400 });
  const session = await getSessionContext(body.tenantId, body.branchId);
  if (!session) return NextResponse.json({ code: 'WORKSPACE_DENIED' }, { status: 403 });
  (await cookies()).set('barberos-branch-id', body.branchId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return NextResponse.json({ session });
}
