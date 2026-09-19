import {
  closePayoutCommandSchema,
  correctPayoutCommandSchema,
  createCommissionRuleCommandSchema,
  generateCommissionAccrualsCommandSchema,
  payPayoutCommandSchema,
  updateCommissionRuleCommandSchema,
  type CommissionAccrual,
  type CommissionRule,
  type Entitlement,
  type GenerateCommissionAccrualsCommand,
  type OrderDetail,
  type Payout,
  type PayoutDetail,
  type Permission,
  type ProfessionalWallet,
  type RequestContext,
  type UpdateCommissionRuleCommand,
} from '@barberos/contracts';
import { AuthorizationError, authorize } from '@barberos/permissions';

import type { CashRegisterRepository } from '../../cash-register/domain';
import type { OrderRepository } from '../../orders/domain';
import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  CommissionAccrualFilters,
  CommissionAuditSink,
  CommissionRepository,
  CommissionRuleFilters,
  CommissionOutboxProducer,
  ProfessionalWalletFilters,
  ReverseCommissionAccrualsCommand,
} from '../domain';
import { calculateCommissionAccrualForItem } from '../domain';

const commissionEntitlement = 'finance' satisfies Entitlement;

type PayoutCashRegisterLookup = Pick<
  CashRegisterRepository,
  'findCurrentSession' | 'findSessionById'
>;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export type CommissionApplicationServiceDependencies = {
  repository: CommissionRepository;
  orders?: Pick<OrderRepository, 'findById'>;
  cashRegister?: PayoutCashRegisterLookup;
  auditSink?: CommissionAuditSink;
  outbox?: CommissionOutboxProducer;
  now?: () => string;
};

export class CommissionApplicationService {
  private readonly repository: CommissionRepository;
  private readonly orders?: Pick<OrderRepository, 'findById'>;
  private readonly cashRegister?: PayoutCashRegisterLookup;
  private readonly audit?: CommissionAuditSink;
  private readonly outbox?: CommissionOutboxProducer;
  private readonly now: () => string;

