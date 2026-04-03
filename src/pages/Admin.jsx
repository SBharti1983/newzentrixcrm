import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { PageLoader, PageError } from '../components/Feedback';
import { usersApi, projectsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, Edit2, Trash2, X, Shield, Users, Building2, Settings } from 'lucide-react';

const ROLE_LABELS = {
    superadmin: 'Super Administrator',
    admin: 'Administrator',
    sales_manager: 'Sales Manager',
    agent: 'Sales Agent',
};
const ROLE_BADGE = {
    superadmin: 'badge-rose',
    admin: 'badge-violet',
    sales_manager: 'badge-blue',
    agent: 'badge-cyan',
};

const ROLE_PERMISSIONS = {
    superadmin: ['Full System Access', 'Manage Tenants', 'View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Manage Users', 'System Settings', 'Delete Records', 'Export Data', 'Billing Access'],
    admin: ['View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Manage Users', 'System Settings', 'Delete Records', 'Export Data'],
    sales_manager: ['View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Assign Agents', 'Export Data'],
    agent: ['View Dashboard', 'Manage Own Leads', 'View Projects', 'Schedule Visits', 'Update Bookings'],
};

const DEFAULT_FORM = { name: '', email: '', role: 'agent', department: 'Sales', phone: '', password: 'Zentrix@123' };

