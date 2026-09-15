import React, { useEffect, useState } from 'react';

// Preserve the user's draft (including an empty string) instead of immediately
// redisplaying the numeric fallback used by existing calculation handlers.
export function NumberInput({ value, onChange, onBlur, onFocus, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(String(value ?? ''));
  }, [value, editing]);

  return <input {...props} type="number" inputMode={props.inputMode ?? 'decimal'}
    value={editing ? draft : value}
    onFocus={(event) => {
      setDraft(event.currentTarget.value);
      setEditing(true);
      onFocus?.(event);
    }}
    onChange={(event) => {
      setDraft(event.currentTarget.value);
      onChange?.(event);
    }}
    onBlur={(event) => {
      setEditing(false);
      onBlur?.(event);
    }}
  />;
}
