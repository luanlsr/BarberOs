import type {
  ClosePayoutCommand,
  CommissionAccrual,
  CommissionAccrualStatus,
  CommissionRule,
  CommissionRuleScope,
  CommissionRuleStatus,
  CommissionSummary,
  CreateOutboxEventCommand,
  CorrectPayoutCommand,
  CreateCommissionRuleCommand,
  GenerateCommissionAccrualsCommand,
  OrderItem,
  OrderItemSourceType,
  PayPayoutCommand,
  Payout,
  PayoutDetail,
  PayoutStatus,
  ProfessionalWallet,
  RequestContext,
  UpdateCommissionRuleCommand,
} from '@barberos/contracts';

export type CommissionPeriod = {
  periodStart: string;
  periodEnd: string;
};

export type CommissionRuleFilters = {
  branchId?: string;
  professionalId?: string;
  sourceType?: OrderItemSourceType;
  sourceId?: string;
  status?: CommissionRuleStatus;
  limit?: number;
  cursor?: string;
};

export type CommissionAccrualFilters = Partial<CommissionPeriod> & {
  branchId?: string;
  professionalId?: string;
  status?: CommissionAccrualStatus;
  payoutId?: string;
  orderId?: string;
  limit?: number;
  cursor?: string;
};

export type PayoutFilters = Partial<CommissionPeriod> & {
  branchId?: string;
  professionalId?: string;
  status?: PayoutStatus;
  limit?: number;
  cursor?: string;
};

export type ProfessionalWalletFilters = CommissionPeriod & {
  branchId?: string;
  professionalId: string;
};

export type ReverseCommissionAccrualsCommand = {
  orderId: string;
  paymentId?: string;
  idempotencyKey: string;
  reason: string;
  occurredAt?: string;
};

export interface CommissionRepository {
  listRules(context: RequestContext, filters?: CommissionRuleFilters): Promise<CommissionRule[]>;
  findRuleById(context: RequestContext, ruleId: string): Promise<CommissionRule | null>;
  createRule(
    context: RequestContext,
    command: CreateCommissionRuleCommand,
  ): Promise<CommissionRule>;
  updateRule(
    context: RequestContext,
    ruleId: string,
    command: UpdateCommissionRuleCommand,
  ): Promise<CommissionRule>;
  listAccruals(
    context: RequestContext,
    filters?: CommissionAccrualFilters,
  ): Promise<CommissionAccrual[]>;
  generateAccruals(
    context: RequestContext,
    command: GenerateCommissionAccrualsCommand,
    accruals: readonly CommissionAccrual[],
  ): Promise<CommissionAccrual[]>;
  reverseAccruals(
    context: RequestContext,
    command: ReverseCommissionAccrualsCommand,
    reversals: readonly CommissionAccrual[],
  ): Promise<CommissionAccrual[]>;
  getSummary(
    context: RequestContext,
    filters: CommissionPeriod & { branchId?: string },
  ): Promise<CommissionSummary>;
  listPayouts(context: RequestContext, filters?: PayoutFilters): Promise<Payout[]>;
  getPayoutDetail(context: RequestContext, payoutId: string): Promise<PayoutDetail | null>;
  closePayout(context: RequestContext, command: ClosePayoutCommand): Promise<PayoutDetail>;
  payPayout(context: RequestContext, command: PayPayoutCommand): Promise<PayoutDetail>;
  correctPayout(context: RequestContext, command: CorrectPayoutCommand): Promise<PayoutDetail>;
  getProfessionalWallet(
    context: RequestContext,
    filters: ProfessionalWalletFilters,
  ): Promise<ProfessionalWallet>;
}

export interface CommissionOutboxProducer {
  createEvent(
    context: RequestContext,
    command: Pick<
      CreateOutboxEventCommand,
      'tenantId' | 'branchId' | 'payload' | 'idempotencyKey' | 'correlationId'
    > & {
      eventType: 'FINANCE_RECALCULATION_REQUESTED';
      sourceType: 'COMMISSION';
      sourceId: string;
    },
  ): Promise<unknown>;
}

export interface CommissionAuditSink {
  record(
    context: RequestContext,
    event: {
      action:
        | 'COMMISSION_RULE_CREATED'
        | 'COMMISSION_RULE_UPDATED'
        | 'COMMISSION_ACCRUAL_CREATED'
        | 'COMMISSION_ACCRUAL_REVERSED'
        | 'PAYOUT_CLOSED'
        | 'PAYOUT_PAID'
        | 'PAYOUT_CORRECTED';
      entityType: 'COMMISSION_RULE' | 'COMMISSION_ACCRUAL' | 'PAYOUT';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      branchId?: string;
      professionalId?: string;
      amountCents?: number;
      beforeState?: unknown;
      afterState?: unknown;
    },
  ): Promise<void>;
}

export type CommissionRuleMatchInput = {
  tenantId: string;
  branchId: string;
  professionalId?: string;
  sourceType: OrderItemSourceType;
  sourceId?: string;
  occurredOn: string;
};

export type CommissionRuleMatch = {
  rule: CommissionRule;
  precedence: number;
};

export function commissionRuleIsEffective(rule: CommissionRule, occurredOn: string) {
  return (
    rule.status === 'ACTIVE' &&
    rule.effectiveFrom <= occurredOn &&
    (!rule.effectiveUntil || occurredOn <= rule.effectiveUntil)
  );
}

