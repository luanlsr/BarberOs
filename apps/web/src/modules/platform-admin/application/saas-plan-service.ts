import {
  createSaasPlanCommandSchema,
  saasPlanSchema,
  updateSaasPlanCommandSchema,
  type CreateSaasPlanCommand,
  type PlatformAuditEntry,
  type SaasPlan,
  type UpdateSaasPlanCommand,
} from '@barberos/contracts';

import type { PlatformAuditSink, PlatformRequestContext } from '../domain';
import { PlatformAdminApplicationError } from './platform-admin-errors';
import { authorizePlatformPermission } from './platform-authorization';

export type SaasPlanRepository = {
  listPlans(context: PlatformRequestContext): Promise<SaasPlan[]>;
  findPlanById(context: PlatformRequestContext, planId: string): Promise<SaasPlan | null>;
  findPlanByCode(context: PlatformRequestContext, code: string): Promise<SaasPlan | null>;
  createPlan(context: PlatformRequestContext, command: CreateSaasPlanCommand): Promise<SaasPlan>;
  updatePlan(
    context: PlatformRequestContext,
    planId: string,
    command: UpdateSaasPlanCommand,
  ): Promise<SaasPlan>;
};

export type SaasPlanServiceDependencies = {
  repository: SaasPlanRepository;
  auditSink: PlatformAuditSink;
};

export class SaasPlanService {
  private readonly repository: SaasPlanRepository;
  private readonly audit: PlatformAuditSink;

  constructor(dependencies: SaasPlanServiceDependencies) {
    this.repository = dependencies.repository;
    this.audit = dependencies.auditSink;
  }

  async listPlans(context: PlatformRequestContext) {
    authorizePlatformPermission(context, 'platform.plans.manage');
    const plans = await this.repository.listPlans(context);
    return plans.map((plan) => saasPlanSchema.parse(plan));
  }

  async createPlan(context: PlatformRequestContext, command: unknown) {
    authorizePlatformPermission(context, 'platform.plans.manage');
    const parsed = createSaasPlanCommandSchema.parse(command);
    await this.assertUniquePlanCode(context, parsed.code);

    const created = saasPlanSchema.parse(await this.repository.createPlan(context, parsed));
    await this.recordPlanAudit(context, 'PLAN_CREATED', created.id, undefined, created);
    return created;
  }

  async updatePlan(context: PlatformRequestContext, command: unknown) {
    authorizePlatformPermission(context, 'platform.plans.manage');
    const parsed = updateSaasPlanCommandSchema.parse(command);
    const current = await this.getPlanOrThrow(context, parsed.id);
    if (parsed.code && normalizePlanCode(parsed.code) !== normalizePlanCode(current.code)) {
      await this.assertUniquePlanCode(context, parsed.code, current.id);
    }

    const updated = saasPlanSchema.parse(
      await this.repository.updatePlan(context, parsed.id, parsed),
    );
    await this.recordPlanAudit(
      context,
      updated.status === 'ARCHIVED' ? 'PLAN_ARCHIVED' : 'PLAN_UPDATED',
      updated.id,
      current,
      updated,
    );
    return updated;
  }

  async archivePlan(context: PlatformRequestContext, input: { planId: string; reason: string }) {
    authorizePlatformPermission(context, 'platform.plans.manage');
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_VALIDATION_ERROR',
        'Plan archive requires a reason.',
      );
    }
    const current = await this.getPlanOrThrow(context, input.planId);
    if (current.status === 'ARCHIVED') {
      throw new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_INVALID_STATUS',
        'Plan is already archived.',
      );
    }

    const updated = saasPlanSchema.parse(
      await this.repository.updatePlan(context, input.planId, {
        id: input.planId,
        status: 'ARCHIVED',
      }),
    );
    await this.recordPlanAudit(context, 'PLAN_ARCHIVED', updated.id, current, updated, reason);
    return updated;
  }

  private async getPlanOrThrow(context: PlatformRequestContext, planId: string) {
    const plan = await this.repository.findPlanById(context, planId);
    if (!plan) {
      throw new PlatformAdminApplicationError('PLATFORM_ADMIN_NOT_FOUND', 'Plan was not found.');
    }
    return saasPlanSchema.parse(plan);
  }

  private async assertUniquePlanCode(
    context: PlatformRequestContext,
    code: string,
    currentPlanId?: string,
  ) {
    const existing = await this.repository.findPlanByCode(context, normalizePlanCode(code));
    if (existing && existing.id !== currentPlanId) {
      throw new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_DUPLICATE_CODE',
        'SaaS plan code already exists.',
      );
    }
  }

  private async recordPlanAudit(
    context: PlatformRequestContext,
    action: PlatformAuditEntry['action'],
    planId: string,
    beforeState: SaasPlan | undefined,
    afterState: SaasPlan,
    reason?: string,
  ) {
    await this.audit.record(context, {
      action,
      targetType: 'saas_plan',
      targetId: planId,
      result: 'SUCCESS',
      requestId: context.requestId,
      reason,
      metadata: {
        beforeStatus: beforeState?.status,
        afterStatus: afterState.status,
        entitlementCount: afterState.entitlements.length,
      },
    });
  }
}

function normalizePlanCode(code: string) {
  return code.trim().toLowerCase();
}
