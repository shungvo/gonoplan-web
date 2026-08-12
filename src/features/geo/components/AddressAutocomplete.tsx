'use client';

import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin } from 'lucide-react';
import { fieldClass } from '@/components/ui/field';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import { resolveAddress, suggestAddresses, type Address, type LatLng } from '../api';

/**
 * Long enough that a fast typist does not fire a metered lookup per character,
 * short enough that the list feels like it is keeping up.
 */
const DEBOUNCE_MS = 350;

/** The API's own floor: below two characters a suggestion is about the country. */
const MIN_INPUT = 2;

/**
 * `crypto.randomUUID` needs a secure context, which a plain-HTTP LAN address
 * is not. Falling back to no token loses the provider's session billing but
 * keeps the field working, which is the right way round.
 */
function newSessionToken(): string | undefined {
  return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : undefined;
}

/**
 * How precisely the bias hint is pinned.
 *
 * Two decimals is about 1.1 km. The hint only has to say which city you are
 * in, and rounding it is what stops a map that is still settling from
 * producing a new query key — and a new lookup — on every frame.
 */
function biasKey(near: LatLng | undefined): string {
  return near ? `${near.latitude.toFixed(2)},${near.longitude.toFixed(2)}` : '-';
}

/**
 * An address field that suggests real addresses.
 *
 * Typed text and the chosen address are kept separate on purpose: `onChange`
 * fires for every keystroke and `onPick` only when someone selects a
 * suggestion, so a caller can move a map pin on the second without doing it on
 * the first. Free text still submits — a place down an alley that no geocoder
 * knows is exactly the kind of place this app is for, and a field that refuses
 * anything it cannot match would lose it.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPick,
  near,
  id,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onPick: (address: Address) => void;
  near?: LatLng;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [resolving, setResolving] = useState(false);

  /**
   * Groups the keystrokes of one address entry with the single lookup that
   * ends it, so the provider bills the run once instead of per keystroke.
   * Replaced after each pick, because that is where one entry ends.
   *
   * State rather than a ref: it is read while building the query key's
   * request, and a ref read during render is exactly what the compiler rules
   * forbid. It changes once per completed address, so the extra render is not
   * worth avoiding.
   */
  const [sessionToken, setSessionToken] = useState(newSessionToken);

  const debounced = useDebouncedValue(value, DEBOUNCE_MS);
  const query = debounced.trim();
  const enabled = open && !disabled && query.length >= MIN_INPUT;

  const suggestions = useQuery({
    queryKey: ['geo', 'autocomplete', query, biasKey(near)],
    queryFn: () =>
      suggestAddresses({
        input: query,
        ...(near ? { near } : {}),
        ...(sessionToken ? { sessionToken } : {}),
      }),
    enabled,
    // Suggestions for the same prefix do not change between keystrokes, and
    // backspacing over one is the single most common thing that happens in
    // this field.
    staleTime: 5 * 60_000,
    retry: false,
  });

  const options = enabled ? (suggestions.data ?? []) : [];

  const choose = async (ref: string) => {
    setOpen(false);
    setHighlight(-1);
    setResolving(true);

    try {
      const address = await resolveAddress({
        ref,
        ...(sessionToken ? { sessionToken } : {}),
      });
      onPick(address);
    } catch {
      // The suggestion was shown, so the text is the useful part even when the
      // coordinates cannot be fetched. Leaving what was typed beats clearing
      // the field to explain a failure the person cannot act on.
    } finally {
      setResolving(false);
      // One entry has ended; the next gets its own billing session.
      setSessionToken(newSessionToken());
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
      return;
    }

    if (options.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((current) => (current + step + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter' && highlight >= 0) {
      const chosen = options[highlight];
      if (chosen) {
        event.preventDefault();
        void choose(chosen.ref);
      }
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={highlight >= 0 ? `${listId}-${String(highlight)}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value.slice(0, 300));
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setHighlight(-1);
        }}
        onKeyDown={onKeyDown}
        className={fieldClass('h-12 px-3.5 text-md')}
      />

      {(suggestions.isFetching || resolving) && (
        <Loader2
          className="text-ink-subtle pointer-events-none absolute top-3.5 right-3.5 size-5 animate-spin"
          aria-hidden
        />
      )}

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('address.suggestions')}
          className="border-border bg-surface absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-lg"
        >
          {options.map((option, index) => (
            <li key={option.ref} id={`${listId}-${String(index)}`} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                // Blur fires before click, and blur closes the list — so the
                // press must be prevented from moving focus at all, or the
                // option is gone by the time the click lands.
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  void choose(option.ref);
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left',
                  index === highlight && 'bg-surface-sunken',
                )}
              >
                <MapPin className="text-ink-subtle mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="text-ink block truncate text-sm font-medium">
                    {option.primary}
                  </span>
                  {option.secondary && (
                    <span className="text-ink-subtle block truncate text-xs">
                      {option.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
