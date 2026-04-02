import { useEffect, useState, useCallback } from 'react';
import { superAdminApi } from '../api/client';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../hooks/useToast';
import { Users, Building2, TrendingUp, DollarSign, CheckCircle, XCircle, Plus, Edit2, X, Shield } from 'lucide-react';

export default function SuperAdmin() {
    const { showToast } = useToast();
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editTenant, setEditTenant] = useState(null);
    const [saving, setSaving] = useState(false);
    
    // Generic form for create and edit
    const [form, setForm] = useState({
        name: '', admin_name: '', admin_email: '', admin_password: '',
        plan: 'trial', max_users: 3, max_leads: 500,
        slug: '', logo_url: '', primary_color: '#3b82f6'
    });

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

    const openCreateModal = () => {
        setEditTenant(null);
        setForm({
            name: '', admin_name: '', admin_email: '', admin_password: '',
            plan: 'trial', max_users: 3, max_leads: 500,
            slug: '', logo_url: '', primary_color: '#3b82f6'
        });
        setShowModal(true);
    };

    const openEditModal = (t) => {
        setEditTenant(t);
        setForm({
            name: t.name || '',
            slug: t.slug || '',
            logo_url: t.logo_url || '',
            primary_color: t.primary_color || '#3b82f6',
            plan: t.plan || 'trial',
            max_users: t.max_users || 3,
            max_leads: t.max_leads || 500
        });
        setShowModal(true);
    };

    const saveTenant = async () => {
        if (!form.name) return showToast('Company name is required', 'error');
        
        setSaving(true);
        try {
            if (editTenant) {
                await superAdminApi.updateTenant(editTenant.id, {
                    name: form.name, slug: form.slug, 
                    logo_url: form.logo_url, primary_color: form.primary_color,
                    plan: form.plan, max_users: parseInt(form.max_users), max_leads: parseInt(form.max_leads)
                });
                showToast('Workspace updated successfully', 'success');
            } else {
                if (!form.admin_email || !form.admin_password) return showToast('Admin credentials required', 'error');
                
                await superAdminApi.createTenant({
                    name: form.name, admin_name: form.admin_name, 
                    admin_email: form.admin_email, admin_password: form.admin_password,
                    plan: form.plan, max_users: parseInt(form.max_users), max_leads: parseInt(form.max_leads)
                });
                showToast('Workspace & Admin provisioned!', 'success');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            showToast(err.error || 'Failed to save workspace', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 60 }}>
            {/* Header Area */}
            <div style={{
                background: 'linear-gradient(135deg, var(--navy-900), #1e293b)',
                padding: '44px 40px', borderRadius: '32px', marginBottom: 32,
                color: 'white', position: 'relative', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(10,22,40,0.15)'
            }}>
                <div style={{ position: 'absolute', top: -40, right: -20, opacity: 0.05 }}>
                    <Shield size={340} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-violet)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={16} /> Global Infrastructure Command
                        </div>
                        <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 900, letterSpacing: '-1.5px' }}>Zentrix Network</h1>
                        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px' }}>Managing {tenants.length} active multi-tenant workspaces.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end' }}>
                        {[
                            { label: 'Active Users', value: stats?.totalUsers || 0, color: 'var(--accent-cyan)' },
                            { label: 'Platform MRR', value: `₹${((stats?.mrr || 0) / 1000).toFixed(1)}k`, color: 'var(--accent-emerald)' },
                        ].map(m => (
                          <div key={m.label} style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                              <div style={{ fontSize: '28px', fontWeight: 900, color: m.color }}>{m.value}</div>
                          </div>
                        ))}
                        <button className="btn hover-lift" onClick={openCreateModal} style={{ 
                            background: 'white', color: 'var(--navy-900)', fontWeight: 900, height: 52, padding: '0 28px', borderRadius: '18px', border: 'none',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)', fontSize: '13px'
                        }}>
                             <Plus size={18} /> PROVISION TENANT
                        </button>
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="card" style={{ borderRadius: 24, padding: 8 }}>
                <div className="card-header" style={{ padding: '24px 32px' }}>
                    <h3 className="card-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Workspace Registry</h3>
                </div>
                <div className="card-body" style={{ padding: '0 12px 12px' }}>
                    <div className="table-wrapper" style={{ borderRadius: 16 }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr>
                                    <th style={{ paddingBottom: 12 }}>Workspace / Branding</th>
                                    <th style={{ paddingBottom: 12 }}>Domain Slug</th>
                                    <th style={{ paddingBottom: 12 }}>Plan Limits</th>
                                    <th style={{ paddingBottom: 12 }}>Status</th>
                                    <th style={{ paddingBottom: 12, textAlign: 'right' }}>Controls</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => (
                                    <tr key={t.id} style={{ background: 'var(--slate-50)', transition: 'transform 0.2s' }}>
                                        <td style={{ borderRadius: '14px 0 0 14px', border: '1px solid transparent' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{ 
                                                    width: 44, height: 44, borderRadius: 12, background: t.primary_color || 'var(--navy-600)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800,
                                                    fontSize: '18px', boxShadow: `0 4px 12px ${t.primary_color}40`, overflow: 'hidden'
                                                }}>
                                                    {t.logo_url ? <img src={t.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: 'var(--navy-800)', fontSize: '15px' }}>{t.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, marginTop: 4 }}>Joined {new Date(t.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ background: 'white', padding: '6px 12px', borderRadius: 8, display: 'inline-block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-600)', border: '1px solid var(--border-light)' }}>
                                                {t.slug}.zentrixcrm.com
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <span className={`badge ${t.plan === 'enterprise' ? 'badge-violet' : t.plan === 'pro' ? 'badge-blue' : 'badge-slate'}`} style={{ padding: '6px 12px', fontSize: '10px' }}>
                                                    {t.plan.toUpperCase()}
                                                </span>
                                                <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span>{t.user_count}/{t.max_users} Users</span>
                                                    <span>{t.lead_count}/{t.max_leads} Leads</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div onClick={() => toggleStatus(t.id, t.is_active)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 12, background: t.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: t.is_active ? 'var(--accent-emerald-dark)' : 'var(--accent-rose)', fontSize: '12px', fontWeight: 800, transition: 'all 0.2s' }}>
                                                {t.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />} {t.is_active ? 'Active' : 'Suspended'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', borderRadius: '0 14px 14px 0' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditModal(t)}>
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {tenants.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)', fontWeight: 600 }}>No active workspaces.</div>}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(16px)' }}>
                    <div className="modal animate-fadeIn" onClick={e => e.stopPropagation()} style={{ 
                        maxWidth: 840, width: '95%', background: 'white', borderRadius: '36px', 
                        overflowY: 'auto', maxHeight: '90vh', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' 
                    }}>
                        <div style={{ padding: '36px 48px', position: 'relative' }}>
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 32, right: 32, width: 44, height: 44, borderRadius: '16px', border: '1px solid #f1f5f9', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                            
                            <h2 style={{ margin: '0 0 32px 0', fontSize: '28px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.5px' }}>
                                {editTenant ? `Edit Workspace: ${form.name}` : 'Provision New Workspace'}
                            </h2>

                            <div className="form-grid form-grid-2">
                                {/* Core Details */}
                                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 24, border: '1px solid #f1f5f9' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 20 }}>Workspace Core</h4>
                                    
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 800 }}>Company Name</label>
                                        <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Apex Realtors" />
                                    </div>
                                    
                                    {editTenant && (
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 800 }}>Subdomain Slug (Critical)</label>
                                            <input className="form-control" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder="e.g. apex" />
                                            <small style={{ color: 'var(--slate-400)', display: 'block', marginTop: 6, fontWeight: 600 }}>Changing this immediately alters their login URL.</small>
                                        </div>
                                    )}

                                    <div className="form-group" style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label" style={{ fontWeight: 800 }}>Plan Type</label>
                                            <select className="form-control" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
                                                <option value="trial">Trial</option>
                                                <option value="starter">Starter</option>
                                                <option value="pro">Pro</option>
                                                <option value="enterprise">Enterprise</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label" style={{ fontWeight: 800 }}>Max Users</label>
                                            <input className="form-control" type="number" value={form.max_users} onChange={e => setForm({...form, max_users: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label" style={{ fontWeight: 800 }}>Max Leads Limit</label>
                                        <input className="form-control" type="number" value={form.max_leads} onChange={e => setForm({...form, max_leads: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    {/* Admin User (Only on Create) */}
                                    {!editTenant && (
                                        <div style={{ background: '#f8fafc', padding: 24, borderRadius: 24, border: '1px solid #f1f5f9', marginBottom: 24 }}>
                                            <h4 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 20 }}>Initial Admin Account</h4>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 800 }}>Admin Full Name</label>
                                                <input className="form-control" value={form.admin_name} onChange={e => setForm({...form, admin_name: e.target.value})} placeholder="John Doe" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 800 }}>Admin Login Email</label>
                                                <input className="form-control" type="email" value={form.admin_email} onChange={e => setForm({...form, admin_email: e.target.value})} placeholder="admin@domain.com" />
                                            </div>
                                            <div className="form-group mb-0">
                                                <label className="form-label" style={{ fontWeight: 800 }}>Temporary Password</label>
                                                <input className="form-control" type="password" value={form.admin_password} onChange={e => setForm({...form, admin_password: e.target.value})} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Branding (Only on Edit) */}
                                    {editTenant && (
                                        <div style={{ background: '#f8fafc', padding: 24, borderRadius: 24, border: '1px solid #f1f5f9' }}>
                                            <h4 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 20 }}>Custom Branding</h4>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 800 }}>Logo Image URL</label>
                                                <input className="form-control" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://..." />
                                            </div>
                                            <div className="form-group mb-0">
                                                <label className="form-label" style={{ fontWeight: 800 }}>Primary Brand Color</label>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <input type="color" value={form.primary_color} onChange={e => setForm({...form, primary_color: e.target.value})} style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                                    <input className="form-control" value={form.primary_color} onChange={e => setForm({...form, primary_color: e.target.value})} placeholder="#hexcode" style={{ flex: 1 }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                                <button className="btn btn-secondary" style={{ flex: 1, height: 56, borderRadius: '18px', fontWeight: 800 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 2, height: 56, borderRadius: '18px', background: 'var(--navy-900)', fontWeight: 900, fontSize: '15px' }} onClick={saveTenant} disabled={saving}>
                                    {saving ? 'Processing...' : editTenant ? 'Save Configuration' : 'Provision Workspace & Admin'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
