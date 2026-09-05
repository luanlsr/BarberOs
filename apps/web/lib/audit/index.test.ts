import { describe, expect, it } from 'vitest';
import { sanitizeAuditValue } from './index';

describe('audit sanitization', () => {
  it('removes secrets recursively while preserving business state', () => {
    expect(
      sanitizeAuditValue({
        role: 'OWNER',
        password: 'hidden',
        nested: { accessToken: 'hidden', status: 'ACTIVE' },
      }),
    ).toEqual({ role: 'OWNER', nested: { status: 'ACTIVE' } });
  });
});
