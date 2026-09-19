import type {
  ArchiveProductCategoryCommand,
  CreateProductCategoryCommand,
  RequestContext,
  UpdateProductCategoryCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { CatalogApplicationService } from '../../../../src/modules/catalog/application/catalog-service';
import { SupabaseCatalogRepository } from '../../../../src/modules/catalog/infrastructure';
import { createProductCategoryRouteHandlers } from '../../../../src/modules/catalog/presentation';

export function buildProductCategoryRouteHandlers() {
  return createProductCategoryRouteHandlers({
    resolveContext,
    service: {
      async listCategories(context: RequestContext, branchId?: string) {
        return (await getCatalogApplicationService()).listCategories(context, branchId);
      },
      async createCategory(context: RequestContext, command: CreateProductCategoryCommand) {
        return (await getCatalogApplicationService()).createCategory(context, command);
      },
      async updateCategory(context: RequestContext, command: UpdateProductCategoryCommand) {
        return (await getCatalogApplicationService()).updateCategory(context, command);
      },
      async archiveCategory(context: RequestContext, command: ArchiveProductCategoryCommand) {
        return (await getCatalogApplicationService()).archiveCategory(context, command);
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
