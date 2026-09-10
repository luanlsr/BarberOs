import {
  receivePaymentCommandSchema,
  refundPaymentCommandSchema,
  type Entitlement,
  type OrderDetail,
  type Payment,
  type Permission,
  type ReceivePaymentCommand,
  type RefundPaymentCommand,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { OrderRepository } from '../../orders/domain';
import {
  calculateAmountDue,
  calculateRefundableAmount,
  calculateSplitPaymentTotal,
  type PaymentAuditSink,
  type PaymentReceiveResult,
  type PaymentRepository,
} from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;
const paymentReceivableStatuses = ['OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT'] as const;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class PaymentApplicationService {
  constructor(
    private readonly orders: Pick<OrderRepository, 'findById'>,
    private readonly payments: PaymentRepository,
    private readonly audit?: PaymentAuditSink,
  ) {}

  async receivePayment(context: RequestContext, command: ReceivePaymentCommand) {
    const parsed = receivePaymentCommandSchema.parse(command);
    const idempotentResult = await this.payments.findReceiveResultByIdempotencyKey(
      context,
      parsed.idempotencyKey,
    );
    if (idempotentResult) {
      assertPaymentResultIsVisible(context, idempotentResult);
      return { ...idempotentResult, idempotent: true } satisfies PaymentReceiveResult;
    }

    const order = await this.getVisibleOrder(context, parsed.orderId);
    authorizePaymentAccess(context, 'payments.receive', order.branchId);
    assertOrderCanReceivePayment(order);

    const existingPayments = await this.payments.list(context, {
      branchId: order.branchId,
      orderId: order.id,
    });
    const amountDueCents = calculateAmountDue(order.totalAmountCents, existingPayments);
    const requestedAmountCents = calculateSplitPaymentTotal(parsed.payments);

    if (amountDueCents <= 0) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_AMOUNT_DUE_MISMATCH',
        'Order has no remaining amount due.',
      );
    }

    if (requestedAmountCents > amountDueCents) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_AMOUNT_DUE_MISMATCH',
        'Payment amount cannot exceed the remaining amount due.',
      );
    }

    const result = await this.payments.receivePayment(context, parsed);
    assertPaymentResultIsVisible(context, result);
    if (result.orderId !== order.id) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_VALIDATION_ERROR',
        'Payment mutation returned an unexpected order.',
      );
    }

    await this.audit?.record(context, {
      action: 'PAYMENT_RECEIVED',
      entityType: 'ORDER',
      entityId: order.id,
      result: 'SUCCESS',
      beforeState: { order, amountDueCents },
      afterState: result,
    });

    if (result.status === 'PAID') {
      await this.audit?.record(context, {
        action: 'ORDER_PAID',
        entityType: 'ORDER',
        entityId: order.id,
        result: 'SUCCESS',
        beforeState: order,
        afterState: result,
      });
    }

    return result;
  }

  async refundPayment(context: RequestContext, command: RefundPaymentCommand) {
    const parsed = refundPaymentCommandSchema.parse(command);
    const idempotentRefund = await this.payments.findRefundResultByIdempotencyKey(
      context,
      parsed.idempotencyKey,
    );
    if (idempotentRefund) {
      assertPaymentIsVisible(context, idempotentRefund);
      return idempotentRefund;
    }

    const payment = await this.payments.findById(context, parsed.paymentId);
    if (!payment || payment.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('PAYMENT_NOT_FOUND', 'Payment was not found.');
    }
    assertPaymentIsVisible(context, payment);
    authorizePaymentAccess(context, 'payments.refund', payment.branchId);

    const refundableAmountCents = calculateRefundableAmount(payment);
    if (refundableAmountCents <= 0) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_INVALID_STATUS',
        'Payment has no refundable amount.',
      );
    }
    if (parsed.amountCents > refundableAmountCents) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_AMOUNT_DUE_MISMATCH',
        'Refund amount cannot exceed the refundable payment amount.',
      );
    }

    const updated = await this.payments.refundPayment(context, parsed);
    assertPaymentIsVisible(context, updated);
    if (updated.id !== payment.id) {
      throw new CoreOperationsApplicationError(
        'PAYMENT_VALIDATION_ERROR',
        'Refund mutation returned an unexpected payment.',
      );
    }

    await this.audit?.record(context, {
      action: 'PAYMENT_REFUNDED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      result: 'SUCCESS',
      beforeState: payment,
      afterState: updated,
    });

    return updated;
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

function assertPaymentResultIsVisible(
  context: RequestContext,
  result: Pick<PaymentReceiveResult, 'tenantId' | 'branchId'>,
) {
  if (result.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('PAYMENT_NOT_FOUND', 'Payment result was not found.');
  }
  if (!context.branchScope.includes(result.branchId)) {
    throw new CoreOperationsApplicationError(
      'PAYMENT_BRANCH_SCOPE_DENIED',
      'Payment result is outside the authorized branch scope.',
    );
  }
}

function assertPaymentIsVisible(
  context: RequestContext,
  payment: Pick<Payment, 'tenantId' | 'branchId'>,
) {
  if (payment.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('PAYMENT_NOT_FOUND', 'Payment was not found.');
  }
  if (!context.branchScope.includes(payment.branchId)) {
    throw new CoreOperationsApplicationError(
      'PAYMENT_BRANCH_SCOPE_DENIED',
      'Payment is outside the authorized branch scope.',
    );
  }
}