  constructor(dependencies: CommissionApplicationServiceDependencies) {
    this.repository = dependencies.repository;
    this.orders = dependencies.orders;
    this.cashRegister = dependencies.cashRegister;
    this.audit = dependencies.auditSink;
    this.outbox = dependencies.outbox;
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async listRules(context: RequestContext, filters: CommissionRuleFilters = {}) {
    authorizeCommissionAccess(context, 'commission.manage', filters.branchId);

    const rules = await this.repository.listRules(context, filters);
    for (const rule of rules) assertCommissionRuleIsVisible(context, rule);
    return rules;
  }

  async listAccruals(context: RequestContext, filters: CommissionAccrualFilters = {}) {
    authorizeCommissionReadAccess(context, filters.branchId, filters.professionalId);

    const accruals = await this.repository.listAccruals(context, filters);
    for (const accrual of accruals) assertCommissionAccrualIsVisible(context, accrual);
    return accruals;
  }

  async getProfessionalWallet(context: RequestContext, filters: ProfessionalWalletFilters) {
    authorizeCommissionReadAccess(context, filters.branchId, filters.professionalId);

    const wallet = await this.repository.getProfessionalWallet(context, filters);
    assertProfessionalWalletIsVisible(context, wallet);
    return wallet;
  }

  async createRule(context: RequestContext, command: unknown) {
    const parsed = createCommissionRuleCommandSchema.parse(command);
    authorizeCommissionAccess(context, 'commission.manage', parsed.branchId);

    const rule = await this.repository.createRule(context, parsed);
    assertCommissionRuleIsVisible(context, rule);

    await this.audit?.record(context, {
      action: 'COMMISSION_RULE_CREATED',
      entityType: 'COMMISSION_RULE',
      entityId: rule.id,
      result: 'SUCCESS',
      branchId: rule.branchId,
      professionalId: rule.professionalId,
      amountCents: rule.fixedAmountCents,
      afterState: rule,
    });

    return rule;
  }

  async updateRule(context: RequestContext, command: unknown) {
    const parsed = updateCommissionRuleCommandSchema.parse(command);
    const current = await this.getVisibleRule(context, parsed.id);
    authorizeCommissionAccess(context, 'commission.manage', current.branchId);
    if (parsed.branchId) authorizeCommissionAccess(context, 'commission.manage', parsed.branchId);
    assertRuleEffectiveDatesAreValid(current, parsed);

    const updated = await this.repository.updateRule(context, parsed.id, parsed);
    assertCommissionRuleIsVisible(context, updated);
    if (updated.id !== current.id) {
      throw new CoreOperationsApplicationError(
        'COMMISSION_VALIDATION_ERROR',
        'Commission rule update returned an unexpected rule.',
      );
    }

    await this.audit?.record(context, {
      action: 'COMMISSION_RULE_UPDATED',
      entityType: 'COMMISSION_RULE',
      entityId: updated.id,
      result: 'SUCCESS',
      branchId: updated.branchId,
      professionalId: updated.professionalId,
      amountCents: updated.fixedAmountCents,
      beforeState: current,
      afterState: updated,
    });

    return updated;
  }

  async deactivateRule(context: RequestContext, ruleId: string) {
    return this.updateRule(context, { id: ruleId, status: 'INACTIVE' });
  }

  async generateAccrualsForPaidOrder(
    context: RequestContext,
    command: GenerateCommissionAccrualsCommand,
  ) {
    const parsed = generateCommissionAccrualsCommandSchema.parse(command);
    const order = await this.getVisiblePaidOrder(context, parsed.orderId);
    authorizeCommissionAccess(context, 'commission.manage', order.branchId);

    const existingAccruals = await this.repository.listAccruals(context, {
      branchId: order.branchId,
      orderId: order.id,
    });
    for (const accrual of existingAccruals) assertCommissionAccrualIsVisible(context, accrual);

    const existingItemIds = new Set(existingAccruals.map((accrual) => accrual.orderItemId));
    const rules = await this.repository.listRules(context, {
      branchId: order.branchId,
      status: 'ACTIVE',
    });
    const occurredAt = this.now();
    const accruals = order.items.flatMap((item) => {
      if (existingItemIds.has(item.id)) return [];
      const accrual = calculateCommissionAccrualForItem({
        id: `${parsed.idempotencyKey}:${item.id}`,
        item,
        rules,
        paymentId: parsed.paymentId,
        accruedAt: occurredAt,
      });
      return accrual ? [accrual] : [];
    });

    if (accruals.length === 0) return [];

    const persisted = await this.repository.generateAccruals(context, parsed, accruals);
    for (const accrual of persisted) {
      assertCommissionAccrualIsVisible(context, accrual);
      await this.audit?.record(context, {
        action: 'COMMISSION_ACCRUAL_CREATED',
        entityType: 'COMMISSION_ACCRUAL',
        entityId: accrual.id,
        result: 'SUCCESS',
        branchId: accrual.branchId,
        professionalId: accrual.professionalId,
        amountCents: accrual.commissionAmountCents,
        afterState: accrual,
      });
    }

    return persisted;
  }

  async reverseAccrualsForRefund(
    context: RequestContext,
    command: ReverseCommissionAccrualsCommand,
  ) {
    assertReverseAccrualCommand(command);
    const order = await this.getVisiblePaidOrder(context, command.orderId);
    authorizeCommissionAccess(context, 'commission.manage', order.branchId);

    const existingAccruals = await this.repository.listAccruals(context, {
      branchId: order.branchId,
      orderId: order.id,
    });
    for (const accrual of existingAccruals) assertCommissionAccrualIsVisible(context, accrual);

    const reversedOriginalIds = new Set(
      existingAccruals.flatMap((accrual) =>
        accrual.reversedAccrualId ? [accrual.reversedAccrualId] : [],
      ),
    );
    const occurredAt = command.occurredAt ?? this.now();
    const reversals = existingAccruals.flatMap((accrual) => {
      if (accrual.reversedAccrualId || accrual.status === 'REVERSED') return [];
      if (reversedOriginalIds.has(accrual.id)) return [];
      if (command.paymentId && accrual.paymentId && accrual.paymentId !== command.paymentId)
        return [];
      return [createCommissionAccrualReversal(accrual, command.idempotencyKey, occurredAt)];
    });

    if (reversals.length === 0) return [];

    const persisted = await this.repository.reverseAccruals(context, command, reversals);
    for (const reversal of persisted) {
      assertCommissionAccrualIsVisible(context, reversal);
      await this.audit?.record(context, {
        action: 'COMMISSION_ACCRUAL_REVERSED',
        entityType: 'COMMISSION_ACCRUAL',
        entityId: reversal.id,
        result: 'SUCCESS',
        branchId: reversal.branchId,
        professionalId: reversal.professionalId,
        amountCents: reversal.commissionAmountCents,
        afterState: reversal,
      });
    }

    return persisted;
  }

  async closePayout(context: RequestContext, command: unknown) {
    const parsed = closePayoutCommandSchema.parse(command);
    authorizeCommissionAccess(context, 'commission.manage', parsed.branchId);

    const openAccruals = await this.repository.listAccruals(context, {
      branchId: parsed.branchId,
      professionalId: parsed.professionalId,
      status: 'OPEN',
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    });
    const selectedAccruals = openAccruals.filter((accrual) => {
      assertCommissionAccrualIsVisible(context, accrual);
      const accruedOn = accrual.accruedAt.slice(0, 10);
      const insidePeriod = accruedOn >= parsed.periodStart && accruedOn <= parsed.periodEnd;
      const selectedById = !parsed.accrualIds || parsed.accrualIds.includes(accrual.id);
      return insidePeriod && selectedById;
    });

    if (selectedAccruals.length === 0) {
      throw new CoreOperationsApplicationError(
        'PAYOUT_VALIDATION_ERROR',
        'Payout closing requires open accruals in the selected period.',
      );
    }

    const detail = await this.repository.closePayout(context, {
      ...parsed,
      accrualIds: selectedAccruals.map((accrual) => accrual.id),
    });
    assertPayoutDetailIsVisible(context, detail);

    await this.audit?.record(context, {
      action: 'PAYOUT_CLOSED',
      entityType: 'PAYOUT',
      entityId: detail.payout.id,
      result: 'SUCCESS',
      branchId: detail.payout.branchId,
      professionalId: detail.payout.professionalId,
      amountCents: detail.payout.totalAmountCents,
      afterState: detail,
    });

    return detail;
  }

  async payPayout(context: RequestContext, command: unknown) {
    const parsed = payPayoutCommandSchema.parse(command);
    const current = await this.getVisiblePayoutDetail(context, parsed.payoutId);
    authorizeCommissionAccess(context, 'commission.manage', current.payout.branchId);

    if (current.payout.status === 'PAID') {
      if (current.payout.idempotencyKey === parsed.idempotencyKey) {
        await this.enqueueFinanceRecalculation(context, current.payout);
        return current;
      }
      throw new CoreOperationsApplicationError(
        'PAYOUT_IMMUTABLE',
        'Paid payouts cannot be paid again with a different idempotency key.',
      );
    }
    if (current.payout.status !== 'CLOSED' && current.payout.status !== 'APPROVED') {
      throw new CoreOperationsApplicationError(
        'PAYOUT_INVALID_STATUS',
        'Payout must be closed or approved before payment.',
      );
    }
    const cashRegisterSessionId =
      parsed.paymentMethod === 'CASH'
        ? await this.resolveCashPayoutSession(context, current, parsed.cashRegisterSessionId)
        : parsed.cashRegisterSessionId;

    const paid = await this.repository.payPayout(context, { ...parsed, cashRegisterSessionId });
    assertPayoutDetailIsVisible(context, paid);
    if (
      paid.payout.id !== current.payout.id ||
      paid.payout.status !== 'PAID' ||
      !paid.payout.financialEntryId
    ) {
      throw new CoreOperationsApplicationError(
        'PAYOUT_VALIDATION_ERROR',
        'Payout payment did not create a valid financial entry.',
      );
    }

    await this.audit?.record(context, {
      action: 'PAYOUT_PAID',
      entityType: 'PAYOUT',
      entityId: paid.payout.id,
      result: 'SUCCESS',
      branchId: paid.payout.branchId,
      professionalId: paid.payout.professionalId,
      amountCents: paid.payout.totalAmountCents,
      beforeState: current,
      afterState: paid,
    });
    await this.enqueueFinanceRecalculation(context, paid.payout);

    return paid;
  }

  async correctPayout(context: RequestContext, command: unknown) {
    const parsed = correctPayoutCommandSchema.parse(command);
    const current = await this.getVisiblePayoutDetail(context, parsed.payoutId);
    authorizeCommissionAccess(context, 'commission.manage', current.payout.branchId);
    if (current.payout.status !== 'PAID') {
      throw new CoreOperationsApplicationError(
        'PAYOUT_INVALID_STATUS',
        'Only paid payouts can receive payout corrections.',
      );
    }

    const corrected = await this.repository.correctPayout(context, parsed);
    assertPayoutDetailIsVisible(context, corrected);
    if (corrected.payout.id !== current.payout.id) {
      throw new CoreOperationsApplicationError(
        'PAYOUT_VALIDATION_ERROR',
        'Payout correction returned an unexpected payout.',
      );
    }

    await this.audit?.record(context, {
      action: 'PAYOUT_CORRECTED',
      entityType: 'PAYOUT',
      entityId: corrected.payout.id,
      result: 'SUCCESS',
      branchId: corrected.payout.branchId,
      professionalId: corrected.payout.professionalId,
      amountCents: parsed.amountCents,
      beforeState: current,
      afterState: corrected,
    });
    await this.enqueueFinanceRecalculation(context, corrected.payout);

    return corrected;
  }
  private async enqueueFinanceRecalculation(
    context: RequestContext,
    payout: Pick<Payout, 'tenantId' | 'branchId' | 'id' | 'status' | 'totalAmountCents'>,
  ) {
    if (!this.outbox) return;
    await this.outbox.createEvent(context, {
      tenantId: payout.tenantId,
      branchId: payout.branchId,
      eventType: 'FINANCE_RECALCULATION_REQUESTED',
      sourceType: 'COMMISSION',
      sourceId: payout.id,
      payload: {
        payoutId: payout.id,
        status: payout.status,
        totalAmountCents: payout.totalAmountCents,
      },
      idempotencyKey: 'commission:payout:' + payout.id + ':' + payout.status,
      correlationId: context.requestId,
    });
  }

  private async getVisibleRule(context: RequestContext, ruleId: string) {
    const rule = await this.repository.findRuleById(context, ruleId);
    if (!rule || rule.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError(
        'COMMISSION_RULE_NOT_FOUND',
        'Commission rule was not found.',
      );
    }
    assertCommissionRuleIsVisible(context, rule);
    return rule;
  }

  private async resolveCashPayoutSession(
    context: RequestContext,
    detail: PayoutDetail,
    sessionId?: string,
  ) {
    if (!this.cashRegister) return sessionId;

    const session = sessionId
      ? await this.cashRegister.findSessionById(context, sessionId)
      : await this.cashRegister.findCurrentSession(context, {
          branchId: detail.payout.branchId,
          status: 'OPEN',
        });
    if (!session || session.tenantId !== context.tenantId || session.status !== 'OPEN') {
      throw new CoreOperationsApplicationError(
        'PAYOUT_CASH_REGISTER_NOT_OPEN',
        'Cash payout requires an open cash register session.',
      );
    }
    if (
      !context.branchScope.includes(session.branchId) ||
      session.branchId !== detail.payout.branchId
    ) {
      throw new CoreOperationsApplicationError(
        'PAYOUT_BRANCH_SCOPE_DENIED',
        'Cash register session is outside the payout branch scope.',
      );
    }

    return session.id;
  }

  private async getVisiblePayoutDetail(context: RequestContext, payoutId: string) {
    const detail = await this.repository.getPayoutDetail(context, payoutId);
    if (!detail || detail.payout.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('PAYOUT_NOT_FOUND', 'Payout was not found.');
    }
    assertPayoutDetailIsVisible(context, detail);
    return detail;
  }

  private async getVisiblePaidOrder(context: RequestContext, orderId: string) {
    if (!this.orders) {
      throw new CoreOperationsApplicationError(
        'COMMISSION_VALIDATION_ERROR',
        'Order lookup is required for commission accrual generation.',
      );
    }
    const order = await this.orders.findById(context, orderId);
    if (!order || order.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('COMMISSION_NOT_FOUND', 'Order was not found.');
    }
    assertOrderIsVisible(context, order);
    if (order.status !== 'PAID') {
      throw new CoreOperationsApplicationError(
        'COMMISSION_VALIDATION_ERROR',
        'Commission accruals require a paid order.',
      );
    }
    return order;
  }
}

function authorizeCommissionReadAccess(
  context: RequestContext,
  branchId?: string,
  professionalId?: string,
) {
  try {
    authorize(context, {
      permission: 'commission.read',
      entitlement: commissionEntitlement,
      branchId,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      switch (error.code) {
        case 'PERMISSION_DENIED':
          throw new CoreOperationsApplicationError('COMMISSION_PERMISSION_DENIED', error.message);
        case 'ENTITLEMENT_DENIED':
          throw new CoreOperationsApplicationError('COMMISSION_ENTITLEMENT_DENIED', error.message);
        case 'BRANCH_SCOPE_DENIED':
          throw new CoreOperationsApplicationError('COMMISSION_BRANCH_SCOPE_DENIED', error.message);
        case 'UNAUTHENTICATED':
          throw error;
      }
    }
    throw error;
  }

  if (context.role === 'PROFESSIONAL' && (!professionalId || professionalId !== context.userId)) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_PERMISSION_DENIED',
      'Professionals can only view their own commission data.',
    );
  }
}

