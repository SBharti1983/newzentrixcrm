import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { PageLoader, PageError } from '../components/Feedback';
import { usersApi, projectsApi, settingsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, Edit2, Trash2, X, Shield, Users, Building2, Settings, Check, Save, Palette, Globe } from 'lucide-react';

const ROLE_LABELS = {
    superadmin: 'Super Admin',
    admin: 'Administrator',
    sales_manager: 'Sales Manager',
    team_leader: 'Team Leader',
    agent: 'Sales Agent',
};
const ROLE_BADGE = {
    superadmin: 'badge-rose',
    admin: 'badge-violet',
    sales_manager: 'badge-blue',
    team_leader: 'badge-cyan',
    agent: 'badge-emerald',
};

const ALL_AVAILABLE_PERMISSIONS = [
    'View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 
    'Manage Users', 'System Settings', 'Delete Records', 'Export Data', 
    'Billing Access', 'Full System Access', 'Tenant Management', 
    'Role Management', 'Global Analytics', 'BillingControl',
    'Assign Agents', 'View Team Dashboard', 'Manage Team Leads',
    'Lead Distribution', 'Daily Tracking', 'View Own Leads', 
    'Schedule Visits', 'Update Bookings'
];

const DEFAULT_USER_FORM = { name: '', email: '', role: 'agent', department: 'Sales', phone: '', password: 'Zentrix@123' };
const DEFAULT_PROJECT_FORM = { name: '', location: '', status: 'Active', total_units: 0, available_units: 0, price_range: '', possession_date: '' };

