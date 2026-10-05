export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function brazilMobileNationalDigits(value: string) {
  const digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length > 11) return digits.slice(2, 13);
  return digits.slice(0, 11);
}

export function formatBrazilMobilePhone(value: string) {
  const digits = brazilMobileNationalDigits(value);
  const area = digits.slice(0, 2);
  const first = digits.slice(2, 7);
  const second = digits.slice(7, 11);

  if (digits.length <= 2) return area ? '(' + area : '';
  if (digits.length <= 7) return '(' + area + ') ' + first;
  return '(' + area + ') ' + first + '-' + second;
}

export function formatPhoneForDisplay(value?: string | null) {
  if (!value) return '';
  return formatBrazilMobilePhone(value) || value;
}

export function normalizeBrazilMobilePhoneToE164(value: string) {
  const digits = brazilMobileNationalDigits(value);
  return digits ? '+55' + digits : '';
}

export function isValidBrazilMobilePhone(value: string) {
  const digits = brazilMobileNationalDigits(value);
  return digits.length === 11 && digits[2] === '9';
}
