import { buildCommissionRuleRouteHandlers } from '../handlers';

const handlers = buildCommissionRuleRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.PATCH(request, id);
}
