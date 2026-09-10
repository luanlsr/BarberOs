import { buildExpenseRouteHandlers } from './handlers';

const handlers = buildExpenseRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
