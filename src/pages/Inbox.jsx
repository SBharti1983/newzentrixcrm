import { useState, useEffect, useCallback } from 'react';
import { Search, Mail, MessageSquare, Phone, MoreVertical, Paperclip, Send, Check, CheckCheck, RefreshCw, Wand2, User } from 'lucide-react';
import { notificationsApi } from '../api/client';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../hooks/useToast';

export default function Inbox() {
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
        <div className="animate-fadeIn" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy-800)', margin: '0 0 4px' }}>Omnichannel Inbox</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage WhatsApp, Email, and SMS conversations in real-time.</p>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 0 }}>
                {/* Sidebar */}
                <div style={{ width: 320, borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: 'var(--slate-50)' }}>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-light)' }}>
                        <div className="search-bar" style={{ width: '100%', background: 'white' }}>
                            <Search size={14} style={{ color: 'var(--text-muted)' }} />
                            <input placeholder="Search messages..." />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {conversations.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No conversations yet.</div>
                        ) : conversations.map(c => (
                            <div
                                key={c.lead_id}
                                onClick={() => setActiveId(c.lead_id)}
                                style={{
                                    padding: '16px', display: 'flex', gap: 12, cursor: 'pointer',
                                    background: activeId === c.lead_id ? 'white' : 'transparent',
                                    borderLeft: activeId === c.lead_id ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                                    borderBottom: '1px solid var(--border-light)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'var(--navy-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                        {c.name ? c.name[0] : <User size={20} />}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'white', borderRadius: '50%', padding: 4, display: 'flex', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                        {getChannelIcon(c.channel)}
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontWeight: activeId === c.lead_id ? 800 : 700, color: 'var(--navy-800)', fontSize: '0.9rem' }}>{c.name}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.last_msg}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
                    {activeId ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--accent-teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
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
                                                {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {m.sent_by && (m.status === 'Delivered' ? <CheckCheck size={12} style={{ color: 'var(--accent-teal)' }} /> : <Check size={12} />)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Composer */}
                            <div style={{ padding: '24px', borderTop: '1px solid var(--border-light)', background: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--slate-50)', border: '1.5px solid var(--border-medium)', borderRadius: 24, padding: '4px 8px 4px 16px', transition: 'all 0.2s', focusWithin: { borderColor: 'var(--accent-teal)' } }}>
                                    <button className="btn btn-ghost" style={{ padding: 4 }} title="Attach File"><Paperclip size={18} /></button>
                                    <input
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder={`Type your ${activeConv.channel} reply...`}
                                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', color: 'var(--navy-900)' }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                                    />
                                    <button
                                        className="btn btn-ghost"
                                        style={{ padding: 8, color: 'var(--accent-violet)' }}
                                        onClick={handleDraft}
                                        disabled={drafting}
                                        title="AI Magic Draft"
                                    >
                                        {drafting ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                    </button>
                                    <button className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: 20, boxShadow: '0 4px 12px rgba(30, 58, 115, 0.2)' }} onClick={handleSend} disabled={!replyText.trim()}>
                                        <Send size={16} /> <span style={{ marginLeft: 6 }}>Send</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
                            <div style={{ width: 64, height: 64, background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <MessageSquare size={32} />
                            </div>
                            <h3 style={{ margin: 0, color: 'var(--navy-800)' }}>Select a conversation</h3>
                            <p>Pick a thread from the sidebar to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
