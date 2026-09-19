import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ClosePayoutCommand,
  CommissionAccrual,
  CommissionRule,
  CommissionSummary,
  CorrectPayoutCommand,
  CreateCommissionRuleCommand,
  GenerateCommissionAccrualsCommand,
  OrderDetail,
  PayPayoutCommand,
  Payout,
  PayoutDetail,
  ProfessionalWallet,
  RequestContext,
  UpdateCommissionRuleCommand,
} from '@barberos/contracts';

import type { CashRegisterSummary } from '../../cash-register/domain';
import type {
  CommissionAccrualFilters,
  CommissionAuditSink,
  CommissionPeriod,
  CommissionRepository,
  CommissionRuleFilters,
  PayoutFilters,
  ProfessionalWalletFilters,
  ReverseCommissionAccrualsCommand,
} from '../domain';
import { CommissionApplicationService, CoreOperationsApplicationError } from './commission-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['commission.read', 'commission.manage'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const commissionRule: CommissionRule = {
  id: 'rule-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  scope: 'PROFESSIONAL',
  type: 'PERCENTAGE',
  status: 'ACTIVE',
  professionalId: 'professional-1',
  percentageBps: 5000,
  effectiveFrom: '2026-09-01',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};
const paidOrder: OrderDetail = {
  id: 'order-paid-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'PAID',
  subtotalAmountCents: 10_000,
  discountAmountCents: 1_000,
  totalAmountCents: 9_000,
  openedAt: '2026-09-08T12:00:00.000Z',
  closedAt: '2026-09-08T12:30:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:30:00.000Z',
  items: [
    {
      id: 'item-service-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      orderId: 'order-paid-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      nameSnapshot: 'Corte masculino',
      quantity: 2,
      unitPriceAmountCents: 5_000,
      discountAmountCents: 1_000,
      finalAmountCents: 9_000,
      professionalId: 'professional-1',
      createdBy: 'user-1',
      createdAt: '2026-09-08T12:00:00.000Z',
    },
  ],
  history: [],
};

const existingAccrual: CommissionAccrual = {
  id: 'accrual-existing-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  orderId: 'order-paid-1',
  orderItemId: 'item-service-1',
  paymentId: 'payment-1',
  ruleId: 'rule-1',
  ruleTypeSnapshot: 'PERCENTAGE',
  ruleScopeSnapshot: 'PROFESSIONAL',
  rulePercentageBpsSnapshot: 5000,
  baseAmountCents: 9_000,
  commissionAmountCents: 4_500,
  status: 'OPEN',
  accruedAt: '2026-09-08T12:30:00.000Z',
  createdAt: '2026-09-08T12:30:00.000Z',
  updatedAt: '2026-09-08T12:30:00.000Z',
};
const closedPayoutDetail: PayoutDetail = {
  payout: {
    id: 'payout-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    professionalId: 'professional-1',
    status: 'CLOSED',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-15',
    totalAmountCents: 4_500,
    sources: [
      { accrualId: existingAccrual.id, amountCents: existingAccrual.commissionAmountCents },
    ],
    closedBy: 'user-1',
    closedAt: '2026-09-08T14:00:00.000Z',
    createdAt: '2026-09-08T14:00:00.000Z',
    updatedAt: '2026-09-08T14:00:00.000Z',
  },
  allocations: [],
  accruals: [{ ...existingAccrual, status: 'SETTLED', payoutId: 'payout-1' }],
};

const paidPayoutDetail: PayoutDetail = {
  ...closedPayoutDetail,
  payout: {
    ...closedPayoutDetail.payout,
    status: 'PAID',
    paymentMethod: 'PIX',
    financialEntryId: 'entry-payout-1',
    idempotencyKey: 'payout-pay-1',
    paidBy: 'user-1',
    paidAt: '2026-09-08T15:00:00.000Z',
    updatedAt: '2026-09-08T15:00:00.000Z',
  },
};
const cashSession: CashRegisterSummary = {
  id: 'cash-session-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  status: 'OPEN',
  openedBy: 'user-1',
  openedAt: '2026-09-08T09:00:00.000Z',
  openingBalanceAmountCents: 20_000,
  expectedBalanceAmountCents: 15_500,
  differenceAmountCents: 0,
  createdAt: '2026-09-08T09:00:00.000Z',
  updatedAt: '2026-09-08T09:00:00.000Z',
  movements: [],
  cashInAmountCents: 0,
  cashOutAmountCents: 4_500,
};

