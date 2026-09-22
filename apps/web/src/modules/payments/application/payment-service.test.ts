import { beforeEach, describe, expect, it } from 'vitest';
import type {
  OrderDetail,
  Payment,
  ReceivePaymentCommand,
  RequestContext,
} from '@barberos/contracts';

import type { OrderRepository } from '../../orders/domain';
import type {
  PaymentAuditSink,
  PaymentListFilters,
  PaymentReceiveResult,
  PaymentRepository,
} from '../domain';
import { CoreOperationsApplicationError, PaymentApplicationService } from './payment-service';

const context: RequestContext = {
  requestId: 'request-1',
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
  subtotalAmountCents: 10_000,
  discountAmountCents: 0,
  totalAmountCents: 10_000,
  openedAt: '2026-09-07T10:00:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T10:00:00.000Z',
  updatedAt: '2026-09-07T10:00:00.000Z',
  items: [],
  history: [],
};

class FakeOrderRepository implements Pick<OrderRepository, 'findById'> {
  readonly orders = new Map<string, OrderDetail>([[order.id, order]]);

  async findById(_context: RequestContext, orderId: string) {
    return this.orders.get(orderId) ?? null;
  }
}

class FakePaymentRepository implements PaymentRepository {
  readonly paymentsByOrder = new Map<string, Payment[]>();
  readonly receiveResultsByIdempotencyKey = new Map<string, PaymentReceiveResult>();
  readonly refundResultsByIdempotencyKey = new Map<string, Payment>();
  readonly paymentsById = new Map<string, Payment>();
  receivedCommand: ReceivePaymentCommand | null = null;
  refundCommand: Parameters<PaymentRepository['refundPayment']>[1] | null = null;
  receiveCount = 0;
  refundCount = 0;
  receiveError: unknown | null = null;
  listedFilters: PaymentListFilters | null = null;

  async list(_context: RequestContext, filters: PaymentListFilters = {}) {
    this.listedFilters = filters;
    return this.paymentsByOrder.get(filters.orderId ?? '') ?? [];
  }

  async findById(_context: RequestContext, paymentId: string) {
    return this.paymentsById.get(paymentId) ?? null;
  }

  async findReceiveResultByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.receiveResultsByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async findRefundResultByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.refundResultsByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async receivePayment(_context: RequestContext, command: ReceivePaymentCommand) {
    this.receiveCount += 1;
    if (this.receiveError) throw this.receiveError;
    this.receivedCommand = command;
    const paidAmountCents = command.payments.reduce(
      (total, payment) => total + payment.amountCents,
      0,
    );
    const result: PaymentReceiveResult = {
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: command.orderId,
      paymentIds: command.payments.map((_, index) => 'payment-' + (index + 1)),
      paidAmountCents,
      amountDueCents: Math.max(order.totalAmountCents - paidAmountCents, 0),
      status: paidAmountCents >= order.totalAmountCents ? 'PAID' : 'PARTIALLY_PAID',
      idempotencyKey: command.idempotencyKey,
    };
    this.receiveResultsByIdempotencyKey.set(command.idempotencyKey, result);
    return result;
  }

  async refundPayment(
    _context: RequestContext,
    command: Parameters<PaymentRepository['refundPayment']>[1],
  ) {
    this.refundCount += 1;
    this.refundCommand = command;
    const current = this.paymentsById.get(command.paymentId);
    if (!current) throw new Error('Missing payment fixture.');
    const refundedAmountCents = current.refundedAmountCents + command.amountCents;
    const updated: Payment = {
      ...current,
      status: refundedAmountCents >= current.amountCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAmountCents,
      updatedAt: '2026-09-07T11:00:00.000Z',
    };
    this.paymentsById.set(updated.id, updated);
    this.refundResultsByIdempotencyKey.set(command.idempotencyKey, updated);
    return updated;
  }
}

class FakePaymentAuditSink implements PaymentAuditSink {
  readonly contexts: RequestContext[] = [];
  readonly events: Array<Parameters<PaymentAuditSink['record']>[1]> = [];

  async record(context: RequestContext, event: Parameters<PaymentAuditSink['record']>[1]) {
    this.contexts.push(context);
    this.events.push(event);
  }
}

