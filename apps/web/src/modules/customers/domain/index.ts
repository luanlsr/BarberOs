import type {
  CreateCustomerCommand,
  Customer,
  CustomerStatus,
  DirectoryStatus,
  RequestContext,
  UpdateCustomerCommand,
} from '@barberos/contracts';

export type CustomerListFilters = {
  branchId?: string;
  status?: CustomerStatus;
  query?: string;
  phone?: string;
};

export type PreferredProfessionalSnapshot = {
  id: string;
  tenantId: string;
  branchIds: readonly string[];
  status: DirectoryStatus;
};

export interface CustomerProfessionalLookup {
  findProfessionalById(context: RequestContext, professionalId: string): Promise<PreferredProfessionalSnapshot | null>;
}

export interface CustomerRepository {
  search(context: RequestContext, filters?: CustomerListFilters): Promise<Customer[]>;
  findById(context: RequestContext, customerId: string): Promise<Customer | null>;
  create(context: RequestContext, command: CreateCustomerCommand): Promise<Customer>;
  update(context: RequestContext, command: UpdateCustomerCommand): Promise<Customer>;
  archive(context: RequestContext, customerId: string): Promise<Customer>;
}