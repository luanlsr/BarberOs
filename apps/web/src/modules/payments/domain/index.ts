import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  ReceivePaymentCommand,
  RefundPaymentCommand,
  RequestContext,
} from '@barberos/contracts';

export type PaymentListFilters = {
  branchId?: string;
  orderId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  limit?: number;
  cursor?: string;
};

export type PaymentAmountSnapshot = Pick<Payment, 'amountCents' | 'status' | 'refundedAmountCents'>;

export type PaymentReceiveResult = {
  tenantId: string;
  branchId: string;
  orderId: string;
  paymentIds: string[];
  paidAmountCents: number;
  amountDueCents: number;
  status: 'PARTIALLY_PAID' | 'PAID';
  idempotencyKey: string;
  idempotent?: boolean;
};

export interface PaymentRepository {
  list(context: RequestContext, filters?: PaymentListFilters): Promise<Payment[]>;
  findById(context: RequestContext, paymentId: string): Promise<Payment | null>;
  findReceiveResultByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<PaymentReceiveResult | null>;
  findRefundResultByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<Payment | null>;
  receivePayment(
    context: RequestContext,
    command: ReceivePaymentCommand,
  ): Promise<PaymentReceiveResult>;
  refundPayment(context: RequestContext, command: RefundPaymentCommand): Promise<Payment>;
}

export interface PaymentAuditSink {
  record(
    context: RequestContext,
    event: {
      action: 'PAYMENT_RECEIVED' | 'PAYMENT_REFUNDED' | 'ORDER_PAID';
      entityType: 'PAYMENT' | 'ORDER';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      beforeState?: unknown;
      afterState?: unknown;
    },
  ): Promise<void>;
}

const capturedStatuses = new Set<PaymentStatus>(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

export function calculateCapturedPaymentAmount(payment: PaymentAmountSnapshot) {
  if (!capturedStatuses.has(payment.status)) return 0;
  return Math.max(payment.amountCents - payment.refundedAmountCents, 0);
}

export function calculatePaidAmount(payments: readonly PaymentAmountSnapshot[]) {
  return payments.reduce((total, payment) => total + calculateCapturedPaymentAmount(payment), 0);
}

export function calculateAmountDue(
  orderTotalAmountCents: number,
  payments: readonly PaymentAmountSnapshot[],
) {
  return Math.max(orderTotalAmountCents - calculatePaidAmount(payments), 0);
}

export function calculateSplitPaymentTotal(payments: readonly Pick<Payment, 'amountCents'>[]) {
  return payments.reduce((total, payment) => total + payment.amountCents, 0);
}

export function calculateCashChange(payment: {
  amountCents: number;
  cashReceivedAmountCents?: number | null;
}) {
  return Math.max((payment.cashReceivedAmountCents ?? 0) - payment.amountCents, 0);
}

export function calculateRefundableAmount(payment: PaymentAmountSnapshot) {
  if (!capturedStatuses.has(payment.status)) return 0;
  return Math.max(payment.amountCents - payment.refundedAmountCents, 0);
}

export interface PaymentOutboxProducer {
  createEvent(
    context: RequestContext,
    command: {
      tenantId: string;
      branchId?: string;
      eventType: 'PAYMENT_COMPLETED' | 'ORDER_PAID' | 'PAYMENT_REFUNDED';
      sourceType: 'PAYMENT' | 'ORDER';
      sourceId: string;
      payload: Record<string, unknown>;
      idempotencyKey: string;
      correlationId: string;
    },
  ): Promise<unknown>;
}
