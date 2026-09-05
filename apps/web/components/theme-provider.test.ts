import { describe, expect, it } from 'vitest';
import { getNextTheme } from './theme-provider';

describe('theme preferences', () => {
  it('cycles through light, dark and system modes', () => {
    expect(getNextTheme('light')).toBe('dark');
    expect(getNextTheme('dark')).toBe('system');
    expect(getNextTheme('system')).toBe('light');
  });
});
