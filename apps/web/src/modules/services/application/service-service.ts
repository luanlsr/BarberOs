import {
  createServiceCommandSchema,
  updateServiceCommandSchema,
  type CreateServiceCommand,
  type Entitlement,
  type Permission,
  type RequestContext,
  type Service,
  type UpdateServiceCommand,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { AssignServiceProfessionalCommand, ServiceListFilters, ServiceRepository } from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class ServiceApplicationService {
  constructor(private readonly services: ServiceRepository) {}

  async list(context: RequestContext, filters: ServiceListFilters = {}) {
    authorizeServiceAccess(context, 'services.read');
    const services = await this.services.list(context, filters);
    return services.filter((service) => isServiceVisibleToContext(context, service));
  }

  async create(context: RequestContext, command: CreateServiceCommand) {
    authorizeServiceAccess(context, 'services.create');
    const parsed = createServiceCommandSchema.parse(command);
    return this.services.create(context, parsed);
  }

  async update(context: RequestContext, command: UpdateServiceCommand) {
    authorizeServiceAccess(context, 'services.update');
    const parsed = updateServiceCommandSchema.parse(command);
    const current = await this.findVisibleService(context, parsed.id);
    assertServiceIsMutable(current.status);
    return this.services.update(context, parsed);
  }

  async archive(context: RequestContext, serviceId: string) {
    authorizeServiceAccess(context, 'services.update');
    const current = await this.findVisibleService(context, serviceId);
    if (current.status === 'ARCHIVED') {
      return current;
    }
    return this.services.archive(context, serviceId);
  }

  async assignProfessional(context: RequestContext, command: AssignServiceProfessionalCommand) {
    authorizeServiceAccess(context, 'services.update');
    assertValidServiceProfessionalAssignment(command);
    const current = await this.findVisibleService(context, command.serviceId);
    assertServiceIsMutable(current.status);
    return this.services.assignProfessional(context, command);
  }

  private async findVisibleService(context: RequestContext, serviceId: string) {
    const service = await this.services.findById(context, serviceId);
    if (!service || !isServiceVisibleToContext(context, service)) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Service was not found.');
    }
    return service;
  }
}

function authorizeServiceAccess(context: RequestContext, permission: Permission) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement });
}

function assertServiceIsMutable(status: string) {
  if (status === 'ARCHIVED') {
    throw new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Archived services cannot be changed.');
  }
}

function assertValidServiceProfessionalAssignment(command: AssignServiceProfessionalCommand) {
  if (!command.serviceId.trim() || !command.professionalId.trim()) {
    throw new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Service and professional are required.');
  }
  if (command.priceCents !== undefined && (!Number.isInteger(command.priceCents) || command.priceCents < 0)) {
    throw new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Price must be zero or greater.');
  }
  if (
    command.durationMinutes !== undefined &&
    (!Number.isInteger(command.durationMinutes) || command.durationMinutes < 5 || command.durationMinutes > 720)
  ) {
    throw new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Duration must be between 5 and 720 minutes.');
  }
}

function isServiceVisibleToContext(context: RequestContext, service: Service) {
  return service.tenantId === context.tenantId;
}
