import { buildOrderRouteHandlers } from './handlers';

const handlers = buildOrderRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
