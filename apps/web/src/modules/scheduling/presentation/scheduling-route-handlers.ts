import { NextResponse } from 'next/server';
import type {
  CreateProfessionalScheduleCommand,
  CreateScheduleBlockCommand,
  ProfessionalSchedule,
  RequestContext,
  ScheduleBlock,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { AvailabilitySlot } from '../domain';

export type ScheduleRouteService = {
  listProfessionalSchedules(
    context: RequestContext,
    branchId: string,
  ): Promise<ProfessionalSchedule[]>;
  upsertProfessionalSchedule(
    context: RequestContext,
    command: CreateProfessionalScheduleCommand,
  ): Promise<ProfessionalSchedule>;
};

export type ScheduleBlockRouteService = {
  listScheduleBlocks(context: RequestContext, branchId: string): Promise<ScheduleBlock[]>;
  createScheduleBlock(
    context: RequestContext,
    command: CreateScheduleBlockCommand,
  ): Promise<ScheduleBlock>;
};

export type AvailabilityRouteService = {
  findAvailableSlots(
    context: RequestContext,
    query: {
      branchId: string;
      serviceId: string;
      professionalId?: string;
      startsOn: string;
      endsOn: string;
      slotStepMinutes?: number;
    },
  ): Promise<AvailabilitySlot[]>;
};

export type SchedulingRouteDependencies<TService> = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: TService;
};

export function createScheduleRouteHandlers(
  dependencies: SchedulingRouteDependencies<ScheduleRouteService>,
) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const branchId = requiredParam(new URL(request.url), 'branchId');
        if (!branchId)
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Branch id is required.',
            400,
            context.requestId,
          );

        const schedules = await dependencies.service.listProfessionalSchedules(context, branchId);
        return NextResponse.json({ data: schedules, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    PUT: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as CreateProfessionalScheduleCommand;
        const schedule = await dependencies.service.upsertProfessionalSchedule(context, command);
        return NextResponse.json({ data: schedule, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createScheduleBlockRouteHandlers(
  dependencies: SchedulingRouteDependencies<ScheduleBlockRouteService>,
) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const branchId = requiredParam(new URL(request.url), 'branchId');
        if (!branchId)
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Branch id is required.',
            400,
            context.requestId,
          );

        const blocks = await dependencies.service.listScheduleBlocks(context, branchId);
        return NextResponse.json({ data: blocks, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as CreateScheduleBlockCommand;
        const block = await dependencies.service.createScheduleBlock(context, command);
        return NextResponse.json({ data: block, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createAvailabilityRouteHandlers(
  dependencies: SchedulingRouteDependencies<AvailabilityRouteService>,
) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const branchId = requiredParam(url, 'branchId');
        const serviceId = requiredParam(url, 'serviceId');
        const startsOn = requiredParam(url, 'startsOn');
        const endsOn = requiredParam(url, 'endsOn');

        if (!branchId || !serviceId || !startsOn || !endsOn) {
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Branch, service and date window are required.',
            400,
            context.requestId,
          );
        }

        const slots = await dependencies.service.findAvailableSlots(
          context,
          compactQuery({
            branchId,
            serviceId,
            startsOn,
            endsOn,
            professionalId: optionalParam(url, 'professionalId'),
            slotStepMinutes: optionalNumberParam(url, 'slotStepMinutes'),
          }),
        );
        return NextResponse.json({ data: slots, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function requiredParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
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
