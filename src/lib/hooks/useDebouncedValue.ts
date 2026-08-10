'use client';

import { useEffect, useState } from 'react';

/**
 * Delays a value until it stops changing.
 *
 * Search would otherwise fire on every keystroke — eight requests to spell
 * "ben thanh", seven of them already stale by the time they land. 300 ms is
 * roughly the gap between characters for an average typist, so it fires once
 * per word rather than once per letter.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
