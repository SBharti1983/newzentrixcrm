import { useState } from 'react';
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
    sms: <Smartphone size={15} />,
    email: <Mail size={15} />,
    whatsapp: <MessageSquare size={15} />,
};

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

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const filtered = log.filter(n => {
        const ms = filterStatus === 'all' || n.status === filterStatus;
        const mc = filterChannel === 'all' || n.channel === filterChannel;
        const mq = !search || n.recipient.toLowerCase().includes(search.toLowerCase()) || n.template.toLowerCase().includes(search.toLowerCase());
        return ms && mc && mq;
    });

    const totalSent = parseInt(stats.total_count) || log.length || 1;
    const delivered = parseInt(stats.delivered_count) || log.filter(n => n.status === 'delivered').length;
    const whatsappCount = parseInt(stats.whatsapp_count) || log.filter(n => n.channel === 'whatsapp').length;
    const emailCount = parseInt(stats.email_count) || log.filter(n => n.channel === 'email').length;
    const smsCount = parseInt(stats.sms_count) || log.filter(n => n.channel === 'sms').length;

    function handleSent() {
        refetch();
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notification Center</h1>
                    <p className="page-subtitle">SMS · Email · WhatsApp — all customer communications in one place</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setShowComposer(true)}>
                        <Send size={14} /> Compose Message
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Total Sent', value: totalSent, icon: <Send size={18} />, color: 'var(--navy-600)', bg: 'var(--navy-50)' },
                    { label: 'Delivered', value: delivered, sub: `${Math.round((delivered / totalSent) * 100)}% rate`, icon: <CheckCircle size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'WhatsApp', value: whatsappCount, icon: <MessageSquare size={18} />, color: '#25d366', bg: 'rgba(37,211,102,0.08)' },
                    { label: 'Email / SMS', value: `${emailCount} / ${smsCount}`, icon: <Mail size={18} />, color: 'var(--accent-cyan-dark)', bg: 'rgba(6,182,212,0.08)' },
                ].map(k => (
                    <div key={k.label} style={{
                        background: k.bg, borderRadius: 'var(--border-radius-lg)',
                        border: `1px solid ${k.color}25`, padding: '18px 20px',
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: `${k.color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: k.color, flexShrink: 0,
                        }}>{k.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>{k.label}</div>
                            {k.sub && <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald-dark)', marginTop: 1 }}>{k.sub}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Channel usage bar */}
            <div className="card mb-4" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>Channel Distribution</div>
                <div style={{ display: 'flex', gap: 0, borderRadius: 99, overflow: 'hidden', height: 14 }}>
                    {[
                        { key: 'whatsapp', count: whatsappCount, color: '#25d366' },
                        { key: 'email', count: emailCount, color: '#3b63b8' },
                        { key: 'sms', count: smsCount, color: '#10b981' },
                    ].map(c => (
                        <div key={c.key} style={{
                            height: '100%',
                            width: `${(c.count / totalSent) * 100}%`,
                            background: c.color,
                            transition: 'width 0.6s ease',
                        }} title={`${CHANNELS[c.key].label}: ${c.count}`} />
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                    {[
                        { label: 'WhatsApp', count: whatsappCount, color: '#25d366' },
                        { label: 'Email', count: emailCount, color: '#3b63b8' },
                        { label: 'SMS', count: smsCount, color: '#10b981' },
                    ].map(c => (
                        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                            <span style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                            <span style={{ fontWeight: 700 }}>{c.count}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({Math.round((c.count / totalSent) * 100)}%)</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="form-control"
                            placeholder="Search recipient or template…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 32 }}
                        />
                    </div>
                    <select className="form-control" style={{ width: 140 }} value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
                        <option value="all">All Channels</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                    </select>
                    <select className="form-control" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="delivered">Delivered</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {filtered.length} records
                    </span>
                </div>
            </div>

            {/* Log Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div className="table-wrapper" style={{ margin: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Channel</th>
                                <th>Recipient</th>
                                <th>Template</th>
                                <th>Preview</th>
                                <th>Sent At</th>
                                <th>Sent By</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(n => {
                                const ch = CHANNELS[n.channel];
                                const st = STATUS_STYLE[n.status] || STATUS_STYLE.delivered;
                                return (
                                    <tr key={n.id}>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                background: ch.bg, color: ch.color,
                                                padding: '4px 10px', borderRadius: 99,
                                                fontWeight: 700, fontSize: '0.78rem',
                                            }}>
                                                {CHANNEL_ICONS[n.channel]} {ch.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.recipient}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {n.channel === 'email' ? n.email : n.phone}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-slate">{n.template}</span>
                                            {n.subject && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                                                    {n.subject.substring(0, 40)}{n.subject.length > 40 ? '…' : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: 220 }}>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {n.preview.substring(0, 80)}{n.preview.length > 80 ? '…' : ''}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{n.sentAt}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{n.sentBy}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                background: st.bg, color: st.color,
                                                padding: '4px 10px', borderRadius: 99,
                                                fontWeight: 700, fontSize: '0.75rem',
                                            }}>
                                                {st.icon} {st.label}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                title="Resend"
                                                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                                onClick={() => setShowComposer(true)}
                                            >
                                                <Send size={11} /> Resend
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="empty-state" style={{ padding: '40px 0' }}>
                                            <div className="empty-state-icon">📭</div>
                                            <div className="empty-state-title">No notifications found</div>
                                            <div className="empty-state-text">Try adjusting filters or send your first message.</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
