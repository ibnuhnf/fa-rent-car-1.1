'use client';

import { useEffect, useState } from 'react';

/**
 * useDebounce — antislop §7.3 / ban #20.
 * Debounce nilai selama `delay` ms (default 300). Pakai di semua live search & filter.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
