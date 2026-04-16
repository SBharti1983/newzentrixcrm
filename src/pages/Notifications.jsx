import { useState, useEffect } from 'react';
import { CHANNELS } from '../data/notificationTemplates';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { notificationsApi } from '../api/client';
import NotificationComposer from '../components/NotificationComposer';
import { Plus, Send, Search, Smartphone, Mail, MessageSquare, CheckCircle, Clock, XCircle, BarChart2 } from 'lucide-react';

const STATUS_STYLE = {
    delivered: { label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle size={12} /> },
    pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={12} /> },
    failed: { label: 'Failed', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', icon: <XCircle size={12} /> },
};

const CHANNEL_ICONS = {
    sms: <Smartphone size={16} />,
    email: <Mail size={16} />,
    whatsapp: <MessageSquare size={16} />,
};

const CHANNEL_THEMES = {
    whatsapp: { label: 'WhatsApp', color: '#25d366', bg: 'rgba(37,211,102,0.1)', icon: <MessageSquare size={14} /> },
    email: { label: 'Email', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <Mail size={14} /> },
    sms: { label: 'SMS', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <Smartphone size={14} /> },
};

// World-class Animation Definition
const PULSE_ANIMATION = `
@keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
    100% { opacity: 1; transform: scale(1); }
}
`;

