import { NextResponse } from 'next/server';
import { createCheckoutSession } from '../../../../lib/billing/checkout';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { code: 'INVALID_BODY', message: 'Dados do checkout inválidos.' },
      { status: 400 },
    );
  }

  try {
    const result = await createCheckoutSession({
      planCode: String(body.planCode ?? ''),
      customerName: String(body.customerName ?? ''),
      customerEmail: String(body.customerEmail ?? ''),
      customerPhone: String(body.customerPhone ?? ''),
      document: typeof body.document === 'string' ? body.document : undefined,
      barbershopName: String(body.barbershopName ?? ''),
      branchName: typeof body.branchName === 'string' ? body.branchName : undefined,
      city: typeof body.city === 'string' ? body.city : undefined,
      state: typeof body.state === 'string' ? body.state : undefined,
      employeesCount: typeof body.employeesCount === 'number' ? body.employeesCount : undefined,
      marketingSource: isRecord(body.marketingSource) ? stringifyRecord(body.marketingSource) : {},
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[BarberOS checkout] Failed to create checkout session:', error);
    const message = error instanceof Error ? error.message : 'CHECKOUT_CREATE_FAILED';
    const status = message.includes('ASAAS_API_KEY') ? 503 : 400;
    return NextResponse.json(
      {
        code: status === 503 ? 'CHECKOUT_NOT_CONFIGURED' : 'CHECKOUT_CREATE_FAILED',
        message:
          status === 503
            ? 'Checkout Asaas ainda não foi configurado neste ambiente.'
            : 'Não foi possível iniciar o checkout. Confira os dados e tente novamente.',
      },
      { status },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringifyRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => typeof item === 'string' && item.trim())
      .map(([key, item]) => [key, String(item)]),
  );
}
