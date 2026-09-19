import { describe, expect, it } from 'vitest';
import type { OrderDetail, Payment, RequestContext } from '@barberos/contracts';
import type { OrderRepository } from '../../orders/domain';
import type { PaymentOutboxProducer, PaymentReceiveResult, PaymentRepository } from '../domain';
import { PaymentApplicationService } from './payment-service';

const context: RequestContext = {
  requestId: 'request-payment-outbox',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['payments.receive', 'orders.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const order: OrderDetail = {
  id: 'order-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'READY_FOR_PAYMENT',
  subtotalAmountCents: 1_000,
  discountAmountCents: 0,
  totalAmountCents: 1_000,
  openedAt: '2026-09-19T10:00:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-19T10:00:00.000Z',
  updatedAt: '2026-09-19T10:00:00.000Z',
  items: [],
  history: [],
};

class FakeOutbox implements PaymentOutboxProducer {
  readonly events = new Map<string, Parameters<PaymentOutboxProducer['createEvent']>[1]>();
  attempts = 0;

  async createEvent(
    _context: RequestContext,
    command: Parameters<PaymentOutboxProducer['createEvent']>[1],
  ) {
    this.attempts += 1;
    if (!this.events.has(command.idempotencyKey)) this.events.set(command.idempotencyKey, command);
    return this.events.get(command.idempotencyKey);
  }
}

class FakePayments implements PaymentRepository {
  result: PaymentReceiveResult | null = null;
  payment: Payment = {
    id: 'payment-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    orderId: 'order-1',
    method: 'PIX',
    status: 'PAID',
    amountCents: 1_000,
    changeDueAmountCents: 0,
    idempotencyKey: 'payment-1',
    receivedBy: 'user-1',
    receivedAt: '2026-09-19T10:00:00.000Z',
    refundedAmountCents: 0,
    createdAt: '2026-09-19T10:00:00.000Z',
    updatedAt: '2026-09-19T10:00:00.000Z',
  };
  refundResult: Payment | null = null;

  async list() {
    return [];
  }
  async findById() {
    return this.payment;
  }
  async findReceiveResultByIdempotencyKey() {
    return this.result;
  }
  async findRefundResultByIdempotencyKey() {
    return this.refundResult;
  }
  async receivePayment(
    _context: RequestContext,
    command: Parameters<PaymentRepository['receivePayment']>[1],
  ) {
    this.result = {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      orderId: command.orderId,
      paymentIds: ['payment-1'],
      paidAmountCents: 1_000,
      amountDueCents: 0,
      status: 'PAID',
      idempotencyKey: command.idempotencyKey,
    };
    return this.result;
  }

  async refundPayment(
    _context: RequestContext,
    command: Parameters<PaymentRepository['refundPayment']>[1],
  ) {
    this.payment = {
      ...this.payment,
      status: 'REFUNDED',
      refundedAmountCents: command.amountCents,
    };
    this.refundResult = this.payment;
    return this.payment;
  }
}

describe('PaymentApplicationService outbox integration', () => {
  it('keeps payment success independent from worker availability and deduplicates retry events', async () => {
    const payments = new FakePayments();
    const outbox = new FakeOutbox();
    const orders: Pick<OrderRepository, 'findById'> = { findById: async () => order };
    const service = new PaymentApplicationService(orders, payments, undefined, outbox);
    const command = {
      orderId: order.id,
      idempotencyKey: 'payment-command-1',
      payments: [{ method: 'PIX' as const, amountCents: 1_000 }],
    };

    await service.receivePayment(context, command);
    const retry = await service.receivePayment(context, command);

    expect(retry).toMatchObject({ idempotent: true, status: 'PAID' });
    expect(outbox.events.size).toBe(2);
    expect([...outbox.events.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'PAYMENT_COMPLETED', sourceId: 'payment-1' }),
        expect.objectContaining({ eventType: 'ORDER_PAID', sourceId: 'order-1' }),
      ]),
    );
    expect(outbox.attempts).toBe(4);
  });

  it('enqueues and deduplicates refund events after committed correction', async () => {
    const payments = new FakePayments();
    const outbox = new FakeOutbox();
    const orders: Pick<OrderRepository, 'findById'> = { findById: async () => order };
    const service = new PaymentApplicationService(orders, payments, undefined, outbox);
    const command = {
      paymentId: 'payment-1',
      amountCents: 1_000,
      reason: 'Customer requested refund.',
      idempotencyKey: 'refund-command-1',
    };

    await service.refundPayment(
      { ...context, permissions: ['payments.refund', 'orders.read'] },
      command,
    );
    await service.refundPayment(
      { ...context, permissions: ['payments.refund', 'orders.read'] },
      command,
    );

    expect(outbox.events.size).toBe(1);
    expect([...outbox.events.values()]).toEqual([
      expect.objectContaining({ eventType: 'PAYMENT_REFUNDED', sourceId: 'payment-1' }),
    ]);
    expect(outbox.attempts).toBe(2);
  });
});
