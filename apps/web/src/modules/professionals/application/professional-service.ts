import {
  createProfessionalCommandSchema,
  updateProfessionalCommandSchema,
  type CreateProfessionalCommand,
  type Entitlement,
  type Permission,
  type RequestContext,
  type UpdateProfessionalCommand,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { ProfessionalListFilters, ProfessionalRepository } from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class ProfessionalApplicationService {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async list(context: RequestContext, filters: ProfessionalListFilters = {}) {
    authorizeProfessionalAccess(context, 'professionals.read', filters.branchId ? [filters.branchId] : []);
    return this.professionals.list(context, filters);
  }

  async create(context: RequestContext, command: CreateProfessionalCommand) {
    const parsed = createProfessionalCommandSchema.parse(command);
    authorizeProfessionalAccess(context, 'professionals.create', parsed.branchIds);
    return this.professionals.create(context, parsed);
  }

  async update(context: RequestContext, command: UpdateProfessionalCommand) {
    const parsed = updateProfessionalCommandSchema.parse(command);
    if (parsed.branchIds?.length) {
      authorizeProfessionalAccess(context, 'professionals.update', parsed.branchIds);
      return this.professionals.update(context, parsed);
    }

    const current = await this.professionals.findById(context, parsed.id);
    if (!current) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.');
    }

    authorizeProfessionalAccess(context, 'professionals.update', current.branchIds);
    return this.professionals.update(context, parsed);
  }

  async archive(context: RequestContext, professionalId: string) {
    const current = await this.professionals.findById(context, professionalId);
    if (!current) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.');
    }

    authorizeProfessionalAccess(context, 'professionals.update', current.branchIds);
    return this.professionals.archive(context, professionalId);
  }
}

function authorizeProfessionalAccess(context: RequestContext, permission: Permission, branchIds: readonly string[]) {
  if (!branchIds.length) {
    authorize(context, { permission, entitlement: coreOperationsEntitlement });
    return;
  }

  for (const branchId of branchIds) {
    authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
  }
}