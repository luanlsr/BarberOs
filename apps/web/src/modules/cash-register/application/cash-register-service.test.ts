import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CashMovement,
  CashRegisterMovementCommand,
  CashRegisterSession,
  CloseCashRegisterCommand,
  OpenCashRegisterCommand,
  RequestContext,
} from '@barberos/contracts';

import type {
  CashMovementListFilters,
  CashRegisterAuditSink,
  CashRegisterRepository,
  CashRegisterSessionFilters,
  CashRegisterSummary,
} from '../domain';
import {
  CashRegisterApplicationService,
  CoreOperationsApplicationError,
} from './cash-register-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['finance.read', 'cash.open', 'cash.withdraw', 'cash.close'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const openSession: CashRegisterSummary = {
  id: 'cash-session-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  status: 'OPEN',
  openedBy: 'user-1',
  openedAt: '2026-09-07T10:00:00.000Z',
  openingBalanceAmountCents: 20_000,
  expectedBalanceAmountCents: 25_000,
  differenceAmountCents: 0,
  createdAt: '2026-09-07T10:00:00.000Z',
  updatedAt: '2026-09-07T10:00:00.000Z',
  movements: [],
  cashInAmountCents: 5_000,
  cashOutAmountCents: 0,
};

class FakeCashRegisterRepository implements CashRegisterRepository {
  currentSession: CashRegisterSummary | null = null;
  readonly sessions = new Map<string, CashRegisterSummary>();
  readonly movements: CashMovement[] = [];
  openedCommand: OpenCashRegisterCommand | null = null;
  movementCommand: CashRegisterMovementCommand | null = null;
  closeCommand: CloseCashRegisterCommand | null = null;

  async findCurrentSession(_context: RequestContext, filters: CashRegisterSessionFilters = {}) {
    if (!this.currentSession) return null;
    if (filters.branchId && this.currentSession.branchId !== filters.branchId) return null;
    if (filters.status && this.currentSession.status !== filters.status) return null;
    return this.currentSession;
  }

  async findSessionById(_context: RequestContext, sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async openSession(context: RequestContext, command: OpenCashRegisterCommand) {
    this.openedCommand = command;
    const session: CashRegisterSummary = {
      ...openSession,
      id: 'cash-session-created',
      tenantId: context.tenantId,
      branchId: command.branchId,
      openingBalanceAmountCents: command.openingBalanceAmountCents,
      expectedBalanceAmountCents: command.openingBalanceAmountCents,
      movements: [],
      cashInAmountCents: command.openingBalanceAmountCents,
      cashOutAmountCents: 0,
    };
    this.currentSession = session;
    this.sessions.set(session.id, session);
    return session;
  }

  async recordMovement(context: RequestContext, command: CashRegisterMovementCommand) {
    this.movementCommand = command;
    const movement: CashMovement = {
      id: 'cash-movement-' + (this.movements.length + 1),
      tenantId: context.tenantId,
      branchId: command.branchId,
      sessionId: this.currentSession?.id ?? 'missing-session',
      type: command.type,
      amountCents: command.amountCents,
      signedAmountCents: command.type === 'WITHDRAWAL' ? -command.amountCents : command.amountCents,
      reason: command.reason,
      createdBy: context.userId,
      createdAt: '2026-09-07T11:00:00.000Z',
    };
    this.movements.push(movement);
    return movement;
  }

  async closeSession(context: RequestContext, command: CloseCashRegisterCommand) {
    this.closeCommand = command;
    const current = this.sessions.get(command.sessionId) ?? this.currentSession;
    if (!current) throw new Error('Missing session fixture.');
    const closed: CashRegisterSession = {
      ...current,
      status: 'CLOSED',
      actualBalanceAmountCents: command.actualBalanceAmountCents,
      differenceAmountCents:
        command.actualBalanceAmountCents -
        (command.expectedBalanceAmountCents ?? current.expectedBalanceAmountCents),
      closedBy: context.userId,
      closedAt: '2026-09-07T12:00:00.000Z',
      closingNotes: command.differenceReason,
      updatedAt: '2026-09-07T12:00:00.000Z',
    };
    this.currentSession = null;
    this.sessions.set(closed.id, {
      ...closed,
      movements: [],
      cashInAmountCents: 0,
      cashOutAmountCents: 0,
    });
    return closed;
  }

  async listMovements(_context: RequestContext, _filters: CashMovementListFilters = {}) {
    return this.movements;
  }
}

class FakeCashRegisterAuditSink implements CashRegisterAuditSink {
  readonly contexts: RequestContext[] = [];
  readonly events: Array<Parameters<CashRegisterAuditSink['record']>[1]> = [];

