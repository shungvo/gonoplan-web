'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { fieldClass } from '@/components/ui/field';
import { useT } from '@/i18n/I18nProvider';

/**
 * A password input you can see into.
 *
 * On a phone keyboard a typo in a hidden field is invisible until the server
 * says no, and on the reset screen that means choosing a password you have
 * never actually read. The eye shows it; it starts hidden, because somebody
 * may be looking over a shoulder on a bus.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string | undefined;
  autoFocus?: boolean;
}) {
  const t = useT();
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="mt-4">
      <label htmlFor={id} className="text-ink text-sm font-semibold">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={fieldClass('text-md h-12 pr-12 pl-3.5')}
        />
        <button
          type="button"
          onClick={() => {
            setVisible((shown) => !shown);
          }}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
          className="text-ink-subtle absolute inset-y-0 right-0 flex w-12 items-center justify-center"
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
      {hint && (
        <span id={`${id}-hint`} className="text-ink-subtle mt-1 block text-xs">
          {hint}
        </span>
      )}
    </div>
  );
}
