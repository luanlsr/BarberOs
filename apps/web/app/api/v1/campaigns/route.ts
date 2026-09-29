import { buildCampaignRouteHandlers } from './handlers';

const handlers = buildCampaignRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