function authorizeCommissionAccess(
  context: RequestContext,
  permission: Permission,
  branchId?: string,
) {
  try {
    authorize(context, { permission, entitlement: commissionEntitlement, branchId });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      switch (error.code) {
        case 'PERMISSION_DENIED':
          throw new CoreOperationsApplicationError('COMMISSION_PERMISSION_DENIED', error.message);
        case 'ENTITLEMENT_DENIED':
          throw new CoreOperationsApplicationError('COMMISSION_ENTITLEMENT_DENIED', error.message);
        case 'BRANCH_SCOPE_DENIED':
          throw new CoreOperationsApplicationError('COMMISSION_BRANCH_SCOPE_DENIED', error.message);
        case 'UNAUTHENTICATED':
          throw error;
      }
    }
    throw error;
  }
}

function assertCommissionRuleIsVisible(context: RequestContext, rule: CommissionRule) {
  if (rule.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_RULE_NOT_FOUND',
      'Commission rule was not found.',
    );
  }
  if (rule.branchId && !context.branchScope.includes(rule.branchId)) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_BRANCH_SCOPE_DENIED',
      'Commission rule is outside the authorized branch scope.',
    );
  }
}

function assertCommissionAccrualIsVisible(context: RequestContext, accrual: CommissionAccrual) {
  if (accrual.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_NOT_FOUND',
      'Commission accrual was not found.',
    );
  }
  if (!context.branchScope.includes(accrual.branchId)) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_BRANCH_SCOPE_DENIED',
      'Commission accrual is outside the authorized branch scope.',
    );
  }
}

