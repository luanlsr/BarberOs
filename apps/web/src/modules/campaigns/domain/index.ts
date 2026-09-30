import type {
  Campaign,
  CampaignAudienceCriteria,
  CampaignRecipientOutcome,
  CampaignRun,
  CampaignStatus,
  ConsentState,
  CreateCampaignCommand,
  RequestContext,
  ScheduleCampaignCommand,
} from '@barberos/contracts';

export type CampaignFilters = {
  branchId?: string;
  status?: CampaignStatus;
};

export type CreateCampaignDraftRecordCommand = CreateCampaignCommand & {
  tenantId: string;
  status: 'DRAFT';
  createdBy: string;
  updatedBy: string;
};

export type UpdateCampaignLifecycleCommand = {
  id: string;
  status: CampaignStatus;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  scheduledFor?: string;
};

export type SubmitCampaignForReviewCommand = {
  campaignId: string;
};

export type ApproveCampaignCommand = {
  campaignId: string;
};

export type CancelCampaignCommand = {
  campaignId: string;
  reason?: string;
};

export type CompleteCampaignDispatchCommand = {
  campaignId: string;
  status: Extract<CampaignStatus, 'SENT' | 'PARTIALLY_FAILED'>;
};

export type ScheduleCampaignLifecycleCommand = ScheduleCampaignCommand;

export type PrepareCampaignRunCommand = {
  campaignId: string;
  idempotencyKey: string;
};

export type CampaignAudienceExclusionReason =
  'NO_DESTINATION' | 'WHATSAPP_OPTED_OUT' | 'MARKETING_OPTED_OUT' | 'UNKNOWN_CONSENT';

export type CampaignAudienceCandidate = {
  tenantId: string;
  branchId?: string;
  customerId: string;
  contactPhoneHash?: string;
  hasReachableDestination: boolean;
  whatsappConsentState?: ConsentState;
  marketingConsentState?: ConsentState;
};

export type CampaignAudiencePreview = {
  audienceSize: number;
  eligibleCount: number;
  excludedCount: number;
  unknownContactCount: number;
  exclusions: Array<{
    customerId?: string;
    contactPhoneHash?: string;
    reason: string;
  }>;
};

export type CreateCampaignRecipientOutcomeRecordCommand = {
  tenantId: string;
  branchId?: string;
  campaignId: string;
  campaignRunId?: string;
  customerId?: string;
  contactPhoneHash: string;
  status: CampaignRecipientOutcome['status'];
  exclusionReason?: string;
  idempotencyKey: string;
};

export type CreateCampaignRunSnapshotCommand = {
  tenantId: string;
  branchId?: string;
  campaignId: string;
  status: Extract<CampaignStatus, 'APPROVED' | 'SCHEDULED'>;
  audienceSize: number;
  eligibleCount: number;
  excludedCount: number;
  scheduledFor?: string;
  idempotencyKey: string;
  recipients: CreateCampaignRecipientOutcomeRecordCommand[];
};

export type CampaignRunSnapshot = {
  run: CampaignRun;
  recipients: CampaignRecipientOutcome[];
};

export type CampaignRunEngagementMetrics = {
  optOutCount: number;
  replyCount: number;
};

export type CampaignMetricRollup = {
  tenantId: string;
  branchId?: string;
  campaignId: string;
  campaignRunId: string;
  audienceSize: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  blockedByConsentCount: number;
  optOutCount: number;
  replyCount: number;
  updatedAt: string;
};

export interface CampaignRepository {
  createDraft(
    context: RequestContext,
    command: CreateCampaignDraftRecordCommand,
  ): Promise<Campaign>;
  findById(context: RequestContext, campaignId: string): Promise<Campaign | null>;
  list(context: RequestContext, filters?: CampaignFilters): Promise<Campaign[]>;
  updateLifecycle(
    context: RequestContext,
    command: UpdateCampaignLifecycleCommand,
  ): Promise<Campaign>;
}

export interface CampaignAudienceRepository {
  findAudienceCandidates(
    context: RequestContext,
    criteria: CampaignAudienceCriteria,
  ): Promise<CampaignAudienceCandidate[]>;
}

export interface CampaignRunRepository {
  createFrozenAudienceSnapshot(
    context: RequestContext,
    command: CreateCampaignRunSnapshotCommand,
  ): Promise<CampaignRunSnapshot>;
  findRunById(context: RequestContext, campaignRunId: string): Promise<CampaignRun | null>;
  listRecipientOutcomes(
    context: RequestContext,
    campaignRunId: string,
  ): Promise<CampaignRecipientOutcome[]>;
  findMetricRollup?(
    context: RequestContext,
    campaignRunId: string,
  ): Promise<CampaignMetricRollup | null>;
  countRunEngagementMetrics(
    context: RequestContext,
    campaignRunId: string,
  ): Promise<CampaignRunEngagementMetrics>;
  upsertMetricRollup(
    context: RequestContext,
    rollup: CampaignMetricRollup,
  ): Promise<CampaignMetricRollup>;
}

