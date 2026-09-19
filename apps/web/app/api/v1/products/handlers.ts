import type {
  ArchiveProductCommand,
  CreateProductCommand,
  RequestContext,
  UpdateProductCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { CatalogApplicationService } from '../../../../src/modules/catalog/application/catalog-service';
import { SupabaseCatalogRepository } from '../../../../src/modules/catalog/infrastructure';
import { createProductRouteHandlers } from '../../../../src/modules/catalog/presentation/product-route-handlers';
import type { ProductListFilters } from '../../../../src/modules/catalog/domain';

export function buildProductRouteHandlers() {
  return createProductRouteHandlers({
    resolveContext,
    service: {
      async listProducts(context: RequestContext, filters?: ProductListFilters) {
        return (await getCatalogApplicationService()).listProducts(context, filters ?? {});
      },
      async getProductDetail(
        context: RequestContext,
        productId: string,
        filters?: { branchId?: string },
      ) {
        return (await getCatalogApplicationService()).getProductDetail(context, productId, filters);
      },
      async createProduct(context: RequestContext, command: CreateProductCommand) {
        return (await getCatalogApplicationService()).createProduct(context, command);
      },
      async updateProduct(context: RequestContext, command: UpdateProductCommand) {
        return (await getCatalogApplicationService()).updateProduct(context, command);
      },
      async archiveProduct(context: RequestContext, command: ArchiveProductCommand) {
        return (await getCatalogApplicationService()).archiveProduct(context, command);
      },
    },
  });
}

function resolveContext(request: Request) {
  const url = new URL(request.url);
  return getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
}

async function getCatalogApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new CatalogApplicationService({
    repository: new SupabaseCatalogRepository(client),
  });
}