function assertOrderIsVisible(
  context: RequestContext,
  order: Pick<OrderDetail, 'tenantId' | 'branchId'>,
) {
  if (order.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('COMMISSION_NOT_FOUND', 'Order was not found.');
  }
  if (!context.branchScope.includes(order.branchId)) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_BRANCH_SCOPE_DENIED',
      'Order is outside the authorized branch scope.',
    );
  }
}

function assertPayoutDetailIsVisible(context: RequestContext, detail: PayoutDetail) {
  assertPayoutIsVisible(context, detail.payout);
  for (const accrual of detail.accruals) assertCommissionAccrualIsVisible(context, accrual);
}

function assertProfessionalWalletIsVisible(context: RequestContext, wallet: ProfessionalWallet) {
  if (wallet.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_NOT_FOUND',
      'Professional wallet was not found.',
    );
  }
  if (context.role === 'PROFESSIONAL' && wallet.professionalId !== context.userId) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_PERMISSION_DENIED',
      'Professionals can only view their own commission data.',
    );
  }
  for (const branchId of wallet.branchIds) {
    if (!context.branchScope.includes(branchId)) {
      throw new CoreOperationsApplicationError(
        'COMMISSION_BRANCH_SCOPE_DENIED',
        'Professional wallet is outside the authorized branch scope.',
      );
    }
  }
  for (const accrual of wallet.accruals) assertCommissionAccrualIsVisible(context, accrual);
  for (const payout of wallet.payouts) assertPayoutIsVisible(context, payout);
}

