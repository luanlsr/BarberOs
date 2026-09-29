import type { Campaign, RequestContext } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCampaignActionRouteHandlers,
  createCampaignMetricsRouteHandlers,
  createCampaignPreviewRouteHandlers,
  createCampaignRouteHandlers,
  type CampaignRouteService,
} from './campaign-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['campaigns.read', 'campaigns.create', 'campaigns.approve', 'campaigns.send'],
  entitlements: ['campaigns'],
  branchScope: ['branch-1'],
};

const campaign: Campaign = {
  id: 'campaign-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  name: 'Reativacao setembro',
  status: 'DRAFT',
  audienceCriteria: { branchIds: ['branch-1'], includeCustomersWithoutVisit: false },
  content: {
    templateKey: 'campaign.reactivation.v1',
    bodyPreview: 'Sentimos sua falta.',
    variables: {},
  },
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
};

type MockService = CampaignRouteService & {
  list: ReturnType<typeof vi.fn>;
  createDraft: ReturnType<typeof vi.fn>;
  submitForReview: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
  schedule: ReturnType<typeof vi.fn>;
  markSending: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  previewAudience: ReturnType<typeof vi.fn>;
  aggregateRunMetrics: ReturnType<typeof vi.fn>;
};

describe('campaign route handlers', () => {
  let service: MockService;

  beforeEach(() => {
    service = {
      list: vi.fn(async () => [campaign]),
      createDraft: vi.fn(async () => campaign),
      submitForReview: vi.fn(async () => campaignWithStatus('READY_FOR_REVIEW')),
      approve: vi.fn(async () => campaignWithStatus('APPROVED')),
      schedule: vi.fn(async () => campaignWithStatus('SCHEDULED')),
      markSending: vi.fn(async () => campaignWithStatus('SENDING')),
      cancel: vi.fn(async () => campaignWithStatus('CANCELLED')),
      previewAudience: vi.fn(async () => ({
        audienceSize: 3,
        eligibleCount: 1,
        excludedCount: 2,
        unknownContactCount: 1,
        exclusions: [],
      })),
      aggregateRunMetrics: vi.fn(async () => ({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        campaignId: 'campaign-1',
        campaignRunId: 'campaign-run-1',
        audienceSize: 3,
        sentCount: 1,
        deliveredCount: 1,
        failedCount: 1,
        skippedCount: 1,
        blockedByConsentCount: 0,
        optOutCount: 0,
        replyCount: 1,
        updatedAt: '2026-09-29T13:00:00.000Z',
      })),
    };
  });

  it('lists and creates campaign drafts through protected APIs', async () => {
    const handlers = createCampaignRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/campaigns?branchId=branch-1&status=DRAFT'),
    );
    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: 'DRAFT',
    });
    expect(await response.json()).toEqual({ data: [campaign], requestId: 'request-1' });

    const command = {
      branchId: 'branch-1',
      name: 'Reativacao setembro',
      audienceCriteria: { branchIds: ['branch-1'] },
      content: {
        templateKey: 'campaign.reactivation.v1',
        bodyPreview: 'Sentimos sua falta.',
      },
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/campaigns', {
        method: 'POST',
        body: JSON.stringify(command),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.createDraft).toHaveBeenCalledWith(context, command);
  });

  it('previews campaign audience and reads metrics', async () => {
    const previewHandlers = createCampaignPreviewRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    const metricsHandlers = createCampaignMetricsRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await previewHandlers.POST(
      new Request('https://barberos.local/api/v1/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({ branchIds: ['branch-1'] }),
      }),
    );
    expect(response.status).toBe(200);
    expect(service.previewAudience).toHaveBeenCalledWith(context, { branchIds: ['branch-1'] });

    response = await metricsHandlers.GET(
      new Request('https://barberos.local/api/v1/campaigns/metrics?campaignRunId=campaign-run-1'),
    );
    expect(response.status).toBe(200);
    expect(service.aggregateRunMetrics).toHaveBeenCalledWith(context, {
      campaignRunId: 'campaign-run-1',
    });
  });

  it('routes lifecycle actions to approval, scheduling and cancellation services', async () => {
    const handlers = createCampaignActionRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    await handlers.POST(
      new Request('https://barberos.local/api/v1/campaigns/actions?action=approve', {
        method: 'POST',
        body: JSON.stringify({ campaignId: 'campaign-1' }),
      }),
    );
    expect(service.approve).toHaveBeenCalledWith(context, { campaignId: 'campaign-1' });

    await handlers.POST(
      new Request('https://barberos.local/api/v1/campaigns/actions?action=schedule', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'campaign-1',
          scheduledFor: '2026-09-30T13:00:00.000Z',
          idempotencyKey: 'campaign-1:schedule',
        }),
      }),
    );
    expect(service.schedule).toHaveBeenCalledWith(context, {
      campaignId: 'campaign-1',
      scheduledFor: '2026-09-30T13:00:00.000Z',
      idempotencyKey: 'campaign-1:schedule',
    });

    await handlers.POST(
      new Request('https://barberos.local/api/v1/campaigns/actions?action=cancel', {
        method: 'POST',
        body: JSON.stringify({ campaignId: 'campaign-1', reason: 'Pausar campanha' }),
      }),
    );
    expect(service.cancel).toHaveBeenCalledWith(context, {
      campaignId: 'campaign-1',
      reason: 'Pausar campanha',
    });
  });

  it('returns stable errors for missing auth and missing required parameters', async () => {
    let handlers = createCampaignRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/campaigns', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );
    expect(response.status).toBe(401);

    const metricsHandlers = createCampaignMetricsRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    response = await metricsHandlers.GET(
      new Request('https://barberos.local/api/v1/campaigns/metrics'),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_VALIDATION_ERROR',
        message: 'Campaign run id is required.',
        requestId: 'request-1',
      },
    });
  });
});

function campaignWithStatus(status: Campaign['status']): Campaign {
  return { ...campaign, status };
}
