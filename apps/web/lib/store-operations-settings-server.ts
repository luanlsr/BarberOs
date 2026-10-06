import type { RequestContext, SessionContext } from '@barberos/contracts';
import { SchedulingApplicationService } from '../src/modules/scheduling/application/scheduling-service';
import { SupabaseSchedulingRepository } from '../src/modules/scheduling/infrastructure/supabase-scheduling-repository';
import { createSupabaseServerClient } from './auth/server';
import {
  getStoreOperationsSettings,
  toStoreScheduleBlock,
  type StoreOperationsSettings,
} from './store-operations-settings';

export async function getPersistentStoreOperationsSettings(
  session: SessionContext,
  branchId = session.activeBranchId ?? session.branchScope[0] ?? '',
): Promise<StoreOperationsSettings> {
  const settings = getStoreOperationsSettings(branchId);
  if (!canReadScheduleBlocks(session, branchId)) return settings;

  const client = await createSupabaseServerClient();
  if (!client) return settings;

  const service = new SchedulingApplicationService(new SupabaseSchedulingRepository(client));
  const blocks = await service.listScheduleBlocks(toRequestContext(session), branchId);

  return {
    ...settings,
    blocks: blocks.filter((block) => block.active).map(toStoreScheduleBlock),
  };
}

function canReadScheduleBlocks(session: SessionContext, branchId: string) {
  return (
    Boolean(branchId) &&
    session.permissions.includes('schedules.read') &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(branchId)
  );
}

function toRequestContext(session: SessionContext): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    userId: session.userId,
    tenantId: session.tenantId,
    membershipId: session.membershipId,
    role: session.role,
    permissions: session.permissions,
    entitlements: session.entitlements ?? [],
    branchScope: session.branchScope,
  };
}
