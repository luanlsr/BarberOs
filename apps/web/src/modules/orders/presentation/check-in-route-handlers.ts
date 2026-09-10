import { NextResponse } from 'next/server';
import type { CheckInAppointmentCommand, OrderDetail, RequestContext } from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type CheckInRouteService = {
  checkIn(context: RequestContext, command: CheckInAppointmentCommand): Promise<OrderDetail>;
};

export type CheckInRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: CheckInRouteService;
};

export function createCheckInRouteHandlers(dependencies: CheckInRouteDependencies) {
  return {
    POST: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const body = (await request.json()) as Partial<CheckInAppointmentCommand>;
        const command = compactCommand({
          appointmentId: body.appointmentId,
          idempotencyKey:
            body.idempotencyKey ?? request.headers.get('idempotency-key') ?? undefined,
          notes: body.notes,
        });
        const order = await dependencies.service.checkIn(context, command);
        return NextResponse.json({ data: order, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function compactCommand(command: Partial<CheckInAppointmentCommand>) {
  return Object.fromEntries(
    Object.entries(command).filter(([, value]) => value !== undefined),
  ) as CheckInAppointmentCommand;
}
