import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext, Service } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/service-service';
import { createServiceRouteHandlers, type ServiceRouteService } from './service-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['services.read', 'services.create', 'services.update'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const serviceRecord: Service = {
  id: 'service-1',
  tenantId: 'tenant-1',
  category: 'Cabelo',
  name: 'Corte Masculino',
  durationMinutes: 30,
  priceCents: 5000,
  status: 'ACTIVE',
  enabledProfessionalIds: ['professional-1'],
};

type MockService = ServiceRouteService & {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  archive: ReturnType<typeof vi.fn>;
};

describe('service route handlers', () => {
  let services: MockService;
  let handlers: ReturnType<typeof createServiceRouteHandlers>;

  beforeEach(() => {
    services = {
      list: vi.fn(async () => [serviceRecord]),
      create: vi.fn(async () => serviceRecord),
      update: vi.fn(async () => ({ ...serviceRecord, priceCents: 5500 })),
      archive: vi.fn(async () => ({ ...serviceRecord, status: 'ARCHIVED' as const })),
    };
    handlers = createServiceRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service: services,
    });
  });

  it('lists services with category, professional and search filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/services?category=Cabelo&professionalId=professional-1&search=Corte',
        {
          headers: { 'x-request-id': 'request-1' },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [serviceRecord], requestId: 'request-1' });
    expect(services.list).toHaveBeenCalledWith(context, {
      category: 'Cabelo',
      professionalId: 'professional-1',
      query: 'Corte',
    });
  });

  it('creates services and returns 201', async () => {
    const body = {
      category: 'Cabelo',
      name: 'Corte Masculino',
      durationMinutes: 30,
      priceCents: 5000,
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/services', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: serviceRecord, requestId: 'request-1' });
    expect(services.create).toHaveBeenCalledWith(context, body);
  });

  it('maps validation failures to stable API errors', async () => {
    services.create.mockRejectedValueOnce(
      new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Price must be zero or greater.'),
    );

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/services', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({
          category: 'Cabelo',
          name: 'Corte Masculino',
          durationMinutes: 30,
          priceCents: -1,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_VALIDATION_ERROR',
        message: 'Price must be zero or greater.',
        requestId: 'request-1',
      },
    });
  });

  it('updates services through the application service', async () => {
    const body = { id: 'service-1', priceCents: 5500 };

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/services', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...serviceRecord, priceCents: 5500 },
      requestId: 'request-1',
    });
    expect(services.update).toHaveBeenCalledWith(context, body);
  });

  it('archives services by id', async () => {
    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/services?id=service-1', {
        method: 'DELETE',
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...serviceRecord, status: 'ARCHIVED' as const },
      requestId: 'request-1',
    });
    expect(services.archive).toHaveBeenCalledWith(context, 'service-1');
  });

  it('returns stable error model for permission denied responses', async () => {
    services.update.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'CORE_PERMISSION_DENIED',
        'Missing services.update permission.',
      ),
    );

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/services', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ id: 'service-1', priceCents: 5500 }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_PERMISSION_DENIED',
        message: 'Permission denied.',
        requestId: 'request-1',
      },
    });
  });
});
