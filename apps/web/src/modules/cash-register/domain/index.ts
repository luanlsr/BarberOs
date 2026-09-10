import type {
  CashMovement,
  CashMovementType,
  CashRegisterMovementCommand,
  CashRegisterSession,
  CashRegisterSessionStatus,
  CloseCashRegisterCommand,
  OpenCashRegisterCommand,
  RequestContext,
} from '@barberos/contracts';

export type CashRegisterSessionFilters = {
  branchId?: string;
  status?: CashRegisterSessionStatus;
};

export type CashMovementListFilters = {
  branchId?: string;
  sessionId?: string;
  type?: CashMovementType;
  limit?: number;
  cursor?: string;
};

export type CashRegisterSummary = CashRegisterSession & {
  movements: CashMovement[];
  cashInAmountCents: number;
  cashOutAmountCents: number;
};

export interface CashRegisterRepository {
  findCurrentSession(
    context: RequestContext,
    filters?: CashRegisterSessionFilters,
  ): Promise<CashRegisterSummary | null>;
  findSessionById(context: RequestContext, sessionId: string): Promise<CashRegisterSummary | null>;
  openSession(
    context: RequestContext,
    command: OpenCashRegisterCommand,
  ): Promise<CashRegisterSession>;
  recordMovement(
    context: RequestContext,
    command: CashRegisterMovementCommand,
  ): Promise<CashMovement>;
  closeSession(
    context: RequestContext,
    command: CloseCashRegisterCommand,
  ): Promise<CashRegisterSession>;
  listMovements(
    context: RequestContext,
    filters?: CashMovementListFilters,
  ): Promise<CashMovement[]>;
}

export interface CashRegisterAuditSink {
  record(
    context: RequestContext,
    event: {
      action: 'CASH_OPENED' | 'CASH_MOVEMENT_RECORDED' | 'CASH_CLOSED';
      entityType: 'CASH_REGISTER_SESSION' | 'CASH_MOVEMENT';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      beforeState?: unknown;
      afterState?: unknown;
    },
  ): Promise<void>;
}
