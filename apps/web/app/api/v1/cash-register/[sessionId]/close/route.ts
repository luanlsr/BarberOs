import { buildCashRegisterRouteHandlers } from '../../handlers';

const handlers = buildCashRegisterRouteHandlers();

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  return handlers.POST_CLOSE(request, sessionId);
}
