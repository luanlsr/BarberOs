import type {
  CreateServiceCommand,
  DirectoryStatus,
  RequestContext,
  Service,
  UpdateServiceCommand,
} from '@barberos/contracts';

export type ServiceListFilters = {
  category?: string;
  professionalId?: string;
  status?: DirectoryStatus;
  query?: string;
};

export type AssignServiceProfessionalCommand = {
  serviceId: string;
  professionalId: string;
  priceCents?: number;
  durationMinutes?: number;
};

export interface ServiceRepository {
  list(context: RequestContext, filters?: ServiceListFilters): Promise<Service[]>;
  findById(context: RequestContext, serviceId: string): Promise<Service | null>;
  create(context: RequestContext, command: CreateServiceCommand): Promise<Service>;
  update(context: RequestContext, command: UpdateServiceCommand): Promise<Service>;
  archive(context: RequestContext, serviceId: string): Promise<Service>;
  assignProfessional(context: RequestContext, command: AssignServiceProfessionalCommand): Promise<void>;
}