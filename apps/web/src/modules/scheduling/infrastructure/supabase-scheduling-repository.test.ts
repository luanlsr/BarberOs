import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@barberos/contracts';
import { SupabaseSchedulingRepository } from './supabase-scheduling-repository';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['appointments.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

describe('SupabaseSchedulingRepository', () => {
  it('lists appointments by tenant, branch, date window and professional without requiring serviceId', async () => {
    const query = createAppointmentsQuery([
      {
        id: 'appointment-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        professional_id: 'professional-1',
        starts_at: '2026-09-07T12:00:00.000Z',
        ends_at: '2026-09-07T12:45:00.000Z',
        status: 'CONFIRMED',
        source: 'MANUAL',
        notes: null,
        appointment_services: [
          {
            service_id: 'service-1',
            service_name: 'Corte',
            duration_minutes: 45,
            price_cents: 6000,
            sequence: 1,
          },
        ],
      },
    ]);
    const client = {
      from: vi.fn(() => query),
    };

    const repository = new SupabaseSchedulingRepository(client as never);
    const appointments = await repository.list(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
    });

    expect(client.from).toHaveBeenCalledWith('appointments');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(query.eq).toHaveBeenCalledWith('branch_id', 'branch-1');
    expect(query.eq).toHaveBeenCalledWith('professional_id', 'professional-1');
    expect(query.gte).toHaveBeenCalledWith('starts_at', '2026-09-07T00:00:00.000Z');
    expect(query.lt).toHaveBeenCalledWith('starts_at', '2026-09-08T00:00:00.000Z');
    expect(query.eq).not.toHaveBeenCalledWith('service_id', expect.anything());
    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({
      id: 'appointment-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      services: [{ serviceId: 'service-1', serviceName: 'Corte' }],
    });
  });
});

function createAppointmentsQuery(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(async () => ({ data, error: null })),
  };

  return query;
}
