import { describe, expect, it } from 'vitest';
import { developmentSession } from './session-context';

describe('development session adapter', () => {
  it('keeps tenant, branch and role explicit in the context contract', () => {
    expect(developmentSession.tenantId).toBe('dev-tenant');
    expect(developmentSession.branchScope).toEqual(['dev-branch', 'dev-branch-north']);
    expect(developmentSession.role).toBe('OWNER');
  });
});
