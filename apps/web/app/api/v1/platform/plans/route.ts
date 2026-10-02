import { buildPlatformPlanRouteHandlers } from './handlers';

const handlers = buildPlatformPlanRouteHandlers();

export const DELETE = handlers.DELETE;
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const POST = handlers.POST;
