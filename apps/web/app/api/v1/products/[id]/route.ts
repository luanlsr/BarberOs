import { buildProductRouteHandlers } from '../handlers';

const handlers = buildProductRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.GET(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.PATCH(request, id);
}
