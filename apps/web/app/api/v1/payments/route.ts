import { buildPaymentRouteHandlers } from './handlers';

const handlers = buildPaymentRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
