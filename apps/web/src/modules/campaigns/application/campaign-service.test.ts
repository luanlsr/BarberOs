import { describe, expect, it } from 'vitest';
import {
  campaignRecipientOutcomeSchema,
  campaignRunSchema,
  campaignSchema,
  type Campaign,
  type CampaignRecipientOutcome,
  type CampaignRun,
  type RequestContext,
} from '@barberos/contracts';

import type {
  CampaignAudienceCandidate,
  CampaignAudienceRepository,
  CampaignFilters,
  CampaignMetricRollup,
  CampaignRepository,
  CampaignRunEngagementMetrics,
  CampaignRunRepository,
  CampaignRunSnapshot,
  CreateCampaignRunSnapshotCommand,
  CreateCampaignDraftRecordCommand,
  UpdateCampaignLifecycleCommand,
} from '../domain';
import { CampaignApplicationService } from './campaign-service';

const context: RequestContext = {
  requestId: 'request-campaigns',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['campaigns.read', 'campaigns.create', 'campaigns.approve', 'campaigns.send'],
  entitlements: ['campaigns'],
  branchScope: ['branch-1'],
};

const draft: Campaign = {
  id: 'campaign-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  name: 'Reativacao setembro',
  status: 'DRAFT',
  audienceCriteria: {
    branchIds: ['branch-1'],
    customerStatus: ['INACTIVE'],
    includeCustomersWithoutVisit: false,
  },
  content: {
    templateKey: 'campaign.reactivation.v1',
    bodyPreview: 'Sentimos sua falta por aqui.',
    variables: {},
  },
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-28T12:00:00.000Z',
  updatedAt: '2026-09-28T12:00:00.000Z',
};

class FakeCampaignRepository implements CampaignRepository {
  readonly campaigns = new Map<string, Campaign>([[draft.id, draft]]);
  lastCreate: CreateCampaignDraftRecordCommand | null = null;
  lastFilters: CampaignFilters | undefined;
  lastLifecycle: UpdateCampaignLifecycleCommand | null = null;

  async createDraft(_context: RequestContext, command: CreateCampaignDraftRecordCommand) {
    this.lastCreate = command;
    const campaign = campaignSchema.parse({ ...draft, ...command, id: 'campaign-created' });
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async findById(_context: RequestContext, campaignId: string) {
    return this.campaigns.get(campaignId) ?? null;
  }

  async list(_context: RequestContext, filters?: CampaignFilters) {
    this.lastFilters = filters;
    return [...this.campaigns.values()];
  }

  async updateLifecycle(_context: RequestContext, command: UpdateCampaignLifecycleCommand) {
    this.lastLifecycle = command;
    const current = this.campaigns.get(command.id);
    if (!current) throw new Error('missing campaign');

    const updated = campaignSchema.parse({
      ...current,
      status: command.status,
      approvedBy: command.approvedBy ?? current.approvedBy,
      approvedAt: command.approvedAt ?? current.approvedAt,
      scheduledFor: command.scheduledFor ?? current.scheduledFor,
      updatedBy: command.updatedBy,
      updatedAt: '2026-09-28T12:05:00.000Z',
    });
    this.campaigns.set(updated.id, updated);
    return updated;
  }
}

class FakeCampaignAudienceRepository implements CampaignAudienceRepository {
  readonly candidates: CampaignAudienceCandidate[] = [
    {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-eligible',
      contactPhoneHash: 'hash-customer-eligible',
      hasReachableDestination: true,
      marketingConsentState: 'OPTED_IN',
    },
    {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-no-phone',
      hasReachableDestination: false,
      marketingConsentState: 'OPTED_IN',
    },
    {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-marketing-out',
      contactPhoneHash: 'hash-customer-marketing-out',
      hasReachableDestination: true,
      marketingConsentState: 'OPTED_OUT',
    },
    {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-unknown-consent',
      contactPhoneHash: 'hash-customer-unknown-consent',
      hasReachableDestination: true,
    },
    {
      tenantId: 'tenant-1',
      branchId: 'branch-2',
      customerId: 'customer-outside-branch',
      contactPhoneHash: 'hash-customer-outside-branch',
      hasReachableDestination: true,
      marketingConsentState: 'OPTED_IN',
    },
    {
      tenantId: 'tenant-2',
      branchId: 'branch-1',
      customerId: 'customer-outside-tenant',
      contactPhoneHash: 'hash-customer-outside-tenant',
      hasReachableDestination: true,
      marketingConsentState: 'OPTED_IN',
    },
  ];
  lastCriteria: unknown;

