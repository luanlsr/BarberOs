import type { Campaign, RequestContext } from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import {
  assertCampaignAudienceScope,
  assertCampaignScope,
  isCampaignAudienceCandidateVisibleToContext,
  isCampaignVisibleToContext,
} from './index';

const tenantAContext: RequestContext = {
  requestId: 'request-a',
  userId: 'user-a',
  tenantId: 'tenant-a',
  membershipId: 'membership-a',
  role: 'OWNER',
  permissions: ['campaigns.read', 'campaigns.create', 'campaigns.send'],
  entitlements: ['campaigns'],
  branchScope: ['branch-a'],
};

describe('campaign tenant isolation', () => {
  it('denies cross-tenant campaign writes before side effects', () => {
    expect(() =>
      assertCampaignScope(tenantAContext, {
        tenantId: 'tenant-b',
        branchId: 'branch-a',
      }),
    ).toThrow('Cross-tenant campaign access is not allowed.');
  });

  it('denies campaign branch writes outside the request scope', () => {
    expect(() =>
      assertCampaignScope(tenantAContext, {
        tenantId: 'tenant-a',
        branchId: 'branch-b',
      }),
    ).toThrow('Campaign branch is outside request scope.');
  });

  it('filters cross-tenant and branch-out-of-scope campaign reads', () => {
    expect(isCampaignVisibleToContext(tenantAContext, campaign('tenant-a', 'branch-a'))).toBe(true);
    expect(isCampaignVisibleToContext(tenantAContext, campaign('tenant-b', 'branch-a'))).toBe(
      false,
    );
    expect(isCampaignVisibleToContext(tenantAContext, campaign('tenant-a', 'branch-b'))).toBe(
      false,
    );
  });

  it('denies audience criteria and candidates outside authorized branch or tenant', () => {
    expect(() =>
      assertCampaignAudienceScope(tenantAContext, {
        branchIds: ['branch-b'],
        includeCustomersWithoutVisit: false,
      }),
    ).toThrow('Campaign audience branch is outside request scope.');
    expect(
      isCampaignAudienceCandidateVisibleToContext(tenantAContext, {
        tenantId: 'tenant-b',
        branchId: 'branch-a',
        customerId: 'customer-b',
        contactPhoneHash: 'hash-b',
        hasReachableDestination: true,
      }),
    ).toBe(false);
  });
});

function campaign(tenantId: string, branchId?: string): Campaign {
  return {
    id: `campaign-${tenantId}-${branchId ?? 'all'}`,
    tenantId,
    branchId,
    name: 'Campanha',
    status: 'DRAFT',
    audienceCriteria: {
      branchIds: branchId ? [branchId] : [],
      includeCustomersWithoutVisit: false,
    },
    content: {
      templateKey: 'campaign.reactivation.v1',
      bodyPreview: 'Mensagem',
      variables: {},
    },
    createdBy: 'user-a',
    updatedBy: 'user-a',
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
  };
}
