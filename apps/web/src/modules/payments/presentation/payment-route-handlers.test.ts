import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { Payment, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/payment-service';
import { createPaymentRouteHandlers, type PaymentRouteService } from './payment-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['payments.receive', 'payments.refund'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const payment: Payment = {
  id: 'payment-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  orderId: 'order-1',
  method: 'PIX',
  status: 'PAID',
  amountCents: 8_500,
  changeDueAmountCents: 0,
  idempotencyKey: 'payment-key-1',
  receivedBy: 'user-1',
  receivedAt: '2026-09-07T15:20:00.000Z',
  refundedAmountCents: 0,
  createdAt: '2026-09-07T15:20:00.000Z',
  updatedAt: '2026-09-07T15:20:00.000Z',
};

type MockService = PaymentRouteService & {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  receivePayment: ReturnType<typeof vi.fn>;
  refundPayment: ReturnType<typeof vi.fn>;
};

describe('payment route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createPaymentRouteHandlers>;

  beforeEach(() => {
    service = {
      list: vi.fn(async () => [payment]),
      get: vi.fn(async () => payment),
      receivePayment: vi.fn(async () => ({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        orderId: 'order-1',
        paymentIds: ['payment-1'],
        paidAmountCents: 8_500,
        amountDueCents: 0,
        status: 'PAID' as const,
        idempotencyKey: 'receive-key-1',
      })),
      refundPayment: vi.fn(async () => ({
        ...payment,
        status: 'PARTIALLY_REFUNDED' as const,
        refundedAmountCents: 1_000,
      })),
    };
    handlers = createPaymentRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('lists payments with tenant-safe filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/payments?branchId=branch-1&orderId=order-1&method=PIX&status=PAID&limit=10',
        {
          headers: { 'x-request-id': 'request-1' },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [payment], requestId: 'request-1' });
    expect(service.list).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      orderId: 'order-1',
      method: 'PIX',
      status: 'PAID',
      limit: 10,
    });
  });

  it('receives payments and returns 201', async () => {
    const body = {
      orderId: 'order-1',
      idempotencyKey: 'receive-key-1',
      payments: [{ method: 'PIX', amountCents: 8_500 }],
    };
    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/payments', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ status: 'PAID', amountDueCents: 0 });
    expect(service.receivePayment).toHaveBeenCalledWith(context, body);
  });

  it('refunds a payment through the dynamic route id', async () => {
    const body = { amountCents: 1_000, reason: 'Estorno parcial.', idempotencyKey: 'refund-key-1' };
    const response = await handlers.POST_REFUND(
      new Request('https://barberos.local/api/v1/payments/payment-1/refund', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
      'payment-1',
    );

    expect(response.status).toBe(200);
    expect(service.refundPayment).toHaveBeenCalledWith(context, {
      ...body,
      paymentId: 'payment-1',
    });
  });

  it('returns 401 when context is missing', async () => {
    handlers = createPaymentRouteHandlers({ resolveContext: vi.fn(async () => null), service });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/payments', { method: 'POST', body: '{}' }),
    );

    expect(response.status).toBe(401);
  });

  it('maps validation and duplicate idempotency failures to stable responses', async () => {
    service.receivePayment.mockRejectedValueOnce(new ZodError([]));
    let response: Response = await handlers.POST(
      new Request('https://barberos.local/api/v1/payments', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('CORE_VALIDATION_ERROR');

    service.receivePayment.mockRejectedValueOnce(
      new CoreOperationsApplicationError('PAYMENT_IDEMPOTENCY_CONFLICT', 'Payment retry conflict.'),
    );
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/payments', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({
      code: 'PAYMENT_IDEMPOTENCY_CONFLICT',
      message: 'Payment request conflicts with an existing idempotency key.',
    });
  });
});
