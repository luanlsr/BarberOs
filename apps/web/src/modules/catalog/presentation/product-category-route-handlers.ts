import { NextResponse } from 'next/server';
import type {
  ArchiveProductCategoryCommand,
  CreateProductCategoryCommand,
  ProductCategory,
  RequestContext,
  UpdateProductCategoryCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type ProductCategoryRouteService = {
  listCategories(context: RequestContext, branchId?: string): Promise<ProductCategory[]>;
  createCategory(
    context: RequestContext,
    command: CreateProductCategoryCommand,
  ): Promise<ProductCategory>;
  updateCategory(
    context: RequestContext,
    command: UpdateProductCategoryCommand,
  ): Promise<ProductCategory>;
  archiveCategory(
    context: RequestContext,
    command: ArchiveProductCategoryCommand,
  ): Promise<ProductCategory>;
};

export type ProductCategoryRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: ProductCategoryRouteService;
};

export function createProductCategoryRouteHandlers(dependencies: ProductCategoryRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const branchId = new URL(request.url).searchParams.get('branchId') ?? undefined;
        const categories = await dependencies.service.listCategories(context, branchId);
        return NextResponse.json({ data: categories, requestId: context.requestId });
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

        const command = (await request.json()) as CreateProductCategoryCommand;
        const category = await dependencies.service.createCategory(context, command);
        return NextResponse.json({ data: category, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    PATCH: async (request: Request, categoryId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as UpdateProductCategoryCommand;
        const category = await dependencies.service.updateCategory(context, {
          ...body,
          id: categoryId ?? body.id,
        });
        return NextResponse.json({ data: category, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_ARCHIVE: async (request: Request, categoryId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json().catch(() => ({}))) as ArchiveProductCategoryCommand;
        const category = await dependencies.service.archiveCategory(context, {
          ...body,
          id: categoryId ?? body.id,
        });
        return NextResponse.json({ data: category, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}
