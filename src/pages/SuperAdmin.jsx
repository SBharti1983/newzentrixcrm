import { useEffect, useState, useCallback } from 'react';
import { superAdminApi } from '../api/client';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../hooks/useToast';
import { Users, Building2, TrendingUp, DollarSign, CheckCircle, XCircle, Plus, Edit2, X, Shield, Trash2, Zap, BarChart, Settings, Mail, MessageSquare, PhoneCall, FileText, Target } from 'lucide-react';

export default function SuperAdmin() {
    const { showToast } = useToast();
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTenant, setEditTenant] = useState(null);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        name: '', admin_name: '', admin_email: '', admin_password: '',
        plan: 'trial', max_users: 3, max_leads: 500,
        slug: '', logo_url: '', primary_color: '#3b82f6',
        features: {
            whatsapp: true, marketing: true, automations: false,
            voice_telemetry: false, custom_reports: false, ai_scoring: false
        }
    });

    const fetchData = useCallback(async () => {
        try {
            const [tData, sData] = await Promise.all([superAdminApi.getTenants(), superAdminApi.getStats()]);
            setTenants(tData); setStats(sData);
        } catch (_err) { showToast('Failed to load Super Admin data', 'error'); } 
        finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleStatus = async (id, currentStatus) => {
        try {
            await superAdminApi.updateTenant(id, { is_active: !currentStatus });
            showToast('Tenant status updated', 'success'); fetchData();
        } catch (_err) { showToast('Failed to update status', 'error'); }
    };

    const openEditModal = (t) => {
        setEditTenant(t);
        setForm({
            name: t.name || '', slug: t.slug || '',
            logo_url: t.logo_url || '', primary_color: t.primary_color || '#3b82f6',
            plan: t.plan || 'trial', max_users: t.max_users || 3, max_leads: t.max_leads || 500,
            features: t.settings?.features || {
                whatsapp: true, marketing: true, automations: false,
                voice_telemetry: false, custom_reports: false, ai_scoring: false
            }
        });
        setShowModal(true);
    };

    const toggleFeature = (f) => {
        setForm(prev => ({ ...prev, features: { ...prev.features, [f]: !prev.features[f] } }));
    };

    const saveTenant = async () => {
        if (!form.name) return showToast('Name required', 'error');
        setSaving(true);
        try {
            const payload = {
                name: form.name, slug: form.slug,
                plan: form.plan, max_users: parseInt(form.max_users), max_leads: parseInt(form.max_leads),
                settings: { features: form.features },
                logo_url: form.logo_url, primary_color: form.primary_color
            };
            if (editTenant) await superAdminApi.updateTenant(editTenant.id, payload);
            else await superAdminApi.createTenant({ ...payload, admin_name: form.admin_name, admin_email: form.admin_email, admin_password: form.admin_password });
            showToast('Workspace sync successful!', 'success');
            setShowModal(false); fetchData();
        } catch (err) { showToast(err.error || 'Failed to save', 'error'); } 
        finally { setSaving(false); }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="animate-fadeIn">
            <div style={{ background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', padding: '44px 40px', borderRadius: '32px', marginBottom: 32, color: 'white', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-violet)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={16} /> Global Infrastructure Command
                        </div>
                        <h1 className="page-title" style={{ color: 'white', margin: 0 }}>Zentrix Network</h1>
                        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Managing {tenants.length} active workspaces.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <button className="btn btn-primary" onClick={() => { setEditTenant(null); setShowModal(true); }}><Plus size={18} /> Provision Workspace</button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Branding</th>
                                <th>Plan Limits</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Controls</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div style={{ width: 40, height: 40, background: t.primary_color, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>{t.name[0]}</div>
                                            <div className="font-black">{t.name} <div className="text-xs text-muted">/{t.slug}</div></div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${t.plan === 'enterprise' ? 'badge-violet' : 'badge-slate'}`}>{t.plan.toUpperCase()}</span>
                                        <div className="text-xs text-muted mt-1">{t.max_users} Users | {t.max_leads} Leads</div>
                                    </td>
                                    <td>
                                        <div onClick={() => toggleStatus(t.id, t.is_active)} className={`badge ${t.is_active ? 'badge-green' : 'badge-rose'} cursor-pointer`}>
                                            {t.is_active ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
                                            {t.is_active ? 'Active' : 'Suspended'}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(t)}><Edit2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: 800 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editTenant ? 'Edit Workspace' : 'Provision New Workspace'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2 gap-8">
                                <div className="flex flex-col gap-4">
                                    <h3 className="section-label">Core Configuration</h3>
                                    <div className="form-group"><label className="form-label">Company Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                                    <div className="grid grid-2">
                                        <div className="form-group"><label className="form-label">Plan Tier</label><select className="form-input" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}><option value="trial">Trial</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></div>
                                        <div className="form-group"><label className="form-label">Max Users</label><input type="number" className="form-input" value={form.max_users} onChange={e => setForm({...form, max_users: e.target.value})} /></div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Max Leads Capacity</label><input type="number" className="form-input" value={form.max_leads} onChange={e => setForm({...form, max_leads: e.target.value})} /></div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <h3 className="section-label">Module Management</h3>
                                    <p className="text-xs text-muted mb-2">Enable or disable specific features for this workspace.</p>
                                    <div className="grid grid-2 gap-2">
                                        {[
                                            { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={14} /> },
                                            { id: 'marketing', label: 'Email Marketing', icon: <Mail size={14} /> },
                                            { id: 'automations', label: 'Automations', icon: <Zap size={14} /> },
                                            { id: 'voice_telemetry', label: 'Voice AI', icon: <PhoneCall size={14} /> },
                                            { id: 'custom_reports', label: 'BI Reports', icon: <FileText size={14} /> },
                                            { id: 'ai_scoring', label: 'Lead Scoring', icon: <Target size={14} /> }
                                        ].map(f => (
                                            <div key={f.id} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${form.features[f.id] ? 'border-primary bg-blue-50' : 'border-slate-100 bg-slate-50 opacity-60'}`} onClick={() => toggleFeature(f.id)}>
                                                <div className="flex items-center gap-2 text-xs font-bold">{f.icon} {f.label}</div>
                                                {form.features[f.id] ? <CheckCircle size={16} className="text-primary" /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveTenant} disabled={saving}>{saving ? 'Processing...' : 'Deploy Workspace'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
