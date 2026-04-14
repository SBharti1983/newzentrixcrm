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
        name: '', slug: '', plan: 'pro', max_users: 10, max_leads: 500,
        logo_url: '', primary_color: '#6366f1', custom_domain: ''
    });
    
    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    useEffect(() => {
        fetchTenants();
        
        // Handle deep-linking from Command Center
        const params = new URLSearchParams(window.location.search);
        if (params.get('provision') === 'true') {
            handleOpenCreate();
        } else if (params.get('edit')) {
            // Find tenant in data (may need to wait for fetch to finish or just use the ID)
            const tenantId = params.get('edit');
            // We'll handle this in fetchTenants once data arrives
        }
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const data = await superAdminApi.getTenants();
            setTenants(data);
            
            // Handle auto-edit if param exists
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('edit');
            if (editId) {
                const tenant = data.find(t => t.id === editId);
                if (tenant) handleOpenEdit(tenant);
            }
        } catch (err) {
            addToast({ type: 'error', title: 'Fetch Failed', message: 'Could not load workspaces.' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingTenant(null);
        setFormData({ name: '', slug: '', plan: 'pro', max_users: 10, max_leads: 500, logo_url: '', primary_color: '#6366f1', custom_domain: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (tenant) => {
        setEditingTenant(tenant);
        setFormData({ 
            name: tenant.name, 
            slug: tenant.slug, 
            plan: tenant.plan, 
            max_users: tenant.max_users, 
            max_leads: tenant.max_leads,
            logo_url: tenant.logo_url || '',
            primary_color: tenant.primary_color || '#6366f1',
            custom_domain: tenant.settings?.custom_domain || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            const cd = payload.custom_domain;
            delete payload.custom_domain;

            if (editingTenant) {
                payload.settings = { ...(editingTenant.settings || {}), custom_domain: cd };
                await superAdminApi.updateTenant(editingTenant.id, payload);
                addToast({ type: 'success', title: 'Profile Updated', message: `${formData.name} configurations refreshed.` });
            } else {
                payload.settings = { custom_domain: cd };
                await superAdminApi.createTenant({ 
                    ...payload, 
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

    const handleDelete = async () => {
        if (!tenantToDelete || deleteConfirmText.toLowerCase() !== `delete ${tenantToDelete.slug}`) return;
        
        try {
            setLoading(true);
            await superAdminApi.deleteTenant(tenantToDelete.id);
            addToast({ type: 'success', title: 'Workspace Terminated', message: 'All cluster data purged.' });
            setIsDeleteModalOpen(false);
            setTenantToDelete(null);
            setDeleteConfirmText('');
            fetchTenants();
        } catch (err) {
            addToast({ type: 'error', title: 'Decommission Failed', message: 'Database integrity lock or unauthorized.' });
        } finally {
            setLoading(false);
        }
    };

    const openDeleteConfirm = (tenant) => {
        setTenantToDelete(tenant);
        setDeleteConfirmText('');
        setIsDeleteModalOpen(true);
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
                                                background: t.logo_url ? 'white' : (t.primary_color || 'linear-gradient(135deg, #6366f1, #a855f7)'), 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                fontSize: '0.9rem', fontWeight: 900, color: 'white',
                                                border: t.logo_url ? '1.5px solid #e2e8f0' : 'none',
                                                overflow: 'hidden'
                                            }}>
                                                {t.logo_url ? (
                                                    <img src={t.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    t.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{t.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>
                                                    {t.settings?.custom_domain || `${t.slug}.zentrixcrm.com`}
                                                </div>
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
                                                onClick={() => openDeleteConfirm(t)}
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 10 }}>
                    <div style={{ 
                        background: 'white', 
                        borderRadius: '24px', 
                        width: '100%', 
                        maxWidth: '520px', 
                        maxHeight: '95vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                                {editingTenant ? 'Configure Workspace' : 'Provision New Node'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ 
                            padding: '24px', 
                            overflowY: 'auto',
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '14px' 
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Workspace Identity</label>
                                    <input 
                                        required 
                                        className="form-control" 
                                        placeholder="Company Name" 
                                        value={formData.name}
                                        onChange={e => {
                                            const val = e.target.value;
                                            let newSlug = formData.slug;
                                            if (!editingTenant) {
                                                if (formData.plan === 'pro_solo') {
                                                    newSlug = val.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');
                                                } else {
                                                    newSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                                                }
                                            }
                                            setFormData({ ...formData, name: val, slug: newSlug });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Subdomain</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            required 
                                            readOnly={!!editingTenant}
                                            className="form-control" 
                                            value={formData.slug}
                                            style={{ background: editingTenant ? '#f8fafc' : 'white' }}
                                            onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
                                        />
                                        {!editingTenant && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', fontWeight: 700, color: '#6366f1' }}>.zentrix...</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Tier</label>
                                    <select 
                                        className="form-control"
                                        value={formData.plan}
                                        onChange={e => {
                                            const newPlan = e.target.value;
                                            let newSlug = formData.slug;
                                            if (!editingTenant && formData.name) {
                                                if (newPlan === 'pro_solo') {
                                                    newSlug = formData.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');
                                                } else {
                                                    newSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                                                }
                                            }
                                            setFormData({ ...formData, plan: newPlan, slug: newSlug });
                                        }}
                                    >
                                        <option value="starter">Starter</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                        <option value="pro_solo">Solopreneur</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Seats</label>
                                    <input 
                                        type="number" 
                                        className="form-control"
                                        value={formData.max_users}
                                        onChange={e => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Lead Cap</label>
                                    <input 
                                        type="number" 
                                        className="form-control"
                                        value={formData.max_leads}
                                        onChange={e => setFormData({ ...formData, max_leads: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Brand Color</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input 
                                            type="color" 
                                            value={formData.primary_color}
                                            onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                            style={{ width: '40px', height: '40px', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '8px', padding: 2 }}
                                        />
                                        <input 
                                            type="text" 
                                            value={formData.primary_color}
                                            onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                            style={{ flex: 1, padding: '0 10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Logo URL</label>
                                <input 
                                    type="url" 
                                    placeholder="https://..."
                                    value={formData.logo_url}
                                    className="form-control"
                                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Custom Domain Mapping</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. crm.apex.com"
                                    className="form-control"
                                    value={formData.custom_domain}
                                    onChange={e => setFormData({ ...formData, custom_domain: e.target.value.toLowerCase().replace(/[^a-z0-9.-]+/g, '') })}
                                />
                                <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>Point DNS CNAME/A record to Vercel for this to work.</p>
                            </div>
                            
                            <button 
                                type="submit" 
                                style={{ 
                                    marginTop: '8px', padding: '12px', background: '#6366f1', color: 'white', 
                                    border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', 
                                    cursor: 'pointer', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' 
                                }}
                            >
                                {editingTenant ? 'Save Changes' : 'Provision Now'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DESTRUCTIVE ACTION MODAL (WIPE DATA) */}
            {isDeleteModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
                    <div style={{ background: 'white', borderRadius: '28px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '20px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Trash2 size={32} />
                        </div>
                        <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 900 }}>Decommission Workspace?</h2>
                        <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
                            This will permanently erase all leads, users, and cluster data for <strong style={{ color: '#0f172a' }}>{tenantToDelete?.name}</strong>. This action is irreversible.
                        </p>
                        
                        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Type "delete {tenantToDelete?.slug}" to confirm
                            </label>
                            <input 
                                className="form-control" 
                                style={{ borderColor: '#fecaca', background: '#fff9f9' }}
                                placeholder={`delete ${tenantToDelete?.slug}`}
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                style={{ padding: '12px', borderRadius: '14px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={deleteConfirmText.toLowerCase() !== `delete ${tenantToDelete?.slug}`}
                                style={{ 
                                    padding: '12px', borderRadius: '14px', background: '#dc2626', color: 'white', 
                                    border: 'none', fontWeight: 700, cursor: 'pointer',
                                    opacity: deleteConfirmText.toLowerCase() === `delete ${tenantToDelete?.slug}` ? 1 : 0.5
                                }}
                            >
                                Wipe Workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                .form-control {
                    width: 100%;
                    padding: 8px 14px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 0.9rem;
                    font-weight: 500;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                    background: white;
                    color: #0f172a;
                }
                select.form-control {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 16px;
                    padding-right: 40px;
                }
                .form-control:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }
            `}} />
        </div>
    );
}
