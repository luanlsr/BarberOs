import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateServiceCommand, RequestContext, Service, UpdateServiceCommand } from '@barberos/contracts';

import type { AssignServiceProfessionalCommand, ServiceListFilters, ServiceRepository } from '../domain';
import { CoreOperationsApplicationError, ServiceApplicationService } from './service-service';

const activeService: Service = {
  id: 'service-1',
  tenantId: 'tenant-1',
  category: 'Cabelo',
  name: 'Corte Masculino',
  description: 'Corte na tesoura ou maquina.',
  durationMinutes: 40,
  priceCents: 5000,
  status: 'ACTIVE',
  enabledProfessionalIds: ['professional-1'],
};

const archivedService: Service = {
  ...activeService,
  id: 'service-archived',
  name: 'Barba antiga',
  status: 'ARCHIVED',
  archivedAt: '2026-09-05T00:00:00.000Z',
};

const managerContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['services.read', 'services.create', 'services.update'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

class FakeServiceRepository implements ServiceRepository {
  readonly services = new Map<string, Service>([
    [activeService.id, activeService],
    [archivedService.id, archivedService],
  ]);
  createdCommand: CreateServiceCommand | null = null;
  updatedCommand: UpdateServiceCommand | null = null;
  listedFilters: ServiceListFilters | null = null;
  archivedId: string | null = null;
  assignedCommand: AssignServiceProfessionalCommand | null = null;

  async list(_context: RequestContext, filters: ServiceListFilters = {}) {
    this.listedFilters = filters;
    return [...this.services.values()];
  }

  async findById(_context: RequestContext, serviceId: string) {
    return this.services.get(serviceId) ?? null;
  }

  async create(context: RequestContext, command: CreateServiceCommand) {
    this.createdCommand = command;
    const service: Service = {
      id: 'service-created',
      tenantId: context.tenantId,
      category: command.category,
      name: command.name,
      description: command.description,
      durationMinutes: command.durationMinutes,
      priceCents: command.priceCents,
      estimatedCostCents: command.estimatedCostCents,
      status: 'ACTIVE',
      enabledProfessionalIds: command.enabledProfessionalIds ?? [],
    };
    this.services.set(service.id, service);
    return service;
  }

  async update(_context: RequestContext, command: UpdateServiceCommand) {
    this.updatedCommand = command;
    const current = this.services.get(command.id) ?? activeService;
    const service = { ...current, ...command } satisfies Service;
    this.services.set(service.id, service);
    return service;
  }

  async archive(_context: RequestContext, serviceId: string) {
    this.archivedId = serviceId;
    const current = this.services.get(serviceId) ?? activeService;
    const archived = { ...current, status: 'ARCHIVED' as const, archivedAt: '2026-09-05T00:00:00.000Z' };
    this.services.set(serviceId, archived);
    return archived;
  }

  async assignProfessional(_context: RequestContext, command: AssignServiceProfessionalCommand) {
    this.assignedCommand = command;
  }
}

describe('ServiceApplicationService', () => {
  let repository: FakeServiceRepository;
  let service: ServiceApplicationService;

  beforeEach(() => {
    repository = new FakeServiceRepository();
    service = new ServiceApplicationService(repository);
  });

  it('lists services when permission and entitlement are allowed', async () => {
    const services = await service.list(managerContext, { status: 'ACTIVE', query: 'corte' });

    expect(services).toHaveLength(2);
    expect(repository.listedFilters).toEqual({ status: 'ACTIVE', query: 'corte' });
  });

  it('creates services with parsed defaults when authorized', async () => {
    const created = await service.create(managerContext, {
      category: 'Cabelo',
      name: 'Corte Navalhado',
      durationMinutes: 45,
      priceCents: 6500,
    });

    expect(created).toMatchObject({
      tenantId: 'tenant-1',
      name: 'Corte Navalhado',
      status: 'ACTIVE',
      enabledProfessionalIds: [],
    });
  });

  it('rejects invalid service duration and price', async () => {
    await expect(
      service.create(managerContext, { category: 'Cabelo', name: 'Curto', durationMinutes: 4, priceCents: 5000 }),
    ).rejects.toThrow();
    await expect(
      service.create(managerContext, { category: 'Cabelo', name: 'Curto', durationMinutes: 40, priceCents: -1 }),
    ).rejects.toThrow();
  });

  it('denies creation without the required permission', async () => {
    const context = { ...managerContext, permissions: ['services.read'] } satisfies RequestContext;

    await expect(
      service.create(context, { category: 'Cabelo', name: 'Corte', durationMinutes: 40, priceCents: 5000 }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('updates active services', async () => {
    const updated = await service.update(managerContext, { id: 'service-1', priceCents: 5500 });

    expect(updated.priceCents).toBe(5500);
    expect(repository.updatedCommand).toEqual({ id: 'service-1', priceCents: 5500 });
  });

  it('does not update archived services', async () => {
    await expect(service.update(managerContext, { id: 'service-archived', priceCents: 5500 })).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Archived services cannot be changed.'),
    );
  });

  it('archives active services and treats already archived services as idempotent', async () => {
    const archived = await service.archive(managerContext, 'service-1');
    const alreadyArchived = await service.archive(managerContext, 'service-archived');

    expect(archived.status).toBe('ARCHIVED');
    expect(alreadyArchived).toEqual(archivedService);
    expect(repository.archivedId).toBe('service-1');
  });

  it('assigns professionals only when override price and duration are valid', async () => {
    await service.assignProfessional(managerContext, {
      serviceId: 'service-1',
      professionalId: 'professional-1',
      priceCents: 6000,
      durationMinutes: 45,
    });

    expect(repository.assignedCommand).toEqual({
      serviceId: 'service-1',
      professionalId: 'professional-1',
      priceCents: 6000,
      durationMinutes: 45,
    });
    await expect(
      service.assignProfessional(managerContext, { serviceId: 'service-1', professionalId: 'professional-1', priceCents: -1 }),
    ).rejects.toMatchObject({ code: 'CORE_VALIDATION_ERROR' });
    await expect(
      service.assignProfessional(managerContext, { serviceId: 'service-1', professionalId: 'professional-1', durationMinutes: 4 }),
    ).rejects.toMatchObject({ code: 'CORE_VALIDATION_ERROR' });
  });
});