import {
  createCustomerCommandSchema,
  updateCustomerCommandSchema,
  type CreateCustomerCommand,
  type Customer,
  type Entitlement,
  type Permission,
  type RequestContext,
  type UpdateCustomerCommand,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { CustomerListFilters, CustomerProfessionalLookup, CustomerRepository } from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class CustomerApplicationService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly professionals?: CustomerProfessionalLookup,
  ) {}

  async search(context: RequestContext, filters: CustomerListFilters = {}) {
    authorizeCustomerAccess(context, 'customers.read', filters.branchId);
    const customers = await this.customers.search(context, filters);
    return customers.filter((customer) => isCustomerVisibleToContext(context, customer));
  }

  async create(context: RequestContext, command: CreateCustomerCommand) {
    const parsed = createCustomerCommandSchema.parse(command);
    authorizeCustomerAccess(context, 'customers.create', parsed.branchId);
    await this.validatePreferredProfessional(context, parsed.preferredProfessionalId, parsed.branchId);
    return this.customers.create(context, parsed);
  }

  async update(context: RequestContext, command: UpdateCustomerCommand) {
    const parsed = updateCustomerCommandSchema.parse(command);
    const current = await this.findVisibleCustomer(context, parsed.id);
    const effectiveBranchId = parsed.branchId ?? current.branchId;

    authorizeCustomerAccess(context, 'customers.update', effectiveBranchId);
    await this.validatePreferredProfessional(context, parsed.preferredProfessionalId, effectiveBranchId);
    return this.customers.update(context, parsed);
  }

  async archive(context: RequestContext, customerId: string) {
    const current = await this.findVisibleCustomer(context, customerId);
    authorizeCustomerAccess(context, 'customers.update', current.branchId);
    return this.customers.archive(context, customerId);
  }

  private async findVisibleCustomer(context: RequestContext, customerId: string) {
    const customer = await this.customers.findById(context, customerId);
    if (!customer || !isCustomerVisibleToContext(context, customer)) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Customer was not found.');
    }
    return customer;
  }

  private async validatePreferredProfessional(
    context: RequestContext,
    preferredProfessionalId: string | undefined,
    branchId: string | undefined,
  ) {
    if (!preferredProfessionalId) return;
    if (!this.professionals) {
      throw new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Preferred professional lookup is unavailable.');
    }

    const professional = await this.professionals.findProfessionalById(context, preferredProfessionalId);
    if (!professional || professional.tenantId !== context.tenantId || professional.status === 'ARCHIVED') {
      throw new CoreOperationsApplicationError('CORE_VALIDATION_ERROR', 'Preferred professional is invalid.');
    }
    if (branchId && !professional.branchIds.includes(branchId)) {
      throw new CoreOperationsApplicationError('CORE_BRANCH_SCOPE_DENIED', 'Preferred professional is outside the customer branch.');
    }
  }
}

function authorizeCustomerAccess(context: RequestContext, permission: Permission, branchId?: string) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function isCustomerVisibleToContext(context: RequestContext, customer: Customer) {
  return (
    customer.tenantId === context.tenantId &&
    (!customer.branchId || context.branchScope.includes(customer.branchId))
  );
}