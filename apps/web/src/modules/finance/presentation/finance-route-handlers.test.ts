import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinanceSummary, FinancialEntry, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/finance-service';
import { createFinanceRouteHandlers, type FinanceRouteService } from './finance-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['finance.read'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const summary: FinanceSummary = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  revenueAmountCents: 50_000,
  expenseAmountCents: 12_000,
  resultAmountCents: 38_000,
  commissionLiabilityAmountCents: 8_000,
  paidPayoutAmountCents: 3_000,
  cashInAmountCents: 40_000,
  cashOutAmountCents: 7_000,
  entriesCount: 9,
};

const entry: FinancialEntry = {
  id: 'financial-entry-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  direction: 'IN',
  type: 'SERVICE_REVENUE',
  status: 'POSTED',
  amountCents: 8_500,
  signedAmountCents: 8_500,
  competenceDate: '2026-09-07',
  cashDate: '2026-09-07',
  sourceType: 'PAYMENT',
  sourceId: 'payment-1',
  description: 'Paid Comanda revenue',
  idempotencyKey: 'receive-key-1:finance:payment-1',
  createdBy: 'user-1',
  createdAt: '2026-09-07T15:20:00.000Z',
};

type MockService = FinanceRouteService & {
  getSummary: ReturnType<typeof vi.fn>;
  listEntries: ReturnType<typeof vi.fn>;
};

describe('finance route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createFinanceRouteHandlers>;

  beforeEach(() => {
    service = {
      getSummary: vi.fn(async () => summary),
      listEntries: vi.fn(async () => [entry]),
    };
    handlers = createFinanceRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('gets a finance summary with required period and branch filters', async () => {
    const response = await handlers.GET_SUMMARY(
      new Request(
        'https://barberos.local/api/v1/finance/summary?periodStart=2026-09-01&periodEnd=2026-09-30&branchId=branch-1',
        { headers: { 'x-request-id': 'request-1' } },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: summary, requestId: 'request-1' });
    expect(service.getSummary).toHaveBeenCalledWith(context, {
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      branchId: 'branch-1',
    });
  });

  it('lists financial entries with period, branch and source filters', async () => {
    const response = await handlers.GET_ENTRIES(
      new Request(
        'https://barberos.local/api/v1/finance/entries?periodStart=2026-09-01&periodEnd=2026-09-30&branchId=branch-1&sourceType=PAYMENT&sourceId=payment-1&limit=20&cursor=2026-09-07T15:20:00.000Z',
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [entry], requestId: 'request-1' });
    expect(service.listEntries).toHaveBeenCalledWith(context, {
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      branchId: 'branch-1',
      sourceType: 'PAYMENT',
      sourceId: 'payment-1',
      limit: 20,
      cursor: '2026-09-07T15:20:00.000Z',
    });
  });

  it('returns 401 when context is missing', async () => {
    handlers = createFinanceRouteHandlers({ resolveContext: vi.fn(async () => null), service });

    const response = await handlers.GET_SUMMARY(
      new Request(
        'https://barberos.local/api/v1/finance/summary?periodStart=2026-09-01&periodEnd=2026-09-30',
      ),
    );

    expect(response.status).toBe(401);
    expect(service.getSummary).not.toHaveBeenCalled();
  });

  it('maps permission denial to a sanitized stable error envelope', async () => {
    service.getSummary.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'FINANCE_PERMISSION_DENIED',
        'Tenant tenant-secret cannot read Branch branch-secret.',
      ),
    );

    const response = await handlers.GET_SUMMARY(
      new Request(
        'https://barberos.local/api/v1/finance/summary?periodStart=2026-09-01&periodEnd=2026-09-30&branchId=branch-secret',
      ),
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'FINANCE_PERMISSION_DENIED',
      message: 'Permission denied.',
      requestId: 'request-1',
    });
    expect(JSON.stringify(body)).not.toContain('tenant-secret');
    expect(JSON.stringify(body)).not.toContain('branch-secret');
  });

  it('maps branch-scope denial and invalid periods to stable responses', async () => {
    service.listEntries.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'FINANCE_BRANCH_SCOPE_DENIED',
        'Tenant tenant-1 cannot access branch branch-2.',
      ),
    );
    let response: Response = await handlers.GET_ENTRIES(
      new Request(
        'https://barberos.local/api/v1/finance/entries?periodStart=2026-09-01&periodEnd=2026-09-30&branchId=branch-2',
      ),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toBe(
      'Financial data is outside the authorized scope.',
    );

    response = await handlers.GET_SUMMARY(
      new Request('https://barberos.local/api/v1/finance/summary?periodStart=2026-09-01'),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('FINANCE_VALIDATION_ERROR');
  });
});
