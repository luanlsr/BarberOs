import { buildCommissionRouteHandlers } from '../commissions/handlers';

const handlers = buildCommissionRouteHandlers();

export const POST = handlers.POST_PAYOUT;