function assertPayoutIsVisible(context: RequestContext, payout: Payout) {
  if (payout.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('PAYOUT_NOT_FOUND', 'Payout was not found.');
  }
  if (!context.branchScope.includes(payout.branchId)) {
    throw new CoreOperationsApplicationError(
      'PAYOUT_BRANCH_SCOPE_DENIED',
      'Payout is outside the authorized branch scope.',
    );
  }
}
function assertRuleEffectiveDatesAreValid(
  current: CommissionRule,
  command: UpdateCommissionRuleCommand,
) {
  const effectiveFrom = command.effectiveFrom ?? current.effectiveFrom;
  const effectiveUntil = command.effectiveUntil ?? current.effectiveUntil;
  if (effectiveUntil && effectiveFrom > effectiveUntil) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_VALIDATION_ERROR',
      'Commission rule effective end must be after start.',
    );
  }
}

function assertReverseAccrualCommand(command: ReverseCommissionAccrualsCommand) {
  if (!command.orderId || !command.idempotencyKey || command.reason.trim().length < 3) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_VALIDATION_ERROR',
      'Commission reversal requires order, idempotency key and reason.',
    );
  }
}

function createCommissionAccrualReversal(
  accrual: CommissionAccrual,
  idempotencyKey: string,
  occurredAt: string,
): CommissionAccrual {
  return {
    ...accrual,
    id: `${idempotencyKey}:${accrual.id}:reversal`,
    status: 'REVERSED',
    accruedAt: occurredAt,
    reversedAccrualId: accrual.id,
    payoutId: undefined,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}
