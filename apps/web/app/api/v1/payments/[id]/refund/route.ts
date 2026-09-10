import { buildPaymentRouteHandlers } from '../../handlers';

const handlers = buildPaymentRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.POST_REFUND(request, id);
}