export interface CampaignAuditSink {
  record(
    context: RequestContext,
    event: {
      action:
        | 'CAMPAIGN_APPROVED'
        | 'CAMPAIGN_SCHEDULED'
        | 'CAMPAIGN_SEND_STARTED'
        | 'CAMPAIGN_SEND_COMPLETED'
        | 'CAMPAIGN_SEND_PARTIALLY_FAILED'
        | 'CAMPAIGN_CANCELLED';
      entityType: 'CAMPAIGN';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      beforeState?: unknown;
      afterState?: unknown;
    },
  ): Promise<void>;
}

export function assertCampaignScope(
  context: RequestContext,
  value: { tenantId: string; branchId?: string },
) {
  if (context.tenantId !== value.tenantId) {
    throw new Error('Cross-tenant campaign access is not allowed.');
  }
  if (value.branchId && !context.branchScope.includes(value.branchId)) {
    throw new Error('Campaign branch is outside request scope.');
  }
}

export function isCampaignVisibleToContext(context: RequestContext, campaign: Campaign) {
  return (
    context.tenantId === campaign.tenantId &&
    (!campaign.branchId || context.branchScope.includes(campaign.branchId))
  );
}

export function assertCampaignAudienceScope(
  context: RequestContext,
  criteria: CampaignAudienceCriteria,
) {
  const deniedBranchId = criteria.branchIds.find(
    (branchId) => !context.branchScope.includes(branchId),
  );
  if (deniedBranchId) {
    throw new Error('Campaign audience branch is outside request scope.');
  }
}

export function isCampaignAudienceCandidateVisibleToContext(
  context: RequestContext,
  candidate: CampaignAudienceCandidate,
) {
  return (
    context.tenantId === candidate.tenantId &&
    (!candidate.branchId || context.branchScope.includes(candidate.branchId))
  );
}

export function getCampaignAudienceExclusionReason(
  candidate: CampaignAudienceCandidate,
): CampaignAudienceExclusionReason | null {
  if (!candidate.hasReachableDestination || !candidate.contactPhoneHash) {
    return 'NO_DESTINATION';
  }
  if (candidate.whatsappConsentState === 'OPTED_OUT') {
    return 'WHATSAPP_OPTED_OUT';
  }
  if (candidate.marketingConsentState === 'OPTED_OUT') {
    return 'MARKETING_OPTED_OUT';
  }
  if (candidate.marketingConsentState !== 'OPTED_IN') {
    return 'UNKNOWN_CONSENT';
  }
  return null;
}

export function getCampaignSnapshotRecipientStatus(
  reason: CampaignAudienceExclusionReason | null,
): CampaignRecipientOutcome['status'] {
  if (!reason) return 'PENDING';
  if (reason === 'NO_DESTINATION') return 'SKIPPED';
  return 'BLOCKED_BY_CONSENT';
}

export function getCampaignSnapshotDestinationHash(candidate: CampaignAudienceCandidate) {
  return candidate.contactPhoneHash ?? `missing-destination:${candidate.customerId}`;
}

export function aggregateCampaignMetrics(input: {
  run: CampaignRun;
  recipients: readonly CampaignRecipientOutcome[];
  engagement: CampaignRunEngagementMetrics;
  updatedAt: string;
}): CampaignMetricRollup {
  const sentCount = input.recipients.filter(
    (recipient) => recipient.status === 'SENT' || recipient.status === 'DELIVERED',
  ).length;
  const deliveredCount = input.recipients.filter(
    (recipient) => recipient.status === 'DELIVERED',
  ).length;
  const failedCount = input.recipients.filter((recipient) => recipient.status === 'FAILED').length;
  const skippedCount = input.recipients.filter(
    (recipient) => recipient.status === 'SKIPPED',
  ).length;
  const blockedByConsentCount = input.recipients.filter(
    (recipient) => recipient.status === 'BLOCKED_BY_CONSENT',
  ).length;

  return {
    tenantId: input.run.tenantId,
    branchId: input.run.branchId,
    campaignId: input.run.campaignId,
    campaignRunId: input.run.id,
    audienceSize: input.run.audienceSize,
    sentCount,
    deliveredCount,
    failedCount,
    skippedCount,
    blockedByConsentCount,
    optOutCount: input.engagement.optOutCount,
    replyCount: input.engagement.replyCount,
    updatedAt: input.updatedAt,
  };
}

const allowedCampaignTransitions = {
  DRAFT: ['READY_FOR_REVIEW', 'CANCELLED'],
  READY_FOR_REVIEW: ['APPROVED', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'SENDING', 'CANCELLED'],
  SCHEDULED: ['SENDING', 'CANCELLED'],
  SENDING: ['SENT', 'PARTIALLY_FAILED'],
  SENT: [],
  PARTIALLY_FAILED: [],
  CANCELLED: [],
} satisfies Record<CampaignStatus, readonly CampaignStatus[]>;

export function assertCampaignTransition(previous: CampaignStatus, next: CampaignStatus) {
  const allowed: readonly CampaignStatus[] = allowedCampaignTransitions[previous];
  if (!allowed.includes(next)) {
    throw new Error(`Campaign cannot transition from ${previous} to ${next}.`);
  }
}
