import { buildInventoryRouteHandlers } from '../handlers';

const handlers = buildInventoryRouteHandlers();

export const GET = handlers.GET_MOVEMENTS;
export const POST = handlers.POST_MOVEMENT;
