import { buildInventoryRouteHandlers } from '../handlers';

const handlers = buildInventoryRouteHandlers();

export const GET = handlers.GET_BALANCES;
