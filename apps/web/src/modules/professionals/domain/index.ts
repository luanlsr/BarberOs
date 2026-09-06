import type {
  CreateProfessionalCommand,
  DirectoryStatus,
  Professional,
  RequestContext,
  UpdateProfessionalCommand,
} from '@barberos/contracts';

export type ProfessionalListFilters = {
  branchId?: string;
  status?: DirectoryStatus;
  query?: string;
};

export interface ProfessionalRepository {
  list(context: RequestContext, filters?: ProfessionalListFilters): Promise<Professional[]>;
  findById(context: RequestContext, professionalId: string): Promise<Professional | null>;
  create(context: RequestContext, command: CreateProfessionalCommand): Promise<Professional>;
  update(context: RequestContext, command: UpdateProfessionalCommand): Promise<Professional>;
  archive(context: RequestContext, professionalId: string): Promise<Professional>;
}