class FakeCommissionRepository implements CommissionRepository {
  rulesById = new Map<string, CommissionRule>([[commissionRule.id, commissionRule]]);
  ruleFilters: CommissionRuleFilters | null = null;
  walletFilters: ProfessionalWalletFilters | null = null;
  createdCommand: CreateCommissionRuleCommand | null = null;
  updatedCommand: UpdateCommissionRuleCommand | null = null;
  generatedCommand: GenerateCommissionAccrualsCommand | null = null;
  generatedAccruals: readonly CommissionAccrual[] | null = null;
  reversedCommand: ReverseCommissionAccrualsCommand | null = null;
  reversedAccruals: readonly CommissionAccrual[] | null = null;
  accruals: CommissionAccrual[] = [];
  payoutDetails = new Map<string, PayoutDetail>();
  closedCommand: ClosePayoutCommand | null = null;
  paidPayoutCommand: PayPayoutCommand | null = null;
  correctedPayoutCommand: CorrectPayoutCommand | null = null;
  cashMovementCreated = false;

  async listRules(_context: RequestContext, filters?: CommissionRuleFilters) {
    this.ruleFilters = filters ?? null;
    return Array.from(this.rulesById.values());
  }

  async findRuleById(_context: RequestContext, ruleId: string) {
    return this.rulesById.get(ruleId) ?? null;
  }

  async createRule(context: RequestContext, command: CreateCommissionRuleCommand) {
    this.createdCommand = command;
    const rule: CommissionRule = {
      id: 'rule-created-1',
      tenantId: context.tenantId,
      branchId: command.branchId,
      scope: command.scope,
      type: command.type,
      status: 'ACTIVE',
      professionalId: command.professionalId,
      sourceType: command.sourceType,
      sourceId: command.sourceId,
      percentageBps: command.percentageBps,
      fixedAmountCents: command.fixedAmountCents,
      effectiveFrom: command.effectiveFrom,
      effectiveUntil: command.effectiveUntil,
      createdBy: context.userId,
      updatedBy: context.userId,
      createdAt: '2026-09-08T13:00:00.000Z',
      updatedAt: '2026-09-08T13:00:00.000Z',
    };
    this.rulesById.set(rule.id, rule);
    return rule;
  }

  async updateRule(context: RequestContext, ruleId: string, command: UpdateCommissionRuleCommand) {
    this.updatedCommand = command;
    const current = this.rulesById.get(ruleId) ?? commissionRule;
    const { id: ignoredId, ...changes } = command;
    void ignoredId;
    const updated: CommissionRule = {
      ...current,
      ...changes,
      updatedBy: context.userId,
      updatedAt: '2026-09-08T13:15:00.000Z',
    };
    this.rulesById.set(ruleId, updated);
    return updated;
  }

  async listAccruals(
    _context: RequestContext,
    filters: CommissionAccrualFilters = {},
  ): Promise<CommissionAccrual[]> {
    return this.accruals.filter(
      (accrual) =>
        (!filters.branchId || accrual.branchId === filters.branchId) &&
        (!filters.orderId || accrual.orderId === filters.orderId) &&
        (!filters.professionalId || accrual.professionalId === filters.professionalId) &&
        (!filters.status || accrual.status === filters.status),
    );
  }

  async generateAccruals(
    _context: RequestContext,
    command: GenerateCommissionAccrualsCommand,
    accruals: readonly CommissionAccrual[],
  ): Promise<CommissionAccrual[]> {
    this.generatedCommand = command;
    this.generatedAccruals = accruals;
    this.accruals.push(...accruals);
    return [...accruals];
  }

  async reverseAccruals(
    _context: RequestContext,
    command: ReverseCommissionAccrualsCommand,
    reversals: readonly CommissionAccrual[],
  ): Promise<CommissionAccrual[]> {
    this.reversedCommand = command;
    this.reversedAccruals = reversals;
    this.accruals.push(...reversals);
    return [...reversals];
  }

  async getSummary(
    _context: RequestContext,
    _filters: CommissionPeriod & { branchId?: string },
  ): Promise<CommissionSummary> {
    throw new Error('Not implemented in this focused test.');
  }

  async listPayouts(_context: RequestContext, _filters?: PayoutFilters): Promise<Payout[]> {
    return [];
  }