export default function Admin() {
    const { showToast } = useToast();
    const { data: usersRaw, loading, error, refetch } = useApi(() => usersApi.list());
    const { data: projectsRaw } = useApi(() => projectsApi.list());
    const usersRawList = usersRaw || [];
    const PROJECTS_DATA = projectsRaw || [];
    // derive current user from session storage
    const { user: currentUser } = useAuth();

    // Filter users based on current user role: Managers only see Agents and themselves
    const users = usersRawList.filter(u => {
        if (currentUser.role === 'sales_manager') {
             // Manager sees themselves and Agents
             return u.id === currentUser.id || u.role === 'agent';
        }
        return true; // Admins and SuperAdmins see everyone
    });

    const [tab, setTab] = useState('users');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const openAdd = () => { setForm(DEFAULT_FORM); setEditingUser(null); setShowModal(true); };
    const openEdit = (u) => { setForm({ ...u, new_password: '' }); setEditingUser(u.id); setShowModal(true); };
    const save = async () => {
        if (!form.name || !form.email) { showToast('Name and email required', 'error'); return; }
        setSaving(true);
        try {
            if (editingUser) {
                const payload = { name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone };
                if (form.new_password) payload.new_password = form.new_password;
                await usersApi.update(editingUser, payload);
            } else {
                await usersApi.create({ name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone, password: form.password || 'Zentrix@123' });
            }
            showToast(editingUser ? 'User updated!' : 'User added!', 'success');
            setShowModal(false); refetch();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };
    const deleteUser = async (id) => {
        if (id === currentUser.id) { showToast('Cannot delete yourself', 'error'); return; }
        if (!window.confirm('Are you sure you want to disable this user?')) return;
        try {
            await usersApi.update(id, { is_active: false });
            showToast('User deactivated successfully', 'success');
            refetch();
        } catch (err) {
            showToast(err?.error || err?.message || 'Failed to deactivate user', 'error');
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admin Controls</h1>
                    <p className="page-subtitle">Manage users, roles, permissions and system settings</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs mb-6" style={{ width: 'fit-content' }}>
                {[['users', <Users size={14} />, 'Users & Roles'], ['projects', <Building2 size={14} />, 'Projects Config'], ['permissions', <Shield size={14} />, 'Permissions'], ['settings', <Settings size={14} />, 'Settings']].map(([key, icon, label]) => (
                    <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {tab === 'users' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{users.length} team members</span>
                        <button className="btn btn-primary btn-sm" onClick={openAdd}>
                            <Plus size={14} /> Add User
                        </button>
                    </div>
                    <div className="grid grid-2">
                        {users.map(u => (
                            <div key={u.id} className="card" style={{ padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div className="avatar avatar-lg" style={{
                                        background: `hsl(${u.id * 60 + 180}, 60%, 50%)`,
                                        width: 50, height: 50, fontSize: '1rem',
                                    }}>{u.avatar}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.name}</span>
                                            {u.id === currentUser.id && (
                                                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>You</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{u.email}</div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                                            <span className="badge badge-slate">{u.department || 'Sales'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(u)}><Edit2 size={13} /></button>
                                        <button
                                            className="btn btn-ghost btn-sm btn-icon"
                                            style={{ color: u.id === currentUser.id ? 'var(--text-muted)' : 'var(--accent-rose)' }}
                                            onClick={() => deleteUser(u.id)}
                                            disabled={u.id === currentUser.id}
                                        ><Trash2 size={13} /></button>
                                    </div>
                                </div>

                                {/* Permissions mini */}
                                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Permissions</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {(ROLE_PERMISSIONS[u.role] || []).map(p => (
                                            <span key={p} className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{p}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Config Tab */}
            {tab === 'projects' && (
                <div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {['Project', 'Type', 'Location', 'Units', 'Available', 'Status', 'Completion'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {PROJECTS_DATA.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '1.2rem' }}>{p.image}</span>
                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-blue">{p.type}</span></td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.location}</td>
                                        <td style={{ fontWeight: 600 }}>{p.units}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{p.available}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'Active' ? 'badge-green' : p.status === 'Pre-launch' ? 'badge-violet' : 'badge-slate'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{p.completion}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Permissions Tab */}
            {tab === 'permissions' && (
                <div className="grid grid-3">
                    {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                        <div key={role} className="card" style={{ overflow: 'visible' }}>
                            <div style={{
                                background: role === 'superadmin'
                                    ? 'linear-gradient(135deg, var(--accent-rose-dark), var(--accent-rose))'
                                    : role === 'admin'
                                        ? 'linear-gradient(135deg, var(--accent-violet-dark), var(--accent-violet))'
                                        : role === 'sales_manager'
                                            ? 'linear-gradient(135deg, var(--navy-700), var(--navy-50))'
                                            : 'linear-gradient(135deg, var(--accent-cyan-dark), var(--accent-cyan))',
                                padding: '20px 22px',
                                borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0',
                            }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>
                                    {role === 'admin' ? '👤' : role === 'sales_manager' ? '🎯' : '💼'}
                                </div>
                                <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{ROLE_LABELS[role]}</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 2 }}>
                                    {users.filter(u => u.role === role).length} users
                                </div>
                            </div>
                            <div style={{ padding: '18px 20px' }}>
                                {perms.map(p => (
                                    <div key={p} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border-light)',
                                    }}>
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: 'rgba(16,185,129,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.65rem', color: 'var(--accent-emerald)',
                                            flexShrink: 0,
                                        }}>✅</div>
                                        <span style={{ fontSize: '0.85rem' }}>{p}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
                <div className="grid grid-2">
                    {[
                        { title: 'Company Information', fields: [['Company Name', 'Zentrix Realty Pvt. Ltd.'], ['Website', 'www.zentrixrealty.com'], ['Support Email', 'support@zentrixrealty.com'], ['Phone', '+91 22 4567 8900']] },
                        { title: 'CRM Configuration', fields: [['Lead Expiry (days)', '30'], ['Auto-assign Leads', 'Enabled'], ['Default Currency', 'INR (₹)'], ['Fiscal Year Start', 'April']] },
                        { title: 'Notification Defaults', fields: [['Follow-up Reminders', 'Email + WhatsApp'], ['Visit Reminders', '24 hrs before'], ['Booking Alerts', 'Immediate'], ['Weekly Reports', 'Every Monday']] },
                        { title: 'Data & Privacy', fields: [['Data Retention', '3 Years'], ['Backup Frequency', 'Daily'], ['Export Format', 'CSV / Excel'], ['Audit Logs', 'Enabled (90 days)']] },
                    ].map(section => (
                        <div key={section.title} className="card" style={{ padding: '20px 22px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>{section.title}</div>
                            {section.fields.map(([k, v]) => (
                                <div key={k} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: '1px solid var(--border-light)',
                                }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{k}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v}</span>
                                        <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 24, height: 24, padding: 0 }}>
                                            <Edit2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* User Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add Team Member'}</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@zentrix.com" />
                                </div>
                                {!editingUser ? (
                                    <div className="form-group">
                                        <label className="form-label">Default Password *</label>
                                        <input className="form-control" type="text" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Default password" />
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label className="form-label">New Password</label>
                                        <input className="form-control" type="password" value={form.new_password || ''} onChange={e => setForm({ ...form, new_password: e.target.value })} placeholder="Leave blank to keep" />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        {currentUser.role !== 'sales_manager' && (
                                            <>
                                                <option value="superadmin">Super Administrator</option>
                                                <option value="admin">Administrator</option>
                                                <option value="sales_manager">Sales Manager</option>
                                            </>
                                        )}
                                        <option value="agent">Sales Agent</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input className="form-control" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Sales" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : (editingUser ? 'Save Changes' : 'Add Member')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
