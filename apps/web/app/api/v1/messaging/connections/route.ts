import { buildMessagingConnectionRouteHandlers } from '../handlers';

const handlers = buildMessagingConnectionRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
