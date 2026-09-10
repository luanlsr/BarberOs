import { buildCashRegisterRouteHandlers } from './handlers';

const handlers = buildCashRegisterRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
