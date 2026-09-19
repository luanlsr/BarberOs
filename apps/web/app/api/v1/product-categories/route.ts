import { buildProductCategoryRouteHandlers } from './handlers';

const handlers = buildProductCategoryRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
