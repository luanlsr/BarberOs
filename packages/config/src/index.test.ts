import { describe, expect, it } from 'vitest';
import { parsePublicEnv, parseServerEnv } from './index';

describe('environment contracts', () => {
  it('provides safe public defaults', () => {
    expect(parsePublicEnv({})).toEqual({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_NAME: 'BarberOS',
    });
  });

  it('rejects invalid public URLs', () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: 'not-a-url' })).toThrow();
  });

  it('does not require service role credentials for local shell work', () => {
    expect(parseServerEnv({}).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
