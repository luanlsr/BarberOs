import { NextResponse } from 'next/server';
import { authorize } from '@barberos/permissions';
import { getRequestContext, createSupabaseServerClient } from '../../../../lib/auth/server';
import { recordAuditEvent } from '../../../../lib/audit';

export async function POST(request: Request) {
  const context = await getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
  );
  if (!context) return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    label?: string;
    branchId?: string;
  } | null;
  const branchId = body?.branchId ?? context.branchScope[0];
  try {
    authorize(context, { permission: 'settings.read', branchId });
    const client = await createSupabaseServerClient();
    if (client) {
      const { error } = await client.from('foundation_probe').insert({
        tenant_id: context.tenantId,
        branch_id: branchId,
        label: body?.label ?? 'foundation-probe',
      });
      if (error) return NextResponse.json({ code: 'PERSISTENCE_FAILED' }, { status: 500 });
    }
    await recordAuditEvent({
      tenantId: context.tenantId,
      actorType: 'USER',
      actorId: context.userId,
      action: 'foundation.probe.create',
      entityType: 'foundation_probe',
      result: 'SUCCESS',
      requestId: context.requestId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEvent({
      tenantId: context.tenantId,
      actorType: 'USER',
      actorId: context.userId,
      action: 'foundation.probe.create',
      entityType: 'foundation_probe',
      result: 'DENIED',
      requestId: context.requestId,
    });
    const code =
      error instanceof Error && 'code' in error ? String(error.code) : 'PERMISSION_DENIED';
    return NextResponse.json({ code }, { status: 403 });
  }
}
