'use client';

import * as React from 'react';

export type RelatedOption = {
  id: string;
  label: string;
  description?: string;
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatBrazilMobilePhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  const area = digits.slice(0, 2);
  const first = digits.slice(2, 7);
  const second = digits.slice(7, 11);

  if (digits.length <= 2) return area ? `(${area}` : '';
  if (digits.length <= 7) return `(${area}) ${first}`;
  return `(${area}) ${first}-${second}`;
}

export function isValidBrazilMobilePhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 11 && digits[2] === '9';
}

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'inputMode' | 'maxLength' | 'onChange' | 'type' | 'value'
> & {
  onValueChange: (value: string) => void;
  value: string;
};

export function PhoneInput({ onValueChange, value, ...props }: PhoneInputProps) {
  return (
    <input
      {...props}
      autoComplete={props.autoComplete ?? 'tel-national'}
      inputMode="numeric"
      maxLength={15}
      onChange={(event) => onValueChange(formatBrazilMobilePhone(event.target.value))}
      type="tel"
      value={formatBrazilMobilePhone(value)}
    />
  );
}

type RelatedSelectProps = Readonly<{
  disabled?: boolean;
  emptyLabel: string;
  loading?: boolean;
  loadingLabel?: string;
  name?: string;
  onChange: (value: string) => void;
  options: readonly RelatedOption[];
  placeholder: string;
  required?: boolean;
  value: string;
}>;

export function RelatedSelect({
  disabled = false,
  emptyLabel,
  loading = false,
  loadingLabel = 'Carregando...',
  name,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: RelatedSelectProps) {
  const isDisabled = disabled || loading || !options.length;

  return (
    <select
      disabled={isDisabled}
      name={name}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      value={value}
    >
      <option value="">{loading ? loadingLabel : options.length ? placeholder : emptyLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.description ? `${option.label} - ${option.description}` : option.label}
        </option>
      ))}
    </select>
  );
}
