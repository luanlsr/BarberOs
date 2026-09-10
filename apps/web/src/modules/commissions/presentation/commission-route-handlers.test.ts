import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CommissionAccrual,
  Payout,
  PayoutDetail,
  ProfessionalWallet,
  RequestContext,
} from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/commission-service';
import {
  createCommissionRouteHandlers,
  type CommissionRouteService,
} from './commission-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['commission.read', 'commission.manage'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const professionalContext: RequestContext = {
  ...context,
  userId: 'professional-1',
  role: 'PROFESSIONAL',
  permissions: ['commission.read'],
};

const accrual: CommissionAccrual = {
  id: 'accrual-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  orderId: 'order-1',
  orderItemId: 'item-1',
  paymentId: 'payment-1',
  ruleId: 'rule-1',
  ruleTypeSnapshot: 'PERCENTAGE',
  ruleScopeSnapshot: 'SERVICE',
  rulePercentageBpsSnapshot: 5_000,
  baseAmountCents: 9_000,
  commissionAmountCents: 4_500,
  status: 'OPEN',
  accruedAt: '2026-09-08T12:30:00.000Z',
  createdAt: '2026-09-08T12:30:00.000Z',
  updatedAt: '2026-09-08T12:30:00.000Z',
};

const closedPayout: Payout = {
  id: 'payout-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  status: 'CLOSED',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  totalAmountCents: 4_500,
  sources: [{ accrualId: 'accrual-1', amountCents: 4_500 }],
  idempotencyKey: 'payout-close-1',
  closedBy: 'user-1',
  closedAt: '2026-09-08T14:00:00.000Z',
  createdAt: '2026-09-08T14:00:00.000Z',
  updatedAt: '2026-09-08T14:00:00.000Z',
};

const paidPayout: Payout = {
  ...closedPayout,
  status: 'PAID',
  paymentMethod: 'PIX',
  financialEntryId: 'entry-payout-1',
  idempotencyKey: 'payout-pay-1',
  paidBy: 'user-1',
  paidAt: '2026-09-08T15:00:00.000Z',
  updatedAt: '2026-09-08T15:00:00.000Z',
};

const payoutDetail: PayoutDetail = {
  payout: closedPayout,
  allocations: [],
  accruals: [{ ...accrual, status: 'SETTLED', payoutId: 'payout-1' }],
};

const wallet: ProfessionalWallet = {
  tenantId: 'tenant-1',
  professionalId: 'professional-1',
  branchIds: ['branch-1'],
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  productionAmountCents: 9_000,
  openCommissionAmountCents: 4_500,
  paidPayoutAmountCents: 4_500,
  expectedBalanceAmountCents: 0,
  accruals: [accrual],
  payouts: [paidPayout],
};

type MockService = CommissionRouteService & {
  listAccruals: ReturnType<typeof vi.fn>;
  getProfessionalWallet: ReturnType<typeof vi.fn>;
  closePayout: ReturnType<typeof vi.fn>;
  payPayout: ReturnType<typeof vi.fn>;
  correctPayout: ReturnType<typeof vi.fn>;
};

