import type { NextRequest } from 'next/server';
import { buildProductRouteHandlers } from './handlers';

const handlers = buildProductRouteHandlers();

export function GET(request: NextRequest) {
  return handlers.GET(request);
}

export function POST(request: NextRequest) {
  return handlers.POST(request);
}
