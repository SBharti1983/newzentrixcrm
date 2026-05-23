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

    const lastRequestId = useRef(0);

    const fetch = useCallback(async () => {
        const requestId = ++lastRequestId.current;
        setLoading(true);
        setError(null);
        try {
            const result = await apiFnRef.current();
            if (mountedRef.current && requestId === lastRequestId.current) {
                setData(result);
            }
        } catch (err) {
            if (mountedRef.current && requestId === lastRequestId.current) {
                const errMsg = err?.error || err?.message || 'Failed to load data';
                setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
            }
        } finally {
            if (mountedRef.current && requestId === lastRequestId.current) {
                setLoading(false);
            }
        }
    }, deps);

    useEffect(() => {
        mountedRef.current = true;
        fetch();
        return () => { mountedRef.current = false; };
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
}
