/**
 * useApi — lightweight data-fetching hook
 * Usage: const { data, loading, error, refetch } = useApi(fn, deps)
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(apiFn, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFn();
            if (mountedRef.current) setData(result);
        } catch (err) {
            if (mountedRef.current) setError(err?.error || 'Failed to load data');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        mountedRef.current = true;
        fetch();
        return () => { mountedRef.current = false; };
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
}
