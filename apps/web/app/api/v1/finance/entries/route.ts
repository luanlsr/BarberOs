import { buildFinanceRouteHandlers } from '../handlers';

const handlers = buildFinanceRouteHandlers();

export const GET = handlers.GET_ENTRIES;
