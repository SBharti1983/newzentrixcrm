import { useEffect, useState, useCallback } from 'react';
import { superAdminApi } from '../api/client';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../hooks/useToast';
import SuperAdminDashboardView from './SuperAdminDashboardView';

export default function SuperAdmin() {
    const { addToast } = useToast();
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [tData, sData, subData] = await Promise.all([
                superAdminApi.getTenants(),
                superAdminApi.getStats(),
                superAdminApi.getSubscriptions()
            ]);
            setTenants(tData);
            setStats(sData);
            setSubscriptions(subData || []);
            setError(null);
        } catch (err) {
            console.error('SuperAdmin Data Fetch Error:', err);
            setError('Failed to sync network infrastructure data.');
            addToast({
                type: 'error',
                title: 'Data Sync Failed',
                message: 'Unable to connect to the global admin service.'
            });
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <PageLoader message="Synchronizing Network Command Center..." />;

    if (error) {
        return (
            <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                justifyContent: 'center', height: '80vh', gap: '20px', 
                background: '#F8FAFC', borderRadius: '32px' 
            }}>
                <div style={{ fontSize: '4rem' }}>📡</div>
                <h2 style={{ fontWeight: 800 }}>Command Center Offline</h2>
                <p style={{ color: '#64748B', maxWidth: 400, textAlign: 'center' }}>{error}</p>
                <button 
                    onClick={fetchData}
                    style={{
                        padding: '12px 24px', background: '#6366F1', color: 'white',
                        border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    // We pass the fetched data to the rich dashboard view
    return <SuperAdminDashboardView tenants={tenants} stats={stats} subscriptions={subscriptions} />;
}
