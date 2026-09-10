import { buildCommissionRuleRouteHandlers } from './handlers';

const handlers = buildCommissionRuleRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
