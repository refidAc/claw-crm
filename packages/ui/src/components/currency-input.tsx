/**
 * CurrencyInput — formatted currency input field.
 */
'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  currency?: string;
}

export function CurrencyInput({
  value,
  onChange,
  currency = 'USD',
  className,
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(
    value != null ? String(value) : '',
  );

  React.useEffect(() => {
    setDisplayValue(value != null ? String(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setDisplayValue(raw);
    const parsed = parseFloat(raw);
    onChange(isNaN(parsed) ? null : parsed);
  };

  const handleBlur = () => {
    const parsed = parseFloat(displayValue);
    if (!isNaN(parsed)) {
      setDisplayValue(parsed.toFixed(2));
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
        {currency === 'USD' ? '$' : currency}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}