  async getPayoutDetail(_context: RequestContext, payoutId: string): Promise<PayoutDetail | null> {
    return this.payoutDetails.get(payoutId) ?? null;
  }

  async closePayout(context: RequestContext, command: ClosePayoutCommand): Promise<PayoutDetail> {
    this.closedCommand = command;
    const accruals = this.accruals.filter((accrual) => command.accrualIds?.includes(accrual.id));
    const totalAmountCents = accruals.reduce(
      (total, accrual) => total + accrual.commissionAmountCents,
      0,
    );
    const payout: Payout = {
      id: 'payout-closed-1',
      tenantId: context.tenantId,
      branchId: command.branchId,
      professionalId: command.professionalId,
      status: 'CLOSED',
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      totalAmountCents,
      sources: accruals.map((accrual) => ({
        accrualId: accrual.id,
        amountCents: accrual.commissionAmountCents,
      })),
      idempotencyKey: command.idempotencyKey,
      closedBy: context.userId,
      closedAt: '2026-09-08T14:00:00.000Z',
      createdAt: '2026-09-08T14:00:00.000Z',
      updatedAt: '2026-09-08T14:00:00.000Z',
    };
    const detail: PayoutDetail = {
      payout,
      allocations: [],
      accruals: accruals.map((accrual) => ({ ...accrual, status: 'SETTLED', payoutId: payout.id })),
    };
    this.payoutDetails.set(payout.id, detail);
    return detail;
  }

  async payPayout(context: RequestContext, command: PayPayoutCommand): Promise<PayoutDetail> {
    this.paidPayoutCommand = command;
    this.cashMovementCreated =
      command.paymentMethod === 'CASH' && Boolean(command.cashRegisterSessionId);
    const current = this.payoutDetails.get(command.payoutId) ?? closedPayoutDetail;
    const detail: PayoutDetail = {
      ...current,
      payout: {
        ...current.payout,
        status: 'PAID',
        paymentMethod: command.paymentMethod,
        financialEntryId: 'entry-payout-paid-1',
        idempotencyKey: command.idempotencyKey,
        paidBy: context.userId,
        paidAt: command.paidAt ?? '2026-09-08T15:00:00.000Z',
        updatedAt: '2026-09-08T15:00:00.000Z',
      },
    };
    this.payoutDetails.set(command.payoutId, detail);
    return detail;
  }

  async correctPayout(
    _context: RequestContext,
    command: CorrectPayoutCommand,
  ): Promise<PayoutDetail> {
    this.correctedPayoutCommand = command;
    const current = this.payoutDetails.get(command.payoutId) ?? paidPayoutDetail;
    const detail: PayoutDetail = {
      ...current,
      payout: {
        ...current.payout,
        status: 'CORRECTED',
        correctionReason: command.reason,
        updatedAt: '2026-09-08T16:00:00.000Z',
      },
    };
    this.payoutDetails.set(command.payoutId, detail);
    return detail;
  }

  async getProfessionalWallet(
    context: RequestContext,
    filters: ProfessionalWalletFilters,
  ): Promise<ProfessionalWallet> {
    this.walletFilters = filters;
    const accruals = this.accruals.filter(
      (accrual) =>
        accrual.professionalId === filters.professionalId &&
        (!filters.branchId || accrual.branchId === filters.branchId),
    );
    return {
      tenantId: context.tenantId,
      professionalId: filters.professionalId,
      branchIds: filters.branchId ? [filters.branchId] : ['branch-1'],
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      productionAmountCents: accruals.reduce(
        (total, accrual) => total + accrual.baseAmountCents,
        0,
      ),
      openCommissionAmountCents: accruals
        .filter((accrual) => accrual.status === 'OPEN')
        .reduce((total, accrual) => total + accrual.commissionAmountCents, 0),
      paidPayoutAmountCents: paidPayoutDetail.payout.totalAmountCents,
      expectedBalanceAmountCents: 0,
      accruals,
      payouts: [paidPayoutDetail.payout],
    };
  }
}

class FakeOrderLookup {
  orders = new Map<string, OrderDetail>([[paidOrder.id, paidOrder]]);

  async findById(_context: RequestContext, orderId: string) {
    return this.orders.get(orderId) ?? null;
  }
}

class FakePayoutCashRegisterLookup {
  currentSession: CashRegisterSummary | null = cashSession;
  sessions = new Map<string, CashRegisterSummary>([[cashSession.id, cashSession]]);

