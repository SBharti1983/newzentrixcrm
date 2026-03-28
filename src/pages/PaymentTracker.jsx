import { useState, useMemo } from 'react';
import {
    CreditCard, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
    Plus, X, Download, Search, Filter, TrendingUp, IndianRupee, Calendar,
    Receipt, Bell, FileText
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { bookingsApi } from '../api/client';
import { useToast } from '../hooks/useToast';

const STATUS_COLORS = {
    Paid: { badge: 'badge-green', icon: '✅', color: 'var(--accent-emerald)' },
    Pending: { badge: 'badge-amber', icon: '⏳', color: 'var(--accent-amber)' },
    Overdue: { badge: 'badge-red', icon: '🔴', color: 'var(--accent-rose)' },
    Upcoming: { badge: 'badge-blue', icon: '🔵', color: 'var(--navy-400)' },
    Waived: { badge: 'badge-slate', icon: '➖', color: 'var(--slate-400)' },
};

const PLAN_TYPE_COLORS = {
    'Down Payment': { bg: 'rgba(30,58,115,0.08)', border: 'var(--navy-100)', label: 'DP' },
    'Construction Linked': { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)', label: 'CLP' },
    'EMI': { bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.2)', label: 'EMI' },
    'Subvention': { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', label: 'SUB' },
};

export default function PaymentTracker() {
    const { showToast } = useToast();
    const { data: bookings, loading, error, refetch } = useApi(() => bookingsApi.list());

    // Flatten all installments from all bookings
    const allInstRaw = useMemo(() => (bookings || []).flatMap(b => (b.installments || []).map(i => ({
        ...i,
        customerName: b.customer_name || 'Unknown',
        projectName: b.project_name || '—',
        unitNo: b.unit_no,
        agentName: b.agent_name || '—',
        bookingDate: b.booking_date,
        planType: b.payment_plan,
        bookingId: b.id,
        planId: b.id, // use booking id as group key
        totalAmount: b.total_amount,
    }))), [bookings]);

    // Build plan-level grouping from bookings
    const plans = useMemo(() => (bookings || []).map(b => ({
        id: b.id, planType: b.payment_plan, totalAmount: b.total_amount,
        customerName: b.customer_name || 'Unknown', projectName: b.project_name || '—',
        unitNo: b.unit_no, agentName: b.agent_name || '—', bookingDate: b.booking_date,
    })), [bookings]);

    const [expandedPlan, setExpandedPlan] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPlan, setFilterPlan] = useState('All');
    const [searchQ, setSearchQ] = useState('');
    const [showMarkModal, setShowMarkModal] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [receiptNote, setReceiptNote] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState('tracker');

    const installments = allInstRaw;


    const totalCollected = installments
        .filter(i => i.status === 'Paid')
        .reduce((s, i) => s + i.amount, 0);
    const totalPending = installments
        .filter(i => i.status === 'Pending' || i.status === 'Upcoming')
        .reduce((s, i) => s + i.amount, 0);
    const totalOverdue = installments
        .filter(i => i.status === 'Overdue')
        .reduce((s, i) => s + i.amount, 0);

    const formatCr = (val) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const filteredPlans = plans.filter(p => {
        const matchPlan = filterPlan === 'All' || p.planType === filterPlan;
        const searchUpper = searchQ.toLowerCase();
        const matchQ = !searchQ ||
            (p.customerName || '').toLowerCase().includes(searchUpper) ||
            (p.projectName || '').toLowerCase().includes(searchUpper) ||
            String(p.unitNo || '').toLowerCase().includes(searchUpper);
        return matchPlan && matchQ;
    });

    const planInstallments = (planId) => installments.filter(i => i.planId === planId);

    const handleMarkPaid = async () => {
        if (!selectedInstallment) return;
        try {
            await bookingsApi.payInstallment(selectedInstallment.bookingId, selectedInstallment.id, {
                paid_date: paymentDate,
                receipt_no: receiptNote,
                payment_mode: 'NEFT/RTGS',
            });
            showToast('Payment recorded!', 'success');
            refetch();
        } catch (err) { showToast(err.error || 'Failed to record payment', 'error'); }
        setShowMarkModal(false);
        setSelectedInstallment(null);
        setReceiptNote('');
    };

    const allInstallmentsList = installments.filter(i => {
        const matchStatus = filterStatus === 'All' || i.status === filterStatus;
        const matchQ = !searchQ || (i.customerName || '').toLowerCase().includes(searchQ.toLowerCase());
        return matchStatus && matchQ;
    }).sort((a, b) => new Date(a.due_date || a.dueDate) - new Date(b.due_date || b.dueDate));

    const [now] = useState(() => Date.now());
    const { overdueCount, upcomingCount } = useMemo(() => {
        const nextWeekMs = now + 7 * 86400000;
        return {
            overdueCount: installments.filter(i => i.status === 'Overdue').length,
            upcomingCount: installments.filter(i =>
                i.status === 'Upcoming' &&
                new Date(i.due_date || i.dueDate).getTime() <= nextWeekMs
            ).length
        };
    }, [installments, now]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Payment Tracker</h1>
                    <p className="page-subtitle">
                        {plans.length} active payment plans · {installments.filter(i => i.status === 'Paid').length} installments collected
                        {overdueCount > 0 && <span style={{ color: 'var(--accent-rose)', fontWeight: 700, marginLeft: 8 }}>⚠ {overdueCount} overdue</span>}
                    </p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm">
                        <Download size={14} /> Export Report
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Total Collected', value: formatCr(totalCollected), icon: '💰', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
                    { label: 'Pending Amount', value: formatCr(totalPending), icon: '⏳', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
                    { label: 'Overdue Amount', value: formatCr(totalOverdue), icon: '🚨', color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.2)' },
                    { label: 'Active Plans', value: plans.length, icon: '📋', color: 'var(--navy-500)', bg: 'var(--navy-50)', border: 'var(--navy-100)' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: s.bg, borderRadius: 'var(--border-radius-lg)',
                        border: `1px solid ${s.border}`, padding: '18px 20px',
                        transition: 'transform 0.2s', cursor: 'default',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            {(overdueCount > 0 || upcomingCount > 0) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                    {overdueCount > 0 && (
                        <div style={{
                            flex: 1, minWidth: 260,
                            background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.25)',
                            borderRadius: 'var(--border-radius-md)', padding: '12px 16px',
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <AlertTriangle size={18} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-rose)' }}>{overdueCount} Overdue Installment{overdueCount > 1 ? 's' : ''}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Action required — contact customers immediately</div>
                            </div>
                        </div>
                    )}
                    {upcomingCount > 0 && (
                        <div style={{
                            flex: 1, minWidth: 260,
                            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
                            borderRadius: 'var(--border-radius-md)', padding: '12px 16px',
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <Bell size={18} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b45309' }}>{upcomingCount} Installment{upcomingCount > 1 ? 's' : ''} Due This Week</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Send reminders to ensure timely payment</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--slate-100)', borderRadius: 'var(--border-radius-md)', padding: 4, width: 'fit-content' }}>
                {[
                    { key: 'tracker', label: '📊 Plans Overview' },
                    { key: 'installments', label: '📋 All Installments' },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '7px 18px', borderRadius: 'var(--border-radius-sm)',
                            border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                            background: activeTab === t.key ? 'white' : 'transparent',
                            color: activeTab === t.key ? 'var(--navy-600)' : 'var(--text-muted)',
                            boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >{t.label}</button>
                ))}
            </div>

            {/* Search + Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'white', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-md)', padding: '8px 12px', flex: 1, minWidth: 200,
                }}>
                    <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search customer, project, unit..."
                        style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '100%', color: 'var(--text-primary)', background: 'transparent' }}
                    />
                </div>
                {activeTab === 'installments' && ['All', 'Paid', 'Pending', 'Overdue', 'Upcoming'].map(s => (
                    <button key={s}
                        className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setFilterStatus(s)}
                    >{s}</button>
                ))}
                {activeTab === 'tracker' && ['All', 'Down Payment', 'Construction Linked', 'EMI', 'Subvention'].map(p => (
                    <button key={p}
                        className={`btn ${filterPlan === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setFilterPlan(p)}
                        style={{ fontSize: '0.75rem' }}
                    >{p}</button>
                ))}
            </div>

            {/* PLANS OVERVIEW TAB */}
            {activeTab === 'tracker' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filteredPlans.map(plan => {
                        const planInst = planInstallments(plan.id);
                        const paidAmt = planInst.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
                        const progress = Math.round((paidAmt / plan.totalAmount) * 100);
                        const isExpanded = expandedPlan === plan.id;
                        const planColors = PLAN_TYPE_COLORS[plan.planType] || PLAN_TYPE_COLORS['Down Payment'];

                        return (
                            <div key={plan.id} className="card" style={{ overflow: 'visible' }}>
                                {/* Plan Header */}
                                <div
                                    style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
                                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                                >
                                    {/* Icon */}
                                    <div style={{
                                        width: 46, height: 46, borderRadius: 'var(--border-radius-md)', flexShrink: 0,
                                        background: planColors.bg, border: `1px solid ${planColors.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 800, color: 'var(--navy-600)',
                                    }}>{planColors.label}</div>

                                    {/* Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{plan.customerName}</span>
                                            <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>{plan.planType}</span>
                                            {planInst.some(i => i.status === 'Overdue') && (
                                                <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>⚠ Overdue</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                                            <span>🏢 {plan.projectName}</span>
                                            <span>🔑 {plan.unitNo}</span>
                                            <span>📅 Booking: {plan.bookingDate}</span>
                                            <span>👤 {plan.agentName}</span>
                                        </div>
                                    </div>

                                    {/* Progress + Amount */}
                                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 160 }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-600)', marginBottom: 4 }}>
                                            {formatCr(paidAmt)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {formatCr(plan.totalAmount)}</span>
                                        </div>
                                        {/* Progress bar */}
                                        <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                                            <div style={{
                                                height: '100%', width: `${progress}%`,
                                                background: progress === 100 ? 'var(--accent-emerald)' : 'linear-gradient(90deg, var(--navy-500), var(--accent-cyan))',
                                                borderRadius: 3, transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{progress}% collected · {planInst.length} installments</div>
                                    </div>

                                    <div style={{ flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <ChevronDown size={18} />
                                    </div>
                                </div>

                                {/* Expanded Installments */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid var(--border-light)', overflow: 'hidden' }}>
                                        <div style={{ padding: '0 22px 18px' }}>
                                            <div style={{ paddingTop: 14, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                                Payment Schedule
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {planInst.map((inst, idx) => {
                                                    const sc = STATUS_COLORS[inst.status] || STATUS_COLORS.Upcoming;
                                                    const isOverdue = inst.status === 'Overdue';
                                                    return (
                                                        <div key={inst.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: 12,
                                                            padding: '10px 14px', borderRadius: 'var(--border-radius-md)',
                                                            background: isOverdue ? 'rgba(244,63,94,0.05)' : 'var(--slate-50)',
                                                            border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.2)' : 'var(--border-light)'}`,
                                                        }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${sc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: sc.color, flexShrink: 0 }}>
                                                                {idx + 1}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{inst.milestone_name || inst.milestone || `Installment ${idx + 1}`}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    Due: {inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-IN') : inst.dueDate}
                                                                    {(inst.paid_date || inst.paidDate) && <span style={{ color: 'var(--accent-emerald)', marginLeft: 8 }}>· Paid: {inst.paid_date ? new Date(inst.paid_date).toLocaleDateString('en-IN') : inst.paidDate}</span>}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-600)', minWidth: 80, textAlign: 'right' }}>
                                                                {formatCr(inst.amount)}
                                                            </div>
                                                            <span className={`badge ${sc.badge}`} style={{ fontSize: '0.68rem', minWidth: 60, justifyContent: 'center' }}>{inst.status}</span>
                                                            {inst.status !== 'Paid' && inst.status !== 'Waived' && (
                                                                <button
                                                                    className="btn btn-success btn-sm"
                                                                    style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                                    onClick={() => { setSelectedInstallment(inst); setShowMarkModal(true); }}
                                                                >
                                                                    <CheckCircle size={11} /> Mark Paid
                                                                </button>
                                                            )}
                                                            {inst.status === 'Paid' && (
                                                                <button className="btn btn-ghost btn-sm btn-icon" title="View receipt" style={{ fontSize: '0.72rem' }}>
                                                                    <Receipt size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredPlans.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">💳</div>
                            <div className="empty-state-title">No payment plans found</div>
                        </div>
                    )}
                </div>
            )}

            {/* ALL INSTALLMENTS TAB */}
            {activeTab === 'installments' && (
                <div className="card">
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-light)', background: 'var(--slate-50)' }}>
                                    {['#', 'Customer', 'Project / Unit', 'Milestone', 'Due Date', 'Paid Date', 'Amount', 'Status', 'Action'].map(h => (
                                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allInstallmentsList.map((inst, idx) => {
                                    const sc = STATUS_COLORS[inst.status] || STATUS_COLORS.Upcoming;
                                    return (
                                        <tr key={inst.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                                            <td style={{ padding: '12px 14px', fontWeight: 700 }}>{inst.customerName}</td>
                                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                                                <div>{inst.projectName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inst.unitNo}</div>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>{inst.milestone_name || inst.milestone || `Inst ${idx + 1}`}</td>
                                            <td style={{ padding: '12px 14px', color: inst.status === 'Overdue' ? 'var(--accent-rose)' : 'var(--text-secondary)', fontWeight: inst.status === 'Overdue' ? 700 : 400 }}>{inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-IN') : inst.dueDate}</td>
                                            <td style={{ padding: '12px 14px', color: 'var(--accent-emerald)' }}>{(inst.paid_date || inst.paidDate) ? new Date(inst.paid_date || inst.paidDate).toLocaleDateString('en-IN') : '—'}</td>
                                            <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--navy-600)' }}>{formatCr(inst.amount)}</td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span className={`badge ${sc.badge}`} style={{ fontSize: '0.68rem' }}>{inst.status}</span>
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                {inst.status !== 'Paid' && inst.status !== 'Waived' && (
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                        onClick={() => { setSelectedInstallment(inst); setShowMarkModal(true); }}
                                                    >
                                                        <CheckCircle size={11} /> Collect
                                                    </button>
                                                )}
                                                {inst.status === 'Paid' && (
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                                                        <Receipt size={11} /> Receipt
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {allInstallmentsList.length === 0 && (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                            No installments found for the selected filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Mark Paid Modal */}
            {showMarkModal && selectedInstallment && (
                <div className="modal-overlay" onClick={() => setShowMarkModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Record Payment</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowMarkModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'var(--navy-50)', borderRadius: 'var(--border-radius-md)', padding: '14px 16px', marginBottom: 18, border: '1px solid var(--navy-100)' }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedInstallment.milestone}</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    <span>👤 {selectedInstallment.customerName}</span>
                                    <span>🏢 {selectedInstallment.projectName}</span>
                                    <span>🔑 {selectedInstallment.unitNo}</span>
                                </div>
                                <div style={{ marginTop: 10, fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-600)' }}>
                                    {formatCr(selectedInstallment.amount)}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date *</label>
                                <input type="date" className="form-control" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Receipt / Reference Note</label>
                                <input className="form-control" value={receiptNote} onChange={e => setReceiptNote(e.target.value)} placeholder="Cheque no., UTR, NEFT ref etc." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowMarkModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleMarkPaid}>
                                <CheckCircle size={14} /> Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