const payment = (amountCents: number, refundedAmountCents = 0): Payment => ({
  id: 'existing-payment-' + amountCents,
  tenantId: order.tenantId,
  branchId: order.branchId,
  orderId: order.id,
  method: 'PIX',
  status: refundedAmountCents > 0 ? 'PARTIALLY_REFUNDED' : 'PAID',
  amountCents,
  changeDueAmountCents: 0,
  idempotencyKey: 'existing-' + amountCents,
  receivedBy: 'user-1',
  receivedAt: '2026-09-07T10:30:00.000Z',
  refundedAmountCents,
  createdAt: '2026-09-07T10:30:00.000Z',
  updatedAt: '2026-09-07T10:30:00.000Z',
});

describe('PaymentApplicationService', () => {
  let orders: FakeOrderRepository;
  let payments: FakePaymentRepository;
  let audit: FakePaymentAuditSink;
  let service: PaymentApplicationService;

  beforeEach(() => {
    orders = new FakeOrderRepository();
    payments = new FakePaymentRepository();
    audit = new FakePaymentAuditSink();
    service = new PaymentApplicationService(orders, payments, audit);
  });

  it('receives a full payment for a visible payable order', async () => {
    const result = await service.receivePayment(context, {
      orderId: order.id,
      idempotencyKey: 'pay-full-1',
      payments: [{ method: 'PIX', amountCents: 10_000, externalReference: 'pix-e2e-1' }],
      notes: 'Pagamento no PIX.',
    });

    expect(result).toMatchObject({ status: 'PAID', amountDueCents: 0, paidAmountCents: 10_000 });
    expect(payments.listedFilters).toEqual({ branchId: 'branch-1', orderId: 'order-1' });
    expect(payments.receiveCount).toBe(1);
    expect(audit.contexts[0]).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.map((event) => event.action)).toEqual(['PAYMENT_RECEIVED', 'ORDER_PAID']);
    expect(audit.events[0]).toMatchObject({
      action: 'PAYMENT_RECEIVED',
      entityId: order.id,
      result: 'SUCCESS',
      afterState: expect.objectContaining({ tenantId: 'tenant-1', branchId: 'branch-1' }),
    });
  });

  it('does not audit success or expose completion when inventory stock persistence rolls back', async () => {
    payments.receiveError = new Error('Insufficient stock for product sale.');

    await expect(
      service.receivePayment(context, {
        orderId: order.id,
        idempotencyKey: 'pay-stock-fail-1',
        payments: [{ method: 'PIX', amountCents: 10_000, externalReference: 'pix-stock-fail-1' }],
      }),
    ).rejects.toThrow('Insufficient stock for product sale.');

    expect(payments.receiveCount).toBe(1);
    expect(payments.receiveResultsByIdempotencyKey.has('pay-stock-fail-1')).toBe(false);
    expect(audit.events).toEqual([]);
  });

  it('allows a partial payment up to the remaining amount due', async () => {
    payments.paymentsByOrder.set(order.id, [payment(3_000)]);

    const result = await service.receivePayment(context, {
      orderId: order.id,
      idempotencyKey: 'pay-partial-1',
      payments: [{ method: 'DEBIT_CARD', amountCents: 4_000 }],
    });

    expect(result).toMatchObject({ status: 'PARTIALLY_PAID', amountDueCents: 6_000 });
    expect(audit.events.map((event) => event.action)).toEqual(['PAYMENT_RECEIVED']);
  });

  it('accepts cash received above the applied amount as change, not excess paid value', async () => {
    await service.receivePayment(context, {
      orderId: order.id,
      idempotencyKey: 'pay-cash-change-1',
      payments: [{ method: 'CASH', amountCents: 10_000, cashReceivedAmountCents: 20_000 }],
    });

    expect(payments.receivedCommand?.payments[0]).toMatchObject({
      method: 'CASH',
      amountCents: 10_000,
      cashReceivedAmountCents: 20_000,
    });
  });

  it('returns an existing idempotent receive result without writing again', async () => {
    payments.receiveResultsByIdempotencyKey.set('retry-key-1', {
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      paymentIds: ['payment-1'],
      paidAmountCents: 10_000,
      amountDueCents: 0,
      status: 'PAID',
      idempotencyKey: 'retry-key-1',
    });

    const result = await service.receivePayment(context, {
      orderId: order.id,
      idempotencyKey: 'retry-key-1',
      payments: [{ method: 'PIX', amountCents: 10_000 }],
    });

    expect(result).toMatchObject({ idempotent: true, status: 'PAID' });
    expect(payments.receiveCount).toBe(0);
    expect(audit.events).toEqual([]);
  });

  it('rejects payment without receive permission', async () => {
    await expect(
      service.receivePayment(
        { ...context, permissions: ['orders.read'] },
        {
          orderId: order.id,
          idempotencyKey: 'pay-denied-1',
          payments: [{ method: 'PIX', amountCents: 1_000 }],
        },
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects orders outside the authorized branch scope', async () => {
    orders.orders.set(order.id, { ...order, branchId: 'branch-2' });

    await expect(
      service.receivePayment(context, {
        orderId: order.id,
        idempotencyKey: 'pay-branch-denied-1',
        payments: [{ method: 'PIX', amountCents: 1_000 }],
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'PAYMENT_BRANCH_SCOPE_DENIED',
        'Order is outside the authorized branch scope.',
      ),
    );
  });

  it('rejects paid or cancelled orders before calling the payment repository', async () => {
    orders.orders.set(order.id, { ...order, status: 'PAID' });

    await expect(
      service.receivePayment(context, {
        orderId: order.id,
        idempotencyKey: 'pay-paid-order-1',
        payments: [{ method: 'PIX', amountCents: 1_000 }],
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_INVALID_STATUS' });
    expect(payments.receiveCount).toBe(0);
  });

  it('refunds a paid payment with immutable reversal state', async () => {
    const original = payment(8_500);
    payments.paymentsById.set(original.id, original);

    const result = await service.refundPayment(
      { ...context, permissions: ['payments.receive', 'payments.refund', 'orders.read'] },
      {
        paymentId: original.id,
        amountCents: 3_000,
        reason: 'Cliente solicitou estorno parcial.',
        idempotencyKey: 'refund-key-1',
      },
    );

    expect(result).toMatchObject({
      id: original.id,
      status: 'PARTIALLY_REFUNDED',
      refundedAmountCents: 3_000,
    });
    expect(original).toMatchObject({ status: 'PAID', refundedAmountCents: 0 });
    expect(payments.refundCount).toBe(1);
    expect(audit.contexts.at(-1)).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'PAYMENT_REFUNDED',
      entityType: 'PAYMENT',
      entityId: original.id,
      result: 'SUCCESS',
      afterState: expect.objectContaining({ tenantId: 'tenant-1', branchId: 'branch-1' }),
    });
  });

  it('returns an idempotent refund result without recording another refund', async () => {
    const refunded = {
      ...payment(8_500),
      status: 'PARTIALLY_REFUNDED' as const,
      refundedAmountCents: 3_000,
    };
    payments.refundResultsByIdempotencyKey.set('refund-key-2', refunded);

    const result = await service.refundPayment(
      { ...context, permissions: ['payments.receive', 'payments.refund', 'orders.read'] },
      {
        paymentId: refunded.id,
        amountCents: 3_000,
        reason: 'Retry do estorno parcial.',
        idempotencyKey: 'refund-key-2',
      },
    );

    expect(result).toEqual(refunded);
    expect(payments.refundCount).toBe(0);
    expect(audit.events).toEqual([]);
  });

  it('rejects refunds without refund permission', async () => {
    const original = payment(8_500);
    payments.paymentsById.set(original.id, original);

    await expect(
      service.refundPayment(context, {
        paymentId: original.id,
        amountCents: 1_000,
        reason: 'Sem permissão.',
        idempotencyKey: 'refund-denied-1',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects refunds above the refundable amount', async () => {
    const original = payment(8_500, 7_000);
    payments.paymentsById.set(original.id, original);

    await expect(
      service.refundPayment(
        { ...context, permissions: ['payments.receive', 'payments.refund', 'orders.read'] },
        {
          paymentId: original.id,
          amountCents: 2_000,
          reason: 'Acima do valor restante.',
          idempotencyKey: 'refund-over-1',
        },
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_DUE_MISMATCH' });
    expect(payments.refundCount).toBe(0);
  });

  it('rejects applied payment totals above the remaining amount due', async () => {
    payments.paymentsByOrder.set(order.id, [payment(6_000)]);

    await expect(
      service.receivePayment(context, {
        orderId: order.id,
        idempotencyKey: 'pay-overdue-1',
        payments: [{ method: 'PIX', amountCents: 5_000 }],
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_DUE_MISMATCH' });
    expect(payments.receiveCount).toBe(0);
  });
});