export default function Notifications() {
    const { data: apiData, loading, error, refetch } = useApi(() => notificationsApi.list({ limit: 200 }));
    const log = (apiData?.data || []).map(n => ({
        ...n,
        channel: (n.channel || '').toLowerCase(),
        status: (n.status || 'Sent').toLowerCase(),
        recipient: n.lead_name || n.recipient || '—',
        phone: n.recipient,
        email: n.recipient,
        template: n.subject || 'Custom',
        preview: (n.body || '').substring(0, 120),
        sentAt: n.sent_at ? new Date(n.sent_at).toLocaleString('en-IN', { hour12: false }).slice(0, 16) : '—',
        sentBy: n.sent_by_name || '—',
    }));
    const stats = apiData?.stats || {};

    const [showComposer, setShowComposer] = useState(false);
    const [search, setSearch] = useState('');
    const [filterChannel, setFilterChannel] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    // hooks must be called before early returns
    useEffect(() => {
        const originalWidth = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => { document.body.style.overflowX = originalWidth; };
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterChannel, filterStatus]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const filtered = log.filter(n => {
        const ms = filterStatus === 'all' || n.status === filterStatus;
        const mc = filterChannel === 'all' || n.channel === filterChannel;
        const mq = !search || n.recipient.toLowerCase().includes(search.toLowerCase()) || n.template.toLowerCase().includes(search.toLowerCase());
        return ms && mc && mq;
    });
    const localSum = (parseInt(stats.whatsapp_count) || 0) + (parseInt(stats.email_count) || 0) + (parseInt(stats.sms_count) || 0) || 1;
    const statsTotal = parseInt(stats.total_count) || 0;
    const safeTotal = Math.max(statsTotal, localSum, log.length, 1);

    const delivered = parseInt(stats.delivered_count) || log.filter(n => n.status === 'delivered').length || 0;
    const whatsappCount = parseInt(stats.whatsapp_count) || log.filter(n => n.channel === 'whatsapp').length || 0;
    const emailCount = parseInt(stats.email_count) || log.filter(n => n.channel === 'email').length || 0;
    const smsCount = parseInt(stats.sms_count) || log.filter(n => n.channel === 'sms').length || 0;

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    function handleSent() {
        refetch();
    }

    return (
        <div className="animate-fadeIn pb-12" style={{ paddingRight: 20 }}>
            <style>{PULSE_ANIMATION}</style>
            {/* Compressed Enterprise Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 8px var(--accent-emerald)', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate-500)' }}>Messaging Engine: Active</span>
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.02em' }}>Notification Center</h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, marginTop: 2 }}>Unified telemetry & omnichannel dispatch hub</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn hover-lift" onClick={() => setShowComposer(true)} style={{ 
                        background: 'linear-gradient(135deg, var(--navy-900), var(--navy-700))', 
                        color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, 
                        fontWeight: 900, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 8px 16px -4px rgba(10,22,40,0.2)'
                    }}>
                        <Send size={16} /> New Dispatch
                    </button>
                </div>
            </div>

            {/* Ultra-Compact Enterprise KPI Hub */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Outbound', value: statsTotal || log.length, trend: 'Unified', icon: <Send size={18} />, color: 'var(--navy-600)' },
                    { label: 'Network Arrival', value: delivered, trend: `${Math.round((delivered / safeTotal) * 100)}% OK`, icon: <CheckCircle size={18} />, color: '#10b981' },
                    { label: 'WhatsApp Stream', value: whatsappCount, trend: 'Live', icon: <MessageSquare size={18} />, color: '#25d366' },
                    { label: 'Direct Comms', value: emailCount + smsCount, trend: 'Mail/SMS', icon: <Smartphone size={18} />, color: 'var(--accent-cyan-dark)' },
                ].map((k, i) => (
                    <div key={k.label} className="ent-card hover-lift" style={{ 
                        padding: '10px 18px', position: 'relative', overflow: 'hidden', 
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 72,
                        minWidth: 160, maxWidth: 220, flex: '0 1 auto'
                    }}>
                        <div style={{ position: 'absolute', right: -4, top: -4, opacity: 0.03 }}>
                            {k.icon}
                        </div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{k.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--navy-900)', lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: k.color, whiteSpace: 'nowrap', opacity: 0.8 }}>{k.trend}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Compressed Telemetry Matrix */}
            <div className="ent-card mb-6" style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart2 size={14} className="text-slate-400" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 950, color: 'var(--navy-800)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Propagation Matrix</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                        {[
                            { label: 'WA', count: whatsappCount, color: '#25d366' },
                            { label: 'Mail', count: emailCount, color: '#3b63b8' },
                            { label: 'SMS', count: smsCount, color: '#10b981' },
                        ].map(c => (
                            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}` }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--navy-800)' }}>{c.label}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-400)' }}>{Math.round((c.count / safeTotal) * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Bar Structure - No Gap to prevent overflow */}
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 8, background: 'var(--slate-50)', width: '100%' }}>
                    {[
                        { key: 'wa', count: whatsappCount, color: '#25d366' },
                        { key: 'em', count: emailCount, color: '#3b63b8' },
                        { key: 'sm', count: smsCount, color: '#10b981' },
                    ].map(c => (
                        <div key={c.key} style={{
                            height: '100%',
                            width: `${(c.count / safeTotal) * 100}%`,
                            background: c.color,
                            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        }} />
                    ))}
                </div>
            </div>

            {/* Compact Filter Matrix */}
            <div className="ent-card mb-6" style={{ padding: '12px 20px', background: 'var(--slate-50/50)', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 150 }}>
                        <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                        <input
                            className="form-control"
                            placeholder="Recipient or campaign..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 40, height: 42, borderRadius: 12, border: '1px solid var(--border-medium)', fontSize: '0.82rem', fontWeight: 600 }}
                        />
                    </div>
                    <select className="form-control" style={{ width: 140, height: 42, borderRadius: 12, fontWeight: 700, background: 'white', fontSize: '0.8rem' }} value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
                        <option value="all">Channels: All</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Mail</option>
                        <option value="sms">SMS</option>
                    </select>
                    <select className="form-control" style={{ width: 140, height: 42, borderRadius: 12, fontWeight: 700, background: 'white', fontSize: '0.8rem' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">Status: Global</option>
                        <option value="delivered">Sent</option>
                        <option value="pending">Queued</option>
                        <option value="failed">Failed</option>
                    </select>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0 8px' }}>
                        {filtered.length} LOGS FOUND
                    </div>
                </div>
            </div>

            {/* Real-time Log Stream */}
            <div className="ent-card" style={{ overflow: 'hidden', padding: 0 }}>
                <div className="table-wrapper" style={{ margin: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
                        <thead>
                            <tr style={{ background: 'var(--slate-50)' }}>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Communication Vector</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entity Recipient</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Template Mode</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content Digest</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dispatch Time</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Operator</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 950, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Status</th>
                                <th style={{ padding: '20px 24px' }}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginated.map(n => {
                                const chTheme = CHANNEL_THEMES[n.channel] || CHANNEL_THEMES.email;
                                const st = STATUS_STYLE[n.status] || STATUS_STYLE.delivered;
                                return (
                                    <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                                background: chTheme.bg, color: chTheme.color,
                                                padding: '8px 16px', borderRadius: 12,
                                                fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.02em', boxSizing: 'border-box'
                                            }}>
                                                {chTheme.icon} <span style={{ opacity: 0.9 }}>{chTheme.label.toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="avatar avatar-xs" style={{ background: 'var(--navy-600)', color: 'white', fontWeight: 900 }}>{n.recipient[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>{n.recipient}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontWeight: 600 }}>
                                                        {n.channel === 'email' ? n.email : n.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-indigo)' }}>Code: {n.template}</span>
                                                {n.subject && (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--navy-700)', fontWeight: 700 }}>
                                                        {n.subject.substring(0, 30)}{n.subject.length > 30 ? '…' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', maxWidth: 220 }}>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--slate-50)', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-light)', fontStyle: 'italic' }}>
                                                &quot;{n.preview.substring(0, 75)}{n.preview.length > 75 ? '…' : ''}&quot;
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--navy-800)' }}>{n.sentAt}</td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-500)' }}>{n.sentBy}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                                background: st.bg, color: st.color,
                                                padding: '6px 14px', borderRadius: 20,
                                                fontWeight: 900, fontSize: '0.7rem',
                                            }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: `0 0 6px ${st.color}` }} />
                                                {st.label.toUpperCase()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button
                                                className="btn btn-ghost btn-sm hover-lift"
                                                title="Resend Message"
                                                style={{ 
                                                    fontSize: '0.7rem', padding: '8px 16px', borderRadius: 10,
                                                    border: '1px solid var(--border-light)', fontWeight: 900,
                                                    display: 'flex', alignItems: 'center', gap: 6, background: 'white'
                                                }}
                                                onClick={() => setShowComposer(true)}
                                            >
                                                <Send size={12} /> RESEND
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: '80px 0' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: 20, opacity: 0.3 }}>📬</div>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--navy-900)', margin: 0 }}>System Log Empty</h3>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--slate-400)', marginTop: 8 }}>No communications records match the current telemetry filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Premium Pagination bar */}
                {filtered.length > 0 && (
                    <div style={{ 
                        padding: '20px 32px', 
                        borderTop: '1px solid var(--border-light)', 
                        background: '#fafafa',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 700 }}>
                            Telemetry Stream: Displaying {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of <span style={{ color: 'var(--navy-900)', fontWeight: 900 }}>{filtered.length}</span> Dispatch Logs
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn hover-lift"
                                style={{ 
                                    padding: '8px 20px', borderRadius: 12, background: 'white', 
                                    border: '1px solid var(--border-medium)', color: 'var(--navy-900)',
                                    fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1
                                }}
                            >
                                Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        style={{
                                            width: 32, height: 32, borderRadius: 10, border: 'none',
                                            background: currentPage === i + 1 ? 'var(--navy-900)' : 'transparent',
                                            color: currentPage === i + 1 ? 'white' : 'var(--text-secondary)',
                                            fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer'
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn hover-lift"
                                style={{ 
                                    padding: '8px 20px', borderRadius: 12, background: 'white', 
                                    border: '1px solid var(--border-medium)', color: 'var(--navy-900)',
                                    fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showComposer && (
                <NotificationComposer
                    onClose={() => setShowComposer(false)}
                    onSent={handleSent}
                />
            )}
        </div>
    );
}
