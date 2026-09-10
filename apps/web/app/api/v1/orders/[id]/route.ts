import { buildOrderRouteHandlers } from '../handlers';

const handlers = buildOrderRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.GET_BY_ID(request, id);
}
