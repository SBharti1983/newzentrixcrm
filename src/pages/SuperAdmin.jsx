import { useEffect, useState, useCallback } from 'react';
import { superAdminApi } from '../api/client';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../hooks/useToast';
import { Users, Building2, TrendingUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';

export default function SuperAdmin() {
    const { showToast } = useToast();
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [tData, sData] = await Promise.all([
                superAdminApi.getTenants(),
                superAdminApi.getStats()
            ]);
            setTenants(tData);
            setStats(sData);
        } catch (_err) {
            showToast('Failed to load Super Admin data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleStatus = async (id, currentStatus) => {
        try {
            await superAdminApi.updateTenant(id, { is_active: !currentStatus });
            showToast('Tenant status updated', 'success');
            fetchData();
        } catch (_err) {
            showToast('Failed to update status', 'error');
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Super Admin Dashboard</h1>
                    <p className="page-subtitle">Platform-wide overview and multi-tenant management</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Total Agencies (Tenants)', value: stats?.totalTenants || 0, icon: <Building2 className="text-violet" size={24} />, bg: 'var(--accent-violet)' },
                    { label: 'Total Active Users', value: stats?.totalUsers || 0, icon: <Users className="text-blue" size={24} />, bg: 'var(--navy-500)' },
                    { label: 'Total Platform Leads', value: stats?.totalLeads || 0, icon: <TrendingUp className="text-emerald" size={24} />, bg: 'var(--accent-emerald)' },
                    { label: 'Est. Monthly Revenue', value: `₹${(stats?.mrr || 0).toLocaleString()}`, icon: <DollarSign className="text-amber" size={24} />, bg: 'var(--accent-amber)' },
                ].map((stat, i) => (
                    <div key={i} className="stat-card" style={{ '--card-accent': stat.bg }}>
                        <div className="stat-label">{stat.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="stat-value">{stat.value}</div>
                            <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: `${stat.bg}15`, color: stat.bg }}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tenants Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">All Registered Tenants</h3>
                </div>
                <div className="card-body">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Company Name</th>
                                    <th>Slug (Subdomain)</th>
                                    <th>Plan</th>
                                    <th>Users</th>
                                    <th>Leads</th>
                                    <th>Joined</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.slug}</td>
                                        <td>
                                            <span className={`badge ${t.plan === 'enterprise' ? 'badge-violet' : t.plan === 'pro' ? 'badge-blue' : 'badge-slate'}`}>
                                                {t.plan.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{t.user_count} / {t.max_users}</td>
                                        <td>{t.lead_count} / {t.max_leads}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {t.is_active ?
                                                <span className="badge badge-green"><CheckCircle size={10} style={{ marginRight: 4 }} /> Active</span> :
                                                <span className="badge badge-red"><XCircle size={10} style={{ marginRight: 4 }} /> Suspended</span>}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => toggleStatus(t.id, t.is_active)}
                                            >
                                                {t.is_active ? 'Suspend' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {tenants.length === 0 && (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No tenants found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
