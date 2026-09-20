import type {
  CreateCustomerCommand,
  CreateProfessionalCommand,
  CreateServiceCommand,
  Customer,
  Professional,
  RequestContext,
  Service,
  UpdateCustomerCommand,
  UpdateProfessionalCommand,
  UpdateServiceCommand,
} from '@barberos/contracts';

import type { CustomerListFilters, CustomerRepository } from '../../customers/domain';
import type { ProfessionalListFilters, ProfessionalRepository } from '../../professionals/domain';
import type {
  AssignServiceProfessionalCommand,
  ServiceListFilters,
  ServiceRepository,
} from '../../services/domain';

const nowIso = () => new Date().toISOString();

const customers = new Map<string, Customer>([
  [
    'customer-marcos',
    {
      id: 'customer-marcos',
      tenantId: 'tenant-barbearia-centro',
      branchId: 'branch-centro',
      name: 'Marcos Vinicius',
      phone: '(11) 98800-1100',
      source: 'WhatsApp',
      preferredProfessionalId: 'professional-carlos',
      consents: { whatsapp: true, marketing: false },
      status: 'ACTIVE',
    },
  ],
  [
    'customer-rafael',
    {
      id: 'customer-rafael',
      tenantId: 'tenant-barbearia-centro',
      branchId: 'branch-centro',
      name: 'Rafael Alves',
      phone: '(11) 97700-2211',
      source: 'Recepcao',
      consents: { whatsapp: false, marketing: false },
      status: 'AT_RISK',
    },
  ],
  [
    'customer-bruno',
    {
      id: 'customer-bruno',
      tenantId: 'tenant-barbearia-centro',
      branchId: 'branch-centro',
      name: 'Bruno Martins',
      phone: '(11) 96600-3322',
      source: 'Recepcao',
      consents: { whatsapp: false, marketing: false },
      status: 'NEW',
    },
  ],
]);

const professionals = new Map<string, Professional>([
  [
    'professional-carlos',
    {
      id: 'professional-carlos',
      tenantId: 'tenant-barbearia-centro',
      branchIds: ['branch-centro'],
      displayName: 'Carlos Mendes',
      phone: '(11) 95555-0101',
      roleLabel: 'Barbeiro senior',
      status: 'ACTIVE',
    },
  ],
  [
    'professional-joao',
    {
      id: 'professional-joao',
      tenantId: 'tenant-barbearia-centro',
      branchIds: ['branch-centro'],
      displayName: 'Joao Pereira',
      phone: '(11) 95555-0202',
      roleLabel: 'Barbeiro',
      status: 'ACTIVE',
    },
  ],
  [
    'professional-rafael',
    {
      id: 'professional-rafael',
      tenantId: 'tenant-barbearia-centro',
      branchIds: ['branch-centro'],
      displayName: 'Rafael Lima',
      phone: '(11) 95555-0303',
      roleLabel: 'Especialista em barba',
      status: 'ACTIVE',
    },
  ],
]);

const services = new Map<string, Service>([
  [
    'service-cut',
    {
      id: 'service-cut',
      tenantId: 'tenant-barbearia-centro',
      category: 'Cabelo',
      name: 'Corte classico',
      durationMinutes: 45,
      priceCents: 6000,
      status: 'ACTIVE',
      enabledProfessionalIds: ['professional-carlos', 'professional-joao', 'professional-rafael'],
    },
  ],
  [
    'service-beard',
    {
      id: 'service-beard',
      tenantId: 'tenant-barbearia-centro',
      category: 'Barba',
      name: 'Barba',
      durationMinutes: 30,
      priceCents: 4000,
      status: 'ACTIVE',
      enabledProfessionalIds: ['professional-carlos', 'professional-rafael'],
    },
  ],
  [
    'service-premium',
    {
      id: 'service-premium',
      tenantId: 'tenant-barbearia-centro',
      category: 'Pacote',
      name: 'Combo completo',
      durationMinutes: 90,
      priceCents: 13000,
      status: 'ACTIVE',
      enabledProfessionalIds: ['professional-carlos', 'professional-joao', 'professional-rafael'],
    },
  ],
]);

