import { describe, expect, it } from 'vitest';

import {
  brazilMobileNationalDigits,
  formatBrazilMobilePhone,
  isValidBrazilMobilePhone,
  normalizeBrazilMobilePhoneToE164,
  onlyDigits,
} from './form-controls';

describe('form-controls', () => {
  it('formats Brazilian mobile phone numbers', () => {
    expect(formatBrazilMobilePhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatBrazilMobilePhone('+5511999990101')).toBe('(11) 99999-0101');
    expect(formatBrazilMobilePhone('(11) 98765-432199')).toBe('(11) 98765-4321');
    expect(formatBrazilMobilePhone('11987')).toBe('(11) 987');
  });

  it('validates Brazilian mobile phone numbers with area code', () => {
    expect(isValidBrazilMobilePhone('(11) 98765-4321')).toBe(true);
    expect(isValidBrazilMobilePhone('+5511999990101')).toBe(true);
    expect(isValidBrazilMobilePhone('(11) 8765-4321')).toBe(false);
    expect(isValidBrazilMobilePhone('(11) 98765-432')).toBe(false);
  });

  it('normalizes digits from formatted values', () => {
    expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
    expect(brazilMobileNationalDigits('+5511999990101')).toBe('11999990101');
    expect(normalizeBrazilMobilePhoneToE164('(11) 99999-0101')).toBe('+5511999990101');
  });
});
