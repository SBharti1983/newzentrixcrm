import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { followupsApi, leadsApi, usersApi, marketingApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { 
    Plus, X, CheckCircle, Clock, AlertCircle, Calendar, Send, Phone, FileText, 
    LayoutGrid, List, Sparkles, Zap, TrendingUp, ShieldCheck, Filter, ChevronRight, BarChart2, History, Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
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
    const { data: drips = [] } = useApi(marketingApi.getDrips);
    const isMobile = useMobile();
    const { showToast } = useToast();

    // Map leads for quick attribute lookup (score/budget)
    const leadMap = useMemo(() => {
        const map = {};
        const data = allLeads?.data || allLeads || [];
        data.forEach(l => { map[l.id] = l; });
        return map;
    }, [allLeads]);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ lead_id: '', type: 'Call', scheduled_at: '', priority: 'High', notes: '', status: 'Pending', mode: 'single', drip_id: '' });
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterAgent, setFilterAgent] = useState('All');
    const [sortMode, setSortMode] = useState('time'); 
    const [viewMode, setViewMode] = useState('list'); 
    const [notifyTarget, setNotifyTarget] = useState(null);

    // Reset viewMode to 'list' on mobile if somehow initialized/left in kanban/calendar
    useEffect(() => {
        if (isMobile && (viewMode === 'kanban')) {
            setViewMode('list');
        }
    }, [isMobile, viewMode]);
    const [saving, setSaving] = useState(false);
    const [previewLead, setPreviewLead] = useState(null);
    const [hoverContext, setHoverContext] = useState(null); // { x, y, lead }
    const [isTeamView, setIsTeamView] = useState(false);
    const { user } = useAuth();
    const canManageTeam = user?.role === 'admin' || user?.role === 'sales_manager';

    const handleHover = (e, lead) => {
        if (!lead) {
            setHoverContext(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverContext({
            x: rect.left,
            y: rect.top,
            lead
        });
    };



    const filtered = (followups || []).filter(f => {
        if (!f || !f.scheduled_at) return false;
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
        
        if (isTeamView) {
            // Team mode focuses on Overdue/Urgent tasks across all agents
            return (isOverdueVal || isUrgentVal) && ma;
        }

        return ms && ma;
    }).sort((a, b) => {
        if (!a || !b) return 0;
        if (sortMode === 'score') {
            const getScore = (f) => f.lead_score || leadMap[f.lead_id]?.score || 0;
            return getScore(b) - getScore(a);
        }
        if (sortMode === 'value') {
            const getVal = (f) => {
                const lead = leadMap[f.lead_id];
                const budget = f.lead_budget || lead?.budget;
                if (!budget) return 0;
                const numeric = parseFloat(String(budget).replace(/[^0-9.]/g, '')) || 0;
                if (String(budget).toUpperCase().includes('L')) return numeric * 100000;
                if (String(budget).toUpperCase().includes('CR')) return numeric * 10000000;
                return numeric;
            };
            return getVal(b) - getVal(a);
        }
        return new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
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
        if (!form.lead_id) return showToast('Select a lead', 'error');

        if (form.mode === 'sequence') {
            if (!form.drip_id) return showToast('Select a sequence', 'error');
            setSaving(true);
            try {
                // Enrollment API expects an array of lead IDs
                await marketingApi.enrollLeads(form.drip_id, [form.lead_id]);
                showToast('Smart Sequence deployed! Monitoring for engagement...', 'success');
                setShowModal(false);
                setForm({ lead_id: '', type: 'Call', scheduled_at: '', priority: 'High', notes: '', status: 'Pending', mode: 'single', drip_id: '' });
                refetch();
            } catch (err) {
                console.error('Sequence Enrollment Error:', err);
                showToast('Failed to start sequence automation', 'error');
                setSaving(false);
            }
            return;
        }

        if (!form.scheduled_at) return showToast('Select date/time', 'error');
        setSaving(true);
        try {
            await followupsApi.create(form);
            setShowModal(false);
            setForm({ lead_id: '', type: 'Call', scheduled_at: '', priority: 'High', notes: '', status: 'Pending', mode: 'single', drip_id: '' });
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

    const reassign = async (taskId, newAgentId) => {
        try {
            await followupsApi.update(taskId, { assigned_to: newAgentId });
            showToast('Task re-assigned successfully', 'success');
            refetch();
        } catch {
            showToast('Re-assignment failed', 'error');
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const pending = (followups || []).filter(f => f.status === 'Pending').length;
    const completed = (followups || []).filter(f => f.status === 'Completed').length;
    const overdue = (followups || []).filter(f => f.status === 'Pending' && new Date(f.scheduled_at) < new Date()).length;
    const highPriority = (followups || []).filter(f => f.priority === 'High' && f.status === 'Pending').length;

    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '0' : '0 20px', paddingBottom: isMobile ? 100 : 0 }}>
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
                            Managing {pending} active threads and {overdue} overdue actions.
                        </p>
                    </div>

                    {!isMobile && (
                        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#fbbf24' }}>{pending}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>PENDING</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#f43f5e' }}>{overdue}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>OVERDUE</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#10b981' }}>{completed}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>DONE</div>
                            </div>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '40px' }} />
                                <button onClick={() => setShowModal(true)} style={{ background: 'white', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={18} strokeWidth={3} /> NEW TASK
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Mini Stats Row */}
                {isMobile && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', padding: '8px 0', borderRadius: 10 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#fbbf24' }}>{pending}</div>
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Pending</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', padding: '8px 0', borderRadius: 10 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#f43f5e' }}>{overdue}</div>
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Overdue</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', padding: '8px 0', borderRadius: 10 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#10b981' }}>{completed}</div>
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Done</div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: isMobile ? '8px 12px' : '12px 24px', background: 'white', marginBottom: isMobile ? '12px' : '24px', display: 'flex', gap: isMobile ? '6px' : '12px', alignItems: 'center', borderRadius: isMobile ? '12px' : '18px', border: '1px solid #f1f5f9', flexWrap: isMobile ? 'wrap' : 'nowrap', overflowX: isMobile ? 'auto' : 'visible' }}>
                <div style={{ display: 'flex', background: '#f8fafc', padding: '3px', borderRadius: '10px', marginRight: isMobile ? '0' : '8px', flexShrink: 0 }}>
                    <button onClick={() => setViewMode('list')} style={{ border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', padding: isMobile ? '5px 8px' : '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: viewMode === 'list' ? '#0f172a' : '#94a3b8', fontSize: isMobile ? '0.65rem' : 'inherit' }}>
                        <List size={isMobile ? 12 : 14} /> {isMobile ? '' : 'LIST'}
                    </button>
                    {!isMobile && (
                        <button onClick={() => setViewMode('kanban')} style={{ border: 'none', background: viewMode === 'kanban' ? 'white' : 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: viewMode === 'kanban' ? '#0f172a' : '#94a3b8' }}>
                            <LayoutGrid size={14} /> KANBAN
                        </button>
                    )}
                    <button onClick={() => setViewMode('calendar')} style={{ border: 'none', background: viewMode === 'calendar' ? 'white' : 'transparent', padding: isMobile ? '5px 8px' : '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: viewMode === 'calendar' ? '#0f172a' : '#94a3b8', fontSize: isMobile ? '0.65rem' : 'inherit' }}>
                        <Calendar size={isMobile ? 12 : 14} /> {isMobile ? '' : 'CALENDAR'}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', flex: isMobile ? '1 1 100%' : 'none', order: isMobile ? 1 : 0 }}>
                    {['All', 'Today', 'Upcoming', 'Overdue', 'Completed'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} style={{
                            padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: '12px', border: '1px solid',
                            background: filterStatus === s ? 'var(--navy-600)' : 'white',
                            color: filterStatus === s ? 'white' : 'var(--slate-600)',
                            borderColor: filterStatus === s ? 'var(--navy-600)' : 'var(--border-medium)',
                            fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s'
                        }}>{s}</button>
                    ))}
                </div>
                {canManageTeam && !isMobile && (
                    <>
                        <select className="form-control" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
                            style={{ width: 'auto', minWidth: '130px', fontSize: '0.8rem', padding: '7px 12px', borderRadius: '12px' }}>
                            <option value="All">All Agents</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: isTeamView ? '#eff6ff' : '#f8fafc', borderRadius: '10px', border: isTeamView ? '1px solid #bfdbfe' : '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isTeamView ? '#3b82f6' : '#64748b' }}>TEAM MODE</span>
                            <div 
                                onClick={() => setIsTeamView(!isTeamView)}
                                style={{ width: '32px', height: '18px', background: isTeamView ? '#3b82f6' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}
                            >
                                <div style={{ position: 'absolute', top: '2px', left: isTeamView ? '16px' : '2px', width: '14px', height: '14px', background: 'white', borderRadius: '50%', transition: 'all 0.3s' }} />
                            </div>
                        </div>
                    </>
                )}

                {!isMobile && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => {
                                if (sortMode === 'time') setSortMode('score');
                                else if (sortMode === 'score') setSortMode('value');
                                else setSortMode('time');
                            }} 
                            style={{ 
                                border: '1px solid #e2e8f0', 
                                background: sortMode !== 'time' ? '#0f172a' : 'white', 
                                color: sortMode !== 'time' ? 'white' : '#64748b', 
                                padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '150px', justifyContent: 'center' 
                            }}
                        >
                            {sortMode === 'time' ? <Clock size={12} /> : sortMode === 'score' ? <Sparkles size={12} /> : <TrendingUp size={12} />}
                            {sortMode === 'time' ? 'SORT: TIME' : sortMode === 'score' ? 'WIN PROBABILITY' : 'DEAL VALUE'}
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'kanban' ? (
                <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '20px' : '16px', 
                    overflowX: isMobile ? 'auto' : 'hidden', 
                    paddingBottom: isMobile ? '32px' : '0',
                    paddingRight: isMobile ? '40px' : '0',
                    marginRight: isMobile ? '-20px' : '0',
                    marginLeft: isMobile ? '-20px' : '0',
                    paddingLeft: isMobile ? '20px' : '0',
                    scrollbarWidth: 'none',
                    width: '100%'
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
                                    padding: isMobile ? '12px' : '8px', 
                                    borderRadius: '24px', 
                                    border: '1px solid #f1f5f9',
                                    minWidth: isMobile ? '85vw' : '0',
                                    flex: isMobile ? '0 0 auto' : '1',
                                    flexShrink: isMobile ? 0 : 1
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
                                    {items.map(f => {
                                        const lead = leadMap[f.lead_id];
                                        const budget = f.lead_budget || lead?.budget;
                                        const score = f.lead_score || lead?.score || 0;
                                        const budgetVal = budget ? (parseFloat(String(budget).replace(/[^0-9.]/g, '')) || 0) : 0;
                                        const isCr = String(budget).toUpperCase().includes('CR');
                                        const isL = String(budget).toUpperCase().includes('L') || (!isCr && budgetVal < 10000000 && budgetVal >= 100000);
                                        const absoluteValue = isCr ? budgetVal * 10000000 : (isL ? budgetVal * 100000 : budgetVal);
                                        const isHighValue = (score > 85 || absoluteValue >= 5000000);

                                        return (
                                            <FollowupCard 
                                                key={f.id} f={f} isCompact isHighValue={isHighValue} leadDetails={lead}
                                                onToggle={toggle} 
                                                onDial={(id, phone, name) => dialerEvents.call(id, phone, name)} onNotify={setNotifyTarget} 
                                                onDownload={downloadSummary} onDelete={deleteFu} 
                                                onPreview={setPreviewLead} urgent={isUrgent(f.scheduled_at)} 
                                                onDragStart={e => handleDragStart(e, f.id)}
                                                onHover={handleHover}
                                                isTeamView={isTeamView}
                                                agents={agents}
                                                onReassign={reassign}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {isMobile && <div style={{ minWidth: '20px', flexShrink: 0 }} />}
                </div>
            ) : viewMode === 'calendar' ? (
                <div className="calendar-view animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', background: 'var(--border-light)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} style={{ background: '#f8fafc', padding: '12px 4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase' }}>{isMobile ? day.charAt(0) : day}</div>
                    ))}
                    {(() => {
                        const days = [];
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                        
                        for(let i = 0; i < firstDay; i++) {
                            days.push(<div key={`empty-${i}`} style={{ background: 'white', minHeight: isMobile ? '80px' : '120px' }}></div>);
                        }

                        for(let d = 1; d <= daysInMonth; d++) {
                            const dateStr = new Date(currentYear, currentMonth, d).toDateString();
                            const dayTasks = (filtered || []).filter(f => new Date(f.scheduled_at).toDateString() === dateStr);
                            const isToday = now.toDateString() === dateStr;

                            days.push(
                                <div key={`day-${d}`} style={{ 
                                    background: isToday ? '#eff6ff' : 'white', 
                                    minHeight: isMobile ? '80px' : '120px', 
                                    padding: isMobile ? '4px' : '8px', 
                                    display: 'flex', flexDirection: 'column', 
                                    transition: 'background 0.2s', borderTop: '1px solid var(--border-light)', borderLeft: '1px solid var(--border-light)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isToday ? '#3b82f6' : 'var(--navy-900)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday ? 'white' : 'transparent', boxShadow: isToday ? '0 2px 4px rgba(59,130,246,0.15)' : 'none' }}>{d}</span>
                                        {dayTasks.length > 0 && !isMobile && <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'white', background: '#fbbf24', padding: '2px 6px', borderRadius: '8px' }}>{dayTasks.length}</span>}
                                        {dayTasks.length > 0 && isMobile && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }}></div>}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, scrollbarWidth: 'none' }}>
                                        {dayTasks.slice(0, isMobile ? 1 : 3).map(f => {
                                            const lead = leadMap[f.lead_id];
                                            const isDone = f.status === 'Completed';
                                            return (
                                                <div key={f.id} style={{ 
                                                    fontSize: '0.65rem', padding: '4px 6px', borderRadius: '6px', 
                                                    background: isDone ? '#ecfdf5' : 'var(--slate-50)', 
                                                    border: `1px solid ${isDone ? '#a7f3d0' : '#e2e8f0'}`, 
                                                    color: isDone ? '#059669' : 'var(--navy-600)', 
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 800 
                                                }}>
                                                    {isMobile ? TYPE_ICON[f.type] : `${lead?.name?.split(' ')[0] || 'Unk.'} - ${TYPE_ICON[f.type] || f.type}`}
                                                </div>
                                            )
                                        })}
                                        {dayTasks.length > (isMobile ? 1 : 3) && (
                                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textAlign: 'center', marginTop: '2px' }}>+{dayTasks.length - (isMobile ? 1 : 3)} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return days;
                    })()}
                </div>
            ) : (
                <div className="timeline-view" style={{ position: 'relative', paddingLeft: isMobile ? '12px' : '32px' }}>
                    {/* Vertical Timeline Thread */}
                    <div style={{ position: 'absolute', left: isMobile ? '12px' : '32px', top: '20px', bottom: '20px', width: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>
                    
                    {(() => {
                        // Smart Activity Queues auto-grouping logic
                        const groups = {
                            'Overdue / Urgent': [],
                            'Today': [],
                            'Tomorrow': [],
                            'Later This Week': [],
                            'Future Scheduled': [],
                            'Completed': []
                        };
                        const now = new Date();
                        const todayStr = now.toDateString();
                        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
                        const tomorrowStr = tomorrow.toDateString();
                        const in5Days = new Date(now); in5Days.setDate(now.getDate() + 5);
                        
                        filtered.forEach(f => {
                            if (f.status === 'Completed') return groups['Completed'].push(f);
                            const d = new Date(f.scheduled_at);
                            if (d < now && d.toDateString() !== todayStr) groups['Overdue / Urgent'].push(f);
                            else if (d.toDateString() === todayStr) groups['Today'].push(f);
                            else if (d.toDateString() === tomorrowStr) groups['Tomorrow'].push(f);
                            else if (d < in5Days) groups['Later This Week'].push(f);
                            else groups['Future Scheduled'].push(f);
                        });

                        return Object.entries(groups).filter(([_, items]) => items.length > 0).map(([groupName, items], gIdx) => (
                            <div key={groupName} className="animate-fadeIn" style={{ position: 'relative', marginBottom: '32px', zIndex: 1 }}>
                                {/* Timeline Node Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', transform: isMobile ? 'translateX(-12px)' : 'translateX(-24px)', zIndex: 2 }}>
                                    <div style={{ 
                                        width: '48px', height: '28px', borderRadius: '16px', 
                                        background: groupName.includes('Overdue') ? 'var(--rose-50)' : groupName === 'Today' ? 'var(--blue-50)' : groupName === 'Completed' ? 'var(--emerald-50)' : 'white',
                                        border: `2px solid ${groupName.includes('Overdue') ? 'var(--rose-500)' : groupName === 'Today' ? 'var(--blue-500)' : groupName === 'Completed' ? 'var(--emerald-500)' : 'var(--slate-300)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 900,
                                        color: groupName.includes('Overdue') ? 'var(--rose-700)' : groupName === 'Today' ? 'var(--blue-700)' : groupName === 'Completed' ? 'var(--emerald-700)' : 'var(--slate-500)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexShrink: 0
                                    }}>
                                        {items.length}
                                    </div>
                                    <h2 style={{ 
                                        margin: 0, fontSize: '1rem', fontWeight: 900,
                                        color: groupName.includes('Overdue') ? 'var(--rose-600)' : groupName === 'Today' ? 'var(--blue-700)' : 'var(--navy-900)'
                                    }}>{groupName.toUpperCase()}</h2>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)', display: isMobile ? 'none' : 'block' }}></div>
                                </div>
                                
                                {/* Group Items */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: isMobile ? '16px' : '40px' }}>
                                    {items.map(f => {
                                        const lead = leadMap[f.lead_id];
                                        const budgetVal = lead?.budget ? (parseFloat(String(lead.budget).replace(/[^0-9.]/g, '')) || 0) : 0;
                                        const isCr = String(lead?.budget).toUpperCase().includes('CR');
                                        const isL = String(lead?.budget).toUpperCase().includes('L') || (!isCr && budgetVal < 10000000 && budgetVal >= 100000);
                                        const absoluteValue = isCr ? budgetVal * 10000000 : (isL ? budgetVal * 100000 : budgetVal);
                                        const isHighValue = (f.lead_score > 85 || absoluteValue >= 5000000);

                                        return (
                                            <FollowupCard 
                                                key={f.id} f={f} isHighValue={isHighValue} leadDetails={lead}
                                                onToggle={toggle} onDial={(id, phone, name) => dialerEvents.call(id, phone, name)} 
                                                onNotify={setNotifyTarget} onDownload={downloadSummary} 
                                                onDelete={deleteFu} onPreview={setPreviewLead} 
                                                urgent={isUrgent(f.scheduled_at)} 
                                                onHover={handleHover}
                                                isTeamView={isTeamView}
                                                agents={agents}
                                                onReassign={reassign}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Schedule Follow-Up</h3></div>
                        <div className="modal-body">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Orchestration Mode</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                                <button 
                                    onClick={() => setForm({...form, mode: 'single'})}
                                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: form.mode === 'single' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: form.mode === 'single' ? '#0f172a' : '#64748b', transition: 'all 0.2s', boxShadow: form.mode === 'single' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Clock size={14}/> Single Task</div>
                                </button>
                                <button 
                                    onClick={() => setForm({...form, mode: 'sequence'})}
                                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: form.mode === 'sequence' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: form.mode === 'sequence' ? 'var(--navy-600)' : '#64748b', transition: 'all 0.2s', boxShadow: form.mode === 'sequence' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Sparkles size={14}/> Smart Sequence</div>
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Target Lead</label>
                                    <select className="form-control" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}><option value="">Select Lead...</option>{(allLeads?.data || allLeads)?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                                </div>

                                {form.mode === 'sequence' ? (
                                    <div className="animate-fadeIn">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Automation Sequence (Omnichannel)</label>
                                        <select className="form-control" value={form.drip_id} onChange={e => setForm({ ...form, drip_id: e.target.value })}>
                                            <option value="">Select Active Sequence...</option>
                                            {(!drips || (Array.isArray(drips) ? drips : drips?.data || []).length === 0) ? (
                                                <option value="" disabled>No active sequences configured (Go to Marketing)</option>
                                            ) : (
                                                (Array.isArray(drips) ? drips : drips?.data || []).map(d => (
                                                    <option key={d.id} value={d.id}>{d.name} {d.steps_count ? `(${d.steps_count} Automated Steps)` : ''}</option>
                                                ))
                                            )}
                                        </select>
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px dashed rgba(99, 102, 241, 0.2)' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                <Zap size={14} color="var(--navy-600)" style={{ marginTop: '2px' }}/>
                                                <p style={{ fontSize: '0.75rem', color: '#444', lineHeight: 1.4, margin: 0 }}>This will enroll the lead into a <strong>pre-configured multi-day journey</strong>. The automation engine will handle all outreaches perfectly timed.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Follow-up Channel</label>
                                                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{Object.keys(TYPE_ICON).map(t => <option key={t}>{t}</option>)}</select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Priority</label>
                                                <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Schedule Time</label>
                                            <input type="datetime-local" className="form-control" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Task Strategy & Notes</label>
                                            <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What is the objective of this follow-up?"></textarea>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ fontWeight: 700 }}>Discard</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '10px 24px', borderRadius: '10px', background: form.mode === 'sequence' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : undefined, border: 'none' }}>
                                {saving ? 'Deploying...' : form.mode === 'sequence' ? 'Deploy Smart Sequence 🚀' : 'Schedule Single Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notifyTarget && (
                <NotificationComposer onClose={() => setNotifyTarget(null)} onSent={() => setNotifyTarget(null)} prefillLead={notifyTarget} prefillChannel="whatsapp" triggerType="followup" />
            )}

            {previewLead && (
                <LeadContextDrawer id={previewLead} onClose={() => setPreviewLead(null)} onDial={dialerEvents.call} />
            )}

            {hoverContext && !isMobile && (
                <QuickViewTooltip context={hoverContext} />
            )}

            {/* Mobile FAB: New Task */}
            {isMobile && (
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        position: 'fixed',
                        bottom: 85,
                        right: 80,
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 9998,
                        transition: 'transform 0.2s'
                    }}
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            )}
        </div>
    );
}

function QuickViewTooltip({ context }) {
    const { x, y, lead } = context;
    return (
        <div style={{
            position: 'fixed', left: x, top: y, transform: 'translateY(-105%)',
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
            padding: '16px', borderRadius: '16px', color: 'white', zIndex: 10000,
            width: '280px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)', pointerEvents: 'none',
            animation: 'fadeInUp 0.2s ease-out'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>{lead.name?.charAt(0)}</div>
                <div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{lead.name}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>{lead.stage}</div>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Budget</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>₹{lead.budget || 'N/A'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Win Prob.</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: (lead.score || 0) > 70 ? '#10b981' : '#fbbf24' }}>{lead.score || 0}%</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Preferred Project</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{lead.project_name || 'General Inquiry'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Last Interaction</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'No history yet'}</div>
                </div>
            </div>
        </div>
    );
}

function FollowupCard({ f, isCompact, isHighValue, leadDetails, onToggle, onDial, onNotify, onDownload, onDelete, onPreview, urgent, onDragStart, onHover, isTeamView, agents, onReassign }) {
    if (!f) return null;
    const date = new Date(f.scheduled_at || Date.now());
    const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    const isMobile = useMobile();
    const score = f.lead_score || leadDetails?.score || 0;
    const budget = f.lead_budget || leadDetails?.budget;

    return (
        <div 
            draggable={onDragStart ? "true" : "false"}
            onDragStart={onDragStart}
            className={`premium-card hover-lift ${isHighValue ? 'shimmer-highvalue' : (urgent && f.status === 'Pending' ? 'shimmer-urgent' : '')}`} 
            style={{
                padding: isCompact || isMobile ? '16px 20px' : '14px 20px',
                display: 'flex', 
                flexDirection: isCompact || isMobile ? 'column' : 'row',
                alignItems: isCompact || isMobile ? 'flex-start' : 'center', 
                gap: isCompact || isMobile ? '10px' : 0,
                background: 'white',
                minHeight: isCompact ? '110px' : 'auto',
                opacity: f.status === 'Completed' ? 0.6 : 1,
                position: 'relative',
                boxShadow: isHighValue ? '0 0 25px rgba(251, 191, 36, 0.15)' : (urgent && f.status === 'Pending' ? '0 0 15px rgba(244, 63, 94, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)'),
                border: isHighValue ? '2px solid #fbbf24' : (urgent && f.status === 'Pending' ? '1px solid #fecdd3' : (isTeamView ? '1.5px solid #3b82f644' : '1px solid #f1f5f9')),
                borderRadius: isMobile ? '16px' : '24px',
                cursor: onDragStart ? 'grab' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            {/* Live Status Glow */}
            <div style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '6px', height: '6px', borderRadius: '50%',
                background: isHighValue ? '#fbbf24' : (isTeamView ? '#3b82f6' : '#10b981'), 
                boxShadow: isHighValue ? '0 0 10px #fbbf24' : (isTeamView ? '0 0 10px #3b82f6' : '0 0 8px rgba(16, 185, 129, 0.6)')
            }} />

            {/* High Value Label */}
            {isHighValue && (
                <div style={{ position: 'absolute', top: '-10px', left: '20px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: 'white', fontSize: '10px', fontWeight: 950, padding: '2px 8px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)', letterSpacing: '0.05em', zIndex: 1 }}>
                    HIGH ROI OPPORTUNITY
                </div>
            )}

            {/* Left Column: Status (Only in List View or Absolute in Compact) */}
            <div style={{ 
                width: (isCompact || isMobile) ? 'auto' : '40px', 
                flexShrink: 0,
                position: (isCompact || isMobile) ? 'absolute' : 'static', 
                top: (isCompact || isMobile) ? '20px' : 'auto', 
                right: (isCompact || isMobile) ? '20px' : 'auto', 
                zIndex: 2,
                display: 'flex',
                justifyContent: 'center'
            }}>
                <button
                    onClick={() => onToggle(f.id, f.status)}
                    style={{
                        width: 22, height: 22, borderRadius: '8px', border: '2px solid',
                        borderColor: f.status === 'Completed' ? '#10b981' : (isHighValue ? '#fbbf24' : (isTeamView ? '#3b82f6' : '#e2e8f0')),
                        background: f.status === 'Completed' ? '#10b981' : 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    {f.status === 'Completed' && <CheckCircle size={12} color="white" strokeWidth={4} />}
                </button>
            </div>

            {/* Middle & Right Content */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: (isCompact || isMobile) ? 'column' : 'row', 
                alignItems: (isCompact || isMobile) ? 'flex-start' : 'center',
                gap: (isCompact || isMobile) ? '6px' : '24px',
                minWidth: 0
            }}>
                {/* Lead Info Column */}
                <div style={{ width: (isCompact || isMobile) ? '100%' : '220px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span 
                            onClick={() => onPreview(f.lead_id || f.leadId)} 
                            onMouseEnter={(e) => onHover(e, leadDetails)}
                            onMouseLeave={() => onHover(null)}
                            style={{ fontWeight: 950, fontSize: isMobile ? '0.9rem' : (isCompact ? '1rem' : '0.95rem'), cursor: 'pointer', color: '#0f172a' }} 
                            className="hover-underline"
                        >
                            {f.lead_name || f.leadName}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {score > 0 && <span style={{ padding: '2px 6px', borderRadius: '6px', background: score > 80 ? '#ecfdf5' : '#f8fafc', color: score > 80 ? '#059669' : '#64748b', fontSize: '10px', fontWeight: 900, border: score > 80 ? '1px solid #10b98122' : '1px solid #e2e8f0' }}>{score}%</span>}
                            {budget && <span style={{ padding: '2px 6px', borderRadius: '6px', background: isHighValue ? '#fff7ed' : '#f1f5f9', color: isHighValue ? '#d97706' : '#64748b', fontSize: '10px', fontWeight: 900, border: isHighValue ? '1px solid #fbbf2444' : '1px solid #e2e8f0' }}>₹{budget}</span>}
                        </div>
                    </div>
                    {(isCompact || isMobile) && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <Calendar size={12} color={isHighValue ? "#fbbf24" : "#94a3b8"} /> {day} · {time}
                        </div>
                    )}
                </div>

                {/* Notes Column */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>ORCHESTRATION NOTES</div>
                    <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.notes || (isCompact ? 'No briefing shared yet...' : 'Awaiting task briefing...')}
                    </div>
                </div>

                {/* Owner Column (Only in List View) */}
                {!isCompact && !isMobile && (
                    <div style={{ width: '150px', flexShrink: 0, marginRight: '100px' }}>
                        {isTeamView ? (
                            <>
                                <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>RE-ASSIGN TO</div>
                                <select 
                                    className="form-control" 
                                    style={{ height: '24px', padding: '0 4px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #bfdbfe' }}
                                    value={f.assigned_to}
                                    onChange={(e) => onReassign(f.id, e.target.value)}
                                >
                                    {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>OWNER</div>
                                <div style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: isHighValue ? '#fbbf24' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 950, color: isHighValue ? 'white' : '#64748b' }}>{f.assigned_name?.charAt(0) || 'A'}</div>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.assigned_name || 'System Auto'}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Right Column: Actions */}
            <div style={{ 
                width: (isCompact || isMobile) ? '100%' : '120px', 
                flexShrink: 0,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                gap: '8px', 
                marginTop: (isCompact || isMobile) ? '8px' : '0',
                paddingTop: (isCompact || isMobile) ? '10px' : '0',
                borderTop: (isCompact || isMobile) ? '1px solid #f1f5f9' : 'none'
            }}>
                {!isCompact && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 950, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            <Calendar size={13} color={isHighValue ? "#fbbf24" : "#94a3b8"} /> {day}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                    {f.status !== 'Completed' ? (
                        <>
                            <button className="icon-btn-sm" onClick={() => onDial(f.lead_id || f.leadId, f.lead_phone || leadDetails?.phone, f.lead_name || f.leadName)} style={{ background: '#0f172a', color: 'white', width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px', borderRadius: isMobile ? '10px' : '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Phone size={isMobile ? 16 : 18} />
                            </button>
                            <button className="icon-btn-sm" onClick={() => onNotify({ id: f.lead_id || f.leadId, name: f.lead_name || f.leadName, phone: f.lead_phone || leadDetails?.phone })} style={{ background: '#10b981', color: 'white', width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px', borderRadius: isMobile ? '10px' : '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={isMobile ? 16 : 18} />
                            </button>
                        </>
                    ) : (
                        <button className="icon-btn-sm" onClick={() => onDelete(f.id)} style={{ background: '#fee2e2', color: '#f43f5e', width: '40px', height: '40px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function LeadContextDrawer({ id, onClose, onDial }) {
    const { data: lead, loading } = useApi(() => id ? leadsApi.get(id) : null);
    const isMobile = useMobile();
    if (loading) return <div style={{ position: 'fixed', right: '40px', top: '50%', transform: 'translateY(-50%)', background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>Loading Context...</div>;
    if (!lead || !id) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ 
                width: isMobile ? 'calc(100% - 24px)' : '480px', 
                borderRadius: isMobile ? '28px' : '32px', 
                position: 'fixed',
                right: isMobile ? '12px' : '40px',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxHeight: '90vh',
                overflowY: 'auto',
                margin: isMobile ? '0 auto' : '0'
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
                        <div style={{ width: 64, height: 64, borderRadius: '24px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900 }}>{lead?.name?.charAt(0) || '?'}</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950 }}>{lead?.name || 'Unknown Lead'}</h2>
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{lead?.stage || 'PROSPECT'} STAGE</span>
                        </div>
                    </div>
                </div>
                <div className="modal-body" style={{ padding: '0 32px 32px' }}>
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>LEAD SCORE</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 950, color: (lead?.score || 0) > 70 ? '#10b981' : '#f43f5e' }}>{lead?.score || 0}%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>BUDGET</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 950 }}>₹{lead?.budget || 'N/A'}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Project: {lead?.project_name || 'General Inquiry'}</div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><History size={14} /> RECENT HISTORY</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(lead?.interactions || []).slice(0, 3).map((it, i) => (
                                <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', borderLeft: '3px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{it?.type || 'Interaction'}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{it?.note || 'No notes...'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => onDial(lead?.id, lead?.phone, lead?.name)} style={{ width: '100%', height: '56px', borderRadius: '20px', fontSize: '1rem', fontWeight: 900, gap: '12px' }}>
                        <Phone size={20} /> CALL NOW
                    </button>
                </div>
            </div>
        </div>
    );
}
