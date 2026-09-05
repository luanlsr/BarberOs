import { NextResponse } from 'next/server';
import type {
  Appointment,
  AppointmentStatusHistory,
  AvailabilityQuery,
  CancelAppointmentCommand,
  CreateAppointmentCommand,
  RequestContext,
  RescheduleAppointmentCommand,
  UpdateAppointmentStatusCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type AppointmentRouteService = {
  list(context: RequestContext, query: AvailabilityQuery): Promise<Appointment[]>;
  get(context: RequestContext, appointmentId: string): Promise<Appointment>;
  create(context: RequestContext, command: CreateAppointmentCommand): Promise<Appointment>;
  reschedule(context: RequestContext, command: RescheduleAppointmentCommand): Promise<Appointment>;
  updateStatus(context: RequestContext, command: UpdateAppointmentStatusCommand): Promise<Appointment>;
  cancel(context: RequestContext, command: CancelAppointmentCommand): Promise<Appointment>;
  listStatusHistory(context: RequestContext, appointmentId: string): Promise<AppointmentStatusHistory[]>;
};

export type AppointmentRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: AppointmentRouteService;
};

export function createAppointmentRouteHandlers(dependencies: AppointmentRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const appointmentId = optionalParam(url, 'id');
        if (appointmentId && optionalParam(url, 'history')) {
          const history = await dependencies.service.listStatusHistory(context, appointmentId);
          return NextResponse.json({ data: history, requestId: context.requestId });
        }
        if (appointmentId) {
          const appointment = await dependencies.service.get(context, appointmentId);
          return NextResponse.json({ data: appointment, requestId: context.requestId });
        }

        const query = listQueryFromUrl(url);
        if (!query) {
          return jsonError('CORE_VALIDATION_ERROR', 'Branch, service and date window are required.', 400, context.requestId);
        }

        const appointments = await dependencies.service.list(context, query);
        return NextResponse.json({ data: appointments, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as CreateAppointmentCommand;
        const appointment = await dependencies.service.create(context, command);
        return NextResponse.json({ data: appointment, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    PATCH: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = await request.json() as Partial<UpdateAppointmentStatusCommand & RescheduleAppointmentCommand>;
        const appointment = command.status
          ? await dependencies.service.updateStatus(context, command as UpdateAppointmentStatusCommand)
          : await dependencies.service.reschedule(context, command as RescheduleAppointmentCommand);
        return NextResponse.json({ data: appointment, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    DELETE: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const body = await request.json().catch(() => null) as Partial<CancelAppointmentCommand> | null;
        const id = body?.id ?? optionalParam(url, 'id');
        if (!id) return jsonError('CORE_VALIDATION_ERROR', 'Appointment id is required.', 400, context.requestId);

        const appointment = await dependencies.service.cancel(context, { id, reason: body?.reason });
        return NextResponse.json({ data: appointment, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function listQueryFromUrl(url: URL): AvailabilityQuery | null {
  const branchId = optionalParam(url, 'branchId');
  const serviceId = optionalParam(url, 'serviceId');
  const startsOn = optionalParam(url, 'startsOn');
  const endsOn = optionalParam(url, 'endsOn');
  if (!branchId || !serviceId || !startsOn || !endsOn) return null;

  return compactQuery({
    branchId,
    serviceId,
    startsOn,
    endsOn,
    professionalId: optionalParam(url, 'professionalId'),
    slotStepMinutes: optionalNumberParam(url, 'slotStepMinutes'),
  });
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value ? Number(value) : undefined;
}

function compactQuery<T extends Record<string, unknown>>(query: T) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as T;
}