export class DevCustomerRepository implements CustomerRepository {
  async search(context: RequestContext, filters: CustomerListFilters = {}) {
    return [...customers.values()]
      .filter((customer) => customer.tenantId === context.tenantId)
      .filter((customer) =>
        filters.status ? customer.status === filters.status : customer.status !== 'ARCHIVED',
      )
      .filter((customer) => !filters.branchId || customer.branchId === filters.branchId)
      .filter((customer) => !filters.phone || customer.phone.includes(filters.phone))
      .filter(
        (customer) =>
          !filters.query ||
          matches(customer.name, filters.query) ||
          matches(customer.phone, filters.query),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async findById(context: RequestContext, customerId: string) {
    const customer = customers.get(customerId);
    return customer?.tenantId === context.tenantId ? customer : null;
  }

  async create(context: RequestContext, command: CreateCustomerCommand) {
    const id = `customer-${Date.now()}`;
    const customer: Customer = {
      id,
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
    customers.set(id, customer);
    return customer;
  }

  async update(context: RequestContext, command: UpdateCustomerCommand) {
    const current = await this.findById(context, command.id);
    if (!current) throw notFound('Customer');
    const next: Customer = {
      ...current,
      branchId: command.branchId ?? current.branchId,
      name: command.name ?? current.name,
      phone: command.phone ?? current.phone,
      email: command.email ?? current.email,
      birthDate: command.birthDate ?? current.birthDate,
      notes: command.notes ?? current.notes,
      source: command.source ?? current.source,
      preferredProfessionalId: command.preferredProfessionalId ?? current.preferredProfessionalId,
      consents: { ...current.consents, ...command.consents },
      status: command.status ?? current.status,
    };
    customers.set(command.id, next);
    return next;
  }

  async archive(context: RequestContext, customerId: string) {
    const current = await this.findById(context, customerId);
    if (!current) throw notFound('Customer');
    const next = { ...current, status: 'ARCHIVED' as const, archivedAt: nowIso() };
    customers.set(customerId, next);
    return next;
  }
}

export class DevProfessionalRepository implements ProfessionalRepository {
  async list(context: RequestContext, filters: ProfessionalListFilters = {}) {
    return [...professionals.values()]
      .filter((professional) => professional.tenantId === context.tenantId)
      .filter((professional) =>
        filters.status
          ? professional.status === filters.status
          : professional.status !== 'ARCHIVED',
      )
      .filter(
        (professional) => !filters.branchId || professional.branchIds.includes(filters.branchId),
      )
      .filter((professional) => !filters.query || matches(professional.displayName, filters.query))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async findById(context: RequestContext, professionalId: string) {
    const professional = professionals.get(professionalId);
    return professional?.tenantId === context.tenantId ? professional : null;
  }

  async create(context: RequestContext, command: CreateProfessionalCommand) {
    const id = `professional-${Date.now()}`;
    const professional: Professional = {
      id,
      tenantId: context.tenantId,
      branchIds: command.branchIds,
      displayName: command.displayName,
      email: command.email,
      phone: command.phone,
      roleLabel: command.roleLabel ?? 'Profissional',
      avatarUrl: command.avatarUrl,
      status: 'ACTIVE',
    };
    professionals.set(id, professional);
    return professional;
  }

  async update(context: RequestContext, command: UpdateProfessionalCommand) {
    const current = await this.findById(context, command.id);
    if (!current) throw notFound('Professional');
    const next: Professional = {
      ...current,
      branchIds: command.branchIds ?? current.branchIds,
      displayName: command.displayName ?? current.displayName,
      email: command.email ?? current.email,
      phone: command.phone ?? current.phone,
      roleLabel: command.roleLabel ?? current.roleLabel,
      avatarUrl: command.avatarUrl ?? current.avatarUrl,
      status: command.status ?? current.status,
    };
    professionals.set(command.id, next);
    return next;
  }

  async archive(context: RequestContext, professionalId: string) {
    const current = await this.findById(context, professionalId);
    if (!current) throw notFound('Professional');
    const next = { ...current, status: 'ARCHIVED' as const, archivedAt: nowIso() };
    professionals.set(professionalId, next);
    return next;
  }
}

export class DevServiceRepository implements ServiceRepository {
  async list(context: RequestContext, filters: ServiceListFilters = {}) {
    return [...services.values()]
      .filter((service) => service.tenantId === context.tenantId)
      .filter((service) =>
        filters.status ? service.status === filters.status : service.status !== 'ARCHIVED',
      )
      .filter((service) => !filters.category || service.category === filters.category)
      .filter((service) => !filters.query || matches(service.name, filters.query))
      .filter(
        (service) =>
          !filters.professionalId ||
          service.enabledProfessionalIds.includes(filters.professionalId),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async findById(context: RequestContext, serviceId: string) {
    const service = services.get(serviceId);
    return service?.tenantId === context.tenantId ? service : null;
  }

  async create(context: RequestContext, command: CreateServiceCommand) {
    const id = `service-${Date.now()}`;
    const service: Service = {
      id,
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
    services.set(id, service);
    return service;
  }

  async update(context: RequestContext, command: UpdateServiceCommand) {
    const current = await this.findById(context, command.id);
    if (!current) throw notFound('Service');
    const next: Service = {
      ...current,
      category: command.category ?? current.category,
      name: command.name ?? current.name,
      description: command.description ?? current.description,
      durationMinutes: command.durationMinutes ?? current.durationMinutes,
      priceCents: command.priceCents ?? current.priceCents,
      estimatedCostCents: command.estimatedCostCents ?? current.estimatedCostCents,
      status: command.status ?? current.status,
      enabledProfessionalIds: command.enabledProfessionalIds ?? current.enabledProfessionalIds,
    };
    services.set(command.id, next);
    return next;
  }

  async archive(context: RequestContext, serviceId: string) {
    const current = await this.findById(context, serviceId);
    if (!current) throw notFound('Service');
    const next = { ...current, status: 'ARCHIVED' as const, archivedAt: nowIso() };
    services.set(serviceId, next);
    return next;
  }

  async assignProfessional(context: RequestContext, command: AssignServiceProfessionalCommand) {
    const service = await this.findById(context, command.serviceId);
    if (!service) throw notFound('Service');
    if (service.enabledProfessionalIds.includes(command.professionalId)) return;
    services.set(command.serviceId, {
      ...service,
      enabledProfessionalIds: [...service.enabledProfessionalIds, command.professionalId],
    });
  }
}

function matches(value: string | undefined, query: string) {
  return normalize(value ?? '').includes(normalize(query));
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function notFound(resource: string) {
  return Object.assign(new Error(`${resource} was not found.`), { code: 'CORE_NOT_FOUND' });
}
