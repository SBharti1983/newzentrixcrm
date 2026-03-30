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
    // Store apiFn in a ref so refetch() always calls the latest version
    const apiFnRef = useRef(apiFn);
    apiFnRef.current = apiFn;

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFnRef.current();
            if (mountedRef.current) setData(result);
        } catch (err) {
            if (mountedRef.current) {
                // Ensure error is always a string to prevent React rendering crashes
                const errMsg = err?.error || err?.message || 'Failed to load data';
                setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
            }
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
