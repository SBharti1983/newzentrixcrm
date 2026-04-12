import { useState, useEffect } from 'react';
import { superAdminApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { PageLoader } from '../components/Feedback';
import { 
    Building2, Plus, Search, Filter, MoreHorizontal, 
    ShieldCheck, Zap, Server, Globe, ExternalLink,
    Lock, CheckCircle2, XCircle, Trash2
} from 'lucide-react';

export default function WorkspaceManagement() {
    const { addToast } = useToast();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New Tenant Form State
    const [formData, setFormData] = useState({
        name: '', slug: '', plan: 'pro', max_users: 10, primary_color: '#6366f1'
    });

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const data = await superAdminApi.getTenants();
            setTenants(data);
        } catch (err) {
            addToast({ type: 'error', title: 'Fetch Failed', message: 'Could not load workspaces.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await superAdminApi.createTenant(formData);
            addToast({ type: 'success', title: 'Workspace Provisioned', message: `${formData.name} is now live.` });
            setIsModalOpen(false);
            fetchTenants();
        } catch (err) {
            addToast({ type: 'error', title: 'Provisioning Failed', message: err.error || 'Check slug availability.' });
        }
    };

    const toggleTenantStatus = async (tenant) => {
        try {
            await superAdminApi.updateTenant(tenant.id, { is_active: !tenant.is_active });
            addToast({ type: 'info', title: 'Status Updated', message: `${tenant.name} status changed.` });
            fetchTenants();
        } catch (err) {
            addToast({ type: 'error', title: 'Update Failed', message: 'Could not change status.' });
        }
    };

    const filteredTenants = tenants.filter(t => 
        t.name?.toLowerCase().includes(search.toLowerCase()) || 
        t.slug?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <PageLoader message="Loading Global Registry..." />;

    return (
        <div style={{ padding: '32px', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>
                        Workspace <span style={{ color: '#6366f1' }}>Registry</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontWeight: 500 }}>Global Tenant Management & Provisioning Infrastructure</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', 
                        background: '#6366f1', color: 'white', border: 'none', borderRadius: '14px', 
                        fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' 
                    }}
                >
                    <Plus size={20} /> Provision New Workspace
                </button>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                    { label: 'Active Clusters', val: tenants.filter(t => t.is_active).length, icon: Globe, color: '#10b981' },
                    { label: 'Total Nodes', val: tenants.length, icon: Server, color: '#6366f1' },
                    { label: 'Enterprise Tier', val: tenants.filter(t => t.plan === 'enterprise').length, icon: ShieldCheck, color: '#f59e0b' },
                    { label: 'Global Uptime', val: '99.99%', icon: Zap, color: '#06b6d4' }
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: '16px 24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <s.icon size={22} color={s.color} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{s.val}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Listing Section */}
            <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" 
                            placeholder="Find workspace..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                        />
                    </div>
                    <button style={{ padding: '8px 16px', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                        <Filter size={16} /> Filter Multi-Tenancy
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Workspace Identity</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Subscription Tier</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Capacity</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Infra Status</th>
                                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTenants.map((t) => (
                                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ 
                                                width: 44, height: 44, borderRadius: '14px', 
                                                background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                fontSize: '0.9rem', fontWeight: 900, color: 'white' 
                                            }}>
                                                {t.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{t.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>{t.slug}.zentrixcrm.com</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                                            background: t.plan === 'enterprise' ? '#fdf2f8' : t.plan?.includes('solo') ? '#ecfdf5' : '#f5f3ff',
                                            color: t.plan === 'enterprise' ? '#be185d' : t.plan?.includes('solo') ? '#059669' : '#6d28d9',
                                            textTransform: 'uppercase', border: '1px solid rgba(0,0,0,0.05)'
                                        }}>
                                            {t.plan}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{t.max_users} Users Cap</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.max_leads || 500} Leads License</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ 
                                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', 
                                            borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                                            background: t.is_active ? '#ecfdf5' : '#fef2f2',
                                            color: t.is_active ? '#059669' : '#dc2626'
                                        }}>
                                            {t.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            {t.is_active ? 'Production Ready' : 'Infrastructure Suspended'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => toggleTenantStatus(t)}
                                                style={{ padding: '8px', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: t.is_active ? '#dc2626' : '#059669', cursor: 'pointer', transition: 'all 0.2s' }}
                                                title={t.is_active ? 'Suspend Workspace' : 'Activate Workspace'}
                                            >
                                                {t.is_active ? <Lock size={16} /> : <Zap size={16} />}
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    const confirmed = window.confirm(`DANGER: Permanently decommission ${t.name}? This will erase all tenant data!`);
                                                    if (confirmed) {
                                                        try {
                                                            await superAdminApi.deleteTenant(t.id);
                                                            addToast({ type: 'success', title: 'Workspace Purged', message: 'Registry updated successfully.' });
                                                            fetchTenants();
                                                        } catch (err) {
                                                            addToast({ type: 'error', title: 'Purge Failed', message: 'Unauthorized or database lock.' });
                                                        }
                                                    }
                                                }}
                                                style={{ padding: '8px', borderRadius: '10px', background: 'white', border: '1px solid #fecaca', color: '#b91c1c', cursor: 'pointer' }}
                                                title="Permanently Delete Workspace"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Provisioning Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: '28px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Provision Workspace</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
                        </div>
                        
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>Workspace Name</label>
                                <input 
                                    required 
                                    className="form-control" 
                                    placeholder="e.g. My Real Estate Group" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>URL Alias (Slug)</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        required 
                                        className="form-control" 
                                        placeholder="workspace-name" 
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    />
                                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, color: '#6366f1' }}>.zentrixcrm.com</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>Subscription Plan</label>
                                    <select 
                                        className="form-control"
                                        value={formData.plan}
                                        onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                    >
                                        <option value="starter">Starter</option>
                                        <option value="pro">Professional</option>
                                        <option value="enterprise">Enterprise</option>
                                        <option value="pro_solo">Solo Premium</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>User Limit</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={formData.max_users}
                                        onChange={e => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                style={{ 
                                    marginTop: '10px', padding: '14px', background: '#6366f1', color: 'white', 
                                    border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', 
                                    cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' 
                                }}
                            >
                                Initiate Cluster Provisioning
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
