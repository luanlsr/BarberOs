import { describe, expect, it } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import {
  buildWorkerOperationsViewModelFromSummary,
  getDevelopmentWorkerOperationsViewModel,
} from './worker-operations-data';

const ownerSession: SessionContext = {
  authState: 'authenticated',
  userId: 'user-owner',
  email: 'owner@barberos.local',
  userName: 'Owner',
  tenantId: 'dev-tenant',
  tenantName: 'Barbearia Modelo',
  membershipId: 'membership-owner',
  role: 'OWNER',
  permissions: ['worker.failures.read'],
  entitlements: ['worker.operations'],
  branchScope: ['dev-branch'],
  activeBranchId: 'dev-branch',
  branchName: 'Unidade Centro',
  availableWorkspaces: [
    {
      tenantId: 'dev-tenant',
      tenantName: 'Barbearia Modelo',
      branchId: 'dev-branch',
      branchName: 'Unidade Centro',
    },
  ],
};

describe('getDevelopmentWorkerOperationsViewModel', () => {
  it('builds worker operations metrics for an authorized owner', () => {
    const model = getDevelopmentWorkerOperationsViewModel(ownerSession);

    expect(model.state).toBe('ready');
    expect(model.canRead).toBe(true);
    expect(model.metrics).toEqual([
      { label: 'Outbox pendente', value: 1, tone: 'neutral' },
      { label: 'Jobs em retry', value: 1, tone: 'warning' },
      { label: 'Dead letters', value: 2, tone: 'danger' },
      { label: 'Notificações com falha', value: 1, tone: 'danger' },
    ]);
    expect(model.jobIssues.map((issue) => issue.status)).toContain('DEAD_LETTERED');
  });

  it('denies users without worker permission or entitlement', () => {
    const noPermission = getDevelopmentWorkerOperationsViewModel({
      ...ownerSession,
      permissions: [],
    });
    const noEntitlement = getDevelopmentWorkerOperationsViewModel({
      ...ownerSession,
      entitlements: [],
    });

    expect(noPermission.state).toBe('permission-denied');
    expect(noEntitlement.state).toBe('permission-denied');
  });

  it('denies branches outside the current scope', () => {
    const model = getDevelopmentWorkerOperationsViewModel(ownerSession, {
      branchId: 'another-branch',
    });

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
  });

  it('supports empty, offline and error states for UI coverage', () => {
    expect(getDevelopmentWorkerOperationsViewModel(ownerSession, { state: 'empty' }).state).toBe(
      'empty',
    );
    expect(getDevelopmentWorkerOperationsViewModel(ownerSession, { state: 'offline' }).state).toBe(
      'offline',
    );
    expect(getDevelopmentWorkerOperationsViewModel(ownerSession, { state: 'error' }).error).toEqual(
      expect.objectContaining({ code: 'WORKER_VALIDATION_ERROR' }),
    );
  });
});

describe('buildWorkerOperationsViewModelFromSummary', () => {
  it('builds branch-scoped models from sanitized failure summaries', () => {
    const model = buildWorkerOperationsViewModelFromSummary(ownerSession, {
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      generatedAt: '2026-09-22T10:00:00.000Z',
      metrics: [],
      outbox: [
        {
          id: 'outbox-1',
          branchId: 'dev-branch',
          eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
          sourceType: 'NOTIFICATION_INTENT',
          sourceId: 'notification-1',
          status: 'DEAD_LETTERED',
          correlationId: 'correlation-1',
          attemptCount: 5,
          availableAt: '2026-09-22T09:30:00.000Z',
          createdAt: '2026-09-22T09:30:00.000Z',
          updatedAt: '2026-09-22T10:20:00.000Z',
        },
      ],
      jobs: [
        {
          id: 'job-1',
          branchId: 'dev-branch',
          type: 'NOTIFICATION_DELIVERY',
          status: 'RETRY_SCHEDULED',
          sourceType: 'NOTIFICATION_INTENT',
          sourceId: 'notification-1',
          correlationId: 'correlation-1',
          priority: 90,
          attemptCount: 2,
          maxAttempts: 5,
          runAt: '2026-09-22T13:30:00.000Z',
          createdAt: '2026-09-22T10:00:00.000Z',
          updatedAt: '2026-09-22T10:35:00.000Z',
        },
      ],
      notifications: [
        {
          id: 'notification-1',
          branchId: 'dev-branch',
          recipientType: 'CUSTOMER',
          recipientId: 'customer-1',
          channel: 'LOCAL',
          templateKey: 'appointment.reminder.v1',
          sourceType: 'APPOINTMENT',
          sourceId: 'appointment-1',
          status: 'FAILED',
          correlationId: 'correlation-1',
          createdAt: '2026-09-22T09:00:00.000Z',
          updatedAt: '2026-09-22T10:15:00.000Z',
        },
      ],
    });

    expect(model.state).toBe('ready');
    expect(model.branchName).toBe('Unidade Centro');
    expect(model.metrics).toEqual([
      { label: 'Outbox pendente', value: 0, tone: 'neutral' },
      { label: 'Jobs em retry', value: 1, tone: 'warning' },
      { label: 'Dead letters', value: 1, tone: 'danger' },
      { label: 'Notificações com falha', value: 1, tone: 'danger' },
    ]);
    expect(JSON.stringify(model)).not.toContain('payload');
  });

  it('returns empty and permission-denied states from summary context', () => {
    const empty = buildWorkerOperationsViewModelFromSummary(ownerSession, {
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      generatedAt: '2026-09-22T10:00:00.000Z',
      metrics: [],
      outbox: [],
      jobs: [],
      notifications: [],
    });
    const denied = buildWorkerOperationsViewModelFromSummary(ownerSession, {
      tenantId: 'dev-tenant',
      branchId: 'another-branch',
      generatedAt: '2026-09-22T10:00:00.000Z',
      metrics: [],
      outbox: [],
      jobs: [],
      notifications: [],
    });

    expect(empty.state).toBe('empty');
    expect(denied.state).toBe('permission-denied');
  });
});
