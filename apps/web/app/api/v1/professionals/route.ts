import type { ProfessionalListFilters } from '../../../../src/modules/professionals/domain';
import { ProfessionalApplicationService } from '../../../../src/modules/professionals/application/professional-service';
import { SupabaseProfessionalRepository } from '../../../../src/modules/professionals/infrastructure/supabase-professional-repository';
import { createProfessionalRouteHandlers } from '../../../../src/modules/professionals/presentation/professional-route-handlers';
import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from '../../../../lib/auth/server';
import type {
  CreateProfessionalCommand,
  RequestContext,
  UpdateProfessionalCommand,
} from '@barberos/contracts';
import { DevProfessionalRepository } from '../../../../src/modules/platform-data/application/dev-directory-repositories';

const handlers = createProfessionalRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async list(context: RequestContext, filters?: ProfessionalListFilters) {
      return (await getProfessionalService()).list(context, filters);
    },
    async create(context: RequestContext, command: CreateProfessionalCommand) {
      return (await getProfessionalService()).create(context, command);
    },
    async update(context: RequestContext, command: UpdateProfessionalCommand) {
      return (await getProfessionalService()).update(context, command);
    },
    async archive(context: RequestContext, professionalId: string) {
      return (await getProfessionalService()).archive(context, professionalId);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

async function getProfessionalService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    if (isDevelopmentAuthEnabled()) {
      return new ProfessionalApplicationService(new DevProfessionalRepository());
    }
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new ProfessionalApplicationService(new SupabaseProfessionalRepository(client));
}
