import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { followupsApi, leadsApi, usersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { 
    Plus, X, CheckCircle, Clock, AlertCircle, Calendar, Send, Phone, FileText, 
    LayoutGrid, List, Sparkles, Zap, TrendingUp, ShieldCheck, Filter, ChevronRight, BarChart2, History
} from 'lucide-react';
import { dialerEvents } from '../constants/events';
import NotificationComposer from '../components/NotificationComposer';
import { useMobile } from '../hooks/useMobile';

const TYPE_ICON = { Call: '📞', Email: '📧', WhatsApp: '💬', 'Site Visit': '🏠', Meeting: '🤝' };

function isOverdue(date) { return new Date(date) < new Date() && date; }
function isUrgent(date) {
    if (!date) return false;
    const diff = new Date() - new Date(date);
    return diff > 7200000; 
}

export default function Followups() {
    const { data: followups = [], loading, error, refetch } = useApi(followupsApi.list);
    const { data: agents = [] } = useApi(usersApi.list);
    const { data: allLeads = [] } = useApi(() => leadsApi.list({ limit: 1000 }));
    const { showToast } = useToast();
    const isMobile = useMobile();

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ lead_id: '', type: 'Call', scheduled_at: '', priority: 'High', notes: '', status: 'Pending' });
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterAgent, setFilterAgent] = useState('All');
    const [sortMode, setSortMode] = useState('time'); 
    const [viewMode, setViewMode] = useState('list'); 
    const [notifyTarget, setNotifyTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [previewLead, setPreviewLead] = useState(null);



    const filtered = (followups || []).filter(f => {
        const now = new Date();
        const scheduledDate = new Date(f.scheduled_at);
        const isToday = scheduledDate.toDateString() === now.toDateString();
        const isUpcomingDate = scheduledDate > now && !isToday;
        const isOverdueVal = scheduledDate < now && !isToday && f.status !== 'Completed';
        const isUrgentVal = isUrgent(f.scheduled_at) && f.status !== 'Completed';

        let ms = false;
        if (filterStatus === 'All') ms = true;
        else if (filterStatus === 'Pending') ms = f.status === 'Pending';
        else if (filterStatus === 'Completed') ms = f.status === 'Completed';
        else if (filterStatus === 'Critical') ms = isUrgentVal;
        else if (filterStatus === 'Overdue') ms = isOverdueVal;
        else if (filterStatus === 'Today') ms = isToday;
        else if (filterStatus === 'Upcoming') ms = isUpcomingDate;
        
        const ma = filterAgent === 'All' || String(f.assigned_to) === filterAgent;
        return ms && ma;
    }).sort((a, b) => {
        if (sortMode === 'score') {
            return (b.lead_score || 0) - (a.lead_score || 0);
        }
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });

    const toggle = async (id, currentStatus) => {
        try {
            await followupsApi.update(id, { status: currentStatus === 'Completed' ? 'Pending' : 'Completed' });
            refetch();
        } catch {
            showToast('Failed to update task', 'error');
        }
    };

    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('sourceId', id);
    };

    const handleDrop = async (e, targetCol) => {
        const id = e.dataTransfer.getData('sourceId');
        if (!id) return;
        
        const now = new Date();
        const updates = {};
        
        if (targetCol === 'Completed') {
            updates.status = 'Completed';
        } else {
            updates.status = 'Pending';
            if (targetCol === 'Today') {
                updates.scheduled_at = now.toISOString();
            } else if (targetCol === 'Overdue') {
                const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                updates.scheduled_at = yesterday.toISOString();
            } else if (targetCol === 'Upcoming') {
                const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1);
                updates.scheduled_at = tomorrow.toISOString();
            }
        }

        try {
            await followupsApi.update(id, updates);
            refetch();
            showToast(`Moved to ${targetCol}`, 'success');
        } catch {
            showToast('Move failed', 'error');
        }
    };

    const save = async () => {
        if (!form.lead_id || !form.scheduled_at) return showToast('Lead and date are required', 'warning');
        setSaving(true);
        try {
            await followupsApi.create(form);
            setShowModal(false);
            setForm({ lead_id: '', type: 'Call', scheduled_at: '', priority: 'High', notes: '', status: 'Pending' });
            refetch();
            showToast('Follow-up scheduled', 'success');
        } catch {
            showToast('Failed to schedule', 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteFu = async (id) => { try { await followupsApi.delete(id); refetch(); } catch { showToast('Delete failed', 'error'); } };

    const downloadSummary = async (leadId, leadName) => {
        try {
            const lead = await leadsApi.get(leadId);
            const interactions = lead?.interactions || [];
            
            if (interactions.length === 0) {
                showToast('No history found for this lead', 'info');
                return;
            }

            let text = `ZENTRIX CRM - LEAD INTERACTION SUMMARY\n`;
            text += `Lead: ${lead.name || leadName}\n`;
            text += `Phone: ${lead.phone || 'N/A'}\n`;
            text += `Status: ${lead.status || 'N/A'}\n`;
            text += `Generated: ${new Date().toLocaleString()}\n`;
            text += `====================================================\n\n`;
            
            interactions.forEach((entry, i) => {
                const date = new Date(entry.date).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                text += `${i + 1}. [${date}] ${entry.type.toUpperCase()}\n`;
                text += `   Agent: ${entry.agent_name || 'System'}\n`;
                text += `   Action/Note: ${entry.note || 'N/A'}\n`;
                text += `   ------------------------------------------------\n`;
            });

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `LeadSummary_${(lead.name || leadName).replace(/\s+/g, '_')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Lead summary downloaded!', 'success');
        } catch (err) {
            console.error('Summary error:', err);
            showToast('Failed to generate summary', 'error');
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const pending = (followups || []).filter(f => f.status === 'Pending').length;
    const completed = (followups || []).filter(f => f.status === 'Completed').length;
    const highPriority = (followups || []).filter(f => f.priority === 'High' && f.status === 'Pending').length;

    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '0' : '0 20px' }}>
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
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#fbbf24' }}>{pending}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>PENDING</div>
                            </div>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '40px' }} />
                            <button onClick={() => setShowModal(true)} style={{ background: 'white', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={18} strokeWidth={3} /> NEW TASK
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ padding: '12px 24px', background: 'white', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '12px', marginRight: '8px' }}>
                    <button onClick={() => setViewMode('list')} style={{ border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: viewMode === 'list' ? '#0f172a' : '#94a3b8' }}>
                        <List size={14} /> LIST
                    </button>
                    <button onClick={() => setViewMode('kanban')} style={{ border: 'none', background: viewMode === 'kanban' ? 'white' : 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: viewMode === 'kanban' ? '#0f172a' : '#94a3b8' }}>
                        <LayoutGrid size={14} /> KANBAN
                    </button>
                </div>
                <select className="form-control" style={{ width: 160, border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.75rem' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Critical">🚨 Critical</option>
                    <option value="Overdue">🕒 Overdue</option>
                    <option value="Today">📅 Today</option>
                    <option value="Upcoming">🚀 Upcoming</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                </select>
                <select className="form-control" style={{ width: 180, border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.75rem' }} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
                    <option value="All">All Agents</option>
                    {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div style={{ marginLeft: 'auto' }}>
                    <button onClick={() => setSortMode(prev => prev === 'time' ? 'score' : 'time')} style={{ border: '1px solid #e2e8f0', background: sortMode === 'score' ? '#0f172a' : 'white', color: sortMode === 'score' ? 'white' : '#64748b', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sortMode === 'score' ? <Sparkles size={12} /> : <Clock size={12} />}
                        {sortMode === 'score' ? 'WIN PROBABILITY' : 'TIME'}
                    </button>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    overflowX: 'auto', 
                    paddingBottom: '32px',
                    paddingRight: '40px',
                    marginRight: isMobile ? '-20px' : '-40px',
                    marginLeft: isMobile ? '-20px' : '0',
                    paddingLeft: isMobile ? '20px' : '0',
                    scrollbarWidth: 'thin'
                }}>
                    {['Overdue', 'Today', 'Upcoming', 'Completed'].map(col => {
                        const items = (filtered || []).filter(f => {
                            const date = new Date(f.scheduled_at); const now = new Date();
                            if (col === 'Completed') return f.status === 'Completed';
                            if (f.status === 'Completed') return false;
                            if (col === 'Overdue') return date < now && date.toDateString() !== now.toDateString();
                            if (col === 'Today') return date.toDateString() === now.toDateString();
                            if (col === 'Upcoming') return date > now && date.toDateString() !== now.toDateString();
                            return false;
                        });
                        return (
                            <div 
                                key={col} 
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDrop(e, col)}
                                style={{ 
                                    background: '#f8fafc', 
                                    padding: '12px', 
                                    borderRadius: '24px', 
                                    border: '1px solid #f1f5f9',
                                    minWidth: isMobile ? '85vw' : '320px',
                                    flexShrink: 0
                                }}
                            >
                                <h3 style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 950, 
                                    marginBottom: '16px', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em',
                                    color: '#64748b',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0 8px'
                                }}>
                                    {col} 
                                    <span style={{ opacity: 0.4 }}>{items.length}</span>
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {items.map(f => (
                                        <FollowupCard 
                                            key={f.id} f={f} isCompact onToggle={toggle} 
                                            onDial={dialerEvents.call} onNotify={setNotifyTarget} 
                                            onDownload={downloadSummary} onDelete={deleteFu} 
                                            onPreview={setPreviewLead} urgent={isUrgent(f.scheduled_at)} 
                                            onDragStart={e => handleDragStart(e, f.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <div style={{ minWidth: isMobile ? '20px' : '40px', flexShrink: 0 }} />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filtered.map(f => <FollowupCard key={f.id} f={f} onToggle={toggle} onDial={dialerEvents.call} onNotify={setNotifyTarget} onDownload={downloadSummary} onDelete={deleteFu} onPreview={setPreviewLead} urgent={isUrgent(f.scheduled_at)} />)}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Schedule Follow-Up</h3></div>
                        <div className="modal-body">
                            <select className="form-control" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}><option value="">Select Lead...</option>{allLeads?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                            <input type="datetime-local" className="form-control mt-2" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                            <textarea className="form-control mt-2" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes..."></textarea>
                        </div>
                        <div className="modal-footer"><button className="btn btn-primary" onClick={save} disabled={saving}>Schedule</button></div>
                    </div>
                </div>
            )}

            {notifyTarget && (
                <NotificationComposer onClose={() => setNotifyTarget(null)} onSent={() => setNotifyTarget(null)} prefillLead={notifyTarget} prefillChannel="whatsapp" triggerType="followup" />
            )}

            {previewLead && (
                <LeadContextDrawer id={previewLead} onClose={() => setPreviewLead(null)} onDial={dialerEvents.call} />
            )}
        </div>
    );
}

function FollowupCard({ f, isCompact, onToggle, onDial, onNotify, onDownload, onDelete, onPreview, urgent, onDragStart }) {
    const date = new Date(f.scheduled_at);
    const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

    return (
        <div 
            draggable={onDragStart ? "true" : "false"}
            onDragStart={onDragStart}
            className={`premium-card hover-lift ${urgent && f.status === 'Pending' ? 'shimmer-urgent' : ''}`} 
            style={{
                padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                background: 'white',
                opacity: f.status === 'Completed' ? 0.6 : 1,
                position: 'relative',
                boxShadow: urgent && f.status === 'Pending' ? '0 0 15px rgba(244, 63, 94, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
                border: urgent && f.status === 'Pending' ? '1px solid #fecdd3' : '1px solid #f1f5f9',
                borderRadius: '16px',
                cursor: onDragStart ? 'grab' : 'default'
            }}
        >
            {/* Live Indicator Dot */}
            <div style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '5px', height: '5px', borderRadius: '50%',
                background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
            }} />

            {/* Left: Status Toggle */}
            <button
                onClick={() => onToggle(f.id, f.status)}
                style={{
                    width: 20, height: 20, borderRadius: '6px', border: '1.5px solid',
                    borderColor: f.status === 'Completed' ? '#10b981' : '#e2e8f0',
                    background: f.status === 'Completed' ? '#10b981' : 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
            >
                {f.status === 'Completed' && <CheckCircle size={10} color="white" strokeWidth={4} />}
            </button>

            {/* Middle: Lead Context */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                    <span onClick={() => onPreview(f.lead_id || f.leadId)} style={{ fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', color: '#0f172a' }} className="hover-underline">
                        {f.lead_name || f.leadName}
                    </span>
                    {f.lead_score && <span style={{ padding: '1px 4px', borderRadius: '4px', background: '#ecfdf5', color: '#059669', fontSize: '0.55rem', fontWeight: 900 }}>{f.lead_score}%</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.notes || 'No notes...'}
                </div>
            </div>

            {/* Right: Date, Time & Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 900, color: '#1e293b' }}>
                        <Calendar size={12} color="#94a3b8" /> {day}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                    {f.status !== 'Completed' ? (
                        <>
                            <button className="icon-btn-sm" onClick={() => onDial(f.lead_id, f.lead_phone, f.lead_name)} style={{ background: '#0f172a', color: 'white', width: '32px', height: '32px', borderRadius: '10px' }}>
                                <Phone size={14} />
                            </button>
                            <button className="icon-btn-sm" onClick={() => onNotify({ id: f.lead_id, name: f.lead_name })} style={{ background: '#10b981', color: 'white', width: '32px', height: '32px', borderRadius: '10px' }}>
                                <Send size={14} />
                            </button>
                        </>
                    ) : (
                        <button className="icon-btn-sm" onClick={() => onDelete(f.id)} style={{ background: '#fee2e2', color: '#f43f5e', width: '32px', height: '32px', borderRadius: '10px' }}>
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function LeadContextDrawer({ id, onClose, onDial }) {
    const { data: lead, loading } = useApi(() => leadsApi.get(id));
    if (loading || !lead) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ 
                width: '480px', 
                borderRadius: '32px', 
                position: 'fixed',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button 
                    onClick={onClose} 
                    style={{ 
                        position: 'absolute', top: '24px', right: '24px', 
                        background: '#f1f5f9', border: 'none', width: '36px', height: '36px', 
                        borderRadius: '12px', cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}
                >
                    <X size={18} color="#64748b" />
                </button>

                <div className="modal-header" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '24px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900 }}>{lead.name?.charAt(0)}</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950 }}>{lead.name}</h2>
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{lead.stage} STAGE</span>
                        </div>
                    </div>
                </div>
                <div className="modal-body" style={{ padding: '0 32px 32px' }}>
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>LEAD SCORE</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 950, color: lead.score > 70 ? '#10b981' : '#f43f5e' }}>{lead.score || 0}%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>BUDGET</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 950 }}>₹{lead.budget || 'N/A'}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Project: {lead.project_name || 'General Inquiry'}</div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><History size={14} /> RECENT HISTORY</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(lead.interactions || []).slice(0, 3).map((it, i) => (
                                <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', borderLeft: '3px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{it.type}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{it.note}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => onDial(lead.id, lead.phone, lead.name)} style={{ width: '100%', height: '56px', borderRadius: '20px', fontSize: '1rem', fontWeight: 900, gap: '12px' }}>
                        <Phone size={20} /> CALL NOW
                    </button>
                </div>
            </div>
        </div>
    );
}
