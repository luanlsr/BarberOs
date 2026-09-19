import { beforeEach, describe, expect, it } from 'vitest';
import type {
  OrderDetail,
  Payment,
  PaymentTerminal,
  PaymentTerminalIntent,
  ReceivePaymentCommand,
  RequestContext,
} from '@barberos/contracts';

import type { OrderRepository } from '../../orders/domain';
import type { PaymentListFilters, PaymentRepository } from '../../payments/domain';
import type {
  CreatePaymentTerminalIntentRecord,
  PaymentTerminalRepository,
  TerminalProviderChargeResult,
} from '../domain';
import { MockPaymentTerminalProvider } from '../infrastructure';
import {
  PaymentTerminalApplicationService,
  type TerminalPaymentReceiver,
} from './payment-terminal-service';

const context: RequestContext = {
  requestId: 'request-terminal-1',
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
  openedAt: '2026-09-19T10:00:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-19T10:00:00.000Z',
  updatedAt: '2026-09-19T10:00:00.000Z',
  items: [],
  history: [],
};

const terminal: PaymentTerminal = {
  id: 'terminal-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  provider: 'MOCK_TERMINAL',
  providerTerminalId: 'mock-branch-1',
  name: 'Terminal simulado',
  status: 'ACTIVE',
  createdAt: '2026-09-19T10:00:00.000Z',
  updatedAt: '2026-09-19T10:00:00.000Z',
};

class FakeOrderRepository implements Pick<OrderRepository, 'findById'> {
  async findById(_context: RequestContext, orderId: string) {
    return orderId === order.id ? order : null;
  }
}

class FakePaymentRepository implements Pick<PaymentRepository, 'list'> {
  listedFilters: PaymentListFilters | null = null;
  payments: Payment[] = [];

  async list(_context: RequestContext, filters: PaymentListFilters = {}) {
    this.listedFilters = filters;
    return this.payments;
  }
}

class FakeTerminalRepository implements PaymentTerminalRepository {
  intent: PaymentTerminalIntent | null = null;
  providerResult: TerminalProviderChargeResult | null = null;
  paidPaymentId: string | null = null;

  async listTerminals() {
    return [terminal];
  }

  async findTerminalById(_context: RequestContext, terminalId: string) {
    return terminalId === terminal.id ? terminal : null;
  }

  async findIntentByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.intent?.idempotencyKey === idempotencyKey ? this.intent : null;
  }

  async createIntent(_context: RequestContext, record: CreatePaymentTerminalIntentRecord) {
    this.intent = {
      id: 'intent-1',
      tenantId: context.tenantId,
      branchId: record.branchId,
      orderId: record.orderId,
      terminalId: record.terminalId,
      provider: record.provider,
      method: record.method,
      status: 'PENDING',
      amountCents: record.amountCents,
      installments: record.installments,
      idempotencyKey: record.idempotencyKey,
      createdBy: context.userId,
      createdAt: '2026-09-19T10:00:00.000Z',
      updatedAt: '2026-09-19T10:00:00.000Z',
    };
    return this.intent;
  }

  async updateIntentProviderState(
    _context: RequestContext,
    _intentId: string,
    result: TerminalProviderChargeResult,
  ) {
    this.providerResult = result;
    this.intent = {
      ...(this.intent as PaymentTerminalIntent),
      status: result.status,
      providerIntentId: result.providerIntentId,
      providerReference: result.providerReference,
      updatedAt: '2026-09-19T10:01:00.000Z',
    };
    return this.intent;
  }

  async markIntentPaid(_context: RequestContext, _intentId: string, paymentId: string) {
    this.paidPaymentId = paymentId;
    this.intent = {
      ...(this.intent as PaymentTerminalIntent),
      status: 'PAID',
      paymentId,
      paidAt: '2026-09-19T10:02:00.000Z',
      updatedAt: '2026-09-19T10:02:00.000Z',
    };
    return this.intent;
  }
}

class FakePaymentReceiver implements TerminalPaymentReceiver {
  command: ReceivePaymentCommand | null = null;

  async receivePayment(_context: RequestContext, command: ReceivePaymentCommand) {
    this.command = command;
    return { paymentIds: ['payment-1'] };
  }
}

describe('PaymentTerminalApplicationService', () => {
  let payments: FakePaymentRepository;
  let terminals: FakeTerminalRepository;
  let receiver: FakePaymentReceiver;
  let service: PaymentTerminalApplicationService;

  beforeEach(() => {
    payments = new FakePaymentRepository();
    terminals = new FakeTerminalRepository();
    receiver = new FakePaymentReceiver();
    service = new PaymentTerminalApplicationService(
      new FakeOrderRepository(),
      payments,
      terminals,
      [new MockPaymentTerminalProvider()],
      receiver,
    );
  });

  it('lists active branch terminals for payment receivers', async () => {
    const result = await service.listTerminals(context, { branchId: 'branch-1' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Terminal simulado');
  });

  it('creates a terminal intent and posts payment when mock terminal approves', async () => {
    const result = await service.createIntent(context, {
      orderId: 'order-1',
      terminalId: 'terminal-1',
      method: 'PIX',
      amountCents: 10_000,
      idempotencyKey: 'terminal-intent-1',
    });

    expect(result.status).toBe('PAID');
    expect(receiver.command).toMatchObject({
      orderId: 'order-1',
      payments: [{ method: 'PIX', amountCents: 10_000 }],
    });
    expect(terminals.paidPaymentId).toBe('payment-1');
  });

  it('denies terminal payments outside branch scope', async () => {
    await expect(
      service.createIntent(
        { ...context, branchScope: ['branch-2'] },
        {
          orderId: 'order-1',
          terminalId: 'terminal-1',
          method: 'DEBIT_CARD',
          amountCents: 5_000,
          idempotencyKey: 'terminal-intent-2',
        },
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_BRANCH_SCOPE_DENIED' });
  });
});
