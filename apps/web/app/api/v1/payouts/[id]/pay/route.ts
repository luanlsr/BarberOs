import { buildCommissionRouteHandlers } from '../../../commissions/handlers';

const handlers = buildCommissionRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.POST_PAY_PAYOUT(request, id);
}
