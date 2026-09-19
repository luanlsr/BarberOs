import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { ProductCategory, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/catalog-service';
import {
  createProductCategoryRouteHandlers,
  type ProductCategoryRouteService,
} from './product-category-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['inventory.read', 'inventory.write'],
  entitlements: ['inventory'],
  branchScope: ['branch-1'],
};

const category: ProductCategory = {
  id: 'category-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  name: 'Finalizadores',
  status: 'ACTIVE',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
};

type MockService = ProductCategoryRouteService & {
  listCategories: ReturnType<typeof vi.fn>;
  createCategory: ReturnType<typeof vi.fn>;
  updateCategory: ReturnType<typeof vi.fn>;
  archiveCategory: ReturnType<typeof vi.fn>;
};

describe('product category route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createProductCategoryRouteHandlers>;

  beforeEach(() => {
    service = {
      listCategories: vi.fn(async () => [category]),
      createCategory: vi.fn(async () => category),
      updateCategory: vi.fn(async () => ({ ...category, name: 'Bebidas' })),
      archiveCategory: vi.fn(async () => ({
        ...category,
        status: 'ARCHIVED' as const,
        archivedAt: '2026-09-07T10:00:00.000Z',
      })),
    };
    handlers = createProductCategoryRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists categories with branch filters', async () => {
    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/product-categories?branchId=branch-1'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [category], requestId: 'request-1' });
    expect(service.listCategories).toHaveBeenCalledWith(context, 'branch-1');
  });

  it('creates, updates and archives categories through stable command shapes', async () => {
    const createBody = { branchIds: ['branch-1'], name: 'Finalizadores' };
    let response: Response = await handlers.POST(
      new Request('https://barberos.local/api/v1/product-categories', {
        method: 'POST',
        body: JSON.stringify(createBody),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.createCategory).toHaveBeenCalledWith(context, createBody);

    response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/product-categories/category-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Bebidas' }),
      }),
      'category-1',
    );
    expect(response.status).toBe(200);
    expect(service.updateCategory).toHaveBeenCalledWith(context, {
      id: 'category-1',
      name: 'Bebidas',
    });

    response = await handlers.POST_ARCHIVE(
      new Request('https://barberos.local/api/v1/product-categories/category-1/archive', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Linha encerrada' }),
      }),
      'category-1',
    );
    expect(response.status).toBe(200);
    expect(service.archiveCategory).toHaveBeenCalledWith(context, {
      id: 'category-1',
      reason: 'Linha encerrada',
    });
  });

  it('returns stable errors for missing auth, validation and permission denial', async () => {
    handlers = createProductCategoryRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/product-categories'),
    );
    expect(response.status).toBe(401);

    handlers = createProductCategoryRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    service.createCategory.mockRejectedValueOnce(new ZodError([]));
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/product-categories', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('CORE_VALIDATION_ERROR');

    service.updateCategory.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'CATALOG_PERMISSION_DENIED',
        'Tenant tenant-secret cannot update categories.',
      ),
    );
    response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/product-categories/category-1', {
        method: 'PATCH',
        body: '{}',
      }),
      'category-1',
    );
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'CATALOG_PERMISSION_DENIED',
      message: 'Permission denied.',
      requestId: 'request-1',
    });
    expect(JSON.stringify(body)).not.toContain('tenant-secret');
  });
});
