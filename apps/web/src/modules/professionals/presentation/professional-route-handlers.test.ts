import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Professional, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/professional-service';
import { createProfessionalRouteHandlers, type ProfessionalRouteService } from './professional-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['professionals.read', 'professionals.create', 'professionals.update'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const professional: Professional = {
  id: 'professional-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  displayName: 'Carlos Andrade',
  roleLabel: 'Barbeiro',
  status: 'ACTIVE',
};

type MockService = ProfessionalRouteService & {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  archive: ReturnType<typeof vi.fn>;
};

describe('professional route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createProfessionalRouteHandlers>;

  beforeEach(() => {
    service = {
      list: vi.fn(async () => [professional]),
      create: vi.fn(async () => professional),
      update: vi.fn(async () => ({ ...professional, displayName: 'Carlos Atualizado' })),
      archive: vi.fn(async () => ({ ...professional, status: 'ARCHIVED' as const })),
    };
    handlers = createProfessionalRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists professionals with branch and search filters', async () => {
    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/professionals?branchId=branch-1&search=Carlos', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [professional], requestId: 'request-1' });
    expect(service.list).toHaveBeenCalledWith(context, { branchId: 'branch-1', query: 'Carlos' });
  });

  it('creates professionals and returns 201', async () => {
    const body = { branchIds: ['branch-1'], displayName: 'Carlos Andrade', roleLabel: 'Barbeiro' };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/professionals', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: professional, requestId: 'request-1' });
    expect(service.create).toHaveBeenCalledWith(context, body);
  });

  it('updates professionals through the application service', async () => {
    const body = { id: 'professional-1', displayName: 'Carlos Atualizado' };

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/professionals', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ...professional, displayName: 'Carlos Atualizado' }, requestId: 'request-1' });
    expect(service.update).toHaveBeenCalledWith(context, body);
  });

  it('archives professionals by id', async () => {
    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/professionals?id=professional-1', {
        method: 'DELETE',
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ...professional, status: 'ARCHIVED' as const }, requestId: 'request-1' });
    expect(service.archive).toHaveBeenCalledWith(context, 'professional-1');
  });

  it('returns stable error model for authorization failures', async () => {
    service.archive.mockRejectedValueOnce(
      new CoreOperationsApplicationError('CORE_PERMISSION_DENIED', 'Missing professionals.update permission.'),
    );

    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/professionals?id=professional-1', {
        method: 'DELETE',
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_PERMISSION_DENIED',
        message: 'Missing professionals.update permission.',
        requestId: 'request-1',
      },
    });
  });

  it('returns unauthenticated when context cannot be resolved', async () => {
    handlers = createProfessionalRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/professionals', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        requestId: 'request-1',
      },
    });
  });
});