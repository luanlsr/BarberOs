import {
  createProfessionalCommandSchema,
  updateProfessionalCommandSchema,
  type CreateProfessionalCommand,
  type Entitlement,
  type Permission,
  type Professional,
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
    authorizeProfessionalAccess(
      context,
      'professionals.read',
      filters.branchId ? [filters.branchId] : [],
    );
    const professionals = await this.professionals.list(context, filters);
    return professionals.filter((professional) =>
      isProfessionalVisibleToContext(context, professional),
    );
  }

  async create(context: RequestContext, command: CreateProfessionalCommand) {
    const parsed = createProfessionalCommandSchema.parse(command);
    authorizeProfessionalAccess(context, 'professionals.create', parsed.branchIds);
    return this.professionals.create(context, parsed);
  }

  async update(context: RequestContext, command: UpdateProfessionalCommand) {
    const parsed = updateProfessionalCommandSchema.parse(command);
    const current = await this.findVisibleProfessional(context, parsed.id);

    authorizeProfessionalAccess(
      context,
      'professionals.update',
      parsed.branchIds?.length ? parsed.branchIds : current.branchIds,
    );
    return this.professionals.update(context, parsed);
  }

  async archive(context: RequestContext, professionalId: string) {
    const current = await this.findVisibleProfessional(context, professionalId);

    authorizeProfessionalAccess(context, 'professionals.update', current.branchIds);
    return this.professionals.archive(context, professionalId);
  }

  private async findVisibleProfessional(context: RequestContext, professionalId: string) {
    const professional = await this.professionals.findById(context, professionalId);
    if (!professional || !isProfessionalVisibleToContext(context, professional)) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.');
    }
    return professional;
  }
}

function authorizeProfessionalAccess(
  context: RequestContext,
  permission: Permission,
  branchIds: readonly string[],
) {
  if (!branchIds.length) {
    authorize(context, { permission, entitlement: coreOperationsEntitlement });
    return;
  }

  for (const branchId of branchIds) {
    authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
  }
}

function isProfessionalVisibleToContext(context: RequestContext, professional: Professional) {
  return (
    professional.tenantId === context.tenantId &&
    professional.branchIds.some((branchId) => context.branchScope.includes(branchId))
  );
}
