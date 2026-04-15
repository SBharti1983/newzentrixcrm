import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dialerEvents } from '../constants/events';
import {
    Search, Mail, MessageSquare, Phone, MoreVertical,
    Send, RefreshCw, Wand2, User, Sparkles, Brain,
    TrendingUp, TrendingDown, Target, Zap, Clock,
    CheckCircle2, AlertCircle, ChevronRight, Filter
} from 'lucide-react';
import { leadsApi, notificationsApi } from '../api/client';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../hooks/useToast';
import AIPitchModal from '../components/AIPitchModal';

export default function CommandCenter() {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [activeLeadId, setActiveLeadId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [showPitchModal, setShowPitchModal] = useState(false);

    // Mock intelligence data for demonstration
    const getLeadIntelligence = (lead) => {
        if (!lead) return null;
        // Deterministic mock based on ID (handle both numeric and UUID)
        let seed = 0;
        if (typeof lead.id === 'number') {
            seed = lead.id;
        } else if (typeof lead.id === 'string') {
            // Simple hash for UUID
            seed = lead.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        }

        const closingProb = 45 + (seed % 45);
        const sentiment = seed % 3 === 0 ? 'Positive' : seed % 3 === 1 ? 'Neutral' : 'Concerned';

        return {
            closingProbability: closingProb,
            sentiment,
            summary: `User is highly interested in ${lead.property_type || '2BHK'} projects in ${lead.city || 'East Pune'}. They have inquired 3 times and are currently comparing with competitor pricing.`,
            nextAction: closingProb > 75 ? "Send final closing offer" : "Schedule site visit",
            urgency: closingProb > 80 ? 'High' : 'Medium'
        };
    };

    const loadLeads = useCallback(async () => {
        try {
            setLoading(true);
            const res = await leadsApi.list();
            const data = res.data || [];
            setLeads(data);
            setActiveLeadId(prev => prev || (data.length > 0 ? data[0].id : null));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMessages = useCallback(async (leadId) => {
        if (!leadId) return;
        try {
            setMessagesLoading(true);
            const res = await notificationsApi.list({ lead_id: leadId });
            setMessages(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setMessagesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    useEffect(() => {
        if (activeLeadId) loadMessages(activeLeadId);
    }, [activeLeadId, loadMessages]);

    const activeLead = leads.find(l => l.id === activeLeadId);
    const intel = getLeadIntelligence(activeLead);

    const handleSend = async () => {
        if (!replyText.trim() || !activeLeadId) return;
        try {
            await notificationsApi.send({
                channels: ['WhatsApp'],
                lead_id: activeLeadId,
                recipient_phone: activeLead.phone,
                body: replyText
            });
            setReplyText('');
            addToast({ type: 'success', title: 'Message Sent', message: 'WhatsApp message sent successfully.' });
            loadMessages(activeLeadId);
        } catch (_err) {
            addToast({ type: 'error', title: 'Error', message: 'Failed to send message.' });
        }
    };
    const handleDraft = async () => {
        if (!activeLeadId) return;
        try {
            setIsDrafting(true);
            const res = await notificationsApi.draftReply({
                lead_id: activeLeadId,
                channel: 'WhatsApp',
                context: replyText || 'Following up on their interest.'
            });
            if (res.draft) {
                setReplyText(res.draft);
                addToast({ type: 'success', title: 'AI Draft Ready', message: 'Magic draft generated based on context.' });
            }
        } catch (_err) {
            addToast({ type: 'error', title: 'Error', message: 'Failed to generate AI draft.' });
        } finally {
            setIsDrafting(false);
        }
    };

    const filteredLeads = leads.filter(l => {
        const nameMatch = (l.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = (l.phone || '').includes(searchTerm);
        const cityMatch = (l.city || '').toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || phoneMatch || cityMatch;
    });

    if (loading) return <PageLoader />;

    const handleSimulateInbound = () => {
        if (window.simulateInbound) {
            window.simulateInbound();
        } else {
            addToast({ type: 'error', title: 'Error', message: 'Telephony system not ready.' });
        }
    };

    return (
        <div className="command-center-root animate-fadeIn">
            {/* Strategic Command Header */}
            <div className="command-center-header glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="ai-pulse" style={{ width: 48, height: 48, borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)' }}>
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className="text-gradient-premium" style={{ margin: 0, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em' }}>Strategic Command</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 8px var(--accent-emerald)' }} />
                            <span style={{ fontSize: '12px', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Systems Nominal</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #eef2f6' }}>
                        <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-800)' }}>Sync: 2m</span>
                    </div>
                    <button onClick={handleSimulateInbound} style={{ 
                        padding: '10px 18px', borderRadius: '12px', background: 'white', color: 'var(--navy-900)', 
                        border: '1.5px solid #e2e8f0', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', 
                        gap: 8, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }} className="hover-lift">
                        <Phone size={14} color="#6366f1" /> Simulate IVR Call
                    </button>
                </div>
            </div>

            <div className="command-center-grid">
                {/* Left Panel: Conversations List */}
                <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)' }}>
                        <div className="search-bar" style={{ width: '100%', background: 'var(--slate-50)' }}>
                            <Search size={14} style={{ color: 'var(--text-muted)' }} />
                            <input 
                                placeholder="Search opportunities..." 
                                style={{ fontSize: '0.85rem' }} 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {filteredLeads.map(l => {
                            const lIntel = getLeadIntelligence(l);
                            return (
                                <div
                                    key={l.id}
                                    onClick={() => setActiveLeadId(l.id)}
                                    className="glass-interactive"
                                    style={{
                                        padding: '18px 20px', cursor: 'pointer',
                                        background: activeLeadId === l.id ? 'white' : 'transparent',
                                        margin: '8px 12px',
                                        borderRadius: 16,
                                        border: activeLeadId === l.id ? '1px solid var(--accent-violet)' : '1px solid transparent',
                                        boxShadow: activeLeadId === l.id ? '0 10px 20px rgba(139, 92, 246, 0.1)' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '0.9rem' }}>{l.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{l.city}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: (lIntel?.closingProbability || 0) > 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                                                {lIntel?.closingProbability || 0}%
                                            </div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prob.</div>
                                        </div>
                                    </div>
                                    <div style={{ height: 6, width: '100%', background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: `${lIntel?.closingProbability || 0}%`, 
                                            background: activeLeadId === l.id ? 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))' : 'var(--slate-300)',
                                            transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Center Panel: Interaction & Action */}
                <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                    {activeLead ? (
                        <>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'linear-gradient(135deg, var(--navy-900), var(--navy-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(10, 22, 40, 0.2)' }}>
                                        {(activeLead.name || '?')[0]}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{activeLead.name || 'Unknown Lead'}</h3>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                background: activeLead.status === 'Won' ? '#dcfce7' : activeLead.status === 'Lost' ? '#ffe4e6' : '#e0e7ff', 
                                                color: activeLead.status === 'Won' ? '#15803d' : activeLead.status === 'Lost' ? '#be123c' : '#4338ca', 
                                                padding: '3px 10px', 
                                                borderRadius: '100px', 
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                border: `1px solid ${activeLead.status === 'Won' ? '#16653420' : activeLead.status === 'Lost' ? '#9f123920' : '#4338ca20'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                                {activeLead.status || 'Active'}
                                            </span>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                background: '#f8fafc', 
                                                color: '#64748b', 
                                                padding: '3px 10px', 
                                                borderRadius: '100px', 
                                                fontWeight: 800,
                                                border: '1px solid #e2e8f0',
                                                fontFamily: 'monospace'
                                            }}>
                                                ID: {activeLead.id?.toString().slice(0, 8)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="icon-btn" onClick={() => dialerEvents.call(activeLead.id, activeLead.phone, activeLead.name)} title="Call Lead">
                                        <Phone size={18} color="var(--accent-emerald)" />
                                    </button>

                                    <button className="icon-btn" onClick={() => activeLead.email && window.open(`mailto:${activeLead.email}`, '_blank')} title="Send Email"><Mail size={18} /></button>
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/leads/${activeLead.id}`)}>View Profile</button>
                                </div>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ 
                                    flex: 1, padding: '32px', overflowY: 'auto', 
                                    background: 'linear-gradient(to bottom, #ffffff, #fdfdfd)', 
                                    display: 'flex', flexDirection: 'column-reverse', gap: 20, position: 'relative' 
                                }}>
                                    {messagesLoading && (
                                        <div className="glass-card" style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-violet)', zIndex: 10 }}>
                                            Synchronizing...
                                        </div>
                                    )}
                                    {messages.map(m => (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: m.sent_by ? 'flex-end' : 'flex-start' }}>
                                            <div style={{
                                                maxWidth: '85%', padding: '14px 20px', borderRadius: '24px',
                                                background: m.sent_by ? '#dcfce7' : '#f8fafc',
                                                color: m.sent_by ? '#166534' : '#1e293b',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                                borderBottomLeftRadius: !m.sent_by ? 4 : 24,
                                                borderBottomRightRadius: m.sent_by ? 4 : 24,
                                                position: 'relative'
                                            }}>
                                                {!m.sent_by && (
                                                    <div style={{ position: 'absolute', top: -18, left: 4, fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{activeLead.name}</div>
                                                )}
                                                <p style={{ margin: 0, fontSize: '0.94rem', lineHeight: 1.6, fontWeight: 600, color: 'inherit', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                                                <div style={{ textAlign: 'right', marginTop: 8, fontSize: '0.65rem', opacity: 0.8, fontWeight: 700, color: 'inherit' }}>
                                                    {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ textAlign: 'center', margin: '30px 0' }}>
                                        <span style={{ background: 'var(--slate-100)', color: 'var(--text-muted)', padding: '6px 16px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discovery Phase Started</span>
                                    </div>
                                </div>

                                <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-light)', background: 'white' }}>
                                    <div style={{ position: 'relative' }}>
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Write a message or use AI to draft for WhatsApp..."
                                            style={{
                                                width: '100%', border: '1.5px solid var(--border-light)', borderRadius: '16px',
                                                padding: '16px 50px 16px 16px', outline: 'none', resize: 'none', height: '100px',
                                                fontSize: '0.95rem', transition: 'all 0.2s'
                                            }}
                                            onFocus={e => e.target.style.borderColor = 'var(--accent-violet)'}
                                            onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
                                        />
                                        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 10 }}>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                style={{ color: 'var(--accent-violet)', fontWeight: 800 }}
                                                onClick={handleDraft}
                                                disabled={isDrafting}
                                            >
                                                <Sparkles size={14} style={{ marginRight: 6 }} /> 
                                                {isDrafting ? 'Conjuring...' : 'AI WhatsApp Draft'}
                                            </button>
                                        </div>
                                        <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
                                            <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!replyText.trim()} style={{ borderRadius: '12px' }}>
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Right Panel: AI Intelligence */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
                    <div className="glass-panel" style={{ padding: '28px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', background: 'white' }}>
                        <div style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.03 }}>
                            <Zap size={140} color="var(--navy-900)" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                            <div className="ai-pulse" style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-violet)' }} />
                            <h4 style={{ margin: 0, color: 'var(--navy-900)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conversion Index</h4>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--navy-900)', lineHeight: 1, letterSpacing: '-0.1em' }}>{intel?.closingProbability || 0}%</div>
                            <div style={{ marginTop: 20, padding: '10px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={16} color="var(--accent-emerald)" />
                                <span style={{ color: 'var(--slate-500)', fontSize: '0.8rem', fontWeight: 700 }}>{intel ? 'Peak Velocity Reached' : 'Awaiting Engagement'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ flex: 1, padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h5 className="text-gradient-premium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12, fontSize: '1rem', fontWeight: 900 }}>
                                <Sparkles size={18} style={{ color: 'var(--accent-violet)' }} /> Lead Intelligence
                            </h5>
                            <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', fontSize: '0.65rem', fontWeight: 900 }}>REALTIME</div>
                        </div>

                        <div style={{ marginBottom: 32 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sentiment Score</label>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: intel?.sentiment === 'Positive' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>{intel?.sentiment}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, height: 8 }}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} style={{ 
                                        flex: 1, 
                                        height: '100%', 
                                        background: i <= (intel?.sentiment === 'Positive' ? 5 : 3) ? 'var(--accent-violet)' : 'var(--slate-100)', 
                                        borderRadius: 4,
                                        opacity: i <= (intel?.sentiment === 'Positive' ? 5 : 3) ? 1 - (i * 0.1) : 1
                                    }} />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 32 }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Executive Summary</label>
                            <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 16, border: '1px solid var(--border-light)', fontSize: '0.9rem', color: 'var(--navy-800)', lineHeight: 1.6, fontWeight: 500 }}>
                                {intel?.summary}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button className="btn btn-secondary" onClick={() => setShowPitchModal(true)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 800, fontSize: '0.8rem' }}>
                                <Sparkles size={14} style={{ marginRight: 8 }} /> Generate Personal Pitch
                            </button>
                            
                            <div style={{ padding: '20px', background: 'var(--navy-900)', borderRadius: '20px', boxShadow: '0 12px 24px rgba(10,22,40,0.2)' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>AI Recommendation</label>
                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between', padding: '14px 20px', background: 'white', color: 'var(--navy-900)', border: 'none', fontWeight: 900, fontSize: '0.85rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={16} color="var(--accent-violet)" /> {intel?.nextAction}</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPitchModal && activeLead && (
                <AIPitchModal lead={activeLead} onClose={() => setShowPitchModal(false)} />
            )}
        </div>
    );
}
