import { buildPlatformTenantRouteHandlers } from './handlers';

const handlers = buildPlatformTenantRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