  async findAudienceCandidates(_context: RequestContext, criteria: unknown) {
    this.lastCriteria = criteria;
    return this.candidates;
  }
}

class FakeCampaignRunRepository implements CampaignRunRepository {
  lastSnapshot: CreateCampaignRunSnapshotCommand | null = null;
  run: CampaignRun | null = null;
  outcomes: CampaignRecipientOutcome[] = [];
  engagement: CampaignRunEngagementMetrics = { optOutCount: 0, replyCount: 0 };
  lastRollup: CampaignMetricRollup | null = null;

  async createFrozenAudienceSnapshot(
    _context: RequestContext,
    command: CreateCampaignRunSnapshotCommand,
  ): Promise<CampaignRunSnapshot> {
    this.lastSnapshot = command;
    const run: CampaignRun = campaignRunSchema.parse({
      id: 'campaign-run-1',
      tenantId: command.tenantId,
      branchId: command.branchId,
      campaignId: command.campaignId,
      status: command.status,
      audienceSize: command.audienceSize,
      eligibleCount: command.eligibleCount,
      excludedCount: command.excludedCount,
      scheduledFor: command.scheduledFor,
      idempotencyKey: command.idempotencyKey,
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T10:00:00.000Z',
    });
    const recipients: CampaignRecipientOutcome[] = command.recipients.map((recipient, index) =>
      campaignRecipientOutcomeSchema.parse({
        ...recipient,
        id: `campaign-recipient-${index + 1}`,
        campaignRunId: run.id,
        createdAt: '2026-09-29T10:00:00.000Z',
        updatedAt: '2026-09-29T10:00:00.000Z',
      }),
    );
    return { run, recipients };
  }

  async findRunById(_context: RequestContext, campaignRunId: string) {
    return this.run?.id === campaignRunId ? this.run : null;
  }

  async listRecipientOutcomes() {
    return this.outcomes;
  }

  async countRunEngagementMetrics() {
    return this.engagement;
  }

