import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@barberos/contracts';

import {
  DevCustomerRepository,
  DevProfessionalRepository,
  DevServiceRepository,
} from './dev-directory-repositories';

const context = {
  requestId: 'test-request',
  userId: 'user-owner',
  tenantId: 'dev-tenant',
  membershipId: 'membership-owner',
  role: 'OWNER',
  permissions: [
    'customers.read',
    'customers.create',
    'professionals.read',
    'professionals.create',
    'services.read',
    'services.create',
  ],
  entitlements: ['core.operations'],
  branchScope: ['dev-branch'],
} satisfies RequestContext;

describe('dev directory repositories', () => {
  it('serves customers scoped by tenant and branch without configured persistence', async () => {
    const repository = new DevCustomerRepository();

    const customers = await repository.search(context, { branchId: 'dev-branch' });

    expect(customers.map((customer) => customer.name)).toContain('Marcos Vinicius');
    expect(customers.every((customer) => customer.tenantId === context.tenantId)).toBe(true);
  });

  it('creates professionals in the active development tenant', async () => {
    const repository = new DevProfessionalRepository();

    const professional = await repository.create(context, {
      branchIds: ['dev-branch'],
      displayName: 'Nova Pessoa',
      roleLabel: 'Barbeiro',
    });

    expect(professional.tenantId).toBe(context.tenantId);
    expect(professional.branchIds).toEqual(['dev-branch']);
    await expect(repository.findById(context, professional.id)).resolves.toMatchObject({
      displayName: 'Nova Pessoa',
    });
  });

  it('filters services by professional assignment', async () => {
    const repository = new DevServiceRepository();

    const services = await repository.list(context, { professionalId: 'professional-rafael' });

    expect(services.length).toBeGreaterThan(0);
    expect(
      services.every((service) => service.enabledProfessionalIds.includes('professional-rafael')),
    ).toBe(true);
  });
});
