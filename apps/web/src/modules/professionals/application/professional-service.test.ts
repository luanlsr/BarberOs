import { beforeEach, describe, expect, it } from 'vitest';
import { AuthorizationError } from '@barberos/permissions';
import type {
  CreateProfessionalCommand,
  Professional,
  RequestContext,
  UpdateProfessionalCommand,
} from '@barberos/contracts';

import type { ProfessionalListFilters, ProfessionalRepository } from '../domain';
import { CoreOperationsApplicationError, ProfessionalApplicationService } from './professional-service';

const baseProfessional: Professional = {
  id: 'professional-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  displayName: 'Carlos Andrade',
  email: 'carlos@example.local',
  phone: '+5511999990001',
  roleLabel: 'Barbeiro senior',
  status: 'ACTIVE',
};

const otherTenantProfessional: Professional = {
  ...baseProfessional,
  id: 'professional-tenant-b',
  tenantId: 'tenant-2',
  displayName: 'Profissional de outro tenant',
};

const ownerContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['professionals.read', 'professionals.create', 'professionals.update'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const tenantBContext: RequestContext = {
  ...ownerContext,
  requestId: 'request-tenant-b',
  tenantId: 'tenant-2',
  membershipId: 'membership-tenant-b',
};

class FakeProfessionalRepository implements ProfessionalRepository {
  readonly professionals = new Map<string, Professional>([
    [baseProfessional.id, baseProfessional],
    [otherTenantProfessional.id, otherTenantProfessional],
  ]);
  createdCommand: CreateProfessionalCommand | null = null;
  updatedCommand: UpdateProfessionalCommand | null = null;
  listedFilters: ProfessionalListFilters | null = null;
  archivedId: string | null = null;

  async list(_context: RequestContext, filters: ProfessionalListFilters = {}) {
    this.listedFilters = filters;
    return [...this.professionals.values()];
  }

  async findById(_context: RequestContext, professionalId: string) {
    return this.professionals.get(professionalId) ?? null;
  }

  async create(context: RequestContext, command: CreateProfessionalCommand) {
    this.createdCommand = command;
    const professional: Professional = {
      id: 'professional-created',
      tenantId: context.tenantId,
      branchIds: command.branchIds,
      displayName: command.displayName,
      email: command.email,
      phone: command.phone,
      roleLabel: command.roleLabel ?? 'Profissional',
      avatarUrl: command.avatarUrl,
      status: 'ACTIVE',
    };
    this.professionals.set(professional.id, professional);
    return professional;
  }

  async update(_context: RequestContext, command: UpdateProfessionalCommand) {
    this.updatedCommand = command;
    const current = this.professionals.get(command.id) ?? baseProfessional;
    const professional = { ...current, ...command } satisfies Professional;
    this.professionals.set(professional.id, professional);
    return professional;
  }

  async archive(_context: RequestContext, professionalId: string) {
    this.archivedId = professionalId;
    const current = this.professionals.get(professionalId) ?? baseProfessional;
    const archived = { ...current, status: 'ARCHIVED' as const, archivedAt: '2026-09-05T00:00:00.000Z' };
    this.professionals.set(professionalId, archived);
    return archived;
  }
}

describe('ProfessionalApplicationService', () => {
  let repository: FakeProfessionalRepository;
  let service: ProfessionalApplicationService;

  beforeEach(() => {
    repository = new FakeProfessionalRepository();
    service = new ProfessionalApplicationService(repository);
  });

  it('lists professionals when permission, entitlement and branch scope are allowed', async () => {
    const professionals = await service.list(ownerContext, { branchId: 'branch-1', status: 'ACTIVE' });

    expect(professionals).toHaveLength(1);
    expect(repository.listedFilters).toEqual({ branchId: 'branch-1', status: 'ACTIVE' });
  });

  it('isolates professionals by tenant for reads and writes', async () => {
    const tenantAResults = await service.list(ownerContext, { branchId: 'branch-1' });
    const tenantBResults = await service.list(tenantBContext, { branchId: 'branch-1' });

    expect(tenantAResults.map((professional) => professional.id)).toEqual(['professional-1']);
    expect(tenantBResults.map((professional) => professional.id)).toEqual(['professional-tenant-b']);
    await expect(service.update(tenantBContext, { id: 'professional-1', displayName: 'Tentativa externa' })).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.'),
    );
    expect(repository.updatedCommand).toBeNull();
    await expect(service.archive(tenantBContext, 'professional-1')).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.'),
    );
    expect(repository.archivedId).toBeNull();
  });

  it('creates professionals with validated defaults when authorized', async () => {
    const professional = await service.create(ownerContext, {
      branchIds: ['branch-1'],
      displayName: '  Lucas Pereira  ',
    });

    expect(professional).toMatchObject({
      tenantId: 'tenant-1',
      branchIds: ['branch-1'],
      displayName: 'Lucas Pereira',
      roleLabel: 'Profissional',
      status: 'ACTIVE',
    });
    expect(repository.createdCommand).toMatchObject({ displayName: 'Lucas Pereira' });
  });

  it('denies creation without the required permission', async () => {
    const context = { ...ownerContext, permissions: ['professionals.read'] } satisfies RequestContext;

    await expect(
      service.create(context, { branchIds: ['branch-1'], displayName: 'Lucas Pereira' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('denies creation outside the branch scope', async () => {
    await expect(
      service.create(ownerContext, { branchIds: ['branch-2'], displayName: 'Lucas Pereira' }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('denies listing when the core operations entitlement is missing', async () => {
    const context = { ...ownerContext, entitlements: [] } satisfies RequestContext;

    await expect(service.list(context)).rejects.toMatchObject({ code: 'ENTITLEMENT_DENIED' });
  });

  it('updates existing professionals after checking the existing branch scope', async () => {
    const professional = await service.update(ownerContext, {
      id: 'professional-1',
      displayName: 'Carlos A.',
    });

    expect(professional.displayName).toBe('Carlos A.');
    expect(repository.updatedCommand).toMatchObject({ id: 'professional-1', displayName: 'Carlos A.' });
  });

  it('archives only professionals in authorized branches', async () => {
    const professional = await service.archive(ownerContext, 'professional-1');

    expect(professional.status).toBe('ARCHIVED');
    expect(repository.archivedId).toBe('professional-1');
  });

  it('returns a stable not found error before archiving unknown professionals', async () => {
    await expect(service.archive(ownerContext, 'missing-professional')).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.'),
    );
  });
});