export default function Admin() {
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    
    const [tab, setTab] = useState('users');
    const { data: usersRaw, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApi(() => usersApi.list());
    const { data: projectsRaw, loading: projectsLoading, refetch: refetchProjects } = useApi(() => projectsApi.list());
    const { data: settingsRaw, loading: settingsLoading, refetch: refetchSettings } = useApi(() => settingsApi.get());

    const users = (usersRaw || []).filter(u => {
        if (currentUser.role === 'sales_manager') return u.id === currentUser.id || u.role === 'agent' || u.role === 'team_leader';
        if (currentUser.role === 'team_leader') return u.id === currentUser.id || u.role === 'agent';
        return true;
    });

    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState(DEFAULT_USER_FORM);

    const [showProjectModal, setShowProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [projectForm, setProjectForm] = useState(DEFAULT_PROJECT_FORM);

    const [localPermissions, setLocalPermissions] = useState({});
    const [workspaceName, setWorkspaceName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#1e3a73');
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (settingsRaw) {
            setLocalPermissions(settingsRaw.role_permissions || {});
            setWorkspaceName(settingsRaw.workspace_name || currentUser.tenantName || 'My Workspace');
            setPrimaryColor(settingsRaw.primary_color || '#1e3a73');
        }
    }, [settingsRaw, currentUser]);

    // Permissions logic
    const togglePermission = (role, perm) => {
        setLocalPermissions(prev => {
            const current = prev[role] || [];
            const next = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
            return { ...prev, [role]: next };
        });
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            await settingsApi.update({ 
                role_permissions: localPermissions,
                workspace_name: workspaceName,
                primary_color: primaryColor
            });
            showToast('Settings updated successfully!', 'success');
            refetchSettings();
        } catch (err) { showToast('Failed to save settings', 'error'); }
        finally { setSavingSettings(false); }
    };

    // User actions
    const saveUser = async () => {
        try {
            if (editingUser) await usersApi.update(editingUser, userForm);
            else await usersApi.create(userForm);
            showToast(editingUser ? 'User updated' : 'User created', 'success');
            setShowUserModal(false); refetchUsers();
        } catch (err) { showToast(err.error || 'Operation failed', 'error'); }
    };

    // Project actions
    const openAddProject = () => { setProjectForm(DEFAULT_PROJECT_FORM); setEditingProject(null); setShowProjectModal(true); };
    const openEditProject = (p) => { setProjectForm(p); setEditingProject(p.id); setShowProjectModal(true); };
    const saveProject = async () => {
        try {
            if (editingProject) await projectsApi.update(editingProject, projectForm);
            else await projectsApi.create(projectForm);
            showToast(editingProject ? 'Project updated' : 'Project created', 'success');
            setShowProjectModal(false); refetchProjects();
        } catch (err) { showToast(err.error || 'Failed to save project', 'error'); }
    };
    const deleteProject = async (id) => {
        if (!window.confirm('Are you sure you want to delete this project? All associated data will be removed.')) return;
        try {
            await projectsApi.delete(id);
            showToast('Project deleted successfully', 'success');
            refetchProjects();
        } catch (err) { showToast(err.error || 'Delete failed', 'error'); }
    };

    if (usersLoading || projectsLoading || settingsLoading) return <PageLoader />;
    if (usersError) return <PageError message={usersError} onRetry={refetchUsers} />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admin Controls</h1>
                    <p className="page-subtitle">Manage users, roles, permissions and system settings</p>
                </div>
            </div>

            <div className="tabs mb-6" style={{ width: 'fit-content' }}>
                {[['users', <Users size={14} />, 'Users & Roles'], ['projects', <Building2 size={14} />, 'Projects Config'], ['permissions', <Shield size={14} />, 'Permissions'], ['settings', <Settings size={14} />, 'Settings']].map(([key, icon, label]) => (
                    <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* TAB: USERS */}
            {tab === 'users' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-muted">{users.length} Team Members</span>
                        <button className="btn btn-primary btn-sm" onClick={() => { setUserForm(DEFAULT_USER_FORM); setEditingUser(null); setShowUserModal(true); }}>
                            <Plus size={14} /> Add User
                        </button>
                    </div>
                    <div className="grid grid-2">
                        {users.map(u => (
                            <div key={u.id} className="card p-4 flex gap-4">
                                <div className="avatar avatar-lg" style={{ background: `hsl(${u.id.length * 40}, 50%, 50%)` }}>{u.avatar}</div>
                                <div className="flex-1">
                                    <h3 className="font-bold">{u.name} {u.id === currentUser.id && <span className="badge badge-emerald text-xs ml-1">You</span>}</h3>
                                    <p className="text-xs text-muted mb-2">{u.email}</p>
                                    <div className="flex gap-2">
                                        <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role] || u.role}</span>
                                        <span className="badge badge-slate">{u.department || 'Sales'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 h-fit">
                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setUserForm(u); setEditingUser(u.id); setShowUserModal(true); }}><Edit2 size={13} /></button>
                                    <button className="btn btn-ghost btn-sm btn-icon text-rose" onClick={async () => {
                                        if (confirm('Deactivate user?')) { await usersApi.update(u.id, { is_active: false }); refetchUsers(); }
                                    }} disabled={u.id === currentUser.id}><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: PROJECTS */}
            {tab === 'projects' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-muted">Active Project Inventory</span>
                        <button className="btn btn-primary btn-sm" onClick={openAddProject}><Plus size={14} /> New Project</button>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {['Project', 'Location', 'Units', 'Available', 'Status', 'Possession', 'Actions'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {(projectsRaw || []).map(p => (
                                    <tr key={p.id}>
                                        <td className="font-bold">{p.name}</td>
                                        <td>{p.location}</td>
                                        <td>{p.total_units}</td>
                                        <td className="text-emerald font-semibold">{p.available_units}</td>
                                        <td><span className={`badge ${p.status === 'Active' ? 'badge-green' : 'badge-slate'}`}>{p.status}</span></td>
                                        <td>{p.possession_date || 'TBD'}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditProject(p)}><Edit2 size={13} /></button>
                                                <button className="btn btn-ghost btn-sm btn-icon text-rose" onClick={() => deleteProject(p.id)}><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: PERMISSIONS */}
            {tab === 'permissions' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="font-bold text-lg">Edit Role Permissions</h2>
                            <p className="text-xs text-muted">Customize what each role can see and do in your workspace.</p>
                        </div>
                        <button className="btn btn-emerald btn-sm" onClick={saveSettings} disabled={savingSettings}>
                            {savingSettings ? 'Saving...' : <><Save size={14} /> Deploy Permissions</>}
                        </button>
                    </div>
                    <div className="grid grid-3">
                        {Object.keys(ROLE_LABELS).map(role => (
                            <div key={role} className="card overflow-visible">
                                <div className={`p-4 rounded-t-2xl text-white font-black ${ROLE_BADGE[role].replace('badge', 'bg')}`} 
                                     style={{ backgroundColor: role === 'superadmin' ? 'var(--accent-rose)' : role === 'admin' ? 'var(--accent-violet)' : 'var(--navy-600)' }}>
                                    {ROLE_LABELS[role]}
                                </div>
                                <div className="p-4 flex flex-col gap-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {ALL_AVAILABLE_PERMISSIONS.map(perm => {
                                        const isActive = localPermissions[role]?.includes(perm);
                                        return (
                                            <div key={perm} className="flex items-center justify-between p-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
                                                 onClick={() => togglePermission(role, perm)}>
                                                <span className={`text-xs ${isActive ? 'font-bold text-navy-900' : 'text-slate-400'}`}>{perm}</span>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                                                    {isActive ? <Check size={12} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: SETTINGS */}
            {tab === 'settings' && (
                <div style={{ maxWidth: 600 }}>
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-navy-50 text-navy-600 rounded-lg"><Settings size={20} /></div>
                            <div>
                                <h3 className="font-bold">Workspace Configuration</h3>
                                <p className="text-xs text-muted">Brand and identity settings for this tenant</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="form-group">
                                <label className="form-label flex items-center gap-2"><Globe size={14} /> Workspace Name</label>
                                <input className="form-input" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="e.g. Zentrix Real Estate" />
                            </div>

                            <div className="form-group">
                                <label className="form-label flex items-center gap-2"><Palette size={14} /> Brand Primary Color</label>
                                <div className="flex gap-3 items-center">
                                    <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                                    <input className="form-input font-mono flex-1" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                                </div>
                            </div>

                            <div className="pt-4 border-top">
                                <button className="btn btn-primary w-full" onClick={saveSettings} disabled={savingSettings}>
                                    {savingSettings ? 'Saving...' : 'Save Workspace Settings'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PROJECT EDIT */}
            {showProjectModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingProject ? 'Edit Project' : 'Add Project'}</h2>
                            <button className="btn-icon" onClick={() => setShowProjectModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body flex flex-col gap-4">
                            <div className="form-group">
                                <label className="form-label">Project Name</label>
                                <input className="form-input" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-input" value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} />
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Total Units</label>
                                    <input type="number" className="form-input" value={projectForm.total_units} onChange={e => setProjectForm({...projectForm, total_units: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Available Units</label>
                                    <input type="number" className="form-input" value={projectForm.available_units} onChange={e => setProjectForm({...projectForm, available_units: parseInt(e.target.value) || 0})} />
                                </div>
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={projectForm.status} onChange={e => setProjectForm({...projectForm, status: e.target.value})}>
                                        <option value="Active">Active</option>
                                        <option value="Pre-launch">Pre-launch</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Possession Date</label>
                                    <input type="date" className="form-input" value={projectForm.possession_date} onChange={e => setProjectForm({...projectForm, possession_date: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowProjectModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveProject}>Save Project</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
