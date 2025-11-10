import { useEffect, useState } from 'react';

/**
 * Hook para debounce de valores
 * Útil para search inputs, filtros, etc
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 * 
 * useEffect(() => {
 *   // Busca só depois de 300ms sem digitar
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook para throttle de funções
 * Útil para scroll events, resize, etc
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number
): T {
    const [lastCall, setLastCall] = useState(0);

    return ((...args: unknown[]) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            setLastCall(now);
            return callback(...args);
        }
    }) as T;
}
