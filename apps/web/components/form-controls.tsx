'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { formatBrazilMobilePhone, normalizeBrazilMobilePhoneToE164 } from '../lib/phone-format';

export {
  brazilMobileNationalDigits,
  formatBrazilMobilePhone,
  formatPhoneForDisplay,
  isValidBrazilMobilePhone,
  normalizeBrazilMobilePhoneToE164,
  onlyDigits,
} from '../lib/phone-format';

export type RelatedOption = {
  id: string;
  label: string;
  description?: string;
};

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
  const sortedOptions = React.useMemo(() => [...options].sort(compareRelatedOptions), [options]);
  const selectedOption = sortedOptions.find((option) => option.id === value);
  const normalizedQuery = normalizeSearchText(query);
  const filteredOptions = normalizedQuery
    ? sortedOptions.filter((option) =>
        normalizeSearchText(option.label + ' ' + (option.description ?? '')).includes(
          normalizedQuery,
        ),
      )
    : sortedOptions;
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

function compareRelatedOptions(left: RelatedOption, right: RelatedOption) {
  const labelOrder = normalizeSearchText(left.label).localeCompare(
    normalizeSearchText(right.label),
    'pt-BR',
  );
  if (labelOrder !== 0) return labelOrder;
  return left.id.localeCompare(right.id, 'pt-BR');
}
