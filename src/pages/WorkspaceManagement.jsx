import { useState, useEffect } from 'react';
import { superAdminApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { PageLoader } from '../components/Feedback';
import { 
    Building2, Plus, Search, Filter,
    ShieldCheck, Zap, Server, Globe, ExternalLink,
    Lock, CheckCircle2, XCircle, Trash2
} from 'lucide-react';

export default function WorkspaceManagement() {
    const { addToast } = useToast();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form and Editing State
    const [editingTenant, setEditingTenant] = useState(null);
    const [formData, setFormData] = useState({
        name: '', slug: '', plan: 'pro', max_users: 10, max_leads: 500
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

    const handleOpenCreate = () => {
        setEditingTenant(null);
        setFormData({ name: '', slug: '', plan: 'pro', max_users: 10, max_leads: 500 });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (tenant) => {
        setEditingTenant(tenant);
        setFormData({ 
            name: tenant.name, 
            slug: tenant.slug, 
            plan: tenant.plan, 
            max_users: tenant.max_users, 
            max_leads: tenant.max_leads 
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTenant) {
                await superAdminApi.updateTenant(editingTenant.id, formData);
                addToast({ type: 'success', title: 'Profile Updated', message: `${formData.name} configurations refreshed.` });
            } else {
                // For creation, we generate a dummy admin password if not provided
                await superAdminApi.createTenant({ 
                    ...formData, 
                    admin_name: `${formData.name} Admin`, 
                    admin_email: `admin@${formData.slug}.zentrixcrm.com`, 
                    admin_password: 'Password@123' 
                });
                addToast({ type: 'success', title: 'Workspace Provisioned', message: `${formData.name} node is now active.` });
            }
            setIsModalOpen(false);
            fetchTenants();
        } catch (err) {
            addToast({ type: 'error', title: 'Transaction Failed', message: err.error || 'Infrastructure error occurred.' });
        }
    };

    const handleDelete = async (tenant) => {
        const confirmPhrase = `delete ${tenant.slug}`;
        const input = window.prompt(`DANGER: This action is PERMANENT. To confirm, type: ${confirmPhrase}`);
        
        if (input === confirmPhrase) {
            try {
                await superAdminApi.deleteTenant(tenant.id);
                addToast({ type: 'success', title: 'Workspace Terminated', message: 'All cluster data purged.' });
                fetchTenants();
            } catch (err) {
                addToast({ type: 'error', title: 'Decommission Failed', message: 'Database integrity lock or unauthorized.' });
            }
        } else if (input !== null) {
            addToast({ type: 'info', title: 'Deletion Aborted', message: 'Confirmation phrase did not match.' });
        }
    };

    const toggleTenantStatus = async (tenant) => {
        try {
            await superAdminApi.updateTenant(tenant.id, { is_active: !tenant.is_active });
            addToast({ type: 'info', title: 'Node State Changed', message: `${tenant.name} is now ${!tenant.is_active ? 'Online' : 'Offline'}.` });
            fetchTenants();
        } catch (err) {
            addToast({ type: 'error', title: 'Toggle Failed', message: 'Could not switch node state.' });
        }
    };

    const filteredTenants = tenants.filter(t => 
        t.name?.toLowerCase().includes(search.toLowerCase()) || 
        t.slug?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading && !isModalOpen) return <PageLoader message="Synchronizing Network Registry..." />;

    return (
        <div style={{ padding: '32px', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>
                        Workspace <span style={{ color: '#6366f1' }}>Control</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontWeight: 500 }}>Multi-tenant infrastructure & license management</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', 
                        background: '#6366f1', color: 'white', border: 'none', borderRadius: '14px', 
                        fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' 
                    }}
                >
                    <Plus size={20} /> Provision Workspace
                </button>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                    { label: 'Network Clusters', val: tenants.filter(t => t.is_active).length, icon: Globe, color: '#10b981' },
                    { label: 'Global Nodes', val: tenants.length, icon: Server, color: '#6366f1' },
                    { label: 'Enterprise Nodes', val: tenants.filter(t => t.plan === 'enterprise').length, icon: ShieldCheck, color: '#f59e0b' },
                    { label: 'System Uptime', val: '99.99%', icon: Zap, color: '#06b6d4' }
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
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Workspace Identity</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Subscription</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Resources</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Infra Health</th>
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
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{t.max_users} Seats</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.max_leads || 500} Lead Vol</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ 
                                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', 
                                            borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                                            background: t.is_active ? '#ecfdf5' : '#fef2f2',
                                            color: t.is_active ? '#059669' : '#dc2626'
                                        }}>
                                            {t.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            {t.is_active ? 'Production Ready' : 'Suspended'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => handleOpenEdit(t)}
                                                style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: '#6366f1', cursor: 'pointer', transition: 'all 0.2s' }}
                                                title="Edit Workspace"
                                            >
                                                <ExternalLink size={18} />
                                            </button>
                                            <button 
                                                onClick={() => toggleTenantStatus(t)}
                                                style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: t.is_active ? '#dc2626' : '#059669', cursor: 'pointer' }}
                                                title={t.is_active ? 'Suspend Node' : 'Activate Node'}
                                            >
                                                {t.is_active ? <Lock size={18} /> : <Zap size={18} />}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t)}
                                                style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #fecaca', color: '#b91c1c', cursor: 'pointer' }}
                                                title="Decommission Node"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Universal Form Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: '28px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
                                {editingTenant ? 'Configure Workspace' : 'Provision Workspace'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>Workspace Identity</label>
                                <input 
                                    required 
                                    className="form-control" 
                                    placeholder="Company Name" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>Subdomain Slug</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        required 
                                        readOnly={!!editingTenant}
                                        className="form-control" 
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
                                        style={editingTenant ? { background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' } : {}}
                                    />
                                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, color: '#6366f1' }}>.zentrixcrm.com</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>Subscription Tier</label>
                                    <select 
                                        className="form-control"
                                        value={formData.plan}
                                        onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                    >
                                        <option value="starter">Starter</option>
                                        <option value="pro">Professional</option>
                                        <option value="enterprise">Enterprise</option>
                                        <option value="pro_solo">Solopreneur Premium</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>License Seats</label>
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
                                {editingTenant ? 'Sync Configurations' : 'Initiate Provisioning'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                .form-control {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 0.95rem;
                    font-weight: 500;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .form-control:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }
            `}} />
        </div>
    );
}
