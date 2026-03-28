import { useState, useEffect, useCallback } from 'react';
import {
    Settings, Plus, Play, Zap, Clock, Mail, MessageSquare,
    ArrowRight, Activity, X, Trash2, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { automationsApi } from '../api/client';
import { useToast } from '../hooks/useToast';

export default function Automations() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' | 'logs'
    const { data: workflowsRaw, loading, refetch } = useApi(() => automationsApi.list());
    const workflows = workflowsRaw || [];
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        trigger_type: 'lead_created',
        action_type: 'send_whatsapp',
        action_config: { template: 'Welcome Message' }
    });

    const loadLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            const data = await automationsApi.getLogs();
            setLogs(data);
        } catch (_err) {
            showToast('Failed to load logs', 'error');
        } finally {
            setLogsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (activeTab === 'logs') {
            loadLogs();
        }
    }, [activeTab, loadLogs]);

    const handleCreate = async () => {
        if (!formData.name) return showToast('Please enter a name', 'error');
        setSubmitting(true);
        try {
            await automationsApi.create(formData);
            showToast('Automation activated!', 'success');
            setShowCreate(false);
            setFormData({ name: '', trigger_type: 'lead_created', action_type: 'send_whatsapp', action_config: { template: 'Welcome Message' } });
            refetch();
        } catch (_err) {
            showToast('Failed to create workflow', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            await automationsApi.toggle(id, { is_active: !currentStatus });
            showToast(`Workflow ${!currentStatus ? 'Activated' : 'Paused'}`, 'info');
            refetch();
        } catch (_err) {
            showToast('Toggle failed', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this workflow?')) return;
        try {
            await automationsApi.delete(id);
            showToast('Workflow deleted', 'info');
            refetch();
        } catch (_err) {
            showToast('Delete failed', 'error');
        }
    };

    if (loading && workflows.length === 0) return <PageLoader />;

    return (
        <div className="animate-fadeIn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--navy-800)', margin: '0 0 4px' }}>CRM Automations</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Automate follow-ups and repetitive tasks across your pipeline.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => loadLogs()}><RefreshCw size={16} /> Refresh</button>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Workflow</button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-light)', marginBottom: 24 }}>
                <button
                    onClick={() => setActiveTab('workflows')}
                    style={{
                        padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.9rem', fontWeight: 700, position: 'relative',
                        color: activeTab === 'workflows' ? 'var(--navy-600)' : 'var(--text-muted)'
                    }}
                >
                    Workflows
                    {activeTab === 'workflows' && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--navy-600)' }} />}
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    style={{
                        padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.9rem', fontWeight: 700, position: 'relative',
                        color: activeTab === 'logs' ? 'var(--navy-600)' : 'var(--text-muted)'
                    }}
                >
                    Execution Logs
                    {activeTab === 'logs' && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--navy-600)' }} />}
                </button>
            </div>

            {activeTab === 'workflows' ? (
                <>
                    <div className="grid grid-3" style={{ marginBottom: 32 }}>
                        <div className="stat-card" style={{ border: '1px solid var(--border-light)', boxShadow: 'none' }}>
                            <div className="stat-label">Active Workflows</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{workflows.filter(w => w.is_active).length}</div>
                                <div className="badge badge-green">Healthy</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ border: '1px solid var(--border-light)', boxShadow: 'none' }}>
                            <div className="stat-label">Total Executions</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{workflows.reduce((s, w) => s + (w.total_runs || 0), 0)}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>+12% this week</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ border: '1px solid var(--border-light)', boxShadow: 'none' }}>
                            <div className="stat-label">Productivity Gain</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>120h+</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>Saved Monthly</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrapper">
                            <table style={{ margin: 0 }}>
                                <thead style={{ background: 'var(--slate-50)' }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px' }}>Workflow</th>
                                        <th>Trigger / Action</th>
                                        <th>Total Runs</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workflows.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No workflows found. Create your first one!</td></tr>
                                    ) : (
                                        workflows.map(w => (
                                            <tr key={w.id}>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{w.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Created {new Date(w.created_at).toLocaleDateString()}</div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{w.trigger_type.replace('_', ' ')}</div>
                                                        <ArrowRight size={14} color="var(--text-muted)" />
                                                        <div style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-violet-dark)', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{w.action_type.replace('_', ' ')}</div>
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 800 }}>{w.total_runs || 0}</td>
                                                <td>
                                                    <div
                                                        onClick={() => handleToggle(w.id, w.is_active)}
                                                        style={{
                                                            width: 44, height: 24, borderRadius: 20, background: w.is_active ? 'var(--accent-emerald)' : '#cbd5e1',
                                                            position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: 'absolute', top: 3, left: w.is_active ? 23 : 3, width: 18, height: 18,
                                                            borderRadius: '50%', background: 'white', transition: 'all 0.3s'
                                                        }} />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-ghost btn-sm btn-icon"><Settings size={16} /></button>
                                                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--accent-rose)' }} onClick={() => handleDelete(w.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrapper">
                        <table style={{ margin: 0 }}>
                            <thead style={{ background: 'var(--slate-50)' }}>
                                <tr>
                                    <th style={{ padding: '16px 24px' }}>Time</th>
                                    <th>Workflow</th>
                                    <th>Lead</th>
                                    <th>Outcome</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsLoading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40 }}>Loading logs...</td></tr>
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No execution history yet.</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{log.workflow_name}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{log.lead_name || 'System'}</td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.details?.message || 'Processed successfully'}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {log.status === 'success' ? (
                                                        <CheckCircle size={14} color="var(--accent-emerald)" />
                                                    ) : (
                                                        <AlertCircle size={14} color="var(--accent-rose)" />
                                                    )}
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize' }}>{log.status}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Workflow Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, borderRadius: 24, padding: 0 }}>
                        <div style={{ padding: '30px 40px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--navy-50)', borderRadius: '24px 24px 0 0' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--navy-800)' }}>Visual Automation Builder</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configure triggers and intelligent actions</p>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '40px' }}>
                            <div className="form-group" style={{ marginBottom: 30 }}>
                                <label className="form-label" style={{ fontWeight: 800 }}>WORKFLOW NAME</label>
                                <input
                                    className="form-control"
                                    placeholder="e.g. New Lead - Instant WhatsApp Welcome"
                                    style={{ height: 50, fontSize: '1rem' }}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ background: 'var(--slate-50)', padding: 24, borderRadius: 20, border: '1px solid var(--border-light)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--navy-600)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 12 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--navy-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</div>
                                        Define Trigger Condition
                                    </div>
                                    <select
                                        className="form-control"
                                        style={{ height: 48 }}
                                        value={formData.trigger_type}
                                        onChange={e => setFormData({ ...formData, trigger_type: e.target.value })}
                                    >
                                        <option value="lead_created">Whenever a New Lead is Created</option>
                                        <option value="stage_changed">When Lead Moves to a New Stage</option>
                                        <option value="no_activity">If Lead remains Cold for (X) Days</option>
                                        <option value="site_visit_done">After Site Visit is Completed</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <div style={{ width: 2, height: 30, background: 'var(--border-medium)', borderStyle: 'dashed' }} />
                                </div>

                                <div style={{ background: 'rgba(139,92,246,0.05)', padding: 24, borderRadius: 20, border: '1px solid rgba(139,92,246,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-violet-dark)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 12 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-violet)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</div>
                                        Intelligent Action to Execute
                                    </div>
                                    <select
                                        className="form-control"
                                        style={{ height: 48 }}
                                        value={formData.action_type}
                                        onChange={e => setFormData({ ...formData, action_type: e.target.value })}
                                    >
                                        <option value="send_whatsapp">Send Automated WhatsApp Template</option>
                                        <option value="send_email">Send Professional Email Sequence</option>
                                        <option value="notify_agent">Alert Team Member immediately</option>
                                        <option value="change_stage">Auto-advance Lead Stage</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '30px 40px', background: 'var(--slate-50)', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                            <button className="btn btn-secondary" style={{ padding: '12px 24px' }} disabled={submitting} onClick={() => setShowCreate(false)}>Discard</button>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '12px 32px' }}
                                disabled={submitting}
                                onClick={handleCreate}
                            >
                                <Zap size={16} /> {submitting ? 'Activating...' : 'Save & Activate Workflow'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
