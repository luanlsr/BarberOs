import { describe, expect, it } from 'vitest';
import { getNextTheme } from './theme-provider';

describe('theme preferences', () => {
  it('toggles directly between light and dark modes', () => {
    expect(getNextTheme('light')).toBe('dark');
    expect(getNextTheme('dark')).toBe('light');
    expect(getNextTheme('system')).toBe('dark');
  });
});
