import {
  cashRegisterMovementCommandSchema,
  closeCashRegisterCommandSchema,
  openCashRegisterCommandSchema,
  type CashMovement,
  type CashRegisterSession,
  type CashRegisterMovementCommand,
  type CloseCashRegisterCommand,
  type Entitlement,
  type OpenCashRegisterCommand,
  type Permission,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  CashRegisterAuditSink,
  CashRegisterRepository,
  CashRegisterSessionFilters,
} from '../domain';

const financeEntitlement = 'finance' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class CashRegisterApplicationService {
  constructor(
    private readonly cashRegister: CashRegisterRepository,
    private readonly audit?: CashRegisterAuditSink,
  ) {}

  async getCurrentSession(context: RequestContext, filters: CashRegisterSessionFilters = {}) {
    authorizeCashRegisterAccess(context, 'finance.read', filters.branchId);
    const session = await this.cashRegister.findCurrentSession(context, filters);
    if (session) assertCashRegisterSessionIsVisible(context, session);
    return session;
  }

  async openSession(context: RequestContext, command: OpenCashRegisterCommand) {
    const parsed = openCashRegisterCommandSchema.parse(command);
    authorizeCashRegisterAccess(context, 'cash.open', parsed.branchId);

    const current = await this.cashRegister.findCurrentSession(context, {
      branchId: parsed.branchId,
    });
    if (current?.status === 'OPEN') {
      throw new CoreOperationsApplicationError(
        'CASH_REGISTER_ALREADY_OPEN',
        'Cash register already has an open session for this branch.',
      );
    }

    const session = await this.cashRegister.openSession(context, parsed);
    assertCashRegisterSessionIsVisible(context, session);
    if (session.status !== 'OPEN') {
      throw new CoreOperationsApplicationError(
        'CASH_REGISTER_INVALID_STATUS',
        'Opened cash register session returned an invalid status.',
      );
    }

    await this.audit?.record(context, {
      action: 'CASH_OPENED',
      entityType: 'CASH_REGISTER_SESSION',
      entityId: session.id,
      result: 'SUCCESS',
      afterState: session,
    });

    return session;
  }

  async listMovements(context: RequestContext, filters = {}) {
    const typedFilters = filters as import('../domain').CashMovementListFilters;
    authorizeCashRegisterAccess(context, 'finance.read', typedFilters.branchId);
    const movements = await this.cashRegister.listMovements(context, typedFilters);
    for (const movement of movements) assertCashMovementIsVisible(context, movement);
    return movements;
  }

  async recordMovement(context: RequestContext, command: CashRegisterMovementCommand) {
    const parsed = cashRegisterMovementCommandSchema.parse(command);
    authorizeCashRegisterAccess(context, permissionForMovement(parsed.type), parsed.branchId);

    const current = await this.cashRegister.findCurrentSession(context, {
      branchId: parsed.branchId,
    });
    if (!current) {
      throw new CoreOperationsApplicationError(
        'CASH_REGISTER_NOT_OPEN',
        'Cash register session is not open.',
      );
    }
    assertCashRegisterSessionIsVisible(context, current);
    assertCashRegisterSessionIsOpen(current);

    const movement = await this.cashRegister.recordMovement(context, parsed);
    assertCashMovementIsVisible(context, movement);
    if (movement.sessionId !== current.id) {
      throw new CoreOperationsApplicationError(
        'CASH_MOVEMENT_INVALID',
        'Cash movement returned an unexpected session.',
      );
    }

    await this.audit?.record(context, {
      action: 'CASH_MOVEMENT_RECORDED',
      entityType: 'CASH_MOVEMENT',
      entityId: movement.id,
      result: 'SUCCESS',
      beforeState: current,
      afterState: movement,
    });

    return movement;
  }

  async closeSession(context: RequestContext, command: CloseCashRegisterCommand) {
    const parsed = closeCashRegisterCommandSchema.parse(command);
    const current = await this.cashRegister.findSessionById(context, parsed.sessionId);
    if (!current) {
      throw new CoreOperationsApplicationError(
        'CASH_REGISTER_NOT_FOUND',
        'Cash register session was not found.',
      );
    }
    assertCashRegisterSessionIsVisible(context, current);
    authorizeCashRegisterAccess(context, 'cash.close', current.branchId);
    assertCashRegisterSessionIsOpen(current);

    const expectedBalanceAmountCents =
      parsed.expectedBalanceAmountCents ?? current.expectedBalanceAmountCents;
    if (
      parsed.actualBalanceAmountCents !== expectedBalanceAmountCents &&
      !parsed.differenceReason
    ) {
      throw new CoreOperationsApplicationError(
        'CASH_REGISTER_VALIDATION_ERROR',
        'Cash closing divergence requires a reason.',
      );
    }

    const closed = await this.cashRegister.closeSession(context, {
      ...parsed,
      expectedBalanceAmountCents,
    });
    assertCashRegisterSessionIsVisible(context, closed);
    if (closed.id !== current.id || closed.status !== 'CLOSED') {
      throw new CoreOperationsApplicationError(
        'CASH_REGISTER_INVALID_STATUS',
        'Cash close returned an invalid session state.',
      );
    }

    await this.audit?.record(context, {
      action: 'CASH_CLOSED',
      entityType: 'CASH_REGISTER_SESSION',
      entityId: closed.id,
      result: 'SUCCESS',
      beforeState: current,
      afterState: closed,
    });

    return closed;
  }
}

function authorizeCashRegisterAccess(
  context: RequestContext,
  permission: Permission,
  branchId?: string,
) {
  authorize(context, { permission, entitlement: financeEntitlement, branchId });
}

function permissionForMovement(type: CashRegisterMovementCommand['type']): Permission {
  return type === 'WITHDRAWAL' ? 'cash.withdraw' : 'cash.open';
}

function assertCashRegisterSessionIsOpen(session: Pick<CashRegisterSession, 'status'>) {
  if (session.status !== 'OPEN') {
    throw new CoreOperationsApplicationError(
      'CASH_REGISTER_INVALID_STATUS',
      'Cash register session is closed.',
    );
  }
}

function assertCashRegisterSessionIsVisible(
  context: RequestContext,
  session: Pick<CashRegisterSession, 'tenantId' | 'branchId'>,
) {
  if (session.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError(
      'CASH_REGISTER_NOT_FOUND',
      'Cash register session was not found.',
    );
  }
  if (!context.branchScope.includes(session.branchId)) {
    throw new CoreOperationsApplicationError(
      'CASH_REGISTER_BRANCH_SCOPE_DENIED',
      'Cash register session is outside the authorized branch scope.',
    );
  }
}

function assertCashMovementIsVisible(
  context: RequestContext,
  movement: Pick<CashMovement, 'tenantId' | 'branchId'>,
) {
  if (movement.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError(
      'CASH_REGISTER_NOT_FOUND',
      'Cash movement was not found.',
    );
  }
  if (!context.branchScope.includes(movement.branchId)) {
    throw new CoreOperationsApplicationError(
      'CASH_REGISTER_BRANCH_SCOPE_DENIED',
      'Cash movement is outside the authorized branch scope.',
    );
  }
}
