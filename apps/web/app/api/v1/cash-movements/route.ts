import { buildCashMovementRouteHandlers } from '../cash-register/handlers';

const handlers = buildCashMovementRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
