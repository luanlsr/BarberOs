import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { CashMovement, CashRegisterSession, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/cash-register-service';
import {
  createCashMovementRouteHandlers,
  createCashRegisterRouteHandlers,
  type CashMovementRouteService,
  type CashRegisterRouteService,
} from './cash-register-route-handlers';

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

const session: CashRegisterSession = {
  id: 'cash-session-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  status: 'OPEN',
  openedBy: 'user-1',
  openedAt: '2026-09-07T10:00:00.000Z',
  openingBalanceAmountCents: 20_000,
  expectedBalanceAmountCents: 28_500,
  differenceAmountCents: 0,
  createdAt: '2026-09-07T10:00:00.000Z',
  updatedAt: '2026-09-07T10:00:00.000Z',
};

const movement: CashMovement = {
  id: 'cash-movement-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  sessionId: 'cash-session-1',
  type: 'WITHDRAWAL',
  amountCents: 2_000,
  signedAmountCents: -2_000,
  reason: 'Sangria operacional.',
  createdBy: 'user-1',
  createdAt: '2026-09-07T11:00:00.000Z',
};

type MockCashRegisterService = CashRegisterRouteService & {
  getCurrentSession: ReturnType<typeof vi.fn>;
  openSession: ReturnType<typeof vi.fn>;
  closeSession: ReturnType<typeof vi.fn>;
};

type MockCashMovementService = CashMovementRouteService & {
  listMovements: ReturnType<typeof vi.fn>;
  recordMovement: ReturnType<typeof vi.fn>;
};

describe('cash register route handlers', () => {
  let service: MockCashRegisterService;
  let handlers: ReturnType<typeof createCashRegisterRouteHandlers>;

  beforeEach(() => {
    service = {
      getCurrentSession: vi.fn(async () => ({
        ...session,
        movements: [movement],
        cashInAmountCents: 28_500,
        cashOutAmountCents: 0,
      })),
      openSession: vi.fn(async () => session),
      closeSession: vi.fn(async () => ({
        ...session,
        status: 'CLOSED' as const,
        closedBy: 'user-1',
        closedAt: '2026-09-07T20:00:00.000Z',
      })),
    };
    handlers = createCashRegisterRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('gets the current cash session and opens a session', async () => {
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/cash-register?branchId=branch-1'),
    );
    expect(response.status).toBe(200);
    expect(service.getCurrentSession).toHaveBeenCalledWith(context, { branchId: 'branch-1' });

    const body = {
      branchId: 'branch-1',
      openingBalanceAmountCents: 20_000,
      idempotencyKey: 'cash-open-1',
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/cash-register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.openSession).toHaveBeenCalledWith(context, body);
  });

  it('closes a session through the dynamic close action', async () => {
    const body = { actualBalanceAmountCents: 28_500, idempotencyKey: 'cash-close-1' };
    const response = await handlers.POST_CLOSE(
      new Request('https://barberos.local/api/v1/cash-register/cash-session-1/close', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      'cash-session-1',
    );

    expect(response.status).toBe(200);
    expect(service.closeSession).toHaveBeenCalledWith(context, {
      ...body,
      sessionId: 'cash-session-1',
    });
  });

  it('maps missing and already-open sessions to stable statuses', async () => {
    service.getCurrentSession.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'CASH_REGISTER_NOT_FOUND',
        'Tenant tenant-1 missing session.',
      ),
    );
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/cash-register'),
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error.message).toBe('Cash register session was not found.');

    service.openSession.mockRejectedValueOnce(
      new CoreOperationsApplicationError('CASH_REGISTER_ALREADY_OPEN', 'Already open.'),
    );
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/cash-register', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(409);
  });
});

describe('cash movement route handlers', () => {
  let service: MockCashMovementService;
  let handlers: ReturnType<typeof createCashMovementRouteHandlers>;

  beforeEach(() => {
    service = {
      listMovements: vi.fn(async () => [movement]),
      recordMovement: vi.fn(async () => movement),
    };
    handlers = createCashMovementRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists and records cash movements', async () => {
    let response: Response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/cash-movements?branchId=branch-1&type=WITHDRAWAL&limit=20',
      ),
    );
    expect(response.status).toBe(200);
    expect(service.listMovements).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      type: 'WITHDRAWAL',
      limit: 20,
    });

    const body = {
      branchId: 'branch-1',
      type: 'WITHDRAWAL',
      amountCents: 2_000,
      reason: 'Sangria operacional.',
      idempotencyKey: 'cash-withdraw-1',
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/cash-movements', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.recordMovement).toHaveBeenCalledWith(context, body);
  });

  it('maps validation and branch scope denial to safe responses', async () => {
    service.recordMovement.mockRejectedValueOnce(new ZodError([]));
    let response: Response = await handlers.POST(
      new Request('https://barberos.local/api/v1/cash-movements', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(400);

    service.recordMovement.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'CASH_REGISTER_BRANCH_SCOPE_DENIED',
        'Tenant tenant-1 cannot access branch-2.',
      ),
    );
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/cash-movements', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toBe(
      'Cash register is outside the authorized scope.',
    );
  });
});
