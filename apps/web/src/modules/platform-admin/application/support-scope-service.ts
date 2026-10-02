import {
  createSupportScopeCommandSchema,
  supportScopeSchema,
  type CreateSupportScopeCommand,
  type SupportOperationClass,
  type SupportScope,
} from '@barberos/contracts';

import type { PlatformAuditSink, PlatformRequestContext } from '../domain';
import { assertSupportScope } from './platform-authorization';
import { authorizePlatformPermission } from './platform-authorization';

export type SupportScopeRepository = {
  listSupportScopes(context: PlatformRequestContext, tenantId?: string): Promise<SupportScope[]>;
  createSupportScope(
    context: PlatformRequestContext,
    command: CreateSupportScopeCommand,
  ): Promise<SupportScope>;
  findActiveScope(
    context: PlatformRequestContext,
    input: {
      tenantId: string;
      actorUserId: string;
      operationClass: SupportOperationClass;
    },
  ): Promise<SupportScope | null>;
};

export type SupportScopeServiceDependencies = {
  repository: SupportScopeRepository;
  auditSink: PlatformAuditSink;
  now?: () => Date;
};

export class SupportScopeService {
  private readonly repository: SupportScopeRepository;
  private readonly audit: PlatformAuditSink;
  private readonly now: () => Date;

  constructor(dependencies: SupportScopeServiceDependencies) {
    this.repository = dependencies.repository;
    this.audit = dependencies.auditSink;
    this.now = dependencies.now ?? (() => new Date());
  }

  async listSupportScopes(context: PlatformRequestContext, tenantId?: string) {
    authorizePlatformPermission(context, 'platform.support.manage');
    const scopes = await this.repository.listSupportScopes(context, tenantId);
    return scopes.map((scope) => supportScopeSchema.parse(scope));
  }

  async createSupportScope(context: PlatformRequestContext, command: unknown) {
    authorizePlatformPermission(context, 'platform.support.manage');
    const parsed = createSupportScopeCommandSchema.parse(command);
    const created = supportScopeSchema.parse(
      await this.repository.createSupportScope(context, parsed),
    );
    await this.audit.record(context, {
      action: 'SUPPORT_SCOPE_CREATED',
      tenantId: created.tenantId,
      targetType: 'support_scope',
      targetId: created.id,
      result: 'SUCCESS',
      requestId: context.requestId,
      reason: created.purpose,
      metadata: {
        operationClass: created.operationClass,
        actorUserId: created.actorUserId,
        expiresAt: created.expiresAt,
      },
    });
    return created;
  }

  async assertScopeForOperation(
    context: PlatformRequestContext,
    input: {
      tenantId: string;
      actorUserId: string;
      operationClass: SupportOperationClass;
    },
  ) {
    authorizePlatformPermission(context, 'platform.support.manage');
    const scope = await this.repository.findActiveScope(context, input);
    try {
      assertSupportScope(scope, {
        tenantId: input.tenantId,
        operationClass: input.operationClass,
        now: this.now(),
      });
    } catch (error) {
      await this.audit.record(context, {
        action: 'SUPPORT_SCOPE_DENIED',
        tenantId: input.tenantId,
        targetType: 'support_scope',
        targetId: scope?.id,
        result: 'DENIED',
        requestId: context.requestId,
        reason: 'Missing, expired or insufficient support scope.',
        metadata: {
          requestedOperationClass: input.operationClass,
          actorUserId: input.actorUserId,
          scopeStatus: scope?.status,
          scopeOperationClass: scope?.operationClass,
          expiresAt: scope?.expiresAt,
        },
      });
      throw error;
    }
    return supportScopeSchema.parse(scope);
  }
}
