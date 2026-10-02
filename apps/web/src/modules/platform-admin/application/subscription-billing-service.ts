import {
  assignTenantSubscriptionCommandSchema,
  billingInvoiceSummarySchema,
  tenantSubscriptionSchema,
  tenantSubscriptionStatusSchema,
  type AssignTenantSubscriptionCommand,
  type BillingInvoiceSummary,
  type PlatformAuditEntry,
  type TenantSubscription,
  type TenantSubscriptionStatus,
} from '@barberos/contracts';

import type { PlatformAuditSink, PlatformRequestContext } from '../domain';
import { PlatformAdminApplicationError } from './platform-admin-errors';
import { authorizePlatformPermission } from './platform-authorization';

export type UpdateSubscriptionStatusCommand = {
  subscriptionId: string;
  status: TenantSubscriptionStatus;
  reason: string;
};

export type SubscriptionBillingRepository = {
  listSubscriptions(context: PlatformRequestContext): Promise<TenantSubscription[]>;
  findSubscriptionById(
    context: PlatformRequestContext,
    subscriptionId: string,
  ): Promise<TenantSubscription | null>;
  assignSubscription(
    context: PlatformRequestContext,
    command: AssignTenantSubscriptionCommand,
  ): Promise<TenantSubscription>;
  updateSubscriptionStatus(
    context: PlatformRequestContext,
    command: UpdateSubscriptionStatusCommand,
  ): Promise<TenantSubscription>;
  listInvoices(context: PlatformRequestContext): Promise<BillingInvoiceSummary[]>;
};

export type SubscriptionBillingServiceDependencies = {
  repository: SubscriptionBillingRepository;
  auditSink: PlatformAuditSink;
};

const restrictedSubscriptionStatuses = ['PAST_DUE', 'UNPAID', 'CANCELLED', 'EXPIRED'] as const;

export class SubscriptionBillingService {
  private readonly repository: SubscriptionBillingRepository;
  private readonly audit: PlatformAuditSink;

  constructor(dependencies: SubscriptionBillingServiceDependencies) {
    this.repository = dependencies.repository;
    this.audit = dependencies.auditSink;
  }

  async listSubscriptions(context: PlatformRequestContext) {
    authorizePlatformPermission(context, 'platform.billing.read');
    const subscriptions = await this.repository.listSubscriptions(context);
    return subscriptions.map((subscription) => ({
      subscription: tenantSubscriptionSchema.parse(subscription),
      restrictsTenantAccess: restrictedSubscriptionStatuses.includes(
        subscription.status as (typeof restrictedSubscriptionStatuses)[number],
      ),
    }));
  }

  async listInvoices(context: PlatformRequestContext) {
    authorizePlatformPermission(context, 'platform.billing.read');
    const invoices = await this.repository.listInvoices(context);
    return invoices.map((invoice) => billingInvoiceSummarySchema.parse(invoice));
  }

  async assignSubscription(context: PlatformRequestContext, command: unknown) {
    authorizePlatformPermission(context, 'platform.billing.manage');
    const parsed = assignTenantSubscriptionCommandSchema.parse(command);
    const assigned = tenantSubscriptionSchema.parse(
      await this.repository.assignSubscription(context, parsed),
    );
    await this.recordSubscriptionAudit(
      context,
      'SUBSCRIPTION_ASSIGNED',
      assigned,
      undefined,
      parsed.reason,
    );
    return assigned;
  }

  async updateSubscriptionStatus(
    context: PlatformRequestContext,
    command: UpdateSubscriptionStatusCommand,
  ) {
    authorizePlatformPermission(context, 'platform.billing.manage');
    const status = tenantSubscriptionStatusSchema.parse(command.status);
    const reason = command.reason.trim();
    if (!command.subscriptionId.trim() || reason.length < 3) {
      throw new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_VALIDATION_ERROR',
        'Subscription status updates require subscription id and reason.',
      );
    }

    const current = await this.repository.findSubscriptionById(context, command.subscriptionId);
    if (!current) {
      throw new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_NOT_FOUND',
        'Subscription was not found.',
      );
    }
    const currentParsed = tenantSubscriptionSchema.parse(current);
    const updated = tenantSubscriptionSchema.parse(
      await this.repository.updateSubscriptionStatus(context, {
        subscriptionId: command.subscriptionId,
        status,
        reason,
      }),
    );
    await this.recordSubscriptionAudit(
      context,
      'SUBSCRIPTION_STATUS_CHANGED',
      updated,
      currentParsed,
      reason,
    );
    return {
      subscription: updated,
      restrictsTenantAccess: restrictedSubscriptionStatuses.includes(
        updated.status as (typeof restrictedSubscriptionStatuses)[number],
      ),
    };
  }

  private async recordSubscriptionAudit(
    context: PlatformRequestContext,
    action: PlatformAuditEntry['action'],
    subscription: TenantSubscription,
    beforeState: TenantSubscription | undefined,
    reason: string,
  ) {
    await this.audit.record(context, {
      action,
      tenantId: subscription.tenantId,
      targetType: 'tenant_subscription',
      targetId: subscription.id,
      result: 'SUCCESS',
      requestId: context.requestId,
      reason,
      metadata: {
        previousStatus: beforeState?.status,
        nextStatus: subscription.status,
        planId: subscription.planId,
        provider: subscription.provider,
      },
    });
  }
}
