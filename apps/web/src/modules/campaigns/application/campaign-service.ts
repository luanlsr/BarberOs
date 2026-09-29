import {
  campaignAudienceCriteriaSchema,
  campaignSchema,
  createCampaignCommandSchema,
  scheduleCampaignCommandSchema,
  type Campaign,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';
import { z } from 'zod';

import {
  assertCampaignAudienceScope,
  assertCampaignScope,
  assertCampaignTransition,
  isCampaignVisibleToContext,
  type ApproveCampaignCommand,
  type CancelCampaignCommand,
  type CampaignAudienceRepository,
  type CampaignFilters,
  type CampaignRepository,
  type CampaignRunRepository,
  type CompleteCampaignDispatchCommand,
  type PrepareCampaignRunCommand,
  type ScheduleCampaignLifecycleCommand,
  type SubmitCampaignForReviewCommand,
  getCampaignAudienceExclusionReason,
  getCampaignSnapshotDestinationHash,
  getCampaignSnapshotRecipientStatus,
  aggregateCampaignMetrics,
  isCampaignAudienceCandidateVisibleToContext,
} from '../domain';

const campaignIdCommandSchema = z.object({
  campaignId: z.string().trim().min(1),
});

const cancelCampaignCommandSchema = campaignIdCommandSchema.extend({
  reason: z.string().trim().max(500).optional(),
});

const completeCampaignDispatchCommandSchema = campaignIdCommandSchema.extend({
  status: z.enum(['SENT', 'PARTIALLY_FAILED']),
});

const campaignRunIdCommandSchema = z.object({
  campaignRunId: z.string().trim().min(1),
});

export class CampaignApplicationService {
  private readonly audiences?: CampaignAudienceRepository;
  private readonly runs?: CampaignRunRepository;
  private readonly options: { now?: () => Date };

  constructor(
    private readonly campaigns: CampaignRepository,
    audiencesOrOptions: CampaignAudienceRepository | { now?: () => Date } = {},
    runsOrOptions: CampaignRunRepository | { now?: () => Date } = {},
    options: { now?: () => Date } = {},
  ) {
    if ('findAudienceCandidates' in audiencesOrOptions) {
      this.audiences = audiencesOrOptions;
      if ('createFrozenAudienceSnapshot' in runsOrOptions) {
        this.runs = runsOrOptions;
        this.options = options;
      } else {
        this.options = runsOrOptions;
      }
    } else {
      this.options = audiencesOrOptions;
    }
  }

  async createDraft(context: RequestContext, command: unknown): Promise<Campaign> {
    const parsed = createCampaignCommandSchema.parse(command);
    authorize(context, {
      permission: 'campaigns.create',
      entitlement: 'campaigns',
      branchId: parsed.branchId,
    });
    assertCampaignAudienceScope(context, parsed.audienceCriteria);

    const draft = await this.campaigns.createDraft(context, {
      ...parsed,
      tenantId: context.tenantId,
      status: 'DRAFT',
      createdBy: context.userId,
      updatedBy: context.userId,
    });
    assertCampaignScope(context, draft);
    return campaignSchema.parse(draft);
  }

  async list(context: RequestContext, filters: CampaignFilters = {}): Promise<Campaign[]> {
    authorize(context, {
      permission: 'campaigns.read',
      entitlement: 'campaigns',
      branchId: filters.branchId,
    });
    const campaigns = await this.campaigns.list(context, filters);
    return campaigns.filter((campaign) => isCampaignVisibleToContext(context, campaign));
  }

  async get(context: RequestContext, campaignId: string): Promise<Campaign> {
    authorize(context, { permission: 'campaigns.read', entitlement: 'campaigns' });
    return this.getVisibleCampaign(context, campaignId);
  }

  async previewAudience(context: RequestContext, command: unknown) {
    if (!this.audiences) {
      throw new Error('Campaign audience repository is not configured.');
    }
    const criteria = campaignAudienceCriteriaSchema.parse(command);
    for (const branchId of criteria.branchIds) {
      authorize(context, {
        permission: 'campaigns.create',
        entitlement: 'campaigns',
        branchId,
      });
    }
    assertCampaignAudienceScope(context, criteria);

    const candidates = await this.audiences.findAudienceCandidates(context, criteria);
    const scopedCandidates = candidates.filter((candidate) =>
      isCampaignAudienceCandidateVisibleToContext(context, candidate),
    );
    const exclusions = scopedCandidates.flatMap((candidate) => {
      const reason = getCampaignAudienceExclusionReason(candidate);
      if (!reason) return [];
      return [
        {
          customerId: candidate.customerId,
          contactPhoneHash: candidate.contactPhoneHash,
          reason,
        },
      ];
    });

    return {
      audienceSize: scopedCandidates.length,
      eligibleCount: scopedCandidates.length - exclusions.length,
      excludedCount: exclusions.length,
      unknownContactCount: exclusions.filter((exclusion) => exclusion.reason === 'NO_DESTINATION')
        .length,
      exclusions,
    };
  }

  async submitForReview(
    context: RequestContext,
    command: SubmitCampaignForReviewCommand,
  ): Promise<Campaign> {
    const parsed = campaignIdCommandSchema.parse(command);
    const campaign = await this.getEditableCampaign(context, parsed.campaignId, 'campaigns.create');
    return this.transitionCampaign(context, campaign, 'READY_FOR_REVIEW');
  }

  async approve(context: RequestContext, command: ApproveCampaignCommand): Promise<Campaign> {
    const parsed = campaignIdCommandSchema.parse(command);
    const campaign = await this.getEditableCampaign(
      context,
      parsed.campaignId,
      'campaigns.approve',
    );
    return this.transitionCampaign(context, campaign, 'APPROVED', {
      approvedBy: context.userId,
      approvedAt: this.nowIso(),
    });
  }

  async schedule(
    context: RequestContext,
    command: ScheduleCampaignLifecycleCommand,
  ): Promise<Campaign> {
    const parsed = scheduleCampaignCommandSchema.parse(command);
    const campaign = await this.getEditableCampaign(context, parsed.campaignId, 'campaigns.send');
    return this.transitionCampaign(context, campaign, 'SCHEDULED', {
      scheduledFor: parsed.scheduledFor,
    });
  }

  async markSending(context: RequestContext, command: SubmitCampaignForReviewCommand) {
    const parsed = campaignIdCommandSchema.parse(command);
    const campaign = await this.getEditableCampaign(context, parsed.campaignId, 'campaigns.send');
    return this.transitionCampaign(context, campaign, 'SENDING');
  }

  async prepareRunSnapshot(context: RequestContext, command: PrepareCampaignRunCommand) {
    if (!this.audiences || !this.runs) {
      throw new Error('Campaign audience and run repositories are not configured.');
    }
    const parsed = z
      .object({
        campaignId: z.string().trim().min(1),
        idempotencyKey: z.string().trim().min(8).max(160),
      })
      .parse(command);
    const campaign = await this.getEditableCampaign(context, parsed.campaignId, 'campaigns.send');
    if (campaign.status !== 'APPROVED' && campaign.status !== 'SCHEDULED') {
      throw new Error('Campaign must be approved or scheduled before freezing audience.');
    }

    const candidates = await this.audiences.findAudienceCandidates(
      context,
      campaign.audienceCriteria,
    );
    const scopedCandidates = candidates.filter((candidate) =>
      isCampaignAudienceCandidateVisibleToContext(context, candidate),
    );
    const recipients = scopedCandidates.map((candidate) => {
      const reason = getCampaignAudienceExclusionReason(candidate);
      const contactPhoneHash = getCampaignSnapshotDestinationHash(candidate);
      return {
        tenantId: context.tenantId,
        branchId: candidate.branchId ?? campaign.branchId,
        campaignId: campaign.id,
        customerId: candidate.customerId,
        contactPhoneHash,
        status: getCampaignSnapshotRecipientStatus(reason),
        exclusionReason: reason ?? undefined,
        idempotencyKey: `${parsed.idempotencyKey}:${contactPhoneHash}`,
      };
    });
    const eligibleCount = recipients.filter((recipient) => recipient.status === 'PENDING').length;
    const snapshot = await this.runs.createFrozenAudienceSnapshot(context, {
      tenantId: context.tenantId,
      branchId: campaign.branchId,
      campaignId: campaign.id,
      status: campaign.status,
      audienceSize: recipients.length,
      eligibleCount,
      excludedCount: recipients.length - eligibleCount,
      scheduledFor: campaign.scheduledFor,
      idempotencyKey: parsed.idempotencyKey,
      recipients,
    });
    assertCampaignScope(context, snapshot.run);
    return snapshot;
  }

  async aggregateRunMetrics(context: RequestContext, command: unknown) {
    if (!this.runs) {
      throw new Error('Campaign run repository is not configured.');
    }
    const parsed = campaignRunIdCommandSchema.parse(command);
    authorize(context, { permission: 'campaigns.read', entitlement: 'campaigns' });

    const run = await this.runs.findRunById(context, parsed.campaignRunId);
    if (!run) {
      throw new Error('Campaign run was not found.');
    }
    assertCampaignScope(context, run);
    authorize(context, {
      permission: 'campaigns.read',
      entitlement: 'campaigns',
      branchId: run.branchId,
    });

    const recipients = await this.runs.listRecipientOutcomes(context, run.id);
    const scopedRecipients = recipients.filter(
      (recipient) =>
        recipient.tenantId === context.tenantId &&
        (!recipient.branchId || context.branchScope.includes(recipient.branchId)),
    );
    const engagement = await this.runs.countRunEngagementMetrics(context, run.id);
    const rollup = aggregateCampaignMetrics({
      run,
      recipients: scopedRecipients,
      engagement,
      updatedAt: this.nowIso(),
    });
    assertCampaignScope(context, rollup);
    return this.runs.upsertMetricRollup(context, rollup);
  }

  async completeDispatch(context: RequestContext, command: CompleteCampaignDispatchCommand) {
    const parsed = completeCampaignDispatchCommandSchema.parse(command);
    const campaign = await this.getEditableCampaign(context, parsed.campaignId, 'campaigns.send');
    return this.transitionCampaign(context, campaign, parsed.status);
  }

  async cancel(context: RequestContext, command: CancelCampaignCommand): Promise<Campaign> {
    const parsed = cancelCampaignCommandSchema.parse(command);
    const campaign = await this.getEditableCampaign(
      context,
      parsed.campaignId,
      'campaigns.approve',
    );
    return this.transitionCampaign(context, campaign, 'CANCELLED');
  }

  private async getVisibleCampaign(context: RequestContext, campaignId: string) {
    const campaign = await this.campaigns.findById(context, campaignId);
    if (!campaign || !isCampaignVisibleToContext(context, campaign)) {
      throw new Error('Campaign was not found.');
    }
    return campaignSchema.parse(campaign);
  }

  private async getEditableCampaign(
    context: RequestContext,
    campaignId: string,
    permission: 'campaigns.create' | 'campaigns.approve' | 'campaigns.send',
  ) {
    const campaign = await this.getVisibleCampaign(context, campaignId);
    authorize(context, {
      permission,
      entitlement: 'campaigns',
      branchId: campaign.branchId,
    });
    return campaign;
  }

  private async transitionCampaign(
    context: RequestContext,
    campaign: Campaign,
    status: Campaign['status'],
    metadata: Pick<Campaign, 'approvedBy' | 'approvedAt' | 'scheduledFor'> = {},
  ) {
    assertCampaignTransition(campaign.status, status);
    const updated = await this.campaigns.updateLifecycle(context, {
      id: campaign.id,
      status,
      updatedBy: context.userId,
      ...metadata,
    });
    assertCampaignScope(context, updated);
    return campaignSchema.parse(updated);
  }

  private nowIso() {
    return (this.options.now ?? (() => new Date()))().toISOString();
  }
}