  async findCurrentSession(
    _context: RequestContext,
    filters: { branchId?: string; status?: string } = {},
  ) {
    if (!this.currentSession) return null;
    if (filters.branchId && this.currentSession.branchId !== filters.branchId) return null;
    if (filters.status && this.currentSession.status !== filters.status) return null;
    return this.currentSession;
  }

  async findSessionById(_context: RequestContext, sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }
}
class FakeCommissionAuditSink implements CommissionAuditSink {
  contexts: RequestContext[] = [];
  events: Array<Parameters<CommissionAuditSink['record']>[1]> = [];

  async record(context: RequestContext, event: Parameters<CommissionAuditSink['record']>[1]) {
    this.contexts.push(context);
    this.events.push(event);
  }
}

function contextWith(overrides: Partial<RequestContext>): RequestContext {
  return { ...context, ...overrides };
}

describe('CommissionApplicationService', () => {
  let repository: FakeCommissionRepository;
  let audit: FakeCommissionAuditSink;
  let orders: FakeOrderLookup;
  let cashRegister: FakePayoutCashRegisterLookup;
  let service: CommissionApplicationService;

  beforeEach(() => {
    repository = new FakeCommissionRepository();
    repository.payoutDetails.set(closedPayoutDetail.payout.id, closedPayoutDetail);
    audit = new FakeCommissionAuditSink();
    orders = new FakeOrderLookup();
    cashRegister = new FakePayoutCashRegisterLookup();
    service = new CommissionApplicationService({
      repository,
      orders,
      cashRegister,
      auditSink: audit,
      now: () => '2026-09-08T12:45:00.000Z',
    });
  });

  it('lists commission rules for an authorized branch', async () => {
    const rules = await service.listRules(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      status: 'ACTIVE',
    });

    expect(rules).toEqual([commissionRule]);
    expect(repository.ruleFilters).toEqual({
      branchId: 'branch-1',
      professionalId: 'professional-1',
      status: 'ACTIVE',
    });
  });

  it('denies rule listing without commission manage permission', async () => {
    await expect(
      service.listRules(contextWith({ permissions: ['commission.read'] }), {
        branchId: 'branch-1',
      }),
    ).rejects.toMatchObject({ code: 'COMMISSION_PERMISSION_DENIED' });
    expect(repository.ruleFilters).toBeNull();
  });

  it('rejects listed rules outside the actor branch scope', async () => {
    repository.rulesById.set('rule-branch-2', {
      ...commissionRule,
      id: 'rule-branch-2',
      branchId: 'branch-2',
    });

    await expect(service.listRules(context)).rejects.toMatchObject({
      code: 'COMMISSION_BRANCH_SCOPE_DENIED',
    });
  });

  it('lists accruals for finance users with read permission and scoped filters', async () => {
    repository.accruals = [existingAccrual];

    const accruals = await service.listAccruals(
      contextWith({ role: 'FINANCE', permissions: ['commission.read'] }),
      { branchId: 'branch-1', professionalId: 'professional-1', status: 'OPEN' },
    );

    expect(accruals).toEqual([existingAccrual]);
  });

  it('lets professionals read only their own wallet scope', async () => {
    repository.accruals = [existingAccrual];
    const professionalContext = contextWith({
      userId: 'professional-1',
      role: 'PROFESSIONAL',
      permissions: ['commission.read'],
    });

    const wallet = await service.getProfessionalWallet(professionalContext, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });

    expect(wallet).toMatchObject({ professionalId: 'professional-1', branchIds: ['branch-1'] });
    expect(repository.walletFilters?.professionalId).toBe('professional-1');
    await expect(
      service.getProfessionalWallet(professionalContext, {
        branchId: 'branch-1',
        professionalId: 'professional-2',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toMatchObject({ code: 'COMMISSION_PERMISSION_DENIED' });
  });

  it('creates a commission rule for an authorized branch', async () => {
    const created = await service.createRule(context, {
      branchId: 'branch-1',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      professionalId: 'professional-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      percentageBps: 5500,
      effectiveFrom: '2026-09-08',
    });

    expect(created).toMatchObject({
      id: 'rule-created-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      scope: 'SERVICE',
      percentageBps: 5500,
    });
    expect(repository.createdCommand?.sourceId).toBe('service-1');
    expect(audit.contexts.at(-1)).toMatchObject({ userId: 'user-1', tenantId: 'tenant-1' });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'COMMISSION_RULE_CREATED',
      entityId: created.id,
      branchId: 'branch-1',
      professionalId: 'professional-1',
      result: 'SUCCESS',
    });
  });

  it('updates an active rule after validating effective dates', async () => {
    const updated = await service.updateRule(context, {
      id: commissionRule.id,
      percentageBps: 6000,
      effectiveUntil: '2026-12-31',
    });

    expect(updated.percentageBps).toBe(6000);
    expect(updated.effectiveUntil).toBe('2026-12-31');
    expect(repository.updatedCommand?.id).toBe(commissionRule.id);
    expect(audit.events.at(-1)).toMatchObject({
      action: 'COMMISSION_RULE_UPDATED',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      result: 'SUCCESS',
    });
  });

  it('deactivates a rule through the same audited update boundary', async () => {
    const inactive = await service.deactivateRule(context, commissionRule.id);

    expect(inactive.status).toBe('INACTIVE');
    expect(repository.updatedCommand).toMatchObject({ id: commissionRule.id, status: 'INACTIVE' });
    expect(audit.events.at(-1)).toMatchObject({ action: 'COMMISSION_RULE_UPDATED' });
  });

  it('rejects invalid effective date updates before persistence', async () => {
    await expect(
      service.updateRule(context, {
        id: commissionRule.id,
        effectiveFrom: '2026-10-01',
        effectiveUntil: '2026-09-30',
      }),
    ).rejects.toMatchObject({ code: 'COMMISSION_VALIDATION_ERROR' });
    expect(repository.updatedCommand).toBeNull();
  });

  it('denies actors without commission manage permission before creating rules', async () => {
    await expect(
      service.createRule(contextWith({ permissions: ['commission.read'] }), {
        branchId: 'branch-1',
        scope: 'TENANT_DEFAULT',
        type: 'PERCENTAGE',
        percentageBps: 5000,
        effectiveFrom: '2026-09-08',
      }),
    ).rejects.toMatchObject({ code: 'COMMISSION_PERMISSION_DENIED' });
    expect(repository.createdCommand).toBeNull();
  });

  it('denies rule mutations outside the actor branch scope', async () => {
    await expect(
      service.createRule(context, {
        branchId: 'branch-2',
        scope: 'TENANT_DEFAULT',
        type: 'PERCENTAGE',
        percentageBps: 5000,
        effectiveFrom: '2026-09-08',
      }),
    ).rejects.toMatchObject({ code: 'COMMISSION_BRANCH_SCOPE_DENIED' });
    expect(repository.createdCommand).toBeNull();
  });

  it('sanitizes cross-tenant rule leaks as not found', async () => {
    repository.rulesById.set(commissionRule.id, { ...commissionRule, tenantId: 'tenant-2' });

    await expect(
      service.updateRule(context, { id: commissionRule.id, percentageBps: 6500 }),
    ).rejects.toBeInstanceOf(CoreOperationsApplicationError);
    await expect(
      service.updateRule(context, { id: commissionRule.id, percentageBps: 6500 }),
    ).rejects.toMatchObject({ code: 'COMMISSION_RULE_NOT_FOUND' });
  });
  it('generates commission accruals from paid order items with source uniqueness', async () => {
    const generated = await service.generateAccrualsForPaidOrder(context, {
      orderId: paidOrder.id,
      paymentId: 'payment-1',
      idempotencyKey: 'commission-generate-1',
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({
      id: 'commission-generate-1:item-service-1',
      orderId: paidOrder.id,
      orderItemId: 'item-service-1',
      paymentId: 'payment-1',
      ruleId: 'rule-1',
      rulePercentageBpsSnapshot: 5000,
      baseAmountCents: 9_000,
      commissionAmountCents: 4_500,
      status: 'OPEN',
    });
    expect(repository.generatedAccruals).toEqual(generated);
    expect(audit.events.at(-1)).toMatchObject({
      action: 'COMMISSION_ACCRUAL_CREATED',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      amountCents: 4_500,
      result: 'SUCCESS',
    });
  });

  it('generates commission accruals for paid product items when a product rule matches', async () => {
    const productOrder: OrderDetail = {
      ...paidOrder,
      id: 'order-product-paid-1',
      subtotalAmountCents: 6_000,
      discountAmountCents: 0,
      totalAmountCents: 6_000,
      items: [
        {
          id: 'item-product-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          orderId: 'order-product-paid-1',
          sourceType: 'PRODUCT',
          sourceId: 'product-pomade-1',
          nameSnapshot: 'Pomada matte',
          quantity: 2,
          unitPriceAmountCents: 3_000,
          discountAmountCents: 0,
          finalAmountCents: 6_000,
          professionalId: 'professional-1',
          createdBy: 'user-1',
          createdAt: '2026-09-08T12:00:00.000Z',
        },
      ],
    };
    orders.orders.set(productOrder.id, productOrder);
    repository.rulesById.set('rule-product-1', {
      ...commissionRule,
      id: 'rule-product-1',
      scope: 'PRODUCT',
      sourceType: 'PRODUCT',
      sourceId: 'product-pomade-1',
      percentageBps: 1000,
    });

    const generated = await service.generateAccrualsForPaidOrder(context, {
      orderId: productOrder.id,
      paymentId: 'payment-product-1',
      idempotencyKey: 'commission-product-1',
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({
      id: 'commission-product-1:item-product-1',
      orderId: productOrder.id,
      orderItemId: 'item-product-1',
      paymentId: 'payment-product-1',
      ruleId: 'rule-product-1',
      ruleScopeSnapshot: 'PRODUCT',
      baseAmountCents: 6_000,
      commissionAmountCents: 600,
    });
  });

  it('does not generate product commission accruals when no product rule matches', async () => {
    const productOrder: OrderDetail = {
      ...paidOrder,
      id: 'order-product-without-rule-1',
      subtotalAmountCents: 6_000,
      discountAmountCents: 0,
      totalAmountCents: 6_000,
      items: [
        {
          id: 'item-product-without-rule-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          orderId: 'order-product-without-rule-1',
          sourceType: 'PRODUCT',
          sourceId: 'product-without-rule-1',
          nameSnapshot: 'Shampoo',
          quantity: 1,
          unitPriceAmountCents: 6_000,
          discountAmountCents: 0,
          finalAmountCents: 6_000,
          professionalId: 'professional-1',
          createdBy: 'user-1',
          createdAt: '2026-09-08T12:00:00.000Z',
        },
      ],
    };
    orders.orders.set(productOrder.id, productOrder);
    repository.rulesById.clear();

    const generated = await service.generateAccrualsForPaidOrder(context, {
      orderId: productOrder.id,
      paymentId: 'payment-product-without-rule-1',
      idempotencyKey: 'commission-product-without-rule-1',
    });

    expect(generated).toEqual([]);
    expect(repository.generatedAccruals).toBeNull();
  });
  it('does not duplicate accruals for an order item that already has a source record', async () => {
    repository.accruals = [existingAccrual];

    const generated = await service.generateAccrualsForPaidOrder(context, {
      orderId: paidOrder.id,
      paymentId: 'payment-1',
      idempotencyKey: 'commission-generate-duplicate-1',
    });

    expect(generated).toEqual([]);
    expect(repository.generatedAccruals).toBeNull();
    expect(repository.accruals[0]).toMatchObject({
      id: existingAccrual.id,
      rulePercentageBpsSnapshot: 5000,
      commissionAmountCents: 4_500,
    });
  });

  it('keeps historical accrual snapshots unchanged after commission rules change', async () => {
    repository.accruals = [existingAccrual];
    repository.rulesById.set(commissionRule.id, { ...commissionRule, percentageBps: 6500 });

    await service.generateAccrualsForPaidOrder(context, {
      orderId: paidOrder.id,
      paymentId: 'payment-1',
      idempotencyKey: 'commission-generate-after-rule-change-1',
    });

    expect(repository.accruals[0]).toMatchObject({
      id: existingAccrual.id,
      rulePercentageBpsSnapshot: 5000,
      commissionAmountCents: 4_500,
      status: 'OPEN',
    });
  });

  it('records refund reversals without mutating the original commission accrual', async () => {
    repository.accruals = [existingAccrual];

    const reversals = await service.reverseAccrualsForRefund(context, {
      orderId: paidOrder.id,
      paymentId: 'payment-1',
      idempotencyKey: 'commission-refund-1',
      reason: 'Estorno do pagamento.',
      occurredAt: '2026-09-08T13:00:00.000Z',
    });

    expect(reversals).toHaveLength(1);
    expect(reversals[0]).toMatchObject({
      id: 'commission-refund-1:accrual-existing-1:reversal',
      status: 'REVERSED',
      reversedAccrualId: existingAccrual.id,
      commissionAmountCents: existingAccrual.commissionAmountCents,
    });
    expect(repository.accruals[0]).toMatchObject({ id: existingAccrual.id, status: 'OPEN' });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'COMMISSION_ACCRUAL_REVERSED',
      amountCents: 4_500,
      result: 'SUCCESS',
    });
  });
  it('closes payouts using only open accruals inside the requested partial period', async () => {
    const outsidePeriod = {
      ...existingAccrual,
      id: 'accrual-outside',
      accruedAt: '2026-08-31T12:00:00.000Z',
    };
    repository.accruals = [existingAccrual, outsidePeriod];

    const detail = await service.closePayout(context, {
      professionalId: 'professional-1',
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      idempotencyKey: 'payout-close-1',
    });

    expect(detail.payout).toMatchObject({
      status: 'CLOSED',
      totalAmountCents: 4_500,
      sources: [{ accrualId: existingAccrual.id, amountCents: 4_500 }],
    });
    expect(repository.closedCommand?.accrualIds).toEqual([existingAccrual.id]);
    expect(audit.events.at(-1)).toMatchObject({
      action: 'PAYOUT_CLOSED',
      professionalId: 'professional-1',
      amountCents: 4_500,
      result: 'SUCCESS',
    });
  });

  it('pays a closed payout and records the financial side effect boundary', async () => {
    const paid = await service.payPayout(context, {
      payoutId: closedPayoutDetail.payout.id,
      paymentMethod: 'PIX',
      paidAt: '2026-09-08T15:00:00.000Z',
      idempotencyKey: 'payout-pay-1',
    });

    expect(paid.payout).toMatchObject({
      status: 'PAID',
      financialEntryId: 'entry-payout-paid-1',
      idempotencyKey: 'payout-pay-1',
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'PAYOUT_PAID',
      amountCents: 4_500,
      result: 'SUCCESS',
    });
  });

  it('returns a paid payout idempotently when the duplicate payment key matches', async () => {
    repository.payoutDetails.set(paidPayoutDetail.payout.id, paidPayoutDetail);

    const paid = await service.payPayout(context, {
      payoutId: paidPayoutDetail.payout.id,
      paymentMethod: 'PIX',
      idempotencyKey: 'payout-pay-1',
    });

    expect(paid).toBe(paidPayoutDetail);
    expect(repository.paidPayoutCommand).toBeNull();
  });

  it('keeps paid payouts immutable for different duplicate payment requests', async () => {
    repository.payoutDetails.set(paidPayoutDetail.payout.id, paidPayoutDetail);

    await expect(
      service.payPayout(context, {
        payoutId: paidPayoutDetail.payout.id,
        paymentMethod: 'PIX',
        idempotencyKey: 'payout-pay-different-1',
      }),
    ).rejects.toMatchObject({ code: 'PAYOUT_IMMUTABLE' });
    expect(repository.paidPayoutCommand).toBeNull();
  });

  it('records paid payout corrections without replacing payout history', async () => {
    repository.payoutDetails.set(paidPayoutDetail.payout.id, paidPayoutDetail);

    const corrected = await service.correctPayout(context, {
      payoutId: paidPayoutDetail.payout.id,
      amountCents: 500,
      direction: 'OUT',
      reason: 'Ajuste operacional conferido.',
      idempotencyKey: 'payout-correct-1',
    });

    expect(corrected.payout).toMatchObject({
      id: paidPayoutDetail.payout.id,
      status: 'CORRECTED',
      correctionReason: 'Ajuste operacional conferido.',
    });
    expect(repository.correctedPayoutCommand?.idempotencyKey).toBe('payout-correct-1');
    expect(audit.events.at(-1)).toMatchObject({
      action: 'PAYOUT_CORRECTED',
      amountCents: 500,
      result: 'SUCCESS',
    });
  });
  it('pays a payout in cash only when an open cash session matches the payout branch', async () => {
    const paid = await service.payPayout(context, {
      payoutId: closedPayoutDetail.payout.id,
      paymentMethod: 'CASH',
      cashRegisterSessionId: 'cash-session-1',
      idempotencyKey: 'payout-cash-pay-1',
    });

    expect(paid.payout.paymentMethod).toBe('CASH');
    expect(repository.paidPayoutCommand?.cashRegisterSessionId).toBe('cash-session-1');
    expect(repository.cashMovementCreated).toBe(true);
  });

  it('rejects cash payout payment when there is no open cash session', async () => {
    cashRegister.sessions.clear();
    cashRegister.currentSession = null;

    await expect(
      service.payPayout(context, {
        payoutId: closedPayoutDetail.payout.id,
        paymentMethod: 'CASH',
        cashRegisterSessionId: 'cash-session-missing',
        idempotencyKey: 'payout-cash-missing-1',
      }),
    ).rejects.toMatchObject({ code: 'PAYOUT_CASH_REGISTER_NOT_OPEN' });
    expect(repository.paidPayoutCommand).toBeNull();
  });

  it('rejects cash payout payment when the cash session belongs to another branch', async () => {
    cashRegister.sessions.set('cash-session-branch-2', {
      ...cashSession,
      id: 'cash-session-branch-2',
      branchId: 'branch-2',
    });

    await expect(
      service.payPayout(contextWith({ branchScope: ['branch-1', 'branch-2'] }), {
        payoutId: closedPayoutDetail.payout.id,
        paymentMethod: 'CASH',
        cashRegisterSessionId: 'cash-session-branch-2',
        idempotencyKey: 'payout-cash-branch-mismatch-1',
      }),
    ).rejects.toMatchObject({ code: 'PAYOUT_BRANCH_SCOPE_DENIED' });
    expect(repository.paidPayoutCommand).toBeNull();
  });
  it('captures audit context and financial fields across commission mutations', async () => {
    await service.createRule(context, {
      branchId: 'branch-1',
      scope: 'TENANT_DEFAULT',
      type: 'FIXED_AMOUNT',
      fixedAmountCents: 800,
      effectiveFrom: '2026-09-08',
    });
    const generated = await service.generateAccrualsForPaidOrder(context, {
      orderId: paidOrder.id,
      paymentId: 'payment-audit-1',
      idempotencyKey: 'commission-audit-generate-1',
    });
    const closed = await service.closePayout(context, {
      professionalId: 'professional-1',
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      accrualIds: generated.map((accrual) => accrual.id),
      idempotencyKey: 'commission-audit-close-1',
    });
    const paid = await service.payPayout(context, {
      payoutId: closed.payout.id,
      paymentMethod: 'PIX',
      idempotencyKey: 'commission-audit-pay-1',
    });
    await service.correctPayout(context, {
      payoutId: paid.payout.id,
      amountCents: 250,
      direction: 'OUT',
      reason: 'Ajuste auditado.',
      idempotencyKey: 'commission-audit-correct-1',
    });
    repository.accruals = [existingAccrual];
    await service.reverseAccrualsForRefund(context, {
      orderId: paidOrder.id,
      paymentId: 'payment-1',
      idempotencyKey: 'commission-audit-refund-1',
      reason: 'Refund auditado.',
    });

    expect(audit.contexts.every((item) => item.userId === 'user-1')).toBe(true);
    expect(audit.contexts.every((item) => item.tenantId === 'tenant-1')).toBe(true);
    expect(audit.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'COMMISSION_RULE_CREATED',
          branchId: 'branch-1',
          result: 'SUCCESS',
          amountCents: 800,
        }),
        expect.objectContaining({
          action: 'COMMISSION_ACCRUAL_CREATED',
          branchId: 'branch-1',
          professionalId: 'professional-1',
          result: 'SUCCESS',
          amountCents: 4_500,
        }),
        expect.objectContaining({
          action: 'PAYOUT_CLOSED',
          branchId: 'branch-1',
          professionalId: 'professional-1',
          result: 'SUCCESS',
          amountCents: 4_500,
        }),
        expect.objectContaining({
          action: 'PAYOUT_PAID',
          branchId: 'branch-1',
          professionalId: 'professional-1',
          result: 'SUCCESS',
          amountCents: 4_500,
        }),
        expect.objectContaining({
          action: 'PAYOUT_CORRECTED',
          branchId: 'branch-1',
          professionalId: 'professional-1',
          result: 'SUCCESS',
          amountCents: 250,
        }),
        expect.objectContaining({
          action: 'COMMISSION_ACCRUAL_REVERSED',
          branchId: 'branch-1',
          professionalId: 'professional-1',
          result: 'SUCCESS',
          amountCents: 4_500,
        }),
      ]),
    );
  });
});
