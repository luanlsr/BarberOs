import { describe, expect, it, vi } from 'vitest';
import type { SupportScope } from '@barberos/contracts';

import { SupportScopeService, type SupportScopeRepository } from './support-scope-service';
import type { PlatformAuditSink, PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.support.manage'],
};

function scope(overrides: Partial<SupportScope> = {}): SupportScope {
  return {
    id: 'scope-a',
    tenantId: 'tenant-a',
    actorUserId: 'support-user-a',
    purpose: 'Investigar invoice vencida.',
    operationClass: 'BILLING_SUPPORT',
    status: 'ACTIVE',
    expiresAt: '2026-10-01T13:00:00.000Z',
    createdAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function setup(activeScope: SupportScope | null = scope()) {
  const scopes = activeScope ? [activeScope] : [];
  const repository: SupportScopeRepository = {
    async listSupportScopes(_context, tenantId) {
      return tenantId ? scopes.filter((item) => item.tenantId === tenantId) : scopes;
    },
    async createSupportScope(_context, command) {
      const created = scope({
        id: 'scope-created',
        tenantId: command.tenantId,
        actorUserId: command.actorUserId,
        purpose: command.purpose,
        operationClass: command.operationClass,
        expiresAt: command.expiresAt,
      });
      scopes.push(created);
      return created;
    },
    async findActiveScope(_context, input) {
      return (
        scopes.find(
          (item) =>
            item.tenantId === input.tenantId &&
            item.actorUserId === input.actorUserId &&
            item.status === 'ACTIVE',
        ) ?? null
      );
    },
  };
  const audit: PlatformAuditSink = {
    record: vi.fn(async () => undefined),
  };
  const service = new SupportScopeService({
    repository,
    auditSink: audit,
    now: () => new Date('2026-10-01T12:00:00.000Z'),
  });

  return { service, audit };
}

describe('SupportScopeService', () => {
  it('creates support scopes with purpose, expiration, operation class and audit', async () => {
    const { service, audit } = setup(null);

    const created = await service.createSupportScope(platformContext, {
      tenantId: 'tenant-a',
      actorUserId: 'support-user-a',
      purpose: 'Investigar falha de cobrança.',
      operationClass: 'BILLING_SUPPORT',
      expiresAt: '2099-10-01T13:00:00.000Z',
    });

    expect(created.operationClass).toBe('BILLING_SUPPORT');
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'SUPPORT_SCOPE_CREATED',
        tenantId: 'tenant-a',
        targetType: 'support_scope',
        result: 'SUCCESS',
        reason: 'Investigar falha de cobrança.',
      }),
    );
  });

  it('allows operations covered by an active support scope', async () => {
    const { service } = setup(scope({ operationClass: 'BILLING_SUPPORT' }));

    const activeScope = await service.assertScopeForOperation(platformContext, {
      tenantId: 'tenant-a',
      actorUserId: 'support-user-a',
      operationClass: 'TENANT_HEALTH',
    });

    expect(activeScope.id).toBe('scope-a');
  });

  it('denies missing support scopes and records denied audit', async () => {
    const { service, audit } = setup(null);

    await expect(
      service.assertScopeForOperation(platformContext, {
        tenantId: 'tenant-a',
        actorUserId: 'support-user-a',
        operationClass: 'TENANT_HEALTH',
      }),
    ).rejects.toMatchObject({ code: 'SUPPORT_SCOPE_REQUIRED' });
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'SUPPORT_SCOPE_DENIED',
        result: 'DENIED',
        tenantId: 'tenant-a',
      }),
    );
  });

  it('denies expired or insufficient support scopes', async () => {
    const expired = setup(scope({ expiresAt: '2026-10-01T11:59:00.000Z' }));
    await expect(
      expired.service.assertScopeForOperation(platformContext, {
        tenantId: 'tenant-a',
        actorUserId: 'support-user-a',
        operationClass: 'TENANT_HEALTH',
      }),
    ).rejects.toMatchObject({ code: 'SUPPORT_SCOPE_REQUIRED' });

    const insufficient = setup(scope({ operationClass: 'TENANT_HEALTH' }));
    await expect(
      insufficient.service.assertScopeForOperation(platformContext, {
        tenantId: 'tenant-a',
        actorUserId: 'support-user-a',
        operationClass: 'PRIVATE_OPERATIONAL_READ',
      }),
    ).rejects.toMatchObject({ code: 'SUPPORT_SCOPE_REQUIRED' });
  });
});
