import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CreateCustomerCommand,
  Customer,
  RequestContext,
  UpdateCustomerCommand,
} from '@barberos/contracts';

import type {
  CustomerListFilters,
  CustomerProfessionalLookup,
  CustomerRepository,
  PreferredProfessionalSnapshot,
} from '../domain';
import { CoreOperationsApplicationError, CustomerApplicationService } from './customer-service';

const tenantCustomer: Customer = {
  id: 'customer-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  name: 'Joao Silva',
  phone: '+5511988880001',
  email: 'joao@example.local',
  preferredProfessionalId: 'professional-1',
  consents: { whatsapp: true, marketing: false },
  status: 'ACTIVE',
};

const otherTenantCustomer: Customer = {
  ...tenantCustomer,
  id: 'customer-other-tenant',
  tenantId: 'tenant-2',
  branchId: 'branch-2',
  name: 'Cliente de outro tenant',
};

const receptionistContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['customers.read', 'customers.create', 'customers.update'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const tenantBContext: RequestContext = {
  ...receptionistContext,
  requestId: 'request-tenant-b',
  tenantId: 'tenant-2',
  branchScope: ['branch-2'],
};

const activeProfessional: PreferredProfessionalSnapshot = {
  id: 'professional-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  status: 'ACTIVE',
};

class FakeCustomerRepository implements CustomerRepository {
  readonly customers = new Map<string, Customer>([
    [tenantCustomer.id, tenantCustomer],
    [otherTenantCustomer.id, otherTenantCustomer],
  ]);
  createdCommand: CreateCustomerCommand | null = null;
  updatedCommand: UpdateCustomerCommand | null = null;
  listedFilters: CustomerListFilters | null = null;
  archivedId: string | null = null;

  async search(_context: RequestContext, filters: CustomerListFilters = {}) {
    this.listedFilters = filters;
    return [...this.customers.values()];
  }

  async findById(_context: RequestContext, customerId: string) {
    return this.customers.get(customerId) ?? null;
  }

  async create(context: RequestContext, command: CreateCustomerCommand) {
    this.createdCommand = command;
    const customer: Customer = {
      id: 'customer-created',
      tenantId: context.tenantId,
      branchId: command.branchId,
      name: command.name,
      phone: command.phone,
      email: command.email,
      birthDate: command.birthDate,
      notes: command.notes,
      source: command.source,
      preferredProfessionalId: command.preferredProfessionalId,
      consents: {
        whatsapp: command.consents?.whatsapp ?? false,
        marketing: command.consents?.marketing ?? false,
      },
      status: 'NEW',
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async update(_context: RequestContext, command: UpdateCustomerCommand) {
    this.updatedCommand = command;
    const current = this.customers.get(command.id) ?? tenantCustomer;
    const customer = {
      ...current,
      ...command,
      consents: { ...current.consents, ...command.consents },
    } satisfies Customer;
    this.customers.set(customer.id, customer);
    return customer;
  }

  async archive(_context: RequestContext, customerId: string) {
    this.archivedId = customerId;
    const current = this.customers.get(customerId) ?? tenantCustomer;
    const archived = {
      ...current,
      status: 'ARCHIVED' as const,
      archivedAt: '2026-09-05T00:00:00.000Z',
    };
    this.customers.set(customerId, archived);
    return archived;
  }
}

class FakeCustomerProfessionalLookup implements CustomerProfessionalLookup {
  readonly professionals = new Map<string, PreferredProfessionalSnapshot>([
    [activeProfessional.id, activeProfessional],
  ]);

  async findProfessionalById(_context: RequestContext, professionalId: string) {
    return this.professionals.get(professionalId) ?? null;
  }
}

describe('CustomerApplicationService', () => {
  let customers: FakeCustomerRepository;
  let professionals: FakeCustomerProfessionalLookup;
  let service: CustomerApplicationService;

  beforeEach(() => {
    customers = new FakeCustomerRepository();
    professionals = new FakeCustomerProfessionalLookup();
    service = new CustomerApplicationService(customers, professionals);
  });

  it('searches customers with permission, entitlement and branch scope', async () => {
    const results = await service.search(receptionistContext, {
      branchId: 'branch-1',
      query: 'joao',
    });

    expect(results).toEqual([tenantCustomer]);
    expect(customers.listedFilters).toEqual({ branchId: 'branch-1', query: 'joao' });
  });

  it('creates customers with default consents after validating preferred professional', async () => {
    const created = await service.create(receptionistContext, {
      branchId: 'branch-1',
      name: 'Pedro Souza',
      phone: '+5511988880002',
      preferredProfessionalId: 'professional-1',
    });

    expect(created).toMatchObject({
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      name: 'Pedro Souza',
      consents: { whatsapp: false, marketing: false },
      status: 'NEW',
    });
  });

  it('denies creation without customer permission', async () => {
    const context = {
      ...receptionistContext,
      permissions: ['customers.read'],
    } satisfies RequestContext;

    await expect(
      service.create(context, {
        branchId: 'branch-1',
        name: 'Pedro Souza',
        phone: '+5511988880002',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('denies writes outside branch scope', async () => {
    await expect(
      service.create(receptionistContext, {
        branchId: 'branch-2',
        name: 'Pedro Souza',
        phone: '+5511988880002',
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
  });

  it('rejects preferred professionals from another customer branch', async () => {
    professionals.professionals.set('professional-2', {
      id: 'professional-2',
      tenantId: 'tenant-1',
      branchIds: ['branch-2'],
      status: 'ACTIVE',
    });

    await expect(
      service.create(receptionistContext, {
        branchId: 'branch-1',
        name: 'Pedro Souza',
        phone: '+5511988880002',
        preferredProfessionalId: 'professional-2',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CORE_BRANCH_SCOPE_DENIED',
        'Preferred professional is outside the customer branch.',
      ),
    );
  });

  it('updates visible tenant customers only', async () => {
    const updated = await service.update(receptionistContext, {
      id: 'customer-1',
      notes: 'Prefere horario da tarde',
    });

    expect(updated.notes).toBe('Prefere horario da tarde');
    expect(customers.updatedCommand).toEqual({
      id: 'customer-1',
      notes: 'Prefere horario da tarde',
    });
    await expect(
      service.update(tenantBContext, { id: 'customer-1', notes: 'tentativa externa' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Customer was not found.'),
    );
  });

  it('does not leak cross-tenant customers from repository results', async () => {
    const tenantAResults = await service.search(receptionistContext);
    const tenantBResults = await service.search(tenantBContext);

    expect(tenantAResults.map((customer) => customer.id)).toEqual(['customer-1']);
    expect(tenantBResults.map((customer) => customer.id)).toEqual(['customer-other-tenant']);
  });

  it('archives customers only after tenant and branch visibility checks', async () => {
    const archived = await service.archive(receptionistContext, 'customer-1');

    expect(archived.status).toBe('ARCHIVED');
    expect(customers.archivedId).toBe('customer-1');
    await expect(service.archive(tenantBContext, 'customer-1')).rejects.toMatchObject({
      code: 'CORE_NOT_FOUND',
    });
  });
});
