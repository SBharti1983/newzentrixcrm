import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dialerEvents } from '../../constants/events';
import {
    Search, Mail, MessageSquare, Phone, MoreVertical,
    Send, RefreshCw, Wand2, User, Sparkles, Brain,
    TrendingUp, TrendingDown, Target, Zap, Clock,
    CheckCircle2, AlertCircle, ChevronRight, Filter,
    ChevronLeft, X, Paperclip
} from 'lucide-react';
import { leadsApi, notificationsApi, dashboardApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import AIPitchModal from '../../components/modals/AIPitchModal';
import * as dateUtils from '../../utils/dateUtils';

// ═══════════════════════════════════════════════════════════════════
//  CANNED TEMPLATES
// ═══════════════════════════════════════════════════════════════════
const CANNED_REPLIES = [
    { label: "📅 Site Visit", text: "Hi! Would you be available for a project site visit this Saturday or Sunday? We can arrange transport for you." },
    { label: "🏠 Brochure", text: "Hello! Here are the project configurations, floor plans, and amenities lists for your review. Let me know what you think." },
    { label: "💰 Pricing", text: "Hi! I am compiling the detailed pricing sheets, payment plans, and inventory lists to send over shortly." },
    { label: "📞 Callback", text: "Hello! Just tried calling to discuss your query. Let me know when is a convenient time to connect today." },
    { label: "👋 Follow Up", text: "Hi! Just following up to see if you had any questions on the project options we discussed earlier." }
];

// ═══════════════════════════════════════════════════════════════════
//  SKELETON COMPONENT (Initial Loading)
// ═══════════════════════════════════════════════════════════════════
function CommandCenterSkeleton() {
    return (
        <div style={{ padding: '16px 24px', height: 'calc(100vh - 100px)', overflow: 'hidden', background: '#f8fafc' }} className="animate-fadeIn">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(310px, 1.2fr) 2fr 1.2fr', gap: 20, height: '100%' }} className="command-center-grid">
                {/* Left panel skeleton */}
                <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--border-light)' }}>
                    <div style={{ height: 40, borderRadius: 12, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[50, 70, 60].map((w, i) => (
                            <div key={i} style={{ height: 26, width: w, borderRadius: 10, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'hidden' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ padding: 16, borderRadius: 16, border: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ height: 14, width: '70%', borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                    <div style={{ height: 10, width: '45%', borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center panel skeleton */}
                <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)' }}>
                    <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ height: 16, width: 140, borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                <div style={{ height: 12, width: 80, borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: 32, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ width: '60%', height: 60, borderRadius: '20px 20px 20px 4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ width: '50%', height: 48, borderRadius: '20px 20px 4px 20px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ width: '45%', height: 48, borderRadius: '20px 20px 20px 4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div>
                    </div>
                </div>

                {/* Right panel skeleton */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card" style={{ height: 160, padding: 20, border: '1px solid var(--border-light)' }}>
                        <div style={{ height: 16, width: '60%', borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', marginBottom: 16 }} />
                        <div style={{ height: 80, width: 80, borderRadius: '50%', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', margin: '0 auto' }} />
                    </div>
                    <div className="card" style={{ flex: 1, padding: 24, background: 'var(--navy-900)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ height: 20, width: '50%', borderRadius: 4, background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ height: 12, width: '40%', borderRadius: 4, background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                <div style={{ height: 36, borderRadius: 10, background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  CHAT MESSAGES SKELETON (Switching Leads)
// ═══════════════════════════════════════════════════════════════════
function ChatMessagesSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <div style={{ width: '65%', height: 60, borderRadius: '20px 20px 20px 4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <div style={{ width: '50%', height: 48, borderRadius: '20px 20px 4px 20px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <div style={{ width: '45%', height: 50, borderRadius: '20px 20px 20px 4px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════════
function TypingIndicator() {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '6px 0' }} className="animate-fadeIn">
            <div style={{
                padding: '14px 20px',
                borderRadius: '24px',
                borderBottomLeftRadius: 4,
                background: 'white',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', top: -16, left: 6, fontSize: '0.62rem', fontWeight: 900, color: 'var(--accent-violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Assistant</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 16 }}>
                    {[0, 1, 2].map(i => (
                        <span key={i} style={{
                            width: 6,
                            height: 6,
                            background: 'var(--accent-violet)',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'calTyping 1.4s infinite both',
                            animationDelay: `${i * 0.2}s`
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function CommandCenter() {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [activeLeadId, setActiveLeadId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sidebarFilter, setSidebarFilter] = useState('All'); // All, Active, High, Won, Lost
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [showPitchModal, setShowPitchModal] = useState(false);
    
    // Mobile layouts
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [mobileView, setMobileView] = useState('list'); // 'list', 'chat', 'intel'

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) setMobileView('list');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Data Fetching ─────────────────────────────────────────────
    const loadLeads = useCallback(async () => {
        try {
            setLoading(true);
            const res = await dashboardApi.getCommandCenterIntel();
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
    const intel = activeLead; 

    // ── Handlers ──────────────────────────────────────────────────
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

    const handleRecommendationClick = () => {
        if (!intel?.nextAction) return;
        const action = intel.nextAction;
        let text = '';
        if (action === 'Prepare for Site Visit') {
            text = "Hi! I am preparing the project site layouts and directions for your upcoming visit. Please let me know if you would like me to arrange transport.";
        } else if (action === 'Share Final Pricing') {
            text = "Hello! Based on our last discussion, here is the finalized pricing sheet and booking amount details for your preferred units.";
        } else if (action === 'Schedule Site Visit') {
            text = "Hi! I see you are interested in this project. Would you be available for a site visit this Saturday or Sunday? We can arrange transport for you.";
        } else {
            text = "Hi! Just following up to see if you had a chance to review the details we sent over. Let me know if you need any clarification.";
        }
        setReplyText(text);
        addToast({ type: 'success', title: 'Recommendation Loaded', message: 'Loaded action draft into reply field.' });
    };

    const handleLeadSelect = (leadId: any) => {
        setActiveLeadId(leadId);
        if (isMobile) {
            setMobileView('chat');
        }
    };

    // ── Smart Conversational Previews ─────────────────────────────
    const getLeadLastMessage = (l: any) => {
        if (l.id === activeLeadId && messages.length > 0) {
            return messages[0].body; 
        }
        if (l.stage === 'Won') return "Deal closed! Welcome to Maya Infratech 🎉";
        if (l.stage === 'Lost') return "Outreach ended.";
        if (l.stage === 'Negotiation') return "Sent: Finalizing proposal & payment link.";
        if (l.stage === 'Site Visit Done') return "Site visit completed. Client was positive.";
        if (l.stage === 'Site Visit Scheduled') return "Site visit scheduled for this weekend.";
        if (l.stage === 'Qualified') return "Waiting for client's confirmation.";
        if (l.stage === 'Connected') return "Follow-up: Project brochures sent.";
        return "Outbound: Welcome to Maya Infratech! 👋";
    };

    const getLeadLastTime = (l: any) => {
        if (l.id === activeLeadId && messages.length > 0) {
            return dateUtils.parseSafe(messages[0].sent_at)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now';
        }
        if (l.stage === 'Won') return '1d ago';
        if (l.stage === 'Negotiation') return '2h ago';
        if (l.stage === 'Site Visit Done') return '4h ago';
        if (l.stage === 'Site Visit Scheduled') return 'Yesterday';
        return '3h ago';
    };


    // ── Filtering logic ──────────────────────────────────────────
    const filteredLeads = leads.filter(l => {
        const nameMatch = (l.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = (l.phone || '').includes(searchTerm);
        const cityMatch = (l.city || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = nameMatch || phoneMatch || cityMatch;

        if (!matchesSearch) return false;

        const prob = l.closingProbability || l.score || 0;
        if (sidebarFilter === 'High') return prob >= 60;
        if (sidebarFilter === 'Won') return l.status === 'Won' || l.stage === 'Won';
        if (sidebarFilter === 'Lost') return l.status === 'Lost' || l.stage === 'Lost';
        if (sidebarFilter === 'Active') return l.status !== 'Won' && l.status !== 'Lost' && l.stage !== 'Won' && l.stage !== 'Lost';
        return true;
    });



    if (loading) return <CommandCenterSkeleton />;

    return (
        <div className="command-center-root animate-fadeIn" style={{ height: isMobile ? 'auto' : 'calc(100vh - 64px)', paddingBottom: isMobile ? '80px' : '0px', marginBottom: '0px', overflowX: 'hidden', paddingTop: 20, margin: isMobile ? '0' : '-16px -28px -16px -28px' }}>
            {/* ─── Premium Keyframe styles ─── */}
            <style>{`
                @keyframes calPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.65; transform: scale(0.97); } }
                @keyframes calTyping { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
                .sidebar-filters::-webkit-scrollbar { display: none; }
                .canned-replies-container::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="command-center-grid" style={{ display: isMobile ? 'block' : 'grid', height: isMobile ? 'auto' : '100%' }}>
                
                {/* ═══════════════════════════════════════════════════════
                    LEFT PANEL: CONVERSATIONS LIST
                   ═══════════════════════════════════════════════════════ */}
                {(!isMobile || mobileView === 'list') && (
                    <div className="card" style={{ height: isMobile ? 'calc(100vh - 160px)' : '100%', padding: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', background: 'white' }}>
                            <div className="search-bar" style={{ width: '100%', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: 12 }}>
                                <Search size={14} style={{ color: 'var(--text-muted)', marginRight: 6 }} />
                                <input 
                                    placeholder="Search opportunities..." 
                                    style={{ fontSize: '0.85rem', border: 'none', background: 'transparent', outline: 'none', flex: 1 }} 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={14} /></button>
                                )}
                            </div>

                            {/* Sidebar Filters */}
                            <div style={{ display: 'flex', gap: 4, marginTop: 12, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }} className="sidebar-filters">
                                {[
                                    { id: 'All', label: 'All' },
                                    { id: 'Active', label: '⚡ Active' },
                                    { id: 'High', label: '🔥 High' },
                                    { id: 'Won', label: '🎉 Won' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setSidebarFilter(f.id)}
                                        style={{
                                            padding: '3px 8px',
                                            borderRadius: 12,
                                            border: '1px solid',
                                            borderColor: sidebarFilter === f.id ? 'var(--navy-900)' : 'var(--border-medium)',
                                            background: sidebarFilter === f.id ? 'var(--navy-900)' : 'white',
                                            color: sidebarFilter === f.id ? 'white' : 'var(--text-muted)',
                                            fontSize: '0.64rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0', background: '#fafbfc' }}>
                            {filteredLeads.length === 0 ? (
                                <div className="empty-state" style={{ padding: '40px 20px' }}>
                                    <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🎯</div>
                                    <div className="empty-state-title">No opportunities found</div>
                                    <div className="empty-state-text" style={{ fontSize: '0.78rem' }}>Try refining your filters or search keywords.</div>
                                </div>
                            ) : (
                                filteredLeads.map(l => {
                                    const prob = l.closingProbability || l.score || 0;
                                    const isActive = activeLeadId === l.id;
                                    return (
                                        <div
                                            key={l.id}
                                            onClick={() => handleLeadSelect(l.id)}
                                            style={{
                                                position: 'relative',
                                                padding: '14px 18px', cursor: 'pointer',
                                                background: isActive ? 'white' : 'transparent',
                                                margin: '4px 10px',
                                                borderRadius: '16px',
                                                border: isActive ? '1px solid rgba(226,232,240,0.8)' : '1px solid transparent',
                                                boxShadow: isActive ? '0 10px 25px -5px rgba(15,23,42,0.05), 0 4px 10px -4px rgba(15,23,42,0.02)' : 'none',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: isActive ? 'scale(1.01)' : 'scale(1)'
                                            }}
                                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
                                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {isActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '50%', width: 4, background: 'var(--accent-violet)', borderRadius: '0 4px 4px 0' }} />}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: isActive ? 'var(--navy-900)' : '#f1f5f9', color: isActive ? 'white' : 'var(--navy-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                                                        {l.name ? l.name[0].toUpperCase() : '?'}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '0.84rem', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1, fontWeight: 600 }}>{l.city || 'Unknown Region'}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: prob > 70 ? 'var(--accent-emerald-dark)' : prob > 40 ? 'var(--accent-amber-dark)' : '#f43f5e' }}>
                                                        {prob}%
                                                    </div>
                                                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getLeadLastTime(l)}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Snippet preview */}
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '4px 0 8px', fontWeight: 500 }}>
                                                {getLeadLastMessage(l)}
                                            </div>

                                            <div style={{ height: 3, width: '100%', background: 'var(--slate-100)', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ 
                                                    height: '100%', 
                                                    width: `${prob}%`, 
                                                    background: isActive ? 'linear-gradient(90deg, #818cf8, #c084fc)' : 'var(--slate-300)',
                                                    transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    CENTER PANEL: CHAT FEED VIEW
                   ═══════════════════════════════════════════════════════ */}
                {(!isMobile || mobileView === 'chat') && (
                    <div className="card" style={{ height: isMobile ? 'calc(100vh - 160px)' : '100%', padding: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                        {activeLead ? (
                            <>
                                {/* Chat Header */}
                                <div style={{ padding: isMobile ? '14px 16px' : '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        {isMobile && (
                                            <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', color: 'var(--navy-600)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 2, marginRight: 4, fontWeight: 700, fontSize: '0.8rem' }}>
                                                <ChevronLeft size={18} /> Back
                                            </button>
                                        )}
                                        <div style={{ width: 38, height: 38, borderRadius: '12px', background: 'linear-gradient(135deg, var(--navy-900), var(--navy-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.05rem', boxShadow: '0 4px 10px rgba(10, 22, 40, 0.15)', flexShrink: 0 }}>
                                            {(activeLead.name || '?')[0]}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--navy-900)' }}>{activeLead.name || 'Unknown Lead'}</h3>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '0.58rem', 
                                                    background: activeLead.status === 'Won' ? '#dcfce7' : activeLead.status === 'Lost' ? '#ffe4e6' : '#e0e7ff', 
                                                    color: activeLead.status === 'Won' ? '#15803d' : activeLead.status === 'Lost' ? '#be123c' : '#4338ca', 
                                                    padding: '1px 6px', 
                                                    borderRadius: 99, 
                                                    fontWeight: 900,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    border: `1px solid ${activeLead.status === 'Won' ? '#16653420' : activeLead.status === 'Lost' ? '#9f123920' : '#4338ca20'}`,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 3
                                                }}>
                                                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                                                    {activeLead.status || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                        <button className="icon-btn" onClick={() => dialerEvents.call(activeLead.id, activeLead.phone, activeLead.name)} title="Call Lead" style={{ width: 32, height: 32, border: '1px solid var(--border-medium)', borderRadius: 8, background: 'white' }}>
                                            <Phone size={14} color="var(--accent-emerald)" />
                                        </button>
                                        <button className="icon-btn" onClick={() => activeLead.email && window.open(`mailto:${activeLead.email}`, '_blank')} title="Send Email" style={{ width: 32, height: 32, border: '1px solid var(--border-medium)', borderRadius: 8, background: 'white' }}><Mail size={14} color="#64748b" /></button>
                                        
                                        {isMobile ? (
                                            <button className="btn hover-lift" onClick={() => setMobileView('intel')} style={{ background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))', color: 'var(--accent-violet)', fontWeight: 800, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Brain size={14} /> Intel
                                            </button>
                                        ) : (
                                            <button className="btn btn-secondary btn-sm hover-lift" onClick={() => navigate(`/leads/${activeLead.id}`)} style={{ fontSize: '0.72rem', padding: '6px 12px', height: 32, borderRadius: 8 }}>Profile</button>
                                        )}
                                    </div>
                                </div>

                                {/* Chat Body */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
                                    <div style={{ 
                                        flex: 1, padding: isMobile ? '16px' : '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: 14, position: 'relative' 
                                    }}>
                                        {isDrafting && <TypingIndicator />}
                                        
                                        {messagesLoading ? (
                                            <ChatMessagesSkeleton />
                                        ) : (
                                            messages.map(m => (
                                                <div key={m.id} className="animate-fadeIn" style={{ display: 'flex', justifyContent: m.sent_by ? 'flex-end' : 'flex-start' }}>
                                                    <div style={{
                                                        maxWidth: isMobile ? '85%' : '75%', padding: '12px 18px', borderRadius: '20px',
                                                        background: m.sent_by ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'white',
                                                        color: m.sent_by ? 'white' : '#1e293b',
                                                        border: m.sent_by ? 'none' : '1px solid #e2e8f0',
                                                        boxShadow: m.sent_by ? '0 6px 16px -4px rgba(99,102,241,0.25)' : '0 2px 4px rgba(0,0,0,0.01)',
                                                        borderBottomLeftRadius: !m.sent_by ? 4 : 20,
                                                        borderBottomRightRadius: m.sent_by ? 4 : 20,
                                                        position: 'relative'
                                                    }}>
                                                        {!m.sent_by && (
                                                            <div style={{ position: 'absolute', top: -15, left: 4, fontSize: '0.58rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeLead.name}</div>
                                                        )}
                                                        <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.45, fontWeight: 500, color: 'inherit', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                                                        
                                                        {/* Status Ticks */}
                                                        <div style={{ textAlign: 'right', marginTop: 6, fontSize: '0.55rem', opacity: m.sent_by ? 0.95 : 0.6, fontWeight: 700, color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                                                            {dateUtils.parseSafe(m.sent_at)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '—'}
                                                            {m.sent_by && (
                                                                <span style={{ 
                                                                    marginLeft: 2, 
                                                                    color: m.status === 'Read' ? '#38bdf8' : '#e0e7ff',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 900,
                                                                    display: 'inline-flex'
                                                                }}>
                                                                    {m.status === 'Read' ? '✓✓' : m.status === 'Delivered' ? '✓✓' : '✓'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        <div style={{ textAlign: 'center', margin: '15px 0' }}>
                                            <span style={{ background: 'white', border: '1px solid #e2e8f0', color: 'var(--slate-500)', padding: '5px 14px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>Connection Established</span>
                                        </div>
                                    </div>

                                    {/* Chat Input controls */}
                                    <div style={{ padding: isMobile ? '12px 14px' : '18px 24px', background: 'white', borderTop: '1px solid var(--border-light)' }}>
                                        {/* Canned reply templates */}
                                        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }} className="canned-replies-container">
                                            {CANNED_REPLIES.map((r, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setReplyText(r.text)}
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                        padding: '4px 10px',
                                                        borderRadius: '99px',
                                                        border: '1px solid #e2e8f0',
                                                        background: '#f8fafc',
                                                        color: '#475569',
                                                        fontSize: '0.66rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 10, background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', transition: 'all 0.2s', padding: '4px 8px' }} tabIndex={0} onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-violet)'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                            <button 
                                                className="btn hover-lift" 
                                                style={{ background: 'linear-gradient(to right, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.08))', color: 'var(--accent-violet)', fontWeight: 800, padding: 10, borderRadius: '50%', border: '1px solid rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 36, height: 36 }}
                                                onClick={handleDraft}
                                                disabled={isDrafting}
                                                title="Generate AI Draft"
                                            >
                                                <Wand2 size={16} />
                                            </button>
                                            <button 
                                                className="btn hover-lift" 
                                                style={{ color: '#94a3b8', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 36, cursor: 'pointer', padding: 0 }}
                                                onClick={() => addToast({ type: 'info', title: 'File Attachment', message: 'Attachment portal simulation ready.' })}
                                                title="Attach File"
                                            >
                                                <Paperclip size={16} />
                                            </button>
                                            <textarea
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                placeholder={isMobile ? "Write message..." : "Type a message or click AI to draft..."}
                                                style={{
                                                    flex: 1, border: 'none', background: 'transparent',
                                                    padding: '8px 2px', outline: 'none', resize: 'none', height: '36px',
                                                    fontSize: '0.8rem', fontWeight: 500, color: 'var(--navy-900)', fontFamily: 'inherit'
                                                }}
                                            />
                                            <button className="btn btn-primary hover-lift" onClick={handleSend} disabled={!replyText.trim()} style={{ borderRadius: '18px', padding: isMobile ? '8px 12px' : '10px 24px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: '0.8rem', justifyContent: 'center', height: 36 }}>
                                                {isMobile ? <Send size={14} /> : <>Send <Send size={14} /></>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">💬</div>
                                <div className="empty-state-title">Select a Conversation</div>
                                <div className="empty-state-text">Choose an opportunity from the list to begin conversation management.</div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    RIGHT PANEL: AI INTELLIGENCE
                   ═══════════════════════════════════════════════════════ */}
                {(!isMobile || mobileView === 'intel') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: isMobile ? 'calc(100vh - 160px)' : '100%', minHeight: 0, overflowY: 'auto' }}>
                        
                        {isMobile && (
                            <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 16 }}>
                                <button onClick={() => setMobileView('chat')} style={{ background: 'none', border: 'none', color: 'var(--navy-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 700, fontSize: '0.8rem' }}>
                                    <ChevronLeft size={18} /> Chat
                                </button>
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>AI Intelligence Details</span>
                            </div>
                        )}



                        {/* Intel Summary */}
                        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--navy-900)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            <div style={{ padding: '24px', background: 'rgba(0,0,0,0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 900, color: 'white' }}>
                                        <Sparkles size={16} style={{ color: '#c084fc' }} /> Lead Intelligence
                                    </h5>
                                    <div style={{ padding: '3px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#34d399', fontSize: '0.62rem', fontWeight: 900, border: '1px solid rgba(52, 211, 153, 0.2)' }}>REALTIME</div>
                                </div>

                                {/* Sentiment Index */}
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sentiment Score</label>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: intel?.sentiment === 'Positive' ? '#34d399' : intel?.sentiment === 'Negative' ? '#f43f5e' : '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {intel?.sentiment === 'Positive' ? '😊 Positive' : intel?.sentiment === 'Negative' ? '😡 Negative' : '😐 Neutral'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 5, height: 5 }}>
                                        {[1, 2, 3, 4, 5].map(i => {
                                            const score = intel?.sentiment === 'Positive' ? 5 : intel?.sentiment === 'Negative' ? 1 : 3;
                                            return (
                                                <div key={i} style={{ 
                                                    flex: 1, 
                                                    height: '100%', 
                                                    background: i <= score ? (intel?.sentiment === 'Positive' ? '#10b981' : intel?.sentiment === 'Negative' ? '#f43f5e' : '#fbbf24') : 'rgba(255,255,255,0.08)', 
                                                    borderRadius: 4,
                                                    transition: 'all 0.3s'
                                                }} />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Opportunity Profile Grid */}
                                <div style={{ marginBottom: 20, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', display: 'block', marginBottom: 12, letterSpacing: '0.05em' }}>Opportunity Profile</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Requirement</span>
                                            <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 800 }}>{intel?.propertyType || 'Any Project'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Target City</span>
                                            <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 800 }}>{intel?.city || 'Any Region'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Pipeline Stage</span>
                                            <span style={{ 
                                                fontSize: '0.72rem', 
                                                color: '#c084fc', 
                                                fontWeight: 800,
                                                background: 'rgba(168, 85, 247, 0.1)',
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                display: 'inline-block',
                                                border: '1px solid rgba(168, 85, 247, 0.2)'
                                            }}>{intel?.stage || 'Connected'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Status</span>
                                            <span style={{ 
                                                fontSize: '0.72rem', 
                                                color: intel?.status === 'Won' ? '#34d399' : intel?.status === 'Lost' ? '#f43f5e' : '#fbbf24', 
                                                fontWeight: 800,
                                                background: intel?.status === 'Won' ? 'rgba(16, 185, 129, 0.1)' : intel?.status === 'Lost' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                display: 'inline-block',
                                                border: `1px solid ${intel?.status === 'Won' ? 'rgba(16, 185, 129, 0.2)' : intel?.status === 'Lost' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                                            }}>{intel?.status || 'Active'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Text */}
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.04em' }}>Executive Analysis</label>
                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.55, fontWeight: 500 }}>
                                        {intel?.summary}
                                    </div>
                                </div>

                                {/* Pitch / Action Triggers */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                                    <button className="btn hover-lift" onClick={() => setShowPitchModal(true)} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.15))', color: '#e0e7ff', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px', fontWeight: 900, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                                        <Sparkles size={14} style={{ marginRight: 6, color: '#c084fc' }} /> Generate Smart Pitch
                                    </button>
                                    
                                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <label style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>System Recommendation</label>
                                        <button className="btn hover-lift" onClick={handleRecommendationClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', color: 'var(--navy-900)', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={14} color="#8b5cf6" style={{ fill: '#8b5cf6' }}/> {intel?.nextAction}</span>
                                            <ChevronRight size={16} color="#94a3b8" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Spacer to guarantee scroll padding clearance at the bottom of the flex list */}
                        <div style={{ height: isMobile ? 120 : 90, flexShrink: 0 }} />
                    </div>
                )}
            </div>

            {showPitchModal && activeLead && (
                <AIPitchModal lead={activeLead} onClose={() => setShowPitchModal(false)} />
            )}
        </div>
    );
}
