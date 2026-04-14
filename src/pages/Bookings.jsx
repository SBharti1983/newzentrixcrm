import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { bookingsApi, projectsApi, usersApi, customersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
    Plus, X, CheckCircle, FileText, CreditCard, Clock,
    Coins, Search, MoreHorizontal, ChevronRight, Building2,
    User, Calendar, TrendingUp, Banknote, Clipboard, Link
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProFormaInvoice from '../components/ProFormaInvoice';

const STATUS_BADGE = {
    Confirmed: 'badge-green',
    'Pending Docs': 'badge-amber',
    Cancelled: 'badge-red',
    'In Process': 'badge-blue',
    Registered: 'badge-violet',
};

const PAYMENT_PLANS = [
    {
        id: 'dp',
        name: 'Down Payment',
        description: 'Full or large upfront payment with balance at possession',
        schedule: [
            { milestone: 'Token / Booking Amount', percent: 5, timing: 'At booking' },
            { milestone: 'Down Payment', percent: 45, timing: 'Within 30 days' },
            { milestone: 'Possession Payment', percent: 50, timing: 'At possession' },
        ],
    },
    {
        id: 'clp',
        name: 'Construction Linked',
        description: 'Payments tied to construction milestones',
        schedule: [
            { milestone: 'Token / Booking Amount', percent: 5, timing: 'At booking' },
            { milestone: 'On Foundation', percent: 10, timing: 'Foundation completed' },
            { milestone: 'On Slab 1', percent: 10, timing: '1st slab completion' },
            { milestone: 'On Slab 2', percent: 10, timing: '2nd slab completion' },
            { milestone: 'On Slab 3', percent: 10, timing: '3rd slab completion' },
            { milestone: 'On Brickwork', percent: 10, timing: 'Brickwork done' },
            { milestone: 'On Plastering', percent: 10, timing: 'Plastering done' },
            { milestone: 'On Fitting', percent: 10, timing: 'Fittings done' },
            { milestone: 'Possession', percent: 25, timing: 'At possession' },
        ],
    },
    {
        id: 'emi',
        name: 'EMI',
        description: 'Equal monthly installments over loan tenure via bank',
        schedule: [
            { milestone: 'Token / Booking Amount', percent: 10, timing: 'At booking' },
            { milestone: 'Down Payment', percent: 20, timing: 'Within 30 days' },
            { milestone: 'Bank Loan Disbursement', percent: 70, timing: 'As per bank schedule' },
        ],
    },
    {
        id: 'sub',
        name: 'Subvention',
        description: 'Developer pays EMI during construction; buyer takes over at possession',
        schedule: [
            { milestone: 'Token / Booking Amount', percent: 5, timing: 'At booking' },
            { milestone: 'Initial Payment', percent: 20, timing: 'Within 30 days' },
            { milestone: 'Bank Disbursement (Developer pays EMI)', percent: 75, timing: 'During construction' },
        ],
    },
];

const DEFAULT_FORM = {
    customerName: '', projectId: '1', unitNo: '',
    amount: '', tokenAmount: '', paymentPlan: 'Construction Linked',
    agent: '3', status: 'In Process', bookingDate: new Date().toISOString().split('T')[0],
    tokenMode: 'Cheque', tokenRef: '', notes: '',
    leadId: '',
};

export default function Bookings() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { data: bookingsRaw, loading, error, refetch } = useApi(() => bookingsApi.list({ limit: 200 }));
    const { data: projectsRaw } = useApi(() => projectsApi.list());
    const { data: usersRaw } = useApi(() => usersApi.list());
    const { data: customersRaw } = useApi(() => customersApi.list());

    const bookings = bookingsRaw?.data || bookingsRaw || [];
    const projects = projectsRaw || [];
    const customers = customersRaw || [];
    const agents = (usersRaw || []).filter(u => ['agent', 'sales_manager'].includes(u.role));
    const [showModal, setShowModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQ, setSearchQ] = useState('');
    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(PAYMENT_PLANS[1]);
    const [saving, setSaving] = useState(false);
    const [showProForma, setShowProForma] = useState(null);

    const { data: unitsRaw } = useApi(() => form.projectId ? projectsApi.inventory(form.projectId) : Promise.resolve([]), [form.projectId]);
    const units = unitsRaw || [];
    const selectedUnit = units.find(u => String(u.unit_no || u.unitNo) === String(form.unitNo));

    const filtered = bookings.filter(b => {
        const matchStatus = filterStatus === 'All' || b.status === filterStatus;
        const searchUpper = searchQ.toLowerCase();
        const matchQ = !searchQ ||
            (b.customer_name || b.customerName || '').toLowerCase().includes(searchUpper) ||
            (b.project_name || b.projectName || '').toLowerCase().includes(searchUpper) ||
            String(b.unit_no || b.unitNo || '').toLowerCase().includes(searchUpper);
        return matchStatus && matchQ;
    });

    const save = async () => {
        if (!form.customerName) { showToast('Customer name required', 'error'); return; }
        setSaving(true);
        try {
            await bookingsApi.create({
                customer_name: form.customerName,
                project_id: parseInt(form.projectId) || null,
                unit_no: form.unitNo,
                total_amount: form.amount,
                token_amount: form.tokenAmount,
                payment_plan: selectedPlan.name,
                assigned_to: parseInt(form.agent) || null,
                status: form.status,
                booking_date: form.bookingDate,
                notes: form.notes,
            });
            showToast('Booking created!', 'success');
            setShowModal(false); setForm(DEFAULT_FORM); setStep(1); refetch();
        } catch (err) { showToast(err.error || 'Failed to create booking', 'error'); }
        finally { setSaving(false); }
    };

    const confirmBooking = async (id) => {
        try { await bookingsApi.update(id, { status: 'Confirmed' }); refetch(); }
        catch { showToast('Failed to confirm', 'error'); }
    };

    const cancelBooking = async (id) => {
        try { await bookingsApi.update(id, { status: 'Cancelled' }); refetch(); }
        catch { showToast('Failed to cancel', 'error'); }
    };

    const downloadReceipt = (b) => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFillColor(30, 58, 115); // Navy
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('Zentrix Realty', 15, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Booking Receipt & Summary', 150, 25);

            // Content
            doc.setTextColor(40, 40, 40);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Customer Details', 15, 55);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Name: ${b.customer_name || b.customerName}`, 15, 65);
            doc.text(`Date of Booking: ${b.booking_date || b.bookingDate || new Date().toLocaleDateString()}`, 15, 72);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Property Details', 120, 55);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Project: ${b.project_name || b.projectName}`, 120, 65);
            doc.text(`Unit Number: ${b.unit_no || b.unitNo}`, 120, 72);

            // Finances
            autoTable(doc, {
                startY: 85,
                head: [['Description', 'Values']],
                body: [
                    ['Total Property Value', String(b.total_amount || b.amount)],
                    ['Token Amount Paid', String(b.token_amount || b.tokenAmount)],
                    ['Payment Plan Selected', b.paymentPlan || b.payment_plan]
                ],
                theme: 'striped',
                headStyles: { fillColor: [30, 58, 115] },
                styles: { fontSize: 10, cellPadding: 6 }
            });

            // Footer
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            const finalY = doc.lastAutoTable.finalY || 130;
            doc.text('This is an electronically generated document. No physical signature is required.', 15, finalY + 20);

            doc.save(`Receipt_${b.unit_no || b.unitNo}_${(b.customer_name || b.customerName).replace(/\s+/g, '_')}.pdf`);
            showToast('Receipt downloaded securely!', 'success');
        } catch (e) {
            showToast('Error generating PDF', 'error');
            console.error(e);
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const totalRevenueValue = bookings.filter(b => b.status !== 'Cancelled').reduce((acc, curr) => {
        const val = parseFloat(String(curr.total_amount || curr.amount || '0').replace(/[^0-9.]/g, ''));
        return acc + val;
    }, 0);

    const formatCurrency = (val) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString()}`;
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Booking Management</h1>
                    <p className="page-subtitle">{bookings.length} bookings · {bookings.filter(b => b.status === 'Confirmed').length} confirmed · {bookings.filter(b => b.status === 'In Process').length} in process</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/payment-tracker')}>
                        <CreditCard size={14} /> Payment Tracker
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/agreements')}>
                        <FileText size={14} /> Agreements
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={15} /> New Booking
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Total Bookings', value: bookings.length, icon: '📋', color: 'var(--navy-500)', bg: 'var(--navy-50)', border: 'var(--navy-100)' },
                    { label: 'Confirmed', value: bookings.filter(b => b.status === 'Confirmed').length, icon: '✅', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
                    { label: 'Pending Docs', value: bookings.filter(b => b.status === 'Pending Docs').length, icon: '📄', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
                    { label: 'Revenue', value: formatCurrency(totalRevenueValue), icon: '💰', color: 'var(--navy-600)', bg: 'var(--navy-50)', border: 'var(--navy-100)' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: s.bg, borderRadius: 'var(--border-radius-lg)',
                        border: `1px solid ${s.border}`, padding: '18px 20px',
                        transition: 'transform 0.2s',
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

            {/* Payment Plan Quick Reference */}
            <div className="card mb-6" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>Payment Plans</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click any plan to view full schedule</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {PAYMENT_PLANS.map(plan => {
                        const colors = {
                            'Down Payment': { bg: 'var(--navy-50)', border: 'var(--navy-100)', icon: '💵' },
                            'Construction Linked': { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)', icon: '🏗️' },
                            'EMI': { bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.2)', icon: '🏦' },
                            'Subvention': { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', icon: '📋' },
                        };
                        const c = colors[plan.name] || colors['Down Payment'];
                        const count = bookings.filter(b => b.paymentPlan === plan.name).length;
                        return (
                            <div key={plan.id} onClick={() => setShowPlanModal(plan)} style={{
                                padding: '12px 14px', borderRadius: 'var(--border-radius-md)',
                                background: c.bg, border: `1px solid ${c.border}`,
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', background: 'white', padding: '2px 7px', borderRadius: 20 }}>{count} bookings</span>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--navy-700)', marginBottom: 3 }}>{plan.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{plan.description}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filters + Search */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: 'white',
                    border: '1px solid var(--border-light)', borderRadius: 'var(--border-radius-md)',
                    padding: '8px 12px', flex: 1, minWidth: 200,
                }}>
                    <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search customer, project, unit..."
                        style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '100%', color: 'var(--text-primary)', background: 'transparent' }} />
                </div>
                {['All', 'Confirmed', 'Pending Docs', 'In Process', 'Registered', 'Cancelled'].map(s => (
                    <button key={s}
                        className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setFilterStatus(s)}
                        style={{ fontSize: '0.78rem' }}
                    >{s}</button>
                ))}
            </div>

            {/* Booking Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(b => (
                    <div key={b.id} className="card" style={{ padding: '20px 24px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                            {/* Status icon */}
                            <div style={{
                                width: 48, height: 48, borderRadius: 'var(--border-radius-md)', flexShrink: 0,
                                background: b.status === 'Confirmed' ? 'rgba(16,185,129,0.1)' : b.status === 'Registered' ? 'rgba(139,92,246,0.1)' : 'rgba(30,58,115,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                            }}>
                                {b.status === 'Confirmed' ? '🏠' : b.status === 'Pending Docs' ? '📄' : b.status === 'Registered' ? '🏛️' : '⏳'}
                            </div>

                            {/* Main info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{b.customer_name || b.customerName}</span>
                                    <span className={`badge ${STATUS_BADGE[b.status] || 'badge-slate'}`}>{b.status}</span>
                                    {b.tokenCollected && (
                                        <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>🪙 Token Collected</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                                    <span><Building2 size={12} style={{ marginRight: 4, opacity: 0.6 }} />{b.project_name || b.projectName}</span>
                                    <span>🔑 {b.unit_no || b.unitNo}</span>
                                    <span><Calendar size={12} style={{ marginRight: 4, opacity: 0.6 }} />{b.booking_date || b.bookingDate}</span>
                                    <span><User size={12} style={{ marginRight: 4, opacity: 0.6 }} />{b.agent_name || b.agentName}</span>
                                    <span>💳 {b.payment_plan || b.paymentPlan}</span>
                                </div>

                                {/* Token info strip */}
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 16, padding: '6px 14px',
                                    background: 'var(--slate-50)', borderRadius: 'var(--border-radius-sm)',
                                    border: '1px solid var(--border-light)', fontSize: '0.8rem',
                                }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Token:</span>
                                    <strong style={{ color: 'var(--accent-emerald)' }}>{b.token_amount || b.tokenAmount}</strong>
                                    <span style={{ color: 'var(--text-muted)' }}>Total:</span>
                                    <strong style={{ color: 'var(--navy-600)' }}>{b.total_amount || b.amount}</strong>
                                </div>
                            </div>

                            {/* Financial */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-600)' }}>{b.total_amount || b.amount}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    {b.paymentPlan}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column' }}>
                                {b.status !== 'Confirmed' && (
                                    <button className="btn btn-success btn-sm" style={{ fontSize: '0.75rem' }}
                                        onClick={() => confirmBooking(b.id)}>
                                        <CheckCircle size={12} /> Confirm
                                    </button>
                                )}
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}
                                    onClick={() => setShowProForma(b)}>
                                    <FileText size={12} /> Pro-Forma
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}
                                    onClick={() => navigate('/payment-tracker')}>
                                    <CreditCard size={12} /> Payments
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}
                                    onClick={() => downloadReceipt(b)}>
                                    <Download size={12} /> Receipt
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}
                                    onClick={() => navigate('/agreements')}>
                                    <FileText size={12} /> Docs
                                </button>
                                <button className="btn btn-ghost btn-sm btn-icon"
                                    style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}
                                    onClick={() => cancelBooking(b.id)}>
                                    <X size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No bookings found</div>
                    </div>
                )}
            </div>

            {/* Payment Plan Info Modal */}
            {showPlanModal && (
                <div className="modal-overlay" onClick={() => setShowPlanModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{showPlanModal.name} — Schedule</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPlanModal(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 20, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{showPlanModal.description}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {showPlanModal.schedule.map((s, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '12px 14px', borderRadius: 'var(--border-radius-md)',
                                        background: 'var(--slate-50)', border: '1px solid var(--border-light)',
                                    }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                            background: 'linear-gradient(135deg, var(--navy-500), var(--accent-cyan))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '0.7rem', fontWeight: 800,
                                        }}>{i + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.milestone}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.timing}</div>
                                        </div>
                                        <div style={{
                                            fontSize: '1.1rem', fontWeight: 800,
                                            color: 'var(--navy-600)', background: 'var(--navy-50)',
                                            padding: '4px 12px', borderRadius: 20,
                                        }}>{s.percent}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowPlanModal(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Booking Multi-Step Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setStep(1); }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        {/* Step indicator */}
                        <div style={{
                            padding: '20px 24px 0',
                            borderBottom: '1px solid var(--border-light)',
                            paddingBottom: 16,
                            background: 'var(--navy-50)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 0 }}>
                                {[
                                    { n: 1, label: 'Booking Details' },
                                    { n: 2, label: 'Payment Plan' },
                                    { n: 3, label: 'Token Collection' },
                                ].map((s, i, arr) => (
                                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
                                        }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%',
                                                background: step >= s.n ? 'var(--navy-600)' : 'var(--slate-200)',
                                                color: step >= s.n ? 'white' : 'var(--text-muted)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', fontWeight: 800,
                                                transition: 'all 0.3s',
                                            }}>
                                                {step > s.n ? <CheckCircle size={14} /> : s.n}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: step >= s.n ? 'var(--navy-600)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.label}</span>
                                        </div>
                                        {i < arr.length - 1 && (
                                            <div style={{
                                                height: 2, flex: 1, maxWidth: 40,
                                                background: step > s.n ? 'var(--navy-400)' : 'var(--slate-200)',
                                                marginBottom: 20, transition: 'all 0.3s',
                                            }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-header" style={{ paddingTop: 16 }}>
                            <h3 className="modal-title">
                                {step === 1 ? 'Booking Details' : step === 2 ? 'Select Payment Plan' : 'Token Collection'}
                            </h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setStep(1); }}><X size={16} /></button>
                        </div>

                        <div className="modal-body">
                            {/* Step 1: Details */}
                            {step === 1 && (
                                <div className="form-grid form-grid-2">
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Customer Name *</label>
                                        <input className="form-control" list="cust-list" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Customer full name" />
                                        <datalist id="cust-list">
                                            {customers.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Project</label>
                                        <select className="form-control" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value, unitNo: '' })}>
                                            <option value="">Select project...</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Unit</label>
                                        <select className="form-control" value={form.unitNo} onChange={e => setForm({ ...form, unitNo: e.target.value })}>
                                            <option value="">Select unit</option>
                                            {units.map(u => <option key={u.id} value={u.unit_no || u.unitNo}>{u.unit_no || u.unitNo} ({u.status})</option>)}
                                        </select>
                                    </div>
                                    {selectedUnit && (
                                        <div style={{
                                            gridColumn: 'span 2', padding: '12px 16px',
                                            background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                                            borderRadius: 'var(--border-radius-md)', fontSize: '0.82rem',
                                            display: 'flex', gap: 20, flexWrap: 'wrap',
                                        }}>
                                            <span>🏢 Floor {selectedUnit.floor}</span>
                                            <span>📐 {selectedUnit.area} sq.ft.</span>
                                            <span>🧭 {selectedUnit.facing} facing</span>
                                            <span>🅿️ {selectedUnit.parking} parking</span>
                                            <span style={{ fontWeight: 800, color: 'var(--navy-600)' }}>💰 {selectedUnit.price}</span>
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label">Booking Amount</label>
                                        <input className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="₹95L" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Agent</label>
                                        <select className="form-control" value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })}>
                                            <option value="">Select agent...</option>
                                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Booking Date</label>
                                        <input type="date" className="form-control" value={form.bookingDate} onChange={e => setForm({ ...form, bookingDate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            {['In Process', 'Pending Docs', 'Confirmed'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Payment Plan */}
                            {step === 2 && (
                                <div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>Choose the payment structure for this booking. This will generate installment milestones automatically.</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {PAYMENT_PLANS.map(plan => (
                                            <div key={plan.id} onClick={() => setSelectedPlan(plan)} style={{
                                                padding: '14px 16px', borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
                                                border: `2px solid ${selectedPlan.id === plan.id ? 'var(--navy-500)' : 'var(--border-light)'}`,
                                                background: selectedPlan.id === plan.id ? 'var(--navy-50)' : 'white',
                                                transition: 'all 0.15s',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                                        border: `2px solid ${selectedPlan.id === plan.id ? 'var(--navy-500)' : 'var(--border-medium)'}`,
                                                        background: selectedPlan.id === plan.id ? 'var(--navy-500)' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {selectedPlan.id === plan.id && <CheckCircle size={12} style={{ color: 'white' }} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{plan.name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{plan.description}</div>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                                                        background: 'var(--slate-100)', padding: '3px 9px', borderRadius: 20,
                                                    }}>{plan.schedule.length} milestones</span>
                                                </div>
                                                {selectedPlan.id === plan.id && (
                                                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {plan.schedule.map((s, i) => (
                                                            <span key={i} style={{
                                                                fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px',
                                                                borderRadius: 20, background: 'var(--navy-100)', color: 'var(--navy-700)',
                                                            }}>{s.milestone} ({s.percent}%)</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Token Collection */}
                            {step === 3 && (
                                <div>
                                    <div style={{
                                        padding: '16px', background: 'rgba(16,185,129,0.07)',
                                        border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--border-radius-md)',
                                        marginBottom: 20,
                                    }}>
                                        <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Coins size={14} /> Token / Booking Amount Collection
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            Record the initial token payment to mark the unit as booked. This is typically {selectedPlan.schedule[0]?.percent || 5}% of the total sale value.
                                        </div>
                                    </div>
                                    <div className="form-grid form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Token Amount *</label>
                                            <input className="form-control" value={form.tokenAmount} onChange={e => setForm({ ...form, tokenAmount: e.target.value })} placeholder="₹2L" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Collection Mode</label>
                                            <select className="form-control" value={form.tokenMode} onChange={e => setForm({ ...form, tokenMode: e.target.value })}>
                                                {['Cheque', 'NEFT/RTGS', 'UPI', 'Cash', 'Demand Draft'].map(m => <option key={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Reference / Cheque No.</label>
                                            <input className="form-control" value={form.tokenRef} onChange={e => setForm({ ...form, tokenRef: e.target.value })} placeholder="Cheque/UTR/Transaction reference" />
                                        </div>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Notes</label>
                                            <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional remarks..." />
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '14px 16px', background: 'var(--slate-50)', borderRadius: 'var(--border-radius-md)',
                                        border: '1px solid var(--border-light)', fontSize: '0.85rem',
                                    }}>
                                        <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>📋 Booking Summary</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            {[
                                                { label: 'Customer', value: form.customerName },
                                                { label: 'Unit', value: form.unitNo || '—' },
                                                { label: 'Total Amount', value: form.amount || '—' },
                                                { label: 'Payment Plan', value: selectedPlan.name },
                                            ].map(row => (
                                                <div key={row.label}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{row.label}: </span>
                                                    <span style={{ fontWeight: 600 }}>{row.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
                            <button className="btn btn-secondary" onClick={() => { setShowModal(false); setStep(1); }}>Cancel</button>
                            {step < 3 && <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.customerName}>Next →</button>}
                            {step === 3 && <button className="btn btn-success" onClick={save} disabled={saving}>{saving ? 'Saving...' : <><CheckCircle size={14} /> Create Booking</>}</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
