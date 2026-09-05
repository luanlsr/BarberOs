import { NextResponse } from 'next/server';
import { getRequestContext } from '../../../../lib/auth/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
  if (!context)
    return NextResponse.json(
      { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
      { status: 401 },
    );
  return NextResponse.json({ context });
}
