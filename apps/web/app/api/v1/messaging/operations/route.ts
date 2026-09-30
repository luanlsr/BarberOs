import { buildMessagingOperationsRouteHandlers } from '../handlers';

export const runtime = 'nodejs';

const handlers = buildMessagingOperationsRouteHandlers();

export const GET = handlers.GET;
