import { useState } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Decimal input that lets the user type freely ("", "1.", "0.05") while only
 * ever reporting clamped, finite numbers to the parent.
 */
export function NumberInput({
  value,
  onChange,
  className = '',
  min = 0,
  max,
  placeholder,
  disabled,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const [strVal, setStrVal] = useState(value.toString());
  const [prevValue, setPrevValue] = useState(value);

  // Re-sync when the value changes from outside (e.g. global discount applied),
  // but keep the local text while it already represents the same number
  // ("1." vs 1). Adjusting state during render avoids an extra effect pass.
  if (value !== prevValue) {
    setPrevValue(value);
    // An empty / lone "." field already reports `min`; don't overwrite it mid-typing.
    const local = strVal === '' || strVal === '.' ? min : parseFloat(strVal);
    if (local !== value) setStrVal(value.toString());
  }

  const clamp = (n: number) => {
    let v = n;
    if (max !== undefined && v > max) v = max;
    if (v < min) v = min;
    return v;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(next)) return;
    setStrVal(next);
    if (next === '' || next === '.') {
      onChange(min);
      return;
    }
    const num = parseFloat(next);
    if (Number.isFinite(num)) onChange(clamp(num));
  };

  const handleBlur = () => {
    const num = parseFloat(strVal);
    const v = Number.isFinite(num) ? clamp(num) : min;
    setStrVal(v.toString());
    onChange(v);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={strVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
      className={`${className} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}
