import { buildMessagingConversationRouteHandlers } from '../handlers';

const handlers = buildMessagingConversationRouteHandlers();

export const GET = handlers.GET;