  async upsertMetricRollup(_context: RequestContext, rollup: CampaignMetricRollup) {
    this.lastRollup = rollup;
    return rollup;
  }
}

describe('CampaignApplicationService', () => {
  it('creates campaign drafts inside tenant and branch scope', async () => {
    const repository = new FakeCampaignRepository();
    const service = new CampaignApplicationService(repository);

    const campaign = await service.createDraft(context, {
      branchId: 'branch-1',
      name: 'Reativacao outubro',
      audienceCriteria: {
        branchIds: ['branch-1'],
        customerStatus: ['AT_RISK'],
      },
      content: {
        templateKey: 'campaign.reactivation.v1',
        bodyPreview: 'Tem horario esperando por voce.',
      },
    });

    expect(campaign).toEqual(
      expect.objectContaining({
        id: 'campaign-created',
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        status: 'DRAFT',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }),
    );
    expect(repository.lastCreate).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        status: 'DRAFT',
        audienceCriteria: expect.objectContaining({ branchIds: ['branch-1'] }),
      }),
    );
  });

  it('rejects draft audiences outside the current branch scope', async () => {
    const service = new CampaignApplicationService(new FakeCampaignRepository());

    await expect(
      service.createDraft(context, {
        branchId: 'branch-1',
        name: 'Outra unidade',
        audienceCriteria: { branchIds: ['branch-2'] },
        content: {
          templateKey: 'campaign.reactivation.v1',
          bodyPreview: 'Volte para cortar com a gente.',
        },
      }),
    ).rejects.toThrow('Campaign audience branch is outside request scope.');
  });

  it('lists only campaigns visible to the current tenant and branch scope', async () => {
    const repository = new FakeCampaignRepository();
    repository.campaigns.set('campaign-other-branch', {
      ...draft,
      id: 'campaign-other-branch',
      branchId: 'branch-2',
    });
    repository.campaigns.set('campaign-other-tenant', {
      ...draft,
      id: 'campaign-other-tenant',
      tenantId: 'tenant-2',
    });
    const service = new CampaignApplicationService(repository);

    const campaigns = await service.list(context, { branchId: 'branch-1' });

    expect(campaigns.map((campaign) => campaign.id)).toEqual(['campaign-1']);
    expect(repository.lastFilters).toEqual({ branchId: 'branch-1' });
  });

  it('previews campaign audience with eligible, excluded and unknown-contact counts', async () => {
    const audiences = new FakeCampaignAudienceRepository();
    const service = new CampaignApplicationService(new FakeCampaignRepository(), audiences);

    const preview = await service.previewAudience(context, {
      branchIds: ['branch-1'],
      customerStatus: ['INACTIVE', 'AT_RISK'],
    });

    expect(preview).toEqual({
      audienceSize: 4,
      eligibleCount: 1,
      excludedCount: 3,
      unknownContactCount: 1,
      exclusions: [
        {
          customerId: 'customer-no-phone',
          contactPhoneHash: undefined,
          reason: 'NO_DESTINATION',
        },
        {
          customerId: 'customer-marketing-out',
          contactPhoneHash: 'hash-customer-marketing-out',
          reason: 'MARKETING_OPTED_OUT',
        },
        {
          customerId: 'customer-unknown-consent',
          contactPhoneHash: 'hash-customer-unknown-consent',
          reason: 'UNKNOWN_CONSENT',
        },
      ],
    });
    expect(audiences.lastCriteria).toEqual(
      expect.objectContaining({
        branchIds: ['branch-1'],
        customerStatus: ['INACTIVE', 'AT_RISK'],
        includeCustomersWithoutVisit: false,
      }),
    );
  });

  it('rejects audience previews outside the current branch scope', async () => {
    const service = new CampaignApplicationService(
      new FakeCampaignRepository(),
      new FakeCampaignAudienceRepository(),
    );

    await expect(service.previewAudience(context, { branchIds: ['branch-2'] })).rejects.toThrow();
  });

  it('freezes campaign run audience snapshots with per-recipient idempotency records', async () => {
    const campaigns = new FakeCampaignRepository();
    campaigns.campaigns.set('campaign-approved', {
      ...draft,
      id: 'campaign-approved',
      status: 'APPROVED',
      approvedBy: 'owner-1',
      approvedAt: '2026-09-29T09:00:00.000Z',
    });
    const runs = new FakeCampaignRunRepository();
    const service = new CampaignApplicationService(
      campaigns,
      new FakeCampaignAudienceRepository(),
      runs,
    );

    const snapshot = await service.prepareRunSnapshot(context, {
      campaignId: 'campaign-approved',
      idempotencyKey: 'campaign-approved:run:2026-09-29',
    });

    expect(snapshot.run).toEqual(
      expect.objectContaining({
        id: 'campaign-run-1',
        campaignId: 'campaign-approved',
        status: 'APPROVED',
        audienceSize: 4,
        eligibleCount: 1,
        excludedCount: 3,
        idempotencyKey: 'campaign-approved:run:2026-09-29',
      }),
    );
    expect(runs.lastSnapshot).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        campaignId: 'campaign-approved',
        audienceSize: 4,
        eligibleCount: 1,
        excludedCount: 3,
        recipients: [
          expect.objectContaining({
            customerId: 'customer-eligible',
            contactPhoneHash: 'hash-customer-eligible',
            status: 'PENDING',
            idempotencyKey: 'campaign-approved:run:2026-09-29:hash-customer-eligible',
          }),
          expect.objectContaining({
            customerId: 'customer-no-phone',
            contactPhoneHash: 'missing-destination:customer-no-phone',
            status: 'SKIPPED',
            exclusionReason: 'NO_DESTINATION',
            idempotencyKey:
              'campaign-approved:run:2026-09-29:missing-destination:customer-no-phone',
          }),
          expect.objectContaining({
            customerId: 'customer-marketing-out',
            contactPhoneHash: 'hash-customer-marketing-out',
            status: 'BLOCKED_BY_CONSENT',
            exclusionReason: 'MARKETING_OPTED_OUT',
          }),
          expect.objectContaining({
            customerId: 'customer-unknown-consent',
            contactPhoneHash: 'hash-customer-unknown-consent',
            status: 'BLOCKED_BY_CONSENT',
            exclusionReason: 'UNKNOWN_CONSENT',
          }),
        ],
      }),
    );
    expect(snapshot.recipients).toHaveLength(4);
  });

  it('rejects frozen snapshots before approval or scheduling', async () => {
    const service = new CampaignApplicationService(
      new FakeCampaignRepository(),
      new FakeCampaignAudienceRepository(),
      new FakeCampaignRunRepository(),
    );

    await expect(
      service.prepareRunSnapshot(context, {
        campaignId: 'campaign-1',
        idempotencyKey: 'campaign-1:run',
      }),
    ).rejects.toThrow('Campaign must be approved or scheduled before freezing audience.');
  });

  it('aggregates campaign run metrics from recipient outcomes and engagement events', async () => {
    const runs = new FakeCampaignRunRepository();
    runs.run = campaignRunSchema.parse({
      id: 'campaign-run-metrics',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      campaignId: 'campaign-1',
      status: 'SENDING',
      audienceSize: 7,
      eligibleCount: 5,
      excludedCount: 2,
      idempotencyKey: 'campaign-run-metrics-key',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T10:00:00.000Z',
    });
    runs.outcomes = [
      recipientOutcome('recipient-sent', 'SENT'),
      recipientOutcome('recipient-delivered', 'DELIVERED'),
      recipientOutcome('recipient-failed', 'FAILED'),
      recipientOutcome('recipient-skipped', 'SKIPPED'),
      recipientOutcome('recipient-blocked', 'BLOCKED_BY_CONSENT'),
      recipientOutcome('recipient-queued', 'QUEUED'),
      recipientOutcome('recipient-other-branch', 'DELIVERED', { branchId: 'branch-2' }),
    ];
    runs.engagement = { optOutCount: 2, replyCount: 3 };
    const service = new CampaignApplicationService(
      new FakeCampaignRepository(),
      new FakeCampaignAudienceRepository(),
      runs,
      { now: () => new Date('2026-09-29T11:00:00.000Z') },
    );

    const rollup = await service.aggregateRunMetrics(context, {
      campaignRunId: 'campaign-run-metrics',
    });

    expect(rollup).toEqual({
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      campaignId: 'campaign-1',
      campaignRunId: 'campaign-run-metrics',
      audienceSize: 7,
      sentCount: 2,
      deliveredCount: 1,
      failedCount: 1,
      skippedCount: 1,
      blockedByConsentCount: 1,
      optOutCount: 2,
      replyCount: 3,
      updatedAt: '2026-09-29T11:00:00.000Z',
    });
    expect(runs.lastRollup).toEqual(rollup);
  });

  it('updates campaign metric rollups idempotently from the latest recipient outcomes', async () => {
    const runs = new FakeCampaignRunRepository();
    runs.run = campaignRunSchema.parse({
      id: 'campaign-run-metrics',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      campaignId: 'campaign-1',
      status: 'SENDING',
      audienceSize: 3,
      eligibleCount: 3,
      excludedCount: 0,
      idempotencyKey: 'campaign-run-metrics-key',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T10:00:00.000Z',
    });
    runs.outcomes = [
      recipientOutcome('recipient-queued', 'QUEUED'),
      recipientOutcome('recipient-sent', 'SENT'),
      recipientOutcome('recipient-failed', 'FAILED'),
    ];
    const service = new CampaignApplicationService(
      new FakeCampaignRepository(),
      new FakeCampaignAudienceRepository(),
      runs,
      { now: () => new Date('2026-09-29T11:00:00.000Z') },
    );

    await service.aggregateRunMetrics(context, { campaignRunId: 'campaign-run-metrics' });
    expect(runs.lastRollup).toEqual(
      expect.objectContaining({
        sentCount: 1,
        deliveredCount: 0,
        failedCount: 1,
      }),
    );

    runs.outcomes = [
      recipientOutcome('recipient-delivered-1', 'DELIVERED'),
      recipientOutcome('recipient-delivered-2', 'DELIVERED'),
      recipientOutcome('recipient-skipped', 'SKIPPED'),
    ];
    runs.engagement = { optOutCount: 1, replyCount: 2 };

    await service.aggregateRunMetrics(context, { campaignRunId: 'campaign-run-metrics' });

    expect(runs.lastRollup).toEqual(
      expect.objectContaining({
        sentCount: 2,
        deliveredCount: 2,
        failedCount: 0,
        skippedCount: 1,
        optOutCount: 1,
        replyCount: 2,
      }),
    );
  });

  it('enforces lifecycle permissions before approval, scheduling and metric reads', async () => {
    const repository = new FakeCampaignRepository();
    const runs = new FakeCampaignRunRepository();
    runs.run = campaignRunSchema.parse({
      id: 'campaign-run-metrics',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      campaignId: 'campaign-1',
      status: 'SENDING',
      audienceSize: 1,
      eligibleCount: 1,
      excludedCount: 0,
      idempotencyKey: 'campaign-run-metrics-key',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T10:00:00.000Z',
    });
    const service = new CampaignApplicationService(
      repository,
      new FakeCampaignAudienceRepository(),
      runs,
    );
    const creatorOnlyContext: RequestContext = {
      ...context,
      permissions: ['campaigns.read', 'campaigns.create'],
    };
    const approverOnlyContext: RequestContext = {
      ...context,
      permissions: ['campaigns.read', 'campaigns.approve'],
    };
    const sendOnlyContext: RequestContext = {
      ...context,
      permissions: ['campaigns.send'],
    };

    await expect(
      service.approve(creatorOnlyContext, { campaignId: 'campaign-1' }),
    ).rejects.toThrow();
    await expect(
      service.schedule(approverOnlyContext, {
        campaignId: 'campaign-1',
        scheduledFor: '2026-09-29T13:00:00.000Z',
        idempotencyKey: 'campaign-1:schedule',
      }),
    ).rejects.toThrow();
    await expect(
      service.aggregateRunMetrics(sendOnlyContext, { campaignRunId: 'campaign-run-metrics' }),
    ).rejects.toThrow();
  });

  it('moves campaigns through review, approval, scheduling, sending and completion states', async () => {
    const repository = new FakeCampaignRepository();
    const service = new CampaignApplicationService(repository, {
      now: () => new Date('2026-09-28T13:00:00.000Z'),
    });

    await expect(service.submitForReview(context, { campaignId: 'campaign-1' })).resolves.toEqual(
      expect.objectContaining({ status: 'READY_FOR_REVIEW' }),
    );
    await expect(service.approve(context, { campaignId: 'campaign-1' })).resolves.toEqual(
      expect.objectContaining({
        status: 'APPROVED',
        approvedBy: 'user-1',
        approvedAt: '2026-09-28T13:00:00.000Z',
      }),
    );
    await expect(
      service.schedule(context, {
        campaignId: 'campaign-1',
        scheduledFor: '2026-09-29T13:00:00.000Z',
        idempotencyKey: 'campaign-1:schedule',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'SCHEDULED',
        scheduledFor: '2026-09-29T13:00:00.000Z',
      }),
    );
    await expect(service.markSending(context, { campaignId: 'campaign-1' })).resolves.toEqual(
      expect.objectContaining({ status: 'SENDING' }),
    );
    await expect(
      service.completeDispatch(context, { campaignId: 'campaign-1', status: 'SENT' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'SENT' }));
    expect(repository.lastLifecycle).toEqual(
      expect.objectContaining({ id: 'campaign-1', status: 'SENT', updatedBy: 'user-1' }),
    );
  });

  it('allows sending campaigns to finish as partially failed without losing approval metadata', async () => {
    const repository = new FakeCampaignRepository();
    const service = new CampaignApplicationService(repository, {
      now: () => new Date('2026-09-28T13:00:00.000Z'),
    });

    await service.submitForReview(context, { campaignId: 'campaign-1' });
    await service.approve(context, { campaignId: 'campaign-1' });
    await service.markSending(context, { campaignId: 'campaign-1' });

    const campaign = await service.completeDispatch(context, {
      campaignId: 'campaign-1',
      status: 'PARTIALLY_FAILED',
    });

    expect(campaign).toEqual(
      expect.objectContaining({
        status: 'PARTIALLY_FAILED',
        approvedBy: 'user-1',
        approvedAt: '2026-09-28T13:00:00.000Z',
      }),
    );
  });

  it('cancels draft, review, approved or scheduled campaigns before dispatch starts', async () => {
    const repository = new FakeCampaignRepository();
    repository.campaigns.set('campaign-approved', {
      ...draft,
      id: 'campaign-approved',
      status: 'APPROVED',
      approvedBy: 'owner-1',
      approvedAt: '2026-09-28T12:30:00.000Z',
    });
    const service = new CampaignApplicationService(repository);

    await expect(
      service.cancel(context, { campaignId: 'campaign-approved', reason: 'Cliente pediu pausa' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'CANCELLED' }));
  });

  it('rejects invalid lifecycle transitions and keeps dispatch send-only', async () => {
    const repository = new FakeCampaignRepository();
    const service = new CampaignApplicationService(repository);

    await expect(
      service.schedule(context, {
        campaignId: 'campaign-1',
        scheduledFor: '2026-09-29T13:00:00.000Z',
        idempotencyKey: 'campaign-1:schedule',
      }),
    ).rejects.toThrow('Campaign cannot transition from DRAFT to SCHEDULED.');

    repository.campaigns.set('campaign-sending', {
      ...draft,
      id: 'campaign-sending',
      status: 'SENDING',
    });
    await expect(service.cancel(context, { campaignId: 'campaign-sending' })).rejects.toThrow(
      'Campaign cannot transition from SENDING to CANCELLED.',
    );
  });
});

function recipientOutcome(
  id: string,
  status: CampaignRecipientOutcome['status'],
  overrides: Partial<CampaignRecipientOutcome> = {},
): CampaignRecipientOutcome {
  return campaignRecipientOutcomeSchema.parse({
    id,
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    campaignId: 'campaign-1',
    campaignRunId: 'campaign-run-metrics',
    customerId: `${id}-customer`,
    contactPhoneHash: `${id}-phone-hash`,
    status,
    idempotencyKey: `${id}-key`,
    createdAt: '2026-09-29T10:00:00.000Z',
    updatedAt: '2026-09-29T10:00:00.000Z',
    ...overrides,
  });
}
