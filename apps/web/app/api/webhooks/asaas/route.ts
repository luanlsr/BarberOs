import { NextResponse } from 'next/server';
import { parseServerEnv } from '@barberos/config';
import { processAsaasWebhook } from '../../../../lib/billing/checkout';

export async function POST(request: Request) {
  let env: ReturnType<typeof parseServerEnv>;
  try {
    env = parseServerEnv(process.env);
  } catch (error) {
    console.error('[BarberOS billing] Invalid webhook environment:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (env.ASAAS_WEBHOOK_TOKEN) {
    const token = request.headers.get('asaas-access-token');
    if (token !== env.ASAAS_WEBHOOK_TOKEN) {
      console.warn('[BarberOS billing] Rejected Asaas webhook with invalid token.');
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const result = await processAsaasWebhook(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[BarberOS billing] Failed to process Asaas webhook:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
