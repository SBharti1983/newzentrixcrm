import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PageLoader } from './Feedback';
import { leadsApi } from '../api/client';
import { dialerEvents } from '../constants/events';
import { X, Edit2, Mail, Phone, Calendar as CalendarIcon, CheckSquare, ChevronDown, Sparkles, ExternalLink, MessageSquare, TrendingUp, ShieldCheck, Zap, Target, MapPin, DollarSign, ThumbsUp, ThumbsDown, Copy, Settings, Clock, ArrowRight } from 'lucide-react';
import { usePresence } from '../context/PresenceContext';
import { useAuth } from '../hooks/useAuth';

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

export default function ContactPreviewSidebar({ contactId, onClose }) {
    const navigate = useNavigate();
    const { data: contact, loading, error, refetch } = useApi(() => leadsApi.get(contactId), [contactId]);
    const { user: currentUser } = useAuth();
    const { trackPage, viewers } = usePresence();
    const [activeAction, setActiveAction] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showStagePicker, setShowStagePicker] = useState(false);
    const contactPath = `/leads/${contactId}`;

    useEffect(() => { if (contactId) trackPage(contactPath); }, [contactId]);

    const activeViewers = (viewers[contactPath] || []).filter(u => u.id !== currentUser?.id);

    const updateStage = async (newStage) => {
        try { await leadsApi.update(contactId, { stage: newStage }); refetch(); setShowStagePicker(false); } catch (e) { console.error(e); }
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
                            <button onClick={onClose} className="cps-close-btn"><X size={16} /></button>
                        </div>

                        <div className="cps-body">
                            {/* ── Profile Card ── */}
                            <div className="cps-profile-card">
                                <div className="cps-avatar" style={{ background: avatarColor, boxShadow: `0 12px 28px ${avatarColor}40` }}>
                                    {contact.name?.[0]?.toUpperCase() || '?'}
                                    <div className="cps-avatar-status" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h2 className="cps-name">{contact.name}</h2>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                        <div className="cps-stage-badge" style={{ background: stageStyle.bg, color: stageStyle.color, borderColor: `${stageStyle.color}30` }} onClick={() => setShowStagePicker(!showStagePicker)}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: stageStyle.color }} />
                                            {contact.stage || 'New'}
                                            <ChevronDown size={10} style={{ transform: showStagePicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </div>
                                        <div className="cps-source-tag">via {contact.source || 'Direct'}</div>
                                    </div>
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

                            {/* ── View Full Record ── */}
                            <button className="cps-full-record-btn" onClick={() => navigate(`/leads/${contact.id}`)}>
                                <span>Open Full Record</span>
                                <ExternalLink size={13} />
                            </button>

                            {/* ── Contact Details Grid ── */}
                            <div className="cps-details-section">
                                <div className="cps-section-label">Contact Info</div>
                                <div className="cps-detail-grid">
                                    {[
                                        { icon: Mail, label: 'Email', value: contact.email, color: '#3b82f6' },
                                        { icon: Phone, label: 'Phone', value: contact.phone, color: '#10b981' },
                                        { icon: MapPin, label: 'City', value: contact.city, color: '#8b5cf6' },
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
                                        { icon: Edit2, label: 'Note', color: '#f59e0b' },
                                        { icon: Mail, label: 'Email', color: '#3b82f6' },
                                        { icon: Phone, label: 'Call', color: '#10b981' },
                                        { icon: MessageSquare, label: 'WhatsApp', color: '#25D366' },
                                        { icon: CheckSquare, label: 'Task', color: '#6366f1' },
                                        { icon: CalendarIcon, label: 'Meeting', color: '#ef4444' }
                                    ].map(a => (
                                        <button key={a.label} className="cps-action-btn" onClick={() => {
                                            if (a.label === 'Call' && contact.phone) { dialerEvents.call(contact.id, contact.phone, contact.name); }
                                            else if (a.label === 'WhatsApp' && contact.phone) { const p = contact.phone.replace(/[^0-9]/g, ''); window.open(`https://wa.me/${p.startsWith('91') ? '' : '91'}${p}`, '_blank'); }
                                            else { setActiveAction(a.label); }
                                        }}>
                                            <div className="cps-action-icon" style={{ '--ac': a.color }}><a.icon size={16} color={a.color} strokeWidth={2.5} /></div>
                                            <span>{a.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Inline Form ── */}
                            {activeAction && (
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
                                        try { await leadsApi.addInteraction(contact.id, { type: activeAction, note: noteContent, date: dueDate || new Date().toISOString() }); setNoteContent(''); setDueDate(''); setActiveAction(null); refetch(); }
                                        catch (e) { console.error(e); } finally { setIsSaving(false); }
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
                                            <p>Showing <strong style={{ color: 'var(--accent-emerald)' }}>high intent</strong>. Last activity: <strong>{contact.interactions[0].type}</strong> on {new Date(contact.interactions[0].date).toLocaleDateString()}.</p>
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
                                                        <span className="cps-tl-time">{new Date(it.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
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
