import { buildExpenseRouteHandlers } from '../../handlers';

const handlers = buildExpenseRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.POST_CANCEL(request, id);
}
