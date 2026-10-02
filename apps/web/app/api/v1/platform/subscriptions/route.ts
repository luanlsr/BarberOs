import { buildPlatformSubscriptionRouteHandlers } from './handlers';

const handlers = buildPlatformSubscriptionRouteHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const POST = handlers.POST;