  async record(context: RequestContext, event: Parameters<CashRegisterAuditSink['record']>[1]) {
    this.contexts.push(context);
    this.events.push(event);
  }
}

describe('CashRegisterApplicationService', () => {
  let repository: FakeCashRegisterRepository;
  let audit: FakeCashRegisterAuditSink;
  let service: CashRegisterApplicationService;

  beforeEach(() => {
    repository = new FakeCashRegisterRepository();
    audit = new FakeCashRegisterAuditSink();
    service = new CashRegisterApplicationService(repository, audit);
  });

  it('opens a cash session when the branch has no open session', async () => {
    const result = await service.openSession(context, {
      branchId: 'branch-1',
      openingBalanceAmountCents: 20_000,
      idempotencyKey: 'cash-open-1',
      notes: 'Abertura do dia.',
    });

    expect(result).toMatchObject({ status: 'OPEN', openingBalanceAmountCents: 20_000 });
    expect(repository.openedCommand?.idempotencyKey).toBe('cash-open-1');
    expect(audit.contexts.at(-1)).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'CASH_OPENED',
      result: 'SUCCESS',
      afterState: expect.objectContaining({ tenantId: 'tenant-1', branchId: 'branch-1' }),
    });
  });

  it('rejects duplicate open cash sessions for the same branch', async () => {
    repository.currentSession = openSession;

    await expect(
      service.openSession(context, {
        branchId: 'branch-1',
        openingBalanceAmountCents: 0,
        idempotencyKey: 'cash-open-2',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CASH_REGISTER_ALREADY_OPEN',
        'Cash register already has an open session for this branch.',
      ),
    );
  });

  it('returns the current visible cash session summary', async () => {
    repository.currentSession = openSession;

    await expect(service.getCurrentSession(context, { branchId: 'branch-1' })).resolves.toEqual(
      openSession,
    );
  });

  it('records withdrawal and cash-in movements against the open session', async () => {
    repository.currentSession = openSession;
    repository.sessions.set(openSession.id, openSession);

    const withdrawal = await service.recordMovement(context, {
      branchId: 'branch-1',
      type: 'WITHDRAWAL',
      amountCents: 2_000,
      reason: 'Sangria operacional.',
      idempotencyKey: 'cash-withdraw-1',
    });
    const cashIn = await service.recordMovement(context, {
      branchId: 'branch-1',
      type: 'CASH_IN',
      amountCents: 1_500,
      reason: 'Reforco de troco.',
      idempotencyKey: 'cash-in-1',
    });

    expect(withdrawal).toMatchObject({ type: 'WITHDRAWAL', signedAmountCents: -2_000 });
    expect(cashIn).toMatchObject({ type: 'CASH_IN', signedAmountCents: 1_500 });
    expect(audit.contexts[0]).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.map((event) => event.action)).toEqual([
      'CASH_MOVEMENT_RECORDED',
      'CASH_MOVEMENT_RECORDED',
    ]);
    expect(audit.events[0]).toMatchObject({
      result: 'SUCCESS',
      afterState: expect.objectContaining({ tenantId: 'tenant-1', branchId: 'branch-1' }),
    });
  });

  it('rejects movements when there is no open cash session', async () => {
    await expect(
      service.recordMovement(context, {
        branchId: 'branch-1',
        type: 'WITHDRAWAL',
        amountCents: 1_000,
        reason: 'Sem sessao aberta.',
        idempotencyKey: 'cash-withdraw-2',
      }),
    ).rejects.toMatchObject({ code: 'CASH_REGISTER_NOT_OPEN' });
  });

  it('rejects movement mutation against a closed session', async () => {
    repository.currentSession = {
      ...openSession,
      status: 'CLOSED',
      closedBy: 'user-1',
      closedAt: '2026-09-07T12:00:00.000Z',
    };

    await expect(
      service.recordMovement(context, {
        branchId: 'branch-1',
        type: 'CASH_IN',
        amountCents: 1_000,
        reason: 'Sessao fechada.',
        idempotencyKey: 'cash-in-closed-1',
      }),
    ).rejects.toMatchObject({ code: 'CASH_REGISTER_INVALID_STATUS' });
  });

  it('requires a divergence note when actual and expected closing balances differ', async () => {
    repository.sessions.set(openSession.id, openSession);

    await expect(
      service.closeSession(context, {
        sessionId: openSession.id,
        actualBalanceAmountCents: 20_000,
        idempotencyKey: 'cash-close-1',
      }),
    ).rejects.toMatchObject({ code: 'CASH_REGISTER_VALIDATION_ERROR' });
  });

  it('closes an open session with expected amount and divergence reason', async () => {
    repository.sessions.set(openSession.id, openSession);

    const result = await service.closeSession(context, {
      sessionId: openSession.id,
      actualBalanceAmountCents: 24_000,
      expectedBalanceAmountCents: 25_000,
      differenceReason: 'Diferenca conferida no fechamento.',
      idempotencyKey: 'cash-close-2',
    });

    expect(result).toMatchObject({
      id: openSession.id,
      status: 'CLOSED',
      actualBalanceAmountCents: 24_000,
      differenceAmountCents: -1_000,
    });
    expect(repository.closeCommand?.expectedBalanceAmountCents).toBe(25_000);
    expect(audit.contexts.at(-1)).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'CASH_CLOSED',
      result: 'SUCCESS',
      afterState: expect.objectContaining({ tenantId: 'tenant-1', branchId: 'branch-1' }),
    });
  });
});
