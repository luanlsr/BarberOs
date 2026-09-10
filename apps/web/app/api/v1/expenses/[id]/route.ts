import { buildExpenseRouteHandlers } from '../handlers';

const handlers = buildExpenseRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.PATCH(request, id);
}
