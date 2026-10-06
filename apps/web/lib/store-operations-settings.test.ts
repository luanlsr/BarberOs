import { describe, expect, test } from 'vitest';
import type { ScheduleBlock } from '@barberos/contracts';
import { getStoreOperationsSettings, toStoreScheduleBlock } from './store-operations-settings';

describe('store operations settings', () => {
  test('does not expose development schedule blocks as default settings', () => {
    const settings = getStoreOperationsSettings('dev-branch');

    expect(settings.openingHours).toMatchObject({
      branchId: 'dev-branch',
      startTime: '08:00',
      endTime: '18:00',
      slotMinutes: 30,
    });
    expect(settings.blocks).toEqual([]);
  });

  test('maps persisted schedule blocks into settings blocks using Sao Paulo labels', () => {
    const block: ScheduleBlock = {
      id: 'block-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-05T15:00:00.000Z',
      endsAt: '2026-09-05T16:00:00.000Z',
      type: 'BREAK',
      reason: 'Intervalo da equipe',
      active: true,
    };

    expect(toStoreScheduleBlock(block)).toEqual({
      id: 'block-1',
      branchId: 'branch-1',
      dateIso: '2026-09-05',
      professionalId: 'professional-1',
      startTime: '12:00',
      endTime: '13:00',
      reason: 'Intervalo da equipe',
    });
  });
});
