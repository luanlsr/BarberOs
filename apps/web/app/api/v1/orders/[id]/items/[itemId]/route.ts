import { buildOrderItemRouteHandlers } from '../../../handlers';

const handlers = buildOrderItemRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id, itemId } = await context.params;
  return handlers.PATCH(request, id, itemId);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, itemId } = await context.params;
  return handlers.DELETE(request, id, itemId);
}