describe('commission route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createCommissionRouteHandlers>;

  beforeEach(() => {
    service = {
      listAccruals: vi.fn(async () => [accrual]),
      getProfessionalWallet: vi.fn(async () => wallet),
      closePayout: vi.fn(async () => payoutDetail),
      payPayout: vi.fn(async () => ({ ...payoutDetail, payout: paidPayout })),
      correctPayout: vi.fn(async () => ({
        ...payoutDetail,
        payout: { ...paidPayout, status: 'CORRECTED' as const, correctionReason: 'Ajuste manual' },
      })),
    };
    handlers = createCommissionRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists commission accruals with owner and finance visibility filters', async () => {
    const response = await handlers.GET_ACCRUALS(
      new Request(
        'https://barberos.local/api/v1/commissions/accruals?branchId=branch-1&professionalId=professional-1&status=OPEN&payoutId=payout-1&orderId=order-1&periodStart=2026-09-01&periodEnd=2026-09-30&limit=25&cursor=cursor-1',
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [accrual], requestId: 'request-1' });
    expect(service.listAccruals).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      status: 'OPEN',
      payoutId: 'payout-1',
      orderId: 'order-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      limit: 25,
      cursor: 'cursor-1',
    });
  });

  it('reads the professional wallet with professional-scoped filters', async () => {
    handlers = createCommissionRouteHandlers({
      resolveContext: vi.fn(async () => professionalContext),
      service,
    });

    const response = await handlers.GET_WALLET(
      new Request(
        'https://barberos.local/api/v1/commissions/wallet?branchId=branch-1&professionalId=professional-1&periodStart=2026-09-01&periodEnd=2026-09-30',
      ),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      professionalId: 'professional-1',
      expectedBalanceAmountCents: 0,
    });
    expect(service.getProfessionalWallet).toHaveBeenCalledWith(professionalContext, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });
  });

  it('closes a payout and returns 201', async () => {
    const body = {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      accrualIds: ['accrual-1'],
      idempotencyKey: 'payout-close-1',
    };

    const response = await handlers.POST_PAYOUT(
      new Request('https://barberos.local/api/v1/payouts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).data.payout).toMatchObject({ id: 'payout-1', status: 'CLOSED' });
    expect(service.closePayout).toHaveBeenCalledWith(context, body);
  });

  it('pays and corrects payouts through dynamic route ids', async () => {
    const payBody = {
      paymentMethod: 'PIX',
      paidAt: '2026-09-08T15:00:00.000Z',
      idempotencyKey: 'payout-pay-1',
    };
    let response: Response = await handlers.POST_PAY_PAYOUT(
      new Request('https://barberos.local/api/v1/payouts/payout-1/pay', {
        method: 'POST',
        body: JSON.stringify(payBody),
      }),
      'payout-1',
    );

    expect(response.status).toBe(200);
    expect(service.payPayout).toHaveBeenCalledWith(context, { ...payBody, payoutId: 'payout-1' });

    const correctBody = {
      amountCents: 500,
      direction: 'OUT',
      reason: 'Ajuste manual',
      idempotencyKey: 'payout-correct-1',
    };
    response = await handlers.POST_CORRECT_PAYOUT(
      new Request('https://barberos.local/api/v1/payouts/payout-1/correct', {
        method: 'POST',
        body: JSON.stringify(correctBody),
      }),
      'payout-1',
    );

    expect(response.status).toBe(200);
    expect(service.correctPayout).toHaveBeenCalledWith(context, {
      ...correctBody,
      payoutId: 'payout-1',
    });
  });

  it('returns stable validation, permission and payout errors without protected details', async () => {
    let response: Response = await handlers.GET_WALLET(
      new Request('https://barberos.local/api/v1/commissions/wallet?professionalId=professional-1'),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: 'COMMISSION_VALIDATION_ERROR',
      requestId: 'request-1',
    });

    service.listAccruals.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'COMMISSION_PERMISSION_DENIED',
        'Tenant tenant-secret cannot read branch branch-secret accruals.',
      ),
    );
    response = await handlers.GET_ACCRUALS(
      new Request('https://barberos.local/api/v1/commissions/accruals?branchId=branch-secret'),
    );
    const deniedBody = await response.json();
    expect(response.status).toBe(403);
    expect(deniedBody.error).toMatchObject({
      code: 'COMMISSION_PERMISSION_DENIED',
      message: 'Permission denied.',
    });
    expect(JSON.stringify(deniedBody)).not.toContain('tenant-secret');
    expect(JSON.stringify(deniedBody)).not.toContain('branch-secret');

    service.payPayout.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'PAYOUT_IMMUTABLE',
        'Payout payout-secret was already paid.',
      ),
    );
    response = await handlers.POST_PAY_PAYOUT(
      new Request('https://barberos.local/api/v1/payouts/payout-secret/pay', {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'PIX', idempotencyKey: 'payout-pay-2' }),
      }),
      'payout-secret',
    );
    const payoutBody = await response.json();
    expect(response.status).toBe(409);
    expect(payoutBody.error).toMatchObject({
      code: 'PAYOUT_IMMUTABLE',
      message: 'Payout history cannot be changed destructively.',
    });
    expect(JSON.stringify(payoutBody)).not.toContain('payout-secret');
  });
});
