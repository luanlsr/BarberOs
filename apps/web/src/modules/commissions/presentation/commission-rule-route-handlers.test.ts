import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommissionRule, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/commission-service';
import {
  createCommissionRuleRouteHandlers,
  type CommissionRuleRouteService,
} from './commission-rule-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['commission.manage'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const rule: CommissionRule = {
  id: 'rule-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  scope: 'SERVICE',
  type: 'PERCENTAGE',
  status: 'ACTIVE',
  professionalId: 'professional-1',
  sourceType: 'SERVICE',
  sourceId: 'service-1',
  percentageBps: 4_000,
  effectiveFrom: '2026-09-01',
  effectiveUntil: '2026-12-31',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:00:00.000Z',
};

type MockService = CommissionRuleRouteService & {
  listRules: ReturnType<typeof vi.fn>;
  createRule: ReturnType<typeof vi.fn>;
  updateRule: ReturnType<typeof vi.fn>;
};

describe('commission rule route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createCommissionRuleRouteHandlers>;

  beforeEach(() => {
    service = {
      listRules: vi.fn(async () => [rule]),
      createRule: vi.fn(async () => rule),
      updateRule: vi.fn(async () => ({ ...rule, percentageBps: 4_500 })),
    };
    handlers = createCommissionRuleRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists rules with branch, precedence and cursor filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/commission-rules?branchId=branch-1&professionalId=professional-1&sourceType=SERVICE&sourceId=service-1&status=ACTIVE&limit=25&cursor=cursor-1',
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [rule], requestId: 'request-1' });
    expect(service.listRules).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      status: 'ACTIVE',
      limit: 25,
      cursor: 'cursor-1',
    });
  });

  it('creates a source-specific professional rule and returns 201', async () => {
    const body = {
      branchId: 'branch-1',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      professionalId: 'professional-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      percentageBps: 4_000,
      effectiveFrom: '2026-09-01',
      effectiveUntil: '2026-12-31',
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/commission-rules', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({
      scope: 'SERVICE',
      professionalId: 'professional-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      percentageBps: 4_000,
    });
    expect(service.createRule).toHaveBeenCalledWith(context, body);
  });

  it('updates through a dynamic rule id', async () => {
    const body = { percentageBps: 4_500 };

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/commission-rules/rule-1', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
      'rule-1',
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.percentageBps).toBe(4_500);
    expect(service.updateRule).toHaveBeenCalledWith(context, { ...body, id: 'rule-1' });
  });

  it('returns 401 when context is missing', async () => {
    handlers = createCommissionRuleRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/commission-rules'),
    );

    expect(response.status).toBe(401);
    expect(service.listRules).not.toHaveBeenCalled();
  });

  it('maps effective date validation, permission denial and tenant leakage to stable responses', async () => {
    service.updateRule.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'COMMISSION_VALIDATION_ERROR',
        'Commission rule effective end must be after start.',
      ),
    );
    let response: Response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/commission-rules/rule-1', {
        method: 'PATCH',
        body: JSON.stringify({ effectiveFrom: '2026-12-31', effectiveUntil: '2026-09-01' }),
      }),
      'rule-1',
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: 'COMMISSION_VALIDATION_ERROR',
      requestId: 'request-1',
    });

    service.createRule.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'COMMISSION_PERMISSION_DENIED',
        'Tenant tenant-secret cannot manage commission rules.',
      ),
    );
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/commission-rules', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    const deniedBody = await response.json();
    expect(response.status).toBe(403);
    expect(deniedBody.error).toMatchObject({
      code: 'COMMISSION_PERMISSION_DENIED',
      message: 'Permission denied.',
      requestId: 'request-1',
    });
    expect(JSON.stringify(deniedBody)).not.toContain('tenant-secret');

    service.listRules.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'COMMISSION_BRANCH_SCOPE_DENIED',
        'Branch branch-secret belongs to tenant-secret.',
      ),
    );
    response = await handlers.GET(
      new Request('https://barberos.local/api/v1/commission-rules?branchId=branch-secret'),
    );
    const leakageBody = await response.json();
    expect(response.status).toBe(403);
    expect(leakageBody.error).toMatchObject({
      code: 'COMMISSION_BRANCH_SCOPE_DENIED',
      message: 'Commission data is outside the authorized scope.',
    });
    expect(JSON.stringify(leakageBody)).not.toContain('tenant-secret');
    expect(JSON.stringify(leakageBody)).not.toContain('branch-secret');
  });
});
