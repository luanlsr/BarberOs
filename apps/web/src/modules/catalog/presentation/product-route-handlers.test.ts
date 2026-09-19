import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type {
  Product,
  ProductDetailResponse,
  ProductListResponse,
  RequestContext,
} from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/catalog-service';
import { createProductRouteHandlers, type ProductRouteService } from './product-route-handlers';

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

const product: Product = {
  id: 'product-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  categoryId: 'category-1',
  sku: 'POM-80',
  name: 'Pomada Matte 80g',
  status: 'ACTIVE',
  salePriceAmountCents: 4500,
  costAmountCents: 1800,
  stockTrackingPolicy: 'TRACKED',
  allowNegativeStock: false,
  minimumStockQuantity: 5,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
};

const listResponse: ProductListResponse = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  products: [product],
  categories: [],
  balances: [],
  alerts: [],
};

const detailResponse: ProductDetailResponse = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  product,
  balances: [],
  movements: [],
  alerts: [],
};

type MockService = ProductRouteService & {
  listProducts: ReturnType<typeof vi.fn>;
  getProductDetail: ReturnType<typeof vi.fn>;
  createProduct: ReturnType<typeof vi.fn>;
  updateProduct: ReturnType<typeof vi.fn>;
  archiveProduct: ReturnType<typeof vi.fn>;
};

describe('product route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createProductRouteHandlers>;

  beforeEach(() => {
    service = {
      listProducts: vi.fn(async () => listResponse),
      getProductDetail: vi.fn(async () => detailResponse),
      createProduct: vi.fn(async () => product),
      updateProduct: vi.fn(async () => ({ ...product, status: 'INACTIVE' as const })),
      archiveProduct: vi.fn(async () => ({
        ...product,
        status: 'ARCHIVED' as const,
        archivedAt: '2026-09-07T10:00:00.000Z',
      })),
    };
    handlers = createProductRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('lists products with search, branch, category, status and archive filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/products?branchId=branch-1&categoryId=category-1&status=ACTIVE&search=pomada&includeArchived=true&limit=25&cursor=cursor-1',
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: listResponse, requestId: 'request-1' });
    expect(service.listProducts).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      categoryId: 'category-1',
      status: 'ACTIVE',
      query: 'pomada',
      includeArchived: true,
      limit: 25,
      cursor: 'cursor-1',
    });
  });

  it('reads product detail and writes product lifecycle commands', async () => {
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/products/product-1?branchId=branch-1'),
      'product-1',
    );
    expect(response.status).toBe(200);
    expect(service.getProductDetail).toHaveBeenCalledWith(context, 'product-1', {
      branchId: 'branch-1',
    });

    const createBody = {
      branchIds: ['branch-1'],
      categoryId: 'category-1',
      name: 'Pomada Matte 80g',
      salePriceAmountCents: 4500,
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/products', {
        method: 'POST',
        body: JSON.stringify(createBody),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.createProduct).toHaveBeenCalledWith(context, createBody);

    response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/products/product-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INACTIVE' }),
      }),
      'product-1',
    );
    expect(service.updateProduct).toHaveBeenCalledWith(context, {
      id: 'product-1',
      status: 'INACTIVE',
    });

    response = await handlers.POST_ARCHIVE(
      new Request('https://barberos.local/api/v1/products/product-1/archive', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Descontinuado' }),
      }),
      'product-1',
    );
    expect(service.archiveProduct).toHaveBeenCalledWith(context, {
      id: 'product-1',
      reason: 'Descontinuado',
    });
  });

  it('returns stable errors for validation, permission denial and missing context', async () => {
    handlers = createProductRouteHandlers({ resolveContext: vi.fn(async () => null), service });
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/products'),
    );
    expect(response.status).toBe(401);

    handlers = createProductRouteHandlers({ resolveContext: vi.fn(async () => context), service });
    service.createProduct.mockRejectedValueOnce(new ZodError([]));
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/products', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(400);

    service.getProductDetail.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'CATALOG_PERMISSION_DENIED',
        'Tenant tenant-secret cannot read product.',
      ),
    );
    response = await handlers.GET(
      new Request('https://barberos.local/api/v1/products/product-1'),
      'product-1',
    );
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'CATALOG_PERMISSION_DENIED',
      message: 'Permission denied.',
    });
    expect(JSON.stringify(body)).not.toContain('tenant-secret');
  });
});
