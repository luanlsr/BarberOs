import type {
  CreatePaymentTerminalIntentCommand,
  PaymentTerminal,
  PaymentTerminalIntent,
  PaymentTerminalIntentStatus,
  PaymentTerminalProvider,
  RequestContext,
} from '@barberos/contracts';

export type PaymentTerminalListFilters = {
  branchId?: string;
  status?: PaymentTerminal['status'];
};

export type CreatePaymentTerminalIntentRecord = {
  branchId: string;
  orderId: string;
  terminalId: string;
  provider: PaymentTerminalProvider;
  method: CreatePaymentTerminalIntentCommand['method'];
  amountCents: number;
  installments?: number;
  idempotencyKey: string;
};

export type TerminalProviderChargeResult = {
  providerIntentId: string;
  providerReference: string;
  status: Extract<PaymentTerminalIntentStatus, 'SENT_TO_TERMINAL' | 'PROCESSING' | 'PAID'>;
  payload?: Record<string, unknown>;
};

export interface PaymentTerminalRepository {
  listTerminals(
    context: RequestContext,
    filters?: PaymentTerminalListFilters,
  ): Promise<PaymentTerminal[]>;
  findTerminalById(context: RequestContext, terminalId: string): Promise<PaymentTerminal | null>;
  findIntentByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<PaymentTerminalIntent | null>;
  createIntent(
    context: RequestContext,
    record: CreatePaymentTerminalIntentRecord,
  ): Promise<PaymentTerminalIntent>;
  updateIntentProviderState(
    context: RequestContext,
    intentId: string,
    result: TerminalProviderChargeResult,
  ): Promise<PaymentTerminalIntent>;
  markIntentPaid(
    context: RequestContext,
    intentId: string,
    paymentId: string,
  ): Promise<PaymentTerminalIntent>;
}

export interface PaymentTerminalProviderAdapter {
  provider: PaymentTerminalProvider;
  createPayment(input: {
    amountCents: number;
    idempotencyKey: string;
    intentId: string;
    method: CreatePaymentTerminalIntentCommand['method'];
    orderId: string;
    terminal: PaymentTerminal;
  }): Promise<TerminalProviderChargeResult>;
}
