import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { followupsApi, leadsApi, usersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, X, CheckCircle, Clock, AlertCircle, Calendar, Send, Phone } from 'lucide-react';
import { dialerEvents } from '../constants/events';
import NotificationComposer from '../components/NotificationComposer';
import { useMobile } from '../hooks/useMobile';

const TYPE_ICON = { Call: '📞', Email: '📧', WhatsApp: '💬', 'Site Visit': '🏠', Meeting: '🤝' };
const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-slate' };

const DEFAULT_FORM = {
    leadId: 1, type: 'Call', date: '', time: '10:00',
    agent: 3, priority: 'High', note: '', status: 'Pending',
};

export default function Followups() {
    const { showToast } = useToast();
    const isMobile = useMobile();
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
        <div className="animate-fadeIn" style={{ padding: isMobile ? '0' : '0 20px' }}>
            {/* 💎 Intelligence Ribbon */}
            <div className="premium-card shimmer-ai" style={{ 
                background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`, 
                padding: isMobile ? '24px' : '32px 40px', color: 'white', marginBottom: '32px', border: 'none',
                borderRadius: isMobile ? '0' : '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                             <Clock size={16} color="#fbbf24" strokeWidth={2.5} />
                             <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                Outreach Intelligence
                             </span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2.2rem', fontWeight: 950, letterSpacing: '-1px', lineHeight: 1, color: 'white' }}>
                            Follow-Up <span style={{ color: '#fbbf24' }}>Queue</span>
                        </h1>
                        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600, maxWidth: '500px' }}>
                            Managing {pending} active threads and {highPriority} critical synchronizations.
                        </p>
                    </div>

                    {!isMobile && (
                        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                            {[
                                { label: 'Pending', val: pending, color: '#fbbf24' },
                                { label: 'Critical', val: highPriority, color: '#f43f5e' },
                                { label: 'Success', val: completed, color: '#10b981' }
                            ].map((stat, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 950, color: stat.color, letterSpacing: '-0.5px' }}>{stat.val}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{stat.label}</div>
                                </div>
                            ))}
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '40px' }} />
                            <button className="hover-lift" onClick={() => setShowModal(true)} style={{ 
                                background: 'white', color: '#0f172a', border: 'none', padding: '12px 24px', 
                                borderRadius: '14px', fontWeight: 900, fontSize: '0.85rem', display: 'flex', 
                                alignItems: 'center', gap: '8px', cursor: 'pointer' 
                            }}>
                                <Plus size={18} strokeWidth={3} /> SCHEDULE TASK
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isMobile && (
                <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '100%', marginBottom: 20, borderRadius: 16, height: 50, fontWeight: 900 }}>
                    <Plus size={18} /> SCHEDULE NEW TASK
                </button>
            )}

            {/* Filters Bar */}
            <div className="premium-card" style={{ 
                padding: '12px 24px', background: 'white', marginBottom: '24px', 
                display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '18px'
            }}>
                <select className="form-control" style={{ width: 160, border: 'none', background: '#f8fafc', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option>Pending</option>
                    <option>Completed</option>
                </select>
                <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
                <select className="form-control" style={{ width: 180, border: 'none', background: '#f8fafc', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
                    <option value="All">All Agents</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filtered.map(f => (
                    <div key={f.id} className="premium-card hover-lift" style={{
                        padding: '20px 24px',
                        display: 'flex', alignItems: 'center', gap: '20px',
                        background: 'white',
                        opacity: f.status === 'Completed' ? 0.6 : 1,
                    }}>
                        {/* Toggle & Type */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                            <button
                                onClick={() => toggle(f.id, f.status)}
                                style={{
                                    width: 28, height: 28, borderRadius: '10px',
                                    border: '2px solid',
                                    borderColor: f.status === 'Completed' ? '#10b981' : '#e2e8f0',
                                    background: f.status === 'Completed' ? '#10b981' : 'white',
                                    color: 'white', cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {f.status === 'Completed' && <CheckCircle size={14} strokeWidth={3} />}
                            </button>
                            <div style={{
                                width: 44, height: 44, borderRadius: '14px',
                                background: f.priority === 'High' ? '#fff1f2' : f.priority === 'Medium' ? '#fffbeb' : '#f8fafc',
                                border: `1px solid ${f.priority === 'High' ? '#fecdd3' : f.priority === 'Medium' ? '#fde68a' : '#e2e8f0'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem'
                            }}>
                                {TYPE_ICON[f.type] || '📋'}
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', textDecoration: f.status === 'Completed' ? 'line-through' : 'none' }}>
                                    {f.lead_name || f.leadName}
                                </span>
                                <span style={{ 
                                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 900, 
                                    textTransform: 'uppercase', background: '#f1f5f9', color: '#64748b' 
                                }}>{f.type}</span>
                                {f.priority === 'High' && <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', background: '#f43f5e', color: 'white' }}>CRITICAL</span>}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.notes || f.note || 'No additional notes provided.'}
                            </div>
                        </div>

                        {/* Meta & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 900, fontSize: '0.9rem', justifyContent: 'flex-end' }}>
                                    <Calendar size={14} color="#64748b" />
                                    {f.scheduled_at ? new Date(f.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginTop: '2px' }}>
                                    @{f.scheduled_at ? new Date(f.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Anytime'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {f.status !== 'Completed' ? (
                                    <>
                                        <button 
                                            className="hover-lift"
                                            onClick={() => dialerEvents.call(f.lead_id || f.leadId, f.lead_phone || f.leadPhone, f.lead_name || f.leadName)}
                                            style={{ background: '#0f172a', color: 'white', border: 'none', width: 40, height: 40, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Phone size={18} />
                                        </button>
                                        <button 
                                            className="hover-lift"
                                            onClick={() => setNotifyTarget({ id: f.lead_id || f.leadId, name: f.lead_name || f.leadName })}
                                            style={{ background: '#10b981', color: 'white', border: 'none', width: 40, height: 40, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => deleteFu(f.id)}
                                        style={{ background: '#fee2e2', color: '#f43f5e', border: 'none', width: 40, height: 40, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
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
