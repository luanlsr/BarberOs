import { NextResponse } from 'next/server';
import type {
  ArchiveProductCommand,
  CreateProductCommand,
  Product,
  ProductDetailResponse,
  ProductListResponse,
  ProductStatus,
  RequestContext,
  UpdateProductCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { ProductListFilters } from '../domain';

export type ProductRouteService = {
  listProducts(context: RequestContext, filters?: ProductListFilters): Promise<ProductListResponse>;
  getProductDetail(
    context: RequestContext,
    productId: string,
    filters?: { branchId?: string },
  ): Promise<ProductDetailResponse>;
  createProduct(context: RequestContext, command: CreateProductCommand): Promise<Product>;
  updateProduct(context: RequestContext, command: UpdateProductCommand): Promise<Product>;
  archiveProduct(context: RequestContext, command: ArchiveProductCommand): Promise<Product>;
};

export type ProductRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: ProductRouteService;
};

export function createProductRouteHandlers(dependencies: ProductRouteDependencies) {
  return {
    GET: async (request: Request, productId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const url = new URL(request.url);
        if (productId) {
          const detail = await dependencies.service.getProductDetail(context, productId, {
            branchId: optionalParam(url, 'branchId'),
          });
          return NextResponse.json({ data: detail, requestId: context.requestId });
        }

        const response = await dependencies.service.listProducts(
          context,
          productFiltersFromUrl(url),
        );
        return NextResponse.json({ data: response, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const command = (await request.json()) as CreateProductCommand;
        const product = await dependencies.service.createProduct(context, command);
        return NextResponse.json({ data: product, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    PATCH: async (request: Request, productId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as UpdateProductCommand;
        const product = await dependencies.service.updateProduct(context, {
          ...body,
          id: productId ?? body.id,
        });
        return NextResponse.json({ data: product, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_ARCHIVE: async (request: Request, productId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json().catch(() => ({}))) as ArchiveProductCommand;
        const product = await dependencies.service.archiveProduct(context, {
          ...body,
          id: productId ?? body.id,
        });
        return NextResponse.json({ data: product, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function productFiltersFromUrl(url: URL): ProductListFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    categoryId: optionalParam(url, 'categoryId'),
    status: optionalParam(url, 'status') as ProductStatus | undefined,
    query: optionalParam(url, 'search') ?? optionalParam(url, 'query'),
    includeArchived: optionalBooleanParam(url, 'includeArchived'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value ? Number(value) : undefined;
}

function optionalBooleanParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (value === null) return undefined;
  return value === 'true';
}

function compactFilters<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}
