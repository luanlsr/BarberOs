import { buildProductCategoryRouteHandlers } from '../../handlers';

const handlers = buildProductCategoryRouteHandlers();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handlers.POST_ARCHIVE(request, id);
}
