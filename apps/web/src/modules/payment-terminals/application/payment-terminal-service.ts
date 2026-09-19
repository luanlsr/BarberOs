import {
  createPaymentTerminalIntentCommandSchema,
  type CreatePaymentTerminalIntentCommand,
  type Entitlement,
  type OrderDetail,
  type PaymentTerminalIntent,
  type Permission,
  type ReceivePaymentCommand,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { OrderRepository } from '../../orders/domain';
import { calculateAmountDue, type PaymentRepository } from '../../payments/domain';
import type { PaymentTerminalProviderAdapter, PaymentTerminalRepository } from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;
const paymentReceivableStatuses = ['OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT'] as const;

export type TerminalPaymentReceiver = {
  receivePayment(
    context: RequestContext,
    command: ReceivePaymentCommand,
  ): Promise<{ paymentIds: string[] }>;
};

export class PaymentTerminalApplicationService {
  constructor(
    private readonly orders: Pick<OrderRepository, 'findById'>,
    private readonly payments: Pick<PaymentRepository, 'list'>,
    private readonly terminals: PaymentTerminalRepository,
    private readonly providers: readonly PaymentTerminalProviderAdapter[],
    private readonly paymentReceiver: TerminalPaymentReceiver,
  ) {}

  async listTerminals(context: RequestContext, filters: { branchId?: string } = {}) {
    const branchId = filters.branchId ?? context.branchScope[0];
    if (!branchId) return [];
    authorizePaymentAccess(context, 'payments.receive', branchId);
    return this.terminals.listTerminals(context, { branchId, status: 'ACTIVE' });
  }

  async createIntent(context: RequestContext, command: CreatePaymentTerminalIntentCommand) {
    const parsed = createPaymentTerminalIntentCommandSchema.parse(command);
    const idempotent = await this.terminals.findIntentByIdempotencyKey(
      context,
      parsed.idempotencyKey,
    );
    if (idempotent) {
      assertIntentIsVisible(context, idempotent);
      return idempotent;
    }

    const order = await this.getVisibleOrder(context, parsed.orderId);
    authorizePaymentAccess(context, 'payments.receive', order.branchId);
    assertOrderCanReceivePayment(order);

    const terminal = await this.terminals.findTerminalById(context, parsed.terminalId);
    if (!terminal || terminal.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_NOT_FOUND',
        'Payment terminal was not found.',
      );
    }
    if (terminal.branchId !== order.branchId || terminal.status !== 'ACTIVE') {
      throw new CoreOperationsApplicationError(
        'PAYMENT_INVALID_STATUS',
        'Payment terminal is not available for this order.',
      );
    }

    const existingPayments = await this.payments.list(context, {
      branchId: order.branchId,
      orderId: order.id,
      limit: 100,
    });
    const amountDueCents = calculateAmountDue(order.totalAmountCents, existingPayments);
    if (amountDueCents <= 0 || parsed.amountCents > amountDueCents) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_AMOUNT_DUE_MISMATCH',
        'Terminal payment amount cannot exceed the remaining amount due.',
      );
    }

    const intent = await this.terminals.createIntent(context, {
      branchId: order.branchId,
      orderId: order.id,
      terminalId: terminal.id,
      provider: terminal.provider,
      method: parsed.method,
      amountCents: parsed.amountCents,
      installments: parsed.installments,
      idempotencyKey: parsed.idempotencyKey,
    });

    const provider = this.providerFor(terminal.provider);
    const providerResult = await provider.createPayment({
      amountCents: parsed.amountCents,
      idempotencyKey: parsed.idempotencyKey,
      intentId: intent.id,
      method: parsed.method,
      orderId: order.id,
      terminal,
    });
    const updated = await this.terminals.updateIntentProviderState(
      context,
      intent.id,
      providerResult,
    );

    if (providerResult.status !== 'PAID') return updated;

    const paymentResult = await this.paymentReceiver.receivePayment(context, {
      orderId: order.id,
      idempotencyKey: 'terminal-payment:' + intent.id,
      payments: [
        {
          method: parsed.method,
          amountCents: parsed.amountCents,
          externalReference: providerResult.providerReference,
          installments: parsed.installments,
        },
      ],
      notes: parsed.notes,
    });

    return this.terminals.markIntentPaid(context, intent.id, paymentResult.paymentIds[0]);
  }

  private providerFor(providerName: string) {
    const provider = this.providers.find((candidate) => candidate.provider === providerName);
    if (!provider) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_VALIDATION_ERROR',
        'Payment provider is not configured.',
      );
    }
    return provider;
  }

  private async getVisibleOrder(context: RequestContext, orderId: string) {
    const order = await this.orders.findById(context, orderId);
    if (!order || order.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('ORDER_NOT_FOUND', 'Order was not found.');
    }
    if (!context.branchScope.includes(order.branchId)) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_BRANCH_SCOPE_DENIED',
        'Order is outside the authorized branch scope.',
      );
    }
    return order;
  }
}

function authorizePaymentAccess(context: RequestContext, permission: Permission, branchId: string) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function assertOrderCanReceivePayment(order: Pick<OrderDetail, 'status'>) {
  if (
    !paymentReceivableStatuses.includes(order.status as (typeof paymentReceivableStatuses)[number])
  ) {
    throw new CoreOperationsApplicationError(
      'PAYMENT_INVALID_STATUS',
      'Order cannot receive payment from its current status.',
    );
  }
}

function assertIntentIsVisible(
  context: RequestContext,
  intent: Pick<PaymentTerminalIntent, 'tenantId' | 'branchId'>,
) {
  if (intent.tenantId !== context.tenantId || !context.branchScope.includes(intent.branchId)) {
    throw new CoreOperationsApplicationError(
      'PAYMENT_NOT_FOUND',
      'Payment terminal intent was not found.',
    );
  }
}
