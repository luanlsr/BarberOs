import type {
  AvailabilityQuery,
  CancelAppointmentCommand,
  CreateAppointmentCommand,
  RequestContext,
  RescheduleAppointmentCommand,
  UpdateAppointmentStatusCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SupabaseCustomerRepository } from '../../../../src/modules/customers/infrastructure/supabase-customer-repository';
import { SupabaseProfessionalRepository } from '../../../../src/modules/professionals/infrastructure/supabase-professional-repository';
import { SupabaseServiceRepository } from '../../../../src/modules/services/infrastructure/supabase-service-repository';
import { AppointmentApplicationService } from '../../../../src/modules/scheduling/application/appointment-service';
import { SupabaseSchedulingRepository } from '../../../../src/modules/scheduling/infrastructure/supabase-scheduling-repository';
import { createAppointmentRouteHandlers } from '../../../../src/modules/scheduling/presentation/appointment-route-handlers';

const handlers = createAppointmentRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async list(context: RequestContext, query: AvailabilityQuery) {
      return (await getAppointmentApplicationService()).list(context, query);
    },
    async get(context: RequestContext, appointmentId: string) {
      return (await getAppointmentApplicationService()).get(context, appointmentId);
    },
    async create(context: RequestContext, command: CreateAppointmentCommand) {
      return (await getAppointmentApplicationService()).create(context, command);
    },
    async reschedule(context: RequestContext, command: RescheduleAppointmentCommand) {
      return (await getAppointmentApplicationService()).reschedule(context, command);
    },
    async updateStatus(context: RequestContext, command: UpdateAppointmentStatusCommand) {
      return (await getAppointmentApplicationService()).updateStatus(context, command);
    },
    async cancel(context: RequestContext, command: CancelAppointmentCommand) {
      return (await getAppointmentApplicationService()).cancel(context, command);
    },
    async listStatusHistory(context: RequestContext, appointmentId: string) {
      return (await getAppointmentApplicationService()).listStatusHistory(context, appointmentId);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

async function getAppointmentApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), { code: 'PERSISTENCE_NOT_CONFIGURED' });
  }
  const schedulingRepository = new SupabaseSchedulingRepository(client);
  return new AppointmentApplicationService(
    schedulingRepository,
    schedulingRepository,
    new SupabaseCustomerRepository(client),
    new SupabaseProfessionalRepository(client),
    new SupabaseServiceRepository(client),
  );
}