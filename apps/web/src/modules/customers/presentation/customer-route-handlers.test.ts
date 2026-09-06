import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/customer-service';
import { createCustomerRouteHandlers, type CustomerRouteService } from './customer-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['customers.read', 'customers.create', 'customers.update'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const customer: Customer = {
  id: 'customer-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  name: 'Joao Silva',
  phone: '+5511999999999',
  consents: { whatsapp: true, marketing: false },
  status: 'ACTIVE',
};

type MockService = CustomerRouteService & {
  search: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  archive: ReturnType<typeof vi.fn>;
};

describe('customer route handlers', () => {
  let customers: MockService;
  let handlers: ReturnType<typeof createCustomerRouteHandlers>;

  beforeEach(() => {
    customers = {
      search: vi.fn(async () => [customer]),
      create: vi.fn(async () => customer),
      update: vi.fn(async () => ({ ...customer, name: 'Joao Atualizado' })),
      archive: vi.fn(async () => ({ ...customer, status: 'ARCHIVED' as const })),
    };
    handlers = createCustomerRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service: customers,
    });
  });

  it('searches customers with branch, text and phone filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/customers?branchId=branch-1&search=Joao&phone=9999',
        {
          headers: { 'x-request-id': 'request-1' },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [customer], requestId: 'request-1' });
    expect(customers.search).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      query: 'Joao',
      phone: '9999',
    });
  });

  it('creates customers and returns 201', async () => {
    const body = { branchId: 'branch-1', name: 'Joao Silva', phone: '+5511999999999' };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/customers', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: customer, requestId: 'request-1' });
    expect(customers.create).toHaveBeenCalledWith(context, body);
  });

  it('updates customers through the application service', async () => {
    const body = { id: 'customer-1', name: 'Joao Atualizado' };

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/customers', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...customer, name: 'Joao Atualizado' },
      requestId: 'request-1',
    });
    expect(customers.update).toHaveBeenCalledWith(context, body);
  });

  it('maps cross-tenant write denial to not found without leaking identifiers', async () => {
    customers.update.mockRejectedValueOnce(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Customer was not found.'),
    );

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/customers', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ id: 'customer-from-tenant-2', name: 'Protegido' }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_NOT_FOUND',
        message: 'Customer was not found.',
        requestId: 'request-1',
      },
    });
  });

  it('archives customers by id', async () => {
    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/customers?id=customer-1', {
        method: 'DELETE',
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...customer, status: 'ARCHIVED' as const },
      requestId: 'request-1',
    });
    expect(customers.archive).toHaveBeenCalledWith(context, 'customer-1');
  });
});
