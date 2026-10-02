import {
  platformTenantSummarySchema,
  tenantLifecycleActionCommandSchema,
  type PlatformAuditEntry,
  type PlatformTenantLifecycleStatus,
  type PlatformTenantSummary,
  type TenantLifecycleActionCommand,
} from '@barberos/contracts';

import type { PlatformAuditSink, PlatformRequestContext } from '../domain';
import { PlatformAdminApplicationError } from './platform-admin-errors';
import { authorizePlatformPermission } from './platform-authorization';

export type TenantLifecycleRepository = {
  findTenantById(
    context: PlatformRequestContext,
    tenantId: string,
  ): Promise<PlatformTenantSummary | null>;
  updateTenantLifecycle(
    context: PlatformRequestContext,
    input: {
      tenantId: string;
      nextStatus: PlatformTenantLifecycleStatus;
      reason: string;
    },
  ): Promise<PlatformTenantSummary>;
};

export type TenantLifecycleServiceDependencies = {
  repository: TenantLifecycleRepository;
  auditSink: PlatformAuditSink;
};

const lifecycleAuditAction: Record<
  TenantLifecycleActionCommand['action'],
  PlatformAuditEntry['action']
> = {
  SUSPEND: 'TENANT_SUSPENDED',
  RESTRICT: 'TENANT_RESTRICTED',
  REACTIVATE: 'TENANT_REACTIVATED',
};

export class TenantLifecycleService {
  private readonly repository: TenantLifecycleRepository;
  private readonly audit: PlatformAuditSink;

  constructor(dependencies: TenantLifecycleServiceDependencies) {
    this.repository = dependencies.repository;
    this.audit = dependencies.auditSink;
  }

  async applyLifecycleAction(context: PlatformRequestContext, command: unknown) {
    authorizePlatformPermission(context, 'platform.tenants.manage');
    const parsed = tenantLifecycleActionCommandSchema.parse(command);
    const current = await this.repository.findTenantById(context, parsed.tenantId);
    if (!current) {
      throw new PlatformAdminApplicationError('PLATFORM_ADMIN_NOT_FOUND', 'Tenant was not found.');
    }

    const nextStatus = resolveNextLifecycleStatus(current, parsed);
    const updated = platformTenantSummarySchema.parse(
      await this.repository.updateTenantLifecycle(context, {
        tenantId: parsed.tenantId,
        nextStatus,
        reason: parsed.reason,
      }),
    );
    if (updated.tenantId !== current.tenantId || updated.lifecycleStatus !== nextStatus) {
      throw new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_INVALID_STATUS',
        'Tenant lifecycle update returned an unexpected result.',
      );
    }

    await this.audit.record(context, {
      action: lifecycleAuditAction[parsed.action],
      tenantId: current.tenantId,
      targetType: 'tenant',
      targetId: current.tenantId,
      result: 'SUCCESS',
      requestId: parsed.requestId ?? context.requestId,
      reason: parsed.reason,
      metadata: {
        previousStatus: current.lifecycleStatus,
        nextStatus: updated.lifecycleStatus,
        subscriptionStatus: current.subscriptionStatus,
      },
    });

    return updated;
  }
}

function resolveNextLifecycleStatus(
  current: PlatformTenantSummary,
  command: TenantLifecycleActionCommand,
): PlatformTenantLifecycleStatus {
  if (current.lifecycleStatus === 'CANCELLED') {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_INVALID_STATUS',
      'Cancelled tenants cannot be changed by lifecycle actions.',
    );
  }

  switch (command.action) {
    case 'SUSPEND':
      return 'SUSPENDED';
    case 'RESTRICT':
      return 'RESTRICTED';
    case 'REACTIVATE':
      if (current.lifecycleStatus !== 'SUSPENDED' && current.lifecycleStatus !== 'RESTRICTED') {
        throw new PlatformAdminApplicationError(
          'PLATFORM_ADMIN_INVALID_STATUS',
          'Only suspended or restricted tenants can be reactivated.',
        );
      }
      return current.subscriptionStatus === 'TRIALING' ? 'TRIALING' : 'ACTIVE';
  }
}
