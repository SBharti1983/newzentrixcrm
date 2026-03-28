import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { followupsApi, leadsApi, usersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, X, CheckCircle, Clock, AlertCircle, Calendar, Send } from 'lucide-react';
import NotificationComposer from '../components/NotificationComposer';

const TYPE_ICON = { Call: '📞', Email: '📧', WhatsApp: '💬', 'Site Visit': '🏠', Meeting: '🤝' };
const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-slate' };

const DEFAULT_FORM = {
    leadId: 1, type: 'Call', date: '', time: '10:00',
    agent: 3, priority: 'High', note: '', status: 'Pending',
};

export default function Followups() {
    const { showToast } = useToast();
    const { data: followupsRes, loading, error, refetch } = useApi(() => followupsApi.list({ limit: 200 }));
    const { data: leadsRes } = useApi(() => leadsApi.list({ limit: 200 }));
    const { data: usersRes } = useApi(() => usersApi.list());

    const followups = followupsRes?.data || followupsRes || [];
    const allLeads = leadsRes?.data || [];
    const agents = (usersRes || []).filter(u => ['agent', 'sales_manager'].includes(u.role));

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ lead_id: '', type: 'Call', scheduled_at: '', priority: 'High', notes: '', status: 'Pending' });
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterAgent, setFilterAgent] = useState('All');
    const [notifyTarget, setNotifyTarget] = useState(null);
    const [saving, setSaving] = useState(false);

    const filtered = followups.filter(f => {
        const ms = filterStatus === 'All' || f.status === filterStatus;
        const ma = filterAgent === 'All' || String(f.assigned_to) === filterAgent;
        return ms && ma;
    });

    const toggle = async (id, currentStatus) => {
        try {
            await followupsApi.update(id, { status: currentStatus === 'Completed' ? 'Pending' : 'Completed' });
            refetch();
        } catch { showToast('Failed to update', 'error'); }
    };

    const save = async () => {
        if (!form.lead_id || !form.scheduled_at) { showToast('Lead and date are required', 'error'); return; }
        setSaving(true);
        try {
            await followupsApi.create({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
            showToast('Follow-up scheduled!', 'success'); setShowModal(false); refetch();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };

    const deleteFu = async (id) => { try { await followupsApi.delete(id); refetch(); } catch { showToast('Delete failed', 'error'); } };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const pending = followups.filter(f => f.status === 'Pending').length;
    const completed = followups.filter(f => f.status === 'Completed').length;
    const highPriority = followups.filter(f => f.priority === 'High' && f.status === 'Pending').length;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Follow-Up Scheduler</h1>
                    <p className="page-subtitle">{pending} pending · {highPriority} high priority</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={15} /> Schedule Follow-Up
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-3 mb-4">
                {[
                    { label: 'Pending', count: pending, icon: <Clock size={20} />, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)' },
                    { label: 'Completed', count: completed, icon: <CheckCircle size={20} />, color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'High Priority', count: highPriority, icon: <AlertCircle size={20} />, color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.08)' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: s.bg, borderRadius: 'var(--border-radius-lg)',
                        border: `1px solid ${s.color}30`,
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                        <div style={{ color: s.color }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card mb-4" style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <select className="form-control" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="All">All Status</option>
                        <option>Pending</option>
                        <option>Completed</option>
                    </select>
                    <select className="form-control" style={{ width: 180 }} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
                        <option value="All">All Agents</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(f => (
                    <div key={f.id} className="card" style={{
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: 16,
                        opacity: f.status === 'Completed' ? 0.65 : 1,
                        transition: 'all var(--transition-fast)',
                    }}>
                        {/* Toggle */}
                        <button
                            onClick={() => toggle(f.id, f.status)}
                            style={{
                                width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                                borderColor: f.status === 'Completed' ? 'var(--accent-emerald)' : 'var(--border-medium)',
                                background: f.status === 'Completed' ? 'var(--accent-emerald)' : 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0, transition: 'all var(--transition-fast)',
                                color: 'white',
                            }}
                        >
                            {f.status === 'Completed' && <CheckCircle size={14} />}
                        </button>

                        {/* Icon */}
                        <div style={{
                            width: 40, height: 40, borderRadius: 'var(--border-radius-md)',
                            background: f.priority === 'High' ? 'rgba(244,63,94,0.1)' : f.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'var(--slate-100)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', flexShrink: 0,
                        }}>
                            {TYPE_ICON[f.type] || '📋'}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', textDecoration: f.status === 'Completed' ? 'line-through' : 'none' }}>
                                    {f.lead_name || f.leadName}
                                </span>
                                <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>{f.type}</span>
                                <span className={`badge ${PRIORITY_BADGE[f.priority]}`} style={{ fontSize: '0.7rem' }}>{f.priority}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.note}</div>
                        </div>

                        {/* Date/Agent */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600, marginBottom: 3 }}>
                                <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                                {f.scheduled_at
                                    ? new Date(f.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    : f.date || '—'}
                                <span style={{ color: 'var(--text-muted)' }}>@{f.scheduled_at ? new Date(f.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : f.time}</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.agent_name || f.agentName}</div>
                        </div>

                        {/* Notify */}
                        {f.status !== 'Completed' && (() => {
                            const lead = { id: f.lead_id || f.leadId, name: f.lead_name || f.leadName, phone: '', email: '', project: '', budget: '' };
                            return (
                                <button
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(37,211,102,0.1)', color: '#22c55e', border: '1px solid rgba(37,211,102,0.25)', gap: 5, flexShrink: 0 }}
                                    onClick={() => setNotifyTarget(lead)}
                                    title="Send notification to lead"
                                >
                                    <Send size={12} /> Notify
                                </button>
                            );
                        })()}

                        {/* Delete */}
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteFu(f.id)}>
                            <X size={13} />
                        </button>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <div className="empty-state-title">No follow-ups</div>
                        <div className="empty-state-text">Schedule your first follow-up above.</div>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Schedule Follow-Up</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Lead</label>
                                    <select className="form-control" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                                        <option value="">Select lead...</option>
                                        {allLeads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {['Call', 'Email', 'WhatsApp', 'Site Visit', 'Meeting'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date &amp; Time</label>
                                    <input type="datetime-local" className="form-control" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Assign Agent</label>
                                    <select className="form-control" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                        <option value="">Select agent...</option>
                                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What's this follow-up about?" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Schedule'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Composer */}
            {notifyTarget && (
                <NotificationComposer
                    onClose={() => setNotifyTarget(null)}
                    onSent={() => setNotifyTarget(null)}
                    prefillLead={notifyTarget}
                    prefillChannel="whatsapp"
                    triggerType="followup"
                />
            )}
        </div>
    );
}
