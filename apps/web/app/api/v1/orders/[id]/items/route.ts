import { buildOrderItemRouteHandlers } from '../../handlers';

const handlers = buildOrderItemRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.POST(request, id);
}
