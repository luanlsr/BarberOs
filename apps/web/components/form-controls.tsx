'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

export type RelatedOption = {
  id: string;
  label: string;
  description?: string;
};

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

export function normalizeBrazilMobilePhoneToE164(value: string) {
  const digits = brazilMobileNationalDigits(value);
  return digits ? '+55' + digits : '';
}

export function isValidBrazilMobilePhone(value: string) {
  const digits = brazilMobileNationalDigits(value);
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
      onChange={(event) => onValueChange(normalizeBrazilMobilePhoneToE164(event.target.value))}
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
  searchPlaceholder?: string;
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
  searchPlaceholder = 'Buscar...',
  required = false,
  value,
}: RelatedSelectProps) {
  const inputId = React.useId();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const isDisabled = disabled || loading || !options.length;
  const selectedOption = options.find((option) => option.id === value);
  const normalizedQuery = normalizeSearchText(query);
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        normalizeSearchText(option.label + ' ' + (option.description ?? '')).includes(
          normalizedQuery,
        ),
      )
    : options;
  const helperLabel = loading ? loadingLabel : options.length ? placeholder : emptyLabel;

  function openOptions() {
    if (!isDisabled) setOpen(true);
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setQuery('');
    }
  }

  function selectValue(nextValue: string) {
    onChange(nextValue);
    setQuery('');
    setOpen(false);
  }

  return (
    <div
      className="related-select"
      data-disabled={isDisabled || undefined}
      data-open={open || undefined}
      onBlur={handleBlur}
    >
      {name ? <input name={name} required={required} type="hidden" value={value} /> : null}
      <div className="related-select-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-controls={inputId + '-options'}
          aria-expanded={open}
          aria-label={searchPlaceholder}
          autoComplete="off"
          disabled={isDisabled}
          onChange={(event) => {
            setQuery(event.target.value);
            openOptions();
          }}
          onFocus={openOptions}
          placeholder={selectedOption ? selectedOption.label : helperLabel}
          role="combobox"
          type="search"
          value={query}
        />
      </div>
      {open ? (
        <div
          aria-label={placeholder}
          className="related-select-options"
          id={inputId + '-options'}
          role="listbox"
        >
          {!required && options.length ? (
            <button
              aria-selected={!value}
              className="related-select-option"
              disabled={disabled || loading}
              onClick={() => selectValue('')}
              role="option"
              type="button"
            >
              <span>{placeholder}</span>
            </button>
          ) : null}
          {filteredOptions.map((option) => (
            <button
              aria-selected={option.id === value}
              className="related-select-option"
              disabled={disabled || loading}
              key={option.id}
              onClick={() => selectValue(option.id)}
              role="option"
              type="button"
            >
              <span>{option.label}</span>
              {option.description ? <small>{option.description}</small> : null}
            </button>
          ))}
          {loading || !options.length || !filteredOptions.length ? (
            <p className="related-select-empty">
              {loading ? loadingLabel : options.length ? 'Nenhum resultado encontrado' : emptyLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
