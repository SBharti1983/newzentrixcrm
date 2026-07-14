import { useState, useEffect, useCallback } from 'react';
import { Search, Mail, MessageSquare, Phone, MoreVertical, Paperclip, Send, Check, CheckCheck, RefreshCw, Wand2, User, ChevronLeft, List } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { notificationsApi } from '../../api/client';
import { PageLoader } from '../../components/feedback/Feedback';
import { useToast } from '../../hooks/useToast';
import * as dateUtils from '../../utils/dateUtils';

export default function Inbox() {
    const isMobile = useMobile();
    const { showToast } = useToast();
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [drafting, setDrafting] = useState(false);

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await notificationsApi.conversations();
            setConversations(data || []);
            if (data?.length > 0 && !activeId) {
                setActiveId(data[0].lead_id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [activeId]);

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
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        if (activeId) loadMessages(activeId);
    }, [activeId, loadMessages]);

    const handleSend = async () => {
        if (!replyText.trim() || !activeId) return;
        const conv = conversations.find(c => c.lead_id === activeId);
        try {
            await notificationsApi.send({
                channels: [conv.channel === 'whatsapp' ? 'WhatsApp' : conv.channel === 'email' ? 'Email' : 'SMS'],
                lead_id: activeId,
                recipient_phone: conv.phone,
                recipient_email: conv.email,
                body: replyText
            });
            setReplyText('');
            showToast('Message sent', 'success');
            loadMessages(activeId);
        } catch (_err) {
            showToast('Failed to send message', 'error');
        }
    };

    const handleDraft = async () => {
        if (!activeId) return;
        const conv = conversations.find(c => c.lead_id === activeId);
        setDrafting(true);
        try {
            const { draft } = await notificationsApi.draftReply({
                lead_id: activeId,
                channel: conv.channel,
                context: replyText || 'Following up on the previous discussion.'
            });
            setReplyText(draft);
            showToast('AI Draft generated', 'success');
        } catch (_err) {
            showToast('Failed to generate draft', 'error');
        } finally {
            setDrafting(false);
        }
    };

    const activeConv = conversations.find(c => c.lead_id === activeId) || {};

    const getChannelIcon = (c) => {
        const type = String(c).toLowerCase();
        if (type === 'whatsapp') return <MessageSquare size={14} style={{ color: '#25D366' }} />;
        if (type === 'email') return <Mail size={14} style={{ color: 'var(--accent-rose)' }} />;
        return <Phone size={14} style={{ color: 'var(--accent-cyan)' }} />;
    };

    if (loading) return <PageLoader />;

    return (
        <div className="animate-fadeIn" style={{ 
            height: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - var(--header-height) - 40px)', 
            display: 'flex', 
            flexDirection: 'column',
            margin: isMobile ? '-24px -20px' : 0, /* Negate parent padding on mobile */
            background: 'white'
        }}>
            <div className="card" style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 0, borderRadius: isMobile ? 0 : 20, border: isMobile ? 'none' : '1px solid var(--border-light)' }}>
                {/* Sidebar */}
                <div className={`inbox-sidebar ${isMobile && activeId ? 'hidden' : ''}`} style={{ 
                    width: isMobile ? '100%' : 340, 
                    borderRight: isMobile ? 'none' : '1px solid var(--border-light)', 
                    display: isMobile && activeId ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    background: 'var(--slate-50)' 
                }}>
                    {isMobile && (
                        <div style={{ display: 'none', padding: '24px 20px 10px', background: 'white' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--navy-900)' }}>Messages</h1>
                        </div>
                    )}
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border-light)', background: 'white' }}>
                        <div className="search-bar" style={{ width: '100%', background: 'var(--slate-50)', border: '1px solid var(--border-light)' }}>
                            <Search size={14} style={{ color: 'var(--text-muted)' }} />
                            <input placeholder="Filter by name or message..." style={{ fontSize: '0.85rem' }} />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        {conversations.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No conversations yet.</div>
                        ) : conversations.map(c => (
                            <div
                                key={c.lead_id}
                                onClick={() => setActiveId(c.lead_id)}
                                style={{
                                    padding: '12px 16px', display: 'flex', gap: 12, cursor: 'pointer',
                                    margin: '4px 12px', borderRadius: 12,
                                    background: activeId === c.lead_id ? 'white' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeId === c.lead_id ? 'var(--border-light)' : 'transparent',
                                    boxShadow: activeId === c.lead_id ? 'var(--shadow-sm)' : 'none',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div style={{ 
                                        width: 44, height: 44, borderRadius: '14px', 
                                        background: activeId === c.lead_id ? 'var(--navy-600)' : 'var(--navy-900)', 
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                                        transition: 'background 0.3s'
                                    }}>
                                        {c.name ? c.name[0] : <User size={20} />}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: '3px', border: '1.5px solid white', display: 'flex', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                        {getChannelIcon(c.channel)}
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '0.85rem' }}>{c.name}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{dateUtils.parseSafe(c.time)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.last_msg}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`inbox-main ${isMobile && !activeId ? 'hidden' : ''}`} style={{ 
                    flex: 1, 
                    display: isMobile && !activeId ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    background: 'white' 
                }}>
                    {activeId ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ 
                                padding: isMobile ? '12px 16px' : '16px 24px', 
                                borderBottom: '1px solid var(--border-light)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                background: 'white',
                                position: 'sticky',
                                top: 0,
                                zIndex: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
                                    {isMobile && (
                                        <button className="btn btn-ghost btn-icon" onClick={() => setActiveId(null)}>
                                            <ChevronLeft size={24} />
                                        </button>
                                    )}
                                    <div style={{ 
                                        width: isMobile ? 36 : 44, 
                                        height: isMobile ? 36 : 44, 
                                        borderRadius: '12px', 
                                        background: 'var(--navy-900)', 
                                        color: 'white', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontWeight: 800,
                                        fontSize: isMobile ? '0.9rem' : '1.1rem' 
                                    }}>
                                        {activeConv.name ? activeConv.name[0] : '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, color: 'var(--navy-900)' }}>{activeConv.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {getChannelIcon(activeConv.channel)}
                                            <span style={{ textTransform: 'capitalize' }}>{activeConv.channel}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => loadMessages(activeId)} disabled={messagesLoading}>
                                        <RefreshCw size={16} className={messagesLoading ? 'animate-spin' : ''} />
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => window.open(`/leads/${activeId}`, '_blank')}>View Lead</button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column-reverse', gap: 16 }}>
                                {messages.map(m => (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: m.sent_by ? 'flex-end' : 'flex-start' }}>
                                        <div style={{
                                            maxWidth: '70%',
                                            padding: '12px 16px',
                                            borderRadius: 16,
                                            background: m.sent_by ? 'var(--navy-900)' : 'white',
                                            color: m.sent_by ? 'white' : 'var(--text-primary)',
                                            border: !m.sent_by ? '1px solid var(--border-light)' : 'none',
                                            borderBottomRightRadius: m.sent_by ? 4 : 16,
                                            borderBottomLeftRadius: !m.sent_by ? 4 : 16,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                        }}>
                                            <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{m.body}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6, fontSize: '0.65rem', color: m.sent_by ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                                                {dateUtils.parseSafe(m.sent_at)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                                                {m.sent_by && (m.status === 'Delivered' ? <CheckCheck size={12} style={{ color: 'var(--accent-teal)' }} /> : <Check size={12} />)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                             {/* Composer */}
                            <div style={{ 
                                padding: isMobile ? '12px 16px 32px' : '20px 24px', 
                                borderTop: '1px solid var(--border-light)', 
                                background: 'white' 
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    background: 'var(--slate-50)', 
                                    border: '1px solid var(--border-medium)', 
                                    borderRadius: 24, 
                                    padding: '4px 6px 4px 16px'
                                }}>
                                    <input
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Message..."
                                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', height: 40 }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                                    />
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {replyText.length === 0 && (
                                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--accent-violet)' }} onClick={handleDraft} disabled={drafting}>
                                                <Wand2 size={20} />
                                            </button>
                                        )}
                                        <button 
                                            className="btn btn-primary btn-icon" 
                                            style={{ 
                                                borderRadius: '50%', 
                                                width: 40, 
                                                height: 40, 
                                                background: replyText.trim() ? 'var(--navy-600)' : 'var(--slate-300)',
                                                border: 'none'
                                            }} 
                                            onClick={handleSend} 
                                            disabled={!replyText.trim()}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', background: 'var(--slate-50)' }}>
                            <div style={{ width: 80, height: 80, background: 'white', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
                                <MessageSquare size={32} style={{ color: 'var(--navy-300)' }} />
                            </div>
                            <h3 style={{ margin: '0 0 8px', color: 'var(--navy-900)', fontWeight: 900 }}>Operational Readiness</h3>
                            <p style={{ fontSize: '0.9rem', maxWidth: 300, textAlign: 'center' }}>Waiting for interaction. Select a conversation to start providing elite service.</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Lead Intelligence (Desktop Only) */}
                {activeId && !isMobile && (
                    <div className="hidden-mobile" style={{ width: 280, borderLeft: '1px solid var(--border-light)', background: 'white', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-light)' }}>
                            <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lead Intelligence</h4>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'var(--slate-50)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '2rem', fontWeight: 900, color: 'var(--navy-700)' }}>
                                    {activeConv.name ? activeConv.name[0] : '?'}
                                </div>
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-900)' }}>{activeConv.name}</h3>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', display: 'inline-block', padding: '2px 10px', borderRadius: 20 }}>Active Negotiation</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Project Interest</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                                        Zentrix Elite Towers
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Budget Range</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--navy-900)' }}>₹1.2 Cr - 1.5 Cr</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Lead Engagement Score</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ flex: 1, height: 6, background: 'var(--slate-100)', borderRadius: 10, overflow: 'hidden' }}>
                                            <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, var(--accent-amber), var(--accent-emerald))' }} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--navy-900)' }}>85</span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Preferred Channel</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {getChannelIcon(activeConv.channel)}
                                        <span style={{ textTransform: 'capitalize' }}>{activeConv.channel}</span>
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 32, borderRadius: 12, border: '1px solid var(--border-light)', fontSize: '0.75rem', fontWeight: 800 }}>
                                View Full Profile
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
