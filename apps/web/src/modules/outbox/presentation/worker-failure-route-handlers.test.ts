import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@barberos/contracts';

import {
  createWorkerFailureRouteHandlers,
  type WorkerFailureRouteService,
} from './worker-failure-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['worker.failures.read'],
  entitlements: ['worker.operations'],
  branchScope: ['branch-1'],
};

const summary = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  generatedAt: '2026-09-22T10:00:00.000Z',
  metrics: [{ key: 'deadLetters' as const, label: 'Dead letters', value: 1 }],
  outbox: [],
  jobs: [],
  notifications: [],
};

type MockService = WorkerFailureRouteService & {
  summarize: ReturnType<typeof vi.fn>;
};

describe('worker failure route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createWorkerFailureRouteHandlers>;

  beforeEach(() => {
    service = {
      summarize: vi.fn(async () => summary),
    };
    handlers = createWorkerFailureRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('reads failure summaries with branch and status filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/worker/failures?branchId=branch-1&limit=20&outboxStatus=DEAD_LETTERED&jobStatus=RETRY_SCHEDULED&notificationStatus=FAILED',
      ),
    );

    expect(response.status).toBe(200);
    expect(service.summarize).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      limit: 20,
      outboxStatus: 'DEAD_LETTERED',
      jobStatus: 'RETRY_SCHEDULED',
      notificationStatus: 'FAILED',
    });
    expect(await response.json()).toEqual({ data: summary, requestId: 'request-1' });
  });

  it('returns stable unauthenticated and sanitized authorization envelopes', async () => {
    handlers = createWorkerFailureRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });
    let response = await handlers.GET(
      new Request('https://barberos.local/api/v1/worker/failures', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        requestId: 'request-unauthenticated',
      },
    });

    service.summarize.mockRejectedValueOnce(
      Object.assign(new Error('User user-1 cannot access tenant-secret branch-secret.'), {
        code: 'BRANCH_SCOPE_DENIED',
      }),
    );
    handlers = createWorkerFailureRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    response = await handlers.GET(new Request('https://barberos.local/api/v1/worker/failures'));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: 'CORE_BRANCH_SCOPE_DENIED',
        message: 'Branch scope denied.',
        requestId: 'request-1',
      },
    });
    expect(JSON.stringify(body)).not.toContain('tenant-secret');
    expect(JSON.stringify(body)).not.toContain('branch-secret');
  });
});