export function commissionRuleMatchesInput(rule: CommissionRule, input: CommissionRuleMatchInput) {
  return commissionRulePrecedence(rule, input) !== null;
}

export function commissionRulePrecedence(
  rule: CommissionRule,
  input: CommissionRuleMatchInput,
): number | null {
  if (rule.tenantId !== input.tenantId) return null;
  if (!commissionRuleIsEffective(rule, input.occurredOn)) return null;
  if (rule.branchId && rule.branchId !== input.branchId) return null;
  if (rule.professionalId && rule.professionalId !== input.professionalId) return null;

  const branchScore = rule.branchId ? 10 : 0;
  const professionalScore = rule.professionalId ? 20 : 0;

  switch (rule.scope) {
    case 'SERVICE':
    case 'PRODUCT':
    case 'MANUAL_ITEM': {
      if (!commissionScopeMatchesSource(rule.scope, input.sourceType)) return null;
      if (rule.sourceId && rule.sourceId !== input.sourceId) return null;
      return (rule.sourceId ? 300 : 250) + professionalScore + branchScore;
    }
    case 'PROFESSIONAL':
      if (!input.professionalId || rule.professionalId !== input.professionalId) return null;
      return 200 + branchScore;
    case 'TENANT_DEFAULT':
      return 100 + branchScore;
  }
}

export function sortCommissionRulesByPrecedence(
  rules: readonly CommissionRule[],
  input: CommissionRuleMatchInput,
): CommissionRuleMatch[] {
  return rules
    .map((rule) => ({ rule, precedence: commissionRulePrecedence(rule, input) }))
    .filter((match): match is CommissionRuleMatch => match.precedence !== null)
    .sort((left, right) => {
      if (right.precedence !== left.precedence) return right.precedence - left.precedence;
      if (right.rule.effectiveFrom !== left.rule.effectiveFrom) {
        return right.rule.effectiveFrom.localeCompare(left.rule.effectiveFrom);
      }
      return left.rule.id.localeCompare(right.rule.id);
    });
}

export function findMatchingCommissionRule(
  rules: readonly CommissionRule[],
  input: CommissionRuleMatchInput,
) {
  return sortCommissionRulesByPrecedence(rules, input)[0]?.rule ?? null;
}

function commissionScopeMatchesSource(scope: CommissionRuleScope, sourceType: OrderItemSourceType) {
  if (scope === 'SERVICE') return sourceType === 'SERVICE';
  if (scope === 'PRODUCT') return sourceType === 'PRODUCT';
  if (scope === 'MANUAL_ITEM') return sourceType === 'MANUAL';
  return false;
}

export type CommissionAccrualSourceItem = Pick<
  OrderItem,
  | 'id'
  | 'tenantId'
  | 'branchId'
  | 'orderId'
  | 'sourceType'
  | 'sourceId'
  | 'professionalId'
  | 'finalAmountCents'
>;

export type CommissionAccrualCalculationInput = {
  id: string;
  item: CommissionAccrualSourceItem;
  rules: readonly CommissionRule[];
  paymentId?: string;
  accruedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export function calculateCommissionAmountCents(rule: CommissionRule, baseAmountCents: number) {
  if (!Number.isInteger(baseAmountCents) || baseAmountCents <= 0) return 0;
  if (rule.type === 'FIXED_AMOUNT') return rule.fixedAmountCents ?? 0;
  const percentageBps = rule.percentageBps ?? 0;
  return Math.floor((baseAmountCents * percentageBps + 5000) / 10000);
}

export function calculateCommissionAccrualForItem(
  input: CommissionAccrualCalculationInput,
): CommissionAccrual | null {
  const { item } = input;
  if (!item.professionalId || item.finalAmountCents <= 0) return null;

  const rule = findMatchingCommissionRule(input.rules, {
    tenantId: item.tenantId,
    branchId: item.branchId,
    professionalId: item.professionalId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    occurredOn: input.accruedAt.slice(0, 10),
  });
  if (!rule) return null;

  const commissionAmountCents = calculateCommissionAmountCents(rule, item.finalAmountCents);
  if (commissionAmountCents <= 0) return null;

  return {
    id: input.id,
    tenantId: item.tenantId,
    branchId: item.branchId,
    professionalId: item.professionalId,
    orderId: item.orderId,
    orderItemId: item.id,
    paymentId: input.paymentId,
    ruleId: rule.id,
    ruleTypeSnapshot: rule.type,
    ruleScopeSnapshot: rule.scope,
    rulePercentageBpsSnapshot: rule.type === 'PERCENTAGE' ? rule.percentageBps : undefined,
    ruleFixedAmountCentsSnapshot: rule.type === 'FIXED_AMOUNT' ? rule.fixedAmountCents : undefined,
    baseAmountCents: item.finalAmountCents,
    commissionAmountCents,
    status: 'OPEN',
    accruedAt: input.accruedAt,
    createdAt: input.createdAt ?? input.accruedAt,
    updatedAt: input.updatedAt ?? input.createdAt ?? input.accruedAt,
  };
}

export function calculateCommissionAccrualsForItems(
  inputs: readonly CommissionAccrualCalculationInput[],
) {
  return inputs.flatMap((input) => {
    const accrual = calculateCommissionAccrualForItem(input);
    return accrual ? [accrual] : [];
  });
}
