import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PageLoader } from '../feedback/Feedback';
import { leadsApi, templatesApi } from '../../api/client';
import { dialerEvents } from '../../constants/events';
import { X, Edit2, Mail, Phone, Calendar as CalendarIcon, CheckSquare, ChevronDown, Sparkles, ExternalLink, MessageSquare, TrendingUp, ShieldCheck, Zap, Target, MapPin, DollarSign, ThumbsUp, ThumbsDown, Copy, Settings, Clock, ArrowRight, RotateCw, ClipboardCheck } from 'lucide-react';
import { usePresence } from '../../context/PresenceContext';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import * as dateUtils from '../../utils/dateUtils';

const STAGE_CONFIG = {
    'New': { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: ShieldCheck },
    'Contacted': { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: Target },
    'Qualified': { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', icon: Zap },
    'Disqualified': { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: X },
    'Nurture': { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', icon: TrendingUp },
    'Site Visit': { color: '#0f766e', bg: 'rgba(20,184,166,0.08)', icon: MapPin },
    'Negotiation': { color: '#b45309', bg: 'rgba(245,158,11,0.08)', icon: DollarSign },
    'Won': { color: '#059669', bg: 'rgba(16,185,129,0.08)', icon: ShieldCheck },
    'Lost': { color: '#e11d48', bg: 'rgba(244,63,94,0.08)', icon: CheckSquare }
};
const LIFECYCLE_STAGES = Object.keys(STAGE_CONFIG);

interface ContactPreviewSidebarProps {
    contactId: string | null;
    onClose: () => void;
}

export default function ContactPreviewSidebar({ contactId, onClose }: ContactPreviewSidebarProps) {
    const navigate = useNavigate();
    const { data: contact, loading, error, refetch } = useApi(() => leadsApi.get(contactId), [contactId]);
    const { user: currentUser } = useAuth();
    const { trackPage, viewers } = usePresence();
    const { showToast } = useToast();
    const [activeAction, setActiveAction] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showStagePicker, setShowStagePicker] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const contactPath = `/leads/${contactId}`;

    useEffect(() => {
        templatesApi.list().then(setTemplates).catch(console.error);
    }, []);

    useEffect(() => { if (contactId) trackPage(contactPath); }, [contactId]);

    const activeViewers = (viewers[contactPath] || []).filter(u => u.id !== currentUser?.id);

    const updateStage = async (newStage) => {
        try { await leadsApi.update(contactId, { stage: newStage }); refetch(); setShowStagePicker(false); } catch (e) { showToast('Failed to update stage', 'error'); }
    };

    const updateStatus = async (newStatus, extras = {}) => {
        try {
            await leadsApi.update(contactId, { status: newStatus, ...extras });
            refetch();
            setActiveAction(null);
        } catch (e) { showToast('Failed to update status', 'error'); }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setMounted(true));
        return () => { cancelAnimationFrame(frame); setMounted(false); };
    }, []);

    if (!contactId) return null;

    const PALETTE = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#06b6d4','#ef4444','#6366f1','#14b8a6','#ec4899','#f97316'];
    const avatarColor = contact ? PALETTE[(contact.name || 'A').charCodeAt(0) % PALETTE.length] : '#3b82f6';
    const stageStyle = contact ? (STAGE_CONFIG[contact.stage] || STAGE_CONFIG['New']) : STAGE_CONFIG['New'];

    return (
        <div className={`cps-overlay ${mounted ? 'cps-active' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`cps-panel ${mounted ? 'cps-active' : ''}`}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center' }}><PageLoader /></div>
                ) : error ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--accent-rose)' }}>{error}</div>
                ) : contact ? (
                    <>
                        {/* ── Header ── */}
                        <div className="cps-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="cps-header-dot" />
                                <span className="cps-header-title">LEAD PROFILE</span>
                                {activeViewers.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                                        <div style={{ display: 'flex' }}>
                                            {activeViewers.slice(0, 3).map((u, i) => (
                                                <div key={u.id} title={`${u.name} viewing`} style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', marginLeft: i ? -6 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 900, color: 'white', zIndex: 10 - i }}>{u.avatar || u.name?.[0]}</div>
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '0.05em' }}>LIVE</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    onClick={() => navigate(`/leads/${contact.id}`)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: 'white', border: '1px solid #e2e8f0',
                                        color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
                                >
                                    <span>Open Full Record</span>
                                    <ExternalLink size={12} />
                                </button>
                                <button onClick={onClose} className="cps-close-btn"><X size={16} /></button>
                            </div>
                        </div>

                        <div className="cps-body">
                            {/* ── Profile Card ── */}
                            <div className="cps-profile-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0px 20px 8px', gap: '8px' }}>
                                <div className="cps-avatar" style={{ background: avatarColor, boxShadow: `0 12px 28px ${avatarColor}40`, margin: 0, width: 60, height: 60, fontSize: 24 }}>
                                    {contact.name?.[0]?.toUpperCase() || '?'}
                                    <div className="cps-avatar-status" style={{ right: 2, bottom: 2, width: 14, height: 14, border: '2px solid white' }} />
                                </div>
                                <div style={{ minWidth: 0, width: '100%' }}>
                                    <h2 className="cps-name" style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{contact.name}</h2>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                        <div className="cps-stage-badge" style={{ 
                                            background: contact.status === 'Nurture' ? 'rgba(124,58,237,0.1)' : contact.status === 'Won' ? 'rgba(16,185,129,0.1)' : contact.status === 'Lost' ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)',
                                            color: contact.status === 'Nurture' ? '#7c3aed' : contact.status === 'Won' ? '#059669' : contact.status === 'Lost' ? '#e11d48' : '#3b82f6',
                                            borderColor: 'transparent',
                                            fontWeight: 800,
                                            fontSize: '10px'
                                        }}>
                                            {contact.status || 'Active'}
                                        </div>
                                        <div className="cps-stage-badge" style={{ background: stageStyle.bg, color: stageStyle.color, borderColor: `${stageStyle.color}30` }} onClick={() => setShowStagePicker(!showStagePicker)}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: stageStyle.color }} />
                                            {contact.stage || 'New'}
                                            <ChevronDown size={10} style={{ transform: showStagePicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </div>
                                        <div className="cps-source-tag">via {contact.source || 'Direct'}</div>
                                    </div>

                                    {contact.status === 'Nurture' && (
                                        <div style={{ 
                                            background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 12, padding: '10px 14px', 
                                            marginTop: 8, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 800, color: '#a21caf' }}>
                                                <RotateCw size={12} /> RECONNECT ON {dateUtils.parseSafe(contact.reconnect_date) ? dateUtils.parseSafe(contact.reconnect_date)!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase() : 'TBD'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#701a75', fontWeight: 500 }}>
                                                Reason: {contact.nurture_reason || 'Follow up'}
                                            </div>
                                        </div>
                                    )}

                                    {showStagePicker && (
                                        <div className="cps-stage-dropdown">
                                            {LIFECYCLE_STAGES.map(s => (
                                                <div key={s} className={`cps-stage-option ${contact.stage === s ? 'cps-stage-active' : ''}`} onClick={() => updateStage(s)}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: STAGE_CONFIG[s].color }} />
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* button moved to header */}

                            {/* ── Contact Details Grid ── */}
                            <div className="cps-details-section">
                                <div className="cps-section-label">Contact Info</div>
                                <div className="cps-detail-grid">
                                    {[
                                        { icon: Mail, label: 'Email', value: contact.email, color: '#3b82f6' },
                                        { icon: Phone, label: 'Phone', value: contact.phone, color: '#10b981' },
                                        { icon: DollarSign, label: 'Budget', value: contact.budget ? `₹${contact.budget}` : null, color: '#f59e0b' },
                                    ].filter(f => f.value).map(f => (
                                        <div key={f.label} className="cps-detail-row">
                                            <div className="cps-detail-icon" style={{ background: `${f.color}0a`, color: f.color }}><f.icon size={14} /></div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="cps-detail-label">{f.label}</div>
                                                <div className="cps-detail-value">{f.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Quick Actions ── */}
                            <div className="cps-actions-section">
                                <div className="cps-section-label">Quick Actions</div>
                                <div className="cps-actions-grid">
                                    {[
                                        { icon: Mail, label: 'Email', color: '#3b82f6' },
                                        { icon: Phone, label: 'Call', color: '#10b981' },
                                        { icon: MessageSquare, label: 'WhatsApp', color: '#25D366' },
                                        { icon: Edit2, label: 'Note', color: '#f59e0b' },
                                        { icon: CheckSquare, label: 'Task', color: '#6366f1' },
                                        { icon: CalendarIcon, label: 'Meeting', color: '#ef4444' }
                                    ].map(a => (
                                        <button key={a.label} className="cps-action-btn" onClick={() => {
                                            if (a.label === 'Call' && contact.phone) { dialerEvents.call(contact.id, contact.phone, contact.name); }
                                            else if (a.label === 'WhatsApp' && contact.phone) { setShowTemplates(!showTemplates); }
                                            else if (a.label === 'Note' && contact.status === 'Nurture') { setActiveAction('Edit Nurture'); }
                                            else { setActiveAction(a.label); }
                                        }}>
                                            <div className="cps-action-icon" style={{ '--ac': a.color } as React.CSSProperties}><a.icon size={14} color={a.color} strokeWidth={2.5} /></div>
                                            <span>{a.label}</span>
                                        </button>
                                    ))}
                                    {showTemplates && (
                                        <div className="cps-template-picker animate-fadeIn" style={{
                                            position: 'absolute', bottom: '100%', left: 0, width: '100%', background: 'white',
                                            borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 -10px 30px rgba(0,0,0,0.1)',
                                            zIndex: 50, padding: '16px', marginBottom: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>WhatsApp Templates</h4>
                                                <button onClick={() => setShowTemplates(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={14} /></button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {templates.map(t => (
                                                    <div key={t.id} className="template-option" onClick={() => {
                                                        const p = contact.phone.replace(/[^0-9]/g, '');
                                                        const body = t.body
                                                            .replace(/{{name}}/g, contact.name || 'Customer')
                                                            .replace(/{{project}}/g, contact.project_name || 'the project');
                                                        window.open(`https://wa.me/${p.startsWith('91') ? '' : '91'}${p}?text=${encodeURIComponent(body)}`, '_blank');
                                                        setShowTemplates(false);
                                                    }} style={{
                                                        padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9',
                                                        cursor: 'pointer', transition: 'all 0.2s'
                                                    }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}>
                                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{t.name}</div>
                                                        <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button className="cps-action-btn" onClick={() => setActiveAction('Move to Nurture')} style={{ background: 'rgba(124,58,237,0.05)' }}>
                                        <div className="cps-action-icon" style={{ '--ac': '#7c3aed' } as React.CSSProperties}><TrendingUp size={14} color="#7c3aed" strokeWidth={2.5} /></div>
                                        <span style={{ color: '#7c3aed', fontWeight: 800 }}>Nurture</span>
                                    </button>
                                    <button className="cps-action-btn" onClick={() => setActiveAction('Visit')} style={{ background: 'rgba(245,158,11,0.05)' }}>
                                        <div className="cps-action-icon" style={{ '--ac': '#f59e0b' } as React.CSSProperties}><MapPin size={14} color="#f59e0b" strokeWidth={2.5} /></div>
                                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>Visit</span>
                                    </button>
                                    <button className="cps-action-btn" onClick={() => setActiveAction('Offer')} style={{ background: 'rgba(139,92,246,0.05)' }}>
                                        <div className="cps-action-icon" style={{ '--ac': '#8b5cf6' } as React.CSSProperties}><ClipboardCheck size={14} color="#8b5cf6" strokeWidth={2.5} /></div>
                                        <span style={{ color: '#8b5cf6', fontWeight: 800 }}>Offer</span>
                                    </button>
                                    {contact.status === 'Nurture' && (
                                        <button className="cps-action-btn" onClick={() => updateStatus('Active')} style={{ background: 'rgba(16,185,129,0.05)' }}>
                                            <div className="cps-action-icon" style={{ '--ac': '#10b981' } as React.CSSProperties}><Zap size={14} color="#10b981" strokeWidth={2.5} /></div>
                                            <span style={{ color: '#10b981', fontWeight: 800 }}>Reactivate</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Inline Form ── */}
                            {activeAction === 'Move to Nurture' && (
                                <div className="cps-inline-form animate-fadeIn" style={{ border: '1px solid #f5d0fe', background: '#fff9ff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                        <h4 className="cps-form-title" style={{ color: '#a21caf' }}>Move to Nurture</h4>
                                        <button onClick={() => setActiveAction(null)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>Cancel</button>
                                    </div>
                                    <div className="form-group mb-3">
                                        <label className="form-label">Reason for Nurture</label>
                                        <select className="form-control" value={noteContent} onChange={e => setNoteContent(e.target.value)}>
                                            <option value="">Select reason...</option>
                                            {['Budget issue', 'Timeline delay', 'No response', 'Inventory mismatch', 'Contacted - Follow up later'].map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group mb-3">
                                        <label className="form-label">Reconnect Date</label>
                                        <input type="date" className="form-control" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                    </div>
                                    <button disabled={!noteContent || !dueDate || isSaving} className="cps-save-btn" style={{ background: '#7c3aed' }} onClick={async () => {
                                        setIsSaving(true);
                                        await updateStatus('Nurture', { nurture_reason: noteContent, reconnect_date: dueDate });
                                        setIsSaving(false);
                                    }}>{isSaving ? 'Moving...' : 'Move to Nurture'}</button>
                                </div>
                            )}

                            {activeAction && activeAction !== 'Move to Nurture' && (
                                <div className="cps-inline-form animate-fadeIn">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                        <h4 className="cps-form-title">Log {activeAction}</h4>
                                        <button onClick={() => setActiveAction(null)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>Cancel</button>
                                    </div>
                                    <textarea autoFocus value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder={`Add ${activeAction.toLowerCase()} details...`} className="cps-textarea"
                                        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && noteContent.trim() && !isSaving) document.getElementById('cps-save-btn')?.click(); }}
                                    />
                                    {['Task', 'Meeting'].includes(activeAction) && (
                                        <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="cps-date-input" />
                                    )}
                                    <button id="cps-save-btn" disabled={!noteContent.trim() || isSaving} className="cps-save-btn" onClick={async () => {
                                        setIsSaving(true);
                                        try { await leadsApi.addInteraction(contact.id, { type: activeAction, note: noteContent, date: dueDate || dateUtils.getNow().toISOString() }); setNoteContent(''); setDueDate(''); setActiveAction(null); refetch(); }
                                        catch (e) { showToast('Failed to save', 'error'); } finally { setIsSaving(false); }
                                    }}>{isSaving ? 'Saving...' : `Save ${activeAction}`}</button>
                                </div>
                            )}

                            {/* ── AI Intelligence ── */}
                            <div className="cps-intel-section">
                                <div className="cps-section-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Sparkles size={14} color="#f59e0b" />
                                        <span className="cps-section-label" style={{ margin: 0 }}>AI Intelligence</span>
                                    </div>
                                    <div className="cps-ai-badge"><Zap size={9} /> LIVE</div>
                                </div>
                                <div style={{ display: 'flex', background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.15)', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.05)', marginBottom: '12px' }}>
                                    <div style={{ background: '#6366f115', padding: '8px', borderRadius: '12px', alignSelf: 'flex-start' }}><Sparkles size={18} color="#6366f1" /></div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', lineHeight: 1.5, marginLeft: '12px' }}>
                                        <div style={{ color: '#6366f1', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>AI Summary</div>
                                        {contact.ai_summary || "No AI summary available yet. Interactions are being analyzed to generate a profile."}
                                        {contact.ai_next_action && (
                                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', borderLeft: '3px solid #10b981', fontSize: '11px', color: '#065f46' }}>
                                                <strong>AI Suggested Next Action:</strong> {contact.ai_next_action}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="cps-intel-card">
                                    <div className="cps-intel-score-row">
                                        <div>
                                            <div className="cps-intel-score-label">Lead Score</div>
                                            <div className="cps-intel-score-value">{contact.score || 84}</div>
                                        </div>
                                        <div className="cps-score-bar-wrap">
                                            <div className="cps-score-bar" style={{ width: `${contact.score || 84}%` }} />
                                        </div>
                                    </div>
                                    <div className="cps-intel-body">
                                        {Array.isArray(contact.interactions) && contact.interactions.length > 0 ? (
                                            <p>Showing <strong style={{ color: 'var(--accent-emerald)' }}>high intent</strong>. Last activity: <strong>{contact.interactions[0].type}</strong> on {dateUtils.formatSafeDateISO(contact.interactions[0].date) || 'Unknown'}.</p>
                                        ) : (
                                            <p>No activities logged for <strong>{contact.name}</strong>. Initial discovery call recommended.</p>
                                        )}
                                    </div>
                                    <div className="cps-intel-pills">
                                        <div className="cps-pill cps-pill-green" onClick={() => { const p = contact.phone?.replace(/[^0-9]/g, ''); if (p) window.open(`https://wa.me/${p.startsWith('91') ? '' : '91'}${p}`, '_blank'); }}>
                                            <MessageSquare size={11} /> WhatsApp
                                        </div>
                                        <div className="cps-pill cps-pill-blue"><TrendingUp size={11} /> Score: {contact.score || 84}</div>
                                    </div>
                                    <div className="cps-intel-feedback">
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <ThumbsUp size={14} className="cps-fb-icon" />
                                            <ThumbsDown size={14} className="cps-fb-icon" />
                                            <Copy size={14} className="cps-fb-icon" />
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 600 }}>Helpful?</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Planned Follow-ups ── */}
                            {Array.isArray(contact.followups) && contact.followups.length > 0 && (
                                <div className="cps-timeline-section" style={{ marginBottom: '24px' }}>
                                    <div className="cps-section-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <CalendarIcon size={14} color="#10b981" />
                                            <span className="cps-section-label" style={{ margin: 0 }}>Planned Follow-ups</span>
                                        </div>
                                    </div>
                                    <div className="cps-timeline" style={{ padding: '0 4px' }}>
                                        {contact.followups.map((f, idx) => (
                                            <div key={f.id || idx} className="cps-tl-item" style={{ background: 'white', padding: '12px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: f.priority === 'High' ? '#ef4444' : '#64748b' }}>{f.type.toUpperCase()}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', background: '#f0fdf4', padding: '2px 6px', borderRadius: '6px' }}>
                                                        {dateUtils.parseSafe(f.scheduled_at) ? dateUtils.parseSafe(f.scheduled_at)!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 600 }}>{f.note || 'Follow up required'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Activity Timeline ── */}
                            <div className="cps-timeline-section">
                                <div className="cps-section-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Clock size={14} color="var(--slate-400)" />
                                        <span className="cps-section-label" style={{ margin: 0 }}>Recent Activity</span>
                                    </div>
                                    <button className="cps-view-all" onClick={() => navigate(`/leads/${contact.id}`)}>View All <ArrowRight size={11} /></button>
                                </div>
                                <div className="cps-timeline">
                                    {(!contact.interactions || contact.interactions.length === 0) ? (
                                        <div className="cps-empty-feed">No activity recorded yet.</div>
                                    ) : contact.interactions.slice(0, 5).map((it, idx) => {
                                        const Icon = it.type === 'Call' ? Phone : it.type === 'Email' ? Mail : it.type === 'WhatsApp' ? MessageSquare : it.type === 'Task' ? CheckSquare : Edit2;
                                        const color = it.type === 'Call' ? '#10b981' : it.type === 'Email' ? '#3b82f6' : it.type === 'WhatsApp' ? '#25D366' : '#f59e0b';
                                        return (
                                            <div key={it.id || idx} className="cps-tl-item">
                                                <div className="cps-tl-connector">
                                                    <div className="cps-tl-dot" style={{ background: `${color}18`, borderColor: `${color}40` }}><Icon size={12} color={color} /></div>
                                                    {idx < Math.min(contact.interactions.length, 5) - 1 && <div className="cps-tl-line" />}
                                                </div>
                                                <div className="cps-tl-content">
                                                    <div className="cps-tl-header">
                                                        <span className="cps-tl-type">{it.type}</span>
                                                        <span className="cps-tl-time">{dateUtils.parseSafe(it.date) ? dateUtils.parseSafe(it.date)!.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</span>
                                                    </div>
                                                    <div className="cps-tl-agent">by {it.agent_name || 'System'}</div>
                                                    {it.note && <div className="cps-tl-note">{it.note}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
