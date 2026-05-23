import { useState, useMemo } from 'react';
import * as dateUtils from '../../utils/dateUtils';
import {
    CreditCard, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
    Plus, X, Download, Search, Filter, TrendingUp, IndianRupee, Calendar,
    Receipt, Bell, FileText
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { bookingsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { useMobile } from '../../hooks/useMobile';

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
    const isMobile = useMobile(768);
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
    const [paymentDate, setPaymentDate] = useState(dateUtils.getNow().toISOString().split('T')[0]);
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
        } catch (err: any) { showToast(err?.error || 'Failed to record payment', 'error'); }
        setShowMarkModal(false);
        setSelectedInstallment(null);
        setReceiptNote('');
    };

    const allInstallmentsList = installments.filter(i => {
        const matchStatus = filterStatus === 'All' || i.status === filterStatus;
        const matchQ = !searchQ || (i.customerName || '').toLowerCase().includes(searchQ.toLowerCase());
        return matchStatus && matchQ;
    }).sort((a, b) => (dateUtils.parseSafe(a.due_date || a.dueDate)?.getTime() || 0) - (dateUtils.parseSafe(b.due_date || b.dueDate)?.getTime() || 0));

    const [now] = useState(() => Date.now());
    const { overdueCount, upcomingCount } = useMemo(() => {
        const nextWeekMs = now + 7 * 86400000;
        return {
            upcomingCount: installments.filter(i =>
                i.status === 'Upcoming' &&
                (dateUtils.parseSafe(i.due_date || i.dueDate)?.getTime() || 0) <= nextWeekMs
            ).length
        };
    }, [installments, now]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '0 4px' : 0 }}>
            <div className="page-header" style={{ display: 'none', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 12 : 0 }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: isMobile ? '1.5rem' : '1.8rem' }}>Payment Ledger</h1>
                    <p className="page-subtitle">
                        {plans.length} active plans · {installments.filter(i => i.status === 'Paid').length} collected
                    </p>
                </div>
                <div className="page-actions" style={{ width: isMobile ? '100%' : 'auto' }}>
                    <button className="btn btn-secondary btn-sm" style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                        <Download size={14} /> Export Report
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Collected', value: formatCr(totalCollected), icon: '💰', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
                    { label: 'Pending', value: formatCr(totalPending), icon: '⏳', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
                    { label: 'Overdue', value: formatCr(totalOverdue), icon: '🚨', color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.2)' },
                    { label: 'Active', value: plans.length, icon: '📋', color: 'var(--navy-500)', bg: 'var(--navy-50)', border: 'var(--navy-100)' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: s.bg, borderRadius: 16, border: `1px solid ${s.border}`, padding: isMobile ? '12px' : '18px 20px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: isMobile ? '1rem' : '1.4rem' }}>{s.icon}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: isMobile ? '1.1rem' : '1.6rem', fontWeight: 900, color: s.color }}>{s.value}</div>
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
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexDirection: 'column' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'white', border: '1.5px solid var(--border-medium)',
                    borderRadius: 16, padding: '10px 16px', flex: 1,
                }}>
                    <Search size={18} style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search customer, project..."
                        style={{ border: 'none', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                    />
                </div>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {activeTab === 'installments' && ['All', 'Paid', 'Pending', 'Overdue', 'Upcoming'].map(s => (
                        <button key={s}
                            className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            style={{ borderRadius: 12, whiteSpace: 'nowrap' }}
                            onClick={() => setFilterStatus(s)}
                        >{s}</button>
                    ))}
                    {activeTab === 'tracker' && ['All', 'Down Payment', 'Construction Linked', 'EMI'].map(p => (
                        <button key={p}
                            className={`btn ${filterPlan === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            style={{ borderRadius: 12, whiteSpace: 'nowrap' }}
                            onClick={() => setFilterPlan(p)}
                        >{p}</button>
                    ))}
                </div>
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
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.customerName}</span>
                                            {planInst.some(i => i.status === 'Overdue') && (
                                                <AlertTriangle size={14} style={{ color: 'var(--accent-rose)' }} />
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {plan.projectName} · {plan.unitNo}
                                        </div>
                                    </div>

                                    {/* Progress + Amount (Desktop Only) */}
                                    {!isMobile && (
                                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 160 }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-600)', marginBottom: 4 }}>
                                                {formatCr(paidAmt)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {formatCr(plan.totalAmount)}</span>
                                            </div>
                                            <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--navy-500)', borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ flexShrink: 0, color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <ChevronDown size={18} />
                                    </div>
                                </div>

                                {isMobile && !isExpanded && (
                                    <div style={{ padding: '0 22px 14px' }}>
                                        <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--accent-emerald)' : 'var(--navy-500)' }} />
                                        </div>
                                    </div>
                                )}

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
                                                                    Due: {inst.due_date ? dateUtils.formatSafeDate(inst.due_date) : inst.dueDate}
                                                                    {(inst.paid_date || inst.paidDate) && <span style={{ color: 'var(--accent-emerald)', marginLeft: 8 }}>· Paid: {inst.paid_date ? dateUtils.formatSafeDate(inst.paid_date) : inst.paidDate}</span>}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {isMobile ? (
                        allInstallmentsList.map(inst => {
                            const sc = STATUS_COLORS[inst.status] || STATUS_COLORS.Upcoming;
                            return (
                                <div key={inst.id} className="card" style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 900, color: 'var(--navy-900)' }}>{inst.customerName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inst.projectName} · {inst.unitNo}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 900, color: 'var(--navy-600)' }}>{formatCr(inst.amount)}</div>
                                            <span className={`badge ${sc.badge}`} style={{ fontSize: '0.6rem' }}>{inst.status}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--slate-50)', padding: '8px 12px', borderRadius: 12 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                            Due: {inst.due_date ? dateUtils.formatSafeDate(inst.due_date) : inst.dueDate}
                                        </div>
                                        {inst.status !== 'Paid' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => { setSelectedInstallment(inst); setShowMarkModal(true); }}>Collect</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
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
                                                <tr key={inst.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{inst.customerName}</td>
                                                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{inst.projectName} ({inst.unitNo})</td>
                                                    <td style={{ padding: '12px 14px' }}>{inst.milestone_name || inst.milestone}</td>
                                                    <td style={{ padding: '12px 14px' }}>{inst.due_date ? dateUtils.formatSafeDate(inst.due_date) : inst.dueDate}</td>
                                                    <td style={{ padding: '12px 14px' }}>{inst.paid_date ? dateUtils.formatSafeDate(inst.paid_date) : '—'}</td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 800 }}>{formatCr(inst.amount)}</td>
                                                    <td style={{ padding: '12px 14px' }}><span className={`badge ${sc.badge}`}>{inst.status}</span></td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        {inst.status !== 'Paid' && (
                                                            <button className="btn btn-success btn-sm" onClick={() => { setSelectedInstallment(inst); setShowMarkModal(true); }}>Collect</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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
