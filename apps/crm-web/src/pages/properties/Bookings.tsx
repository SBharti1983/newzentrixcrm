import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { bookingsApi, projectsApi, usersApi, customersApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import {
    Plus, X, CheckCircle, FileText, CreditCard, Clock,
    Coins, Search, MoreHorizontal, ChevronRight, Building2,
    User, Calendar, TrendingUp, Banknote, Clipboard, Link, Phone
} from 'lucide-react';
import { dialerEvents } from '../../constants/events';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '../../hooks/useMobile';
import { Download } from 'lucide-react';
import * as dateUtils from '../../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProFormaInvoice from '../../components/modals/ProFormaInvoice';

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
    agent: '3', status: 'In Process', bookingDate: dateUtils.getNow().toISOString().split('T')[0],
    tokenMode: 'Cheque', tokenRef: '', notes: '',
    leadId: '',
};

export default function Bookings() {
    const navigate = useNavigate();
    const isMobile = useMobile();
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
        } catch (err: any) { showToast(err?.error || 'Failed to create booking', 'error'); }
        finally { setSaving(false); }
    };

    const confirmBooking = async (id) => {
        try { await bookingsApi.update(id, { status: 'Confirmed' }); refetch(); }
        catch (err: any) { showToast('Failed to confirm', 'error'); }
    };

    const cancelBooking = async (id) => {
        try { await bookingsApi.update(id, { status: 'Cancelled' }); refetch(); }
        catch (err: any) { showToast('Failed to cancel', 'error'); }
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
            doc.text(`Date of Booking: ${b.booking_date || b.bookingDate || dateUtils.getNow().toLocaleDateString()}`, 15, 72);

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
            const finalY = (doc as any).lastAutoTable.finalY || 130;
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
        <div className="animate-fadeIn" style={{ paddingBottom: isMobile ? 120 : 20 }}>
            <div style={{ 
                display: 'none', 
                flexDirection: isMobile ? 'column' : 'row', 
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center', 
                gap: 16,
                marginBottom: 24,
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: 20
            }}>
                <div style={{ display: 'none' }}>
                    <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: 800, color: 'var(--navy-950)' }}>Booking Center</h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{bookings.length} total nodes in registry</p>
                </div>
                <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '100%', height: 44, borderRadius: 12 }}>
                        <Plus size={18} /> New Booking
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
                gap: isMobile ? 12 : 20,
                marginBottom: 24
            }}>
                {[
                    { label: 'Total', value: bookings.length, icon: '📋', color: 'var(--navy-500)', bg: 'var(--navy-50)' },
                    { label: 'Active', value: bookings.filter(b => b.status === 'Confirmed').length, icon: '✅', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)' },
                    { label: 'Pending', value: bookings.filter(b => b.status === 'Pending Docs').length, icon: '📄', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.07)' },
                    { label: 'Revenue', value: formatCurrency(totalRevenueValue), icon: '💰', color: 'var(--navy-600)', bg: 'var(--navy-50)' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: isMobile ? '14px' : '20px', borderRadius: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: isMobile ? '1.1rem' : '1.4rem' }}>{s.icon}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Payment Plan Quick Reference */}
            <div className="glass-card mb-6" style={{ padding: '20px', borderRadius: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Financial Architecture</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adaptive payment structures</div>
                    </div>
                </div>
                <div style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 8 : 0 }}>
                    {PAYMENT_PLANS.map(plan => {
                        const colors = {
                            'Down Payment': { bg: 'var(--navy-50)', color: 'var(--navy-600)', icon: '💵' },
                            'Construction Linked': { bg: 'rgba(16,185,129,0.07)', color: 'var(--accent-emerald)', icon: '🏗️' },
                            'EMI': { bg: 'rgba(139,92,246,0.07)', color: 'var(--accent-violet)', icon: '🏦' },
                            'Subvention': { bg: 'rgba(245,158,11,0.07)', color: 'var(--accent-amber)', icon: '📋' },
                        };
                        const c = colors[plan.name] || colors['Down Payment'];
                        return (
                            <div key={plan.id} onClick={() => setShowPlanModal(plan)} style={{
                                padding: '16px', borderRadius: '16px',
                                background: 'white', border: '1px solid var(--border-light)',
                                cursor: 'pointer', flexShrink: 0, width: isMobile ? '240px' : 'auto'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{plan.name}</div>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{plan.description}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filters + Search */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, background: 'white',
                    border: '1px solid var(--border-light)', borderRadius: '16px',
                    padding: '12px 16px', flex: 1
                }}>
                    <Search size={18} style={{ color: 'var(--text-muted)' }} />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search ledger..."
                        style={{ border: 'none', outline: 'none', fontSize: '0.9rem', width: '100%', background: 'transparent' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: isMobile ? 8 : 0 }} className="no-scrollbar">
                    {['All', 'Confirmed', 'Pending Docs', 'In Process'].map(s => (
                        <button key={s}
                            className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setFilterStatus(s)}
                            style={{ borderRadius: 12, whiteSpace: 'nowrap' }}
                        >{s}</button>
                    ))}
                </div>
            </div>

            {/* Booking Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(b => (
                    <div key={b.id} className="glass-card" style={{ padding: isMobile ? '20px' : '24px', borderRadius: 24 }}>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
                            <div style={{ 
                                width: isMobile ? '100%' : '64px', height: isMobile ? 'auto' : '64px',
                                background: b.status === 'Confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(30,58,115,0.05)',
                                borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center',
                                padding: isMobile ? '12px 16px' : 0, gap: 12
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>{b.status === 'Confirmed' ? '🏠' : '⏳'}</span>
                                {isMobile && (
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--navy-600)' }}>{b.total_amount || b.amount}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DEAL VALUE</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)' }}>{b.customer_name || b.customerName}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <Building2 size={12} className="text-slate-400" />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{b.project_name || b.projectName} · Unit {b.unit_no || b.unitNo}</span>
                                        </div>
                                    </div>
                                    <span className={`badge ${STATUS_BADGE[b.status] || 'badge-slate'}`} style={{ borderRadius: 8 }}>{b.status}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: '12px', background: 'var(--slate-50)', borderRadius: 16, marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Token Collected</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>{b.token_amount || b.tokenAmount}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plan</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{b.payment_plan || b.paymentPlan}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button onClick={() => navigate('/payment-tracker')} className="btn btn-ghost btn-sm" style={{ flex: 1, borderRadius: 10 }}>Track Payments</button>
                                    <button onClick={() => downloadReceipt(b)} className="btn btn-ghost btn-sm" style={{ flex: 1, borderRadius: 10 }}>Receipt</button>
                                    <button onClick={() => dialerEvents.call(b.customer_id, b.customer_phone, b.customer_name)} className="btn btn-sm btn-success" style={{ flex: 1, borderRadius: 10 }}>Call Client</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No bookings found</div>
                    </div>
                )}

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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ 
                        maxWidth: 600, 
                        height: isMobile ? '100%' : 'auto',
                        maxHeight: isMobile ? '100vh' : '90vh',
                        borderRadius: isMobile ? 0 : 28
                    }}>
                        {/* Step indicator */}
                        <div style={{
                            padding: isMobile ? '40px 24px 16px' : '20px 24px 16px',
                            borderBottom: '1px solid var(--border-light)',
                            background: 'var(--navy-50)',
                        }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                {[
                                    { n: 1, label: 'Details' },
                                    { n: 2, label: 'Plan' },
                                    { n: 3, label: 'Token' },
                                ].map((s, i, arr) => (
                                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: step >= s.n ? 'var(--navy-600)' : 'var(--slate-200)',
                                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800
                                            }}>{step > s.n ? '✓' : s.n}</div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: step >= s.n ? 'var(--navy-600)' : 'var(--text-muted)' }}>{s.label}</span>
                                        </div>
                                        {i < arr.length - 1 && <div style={{ height: 2, flex: 1, maxWidth: 30, background: step > s.n ? 'var(--navy-400)' : 'var(--slate-200)', marginBottom: 18 }} />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-header" style={{ paddingTop: 16 }}>
                            <h3 className="modal-title">
                                {step === 1 ? 'Booking Details' : step === 2 ? 'Select Plan' : 'Token Receipt'}
                            </h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setStep(1); }}><X size={20} /></button>
                        </div>

                        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: isMobile ? 'calc(100vh - 250px)' : '500px' }}>
                            {/* Step 1: Details */}
                            {step === 1 && (
                                <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Customer Name</label>
                                        <input className="form-control" list="cust-list" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Full name" style={{ height: 48, borderRadius: 12 }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div className="form-group">
                                            <label className="form-label">Project</label>
                                            <select className="form-control" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value, unitNo: '' })} style={{ height: 48, borderRadius: 12 }}>
                                                <option value="">Select...</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Unit</label>
                                            <select className="form-control" value={form.unitNo} onChange={e => setForm({ ...form, unitNo: e.target.value })} style={{ height: 48, borderRadius: 12 }}>
                                                <option value="">Select...</option>
                                                {units.map(u => <option key={u.id} value={u.unit_no || u.unitNo}>{u.unit_no || u.unitNo}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Agreed Amount</label>
                                        <input className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 1.5 Cr" style={{ height: 48, borderRadius: 12 }} />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Payment Plan */}
                            {step === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {PAYMENT_PLANS.map(plan => (
                                        <div key={plan.id} onClick={() => setSelectedPlan(plan)} style={{
                                            padding: '16px', borderRadius: '16px', border: `2px solid ${selectedPlan.id === plan.id ? 'var(--navy-500)' : 'var(--border-light)'}`,
                                            background: selectedPlan.id === plan.id ? 'var(--navy-50)' : 'white'
                                        }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{plan.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{plan.description}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 3: Token */}
                            {step === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Token Amount</label>
                                        <input className="form-control" value={form.tokenAmount} onChange={e => setForm({ ...form, tokenAmount: e.target.value })} placeholder="₹5,00,000" style={{ height: 48, borderRadius: 12 }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Payment Mode</label>
                                        <select className="form-control" value={form.tokenMode} onChange={e => setForm({ ...form, tokenMode: e.target.value })} style={{ height: 48, borderRadius: 12 }}>
                                            <option>Cheque</option>
                                            <option>NEFT/RTGS</option>
                                            <option>UPI</option>
                                            <option>Cash</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Notes</label>
                                        <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal remarks..." style={{ borderRadius: 12 }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ paddingBottom: isMobile ? 40 : 20 }}>
                            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                                {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} style={{ flex: 1, height: 48, borderRadius: 12 }}>Back</button>}
                                {step < 3 ? (
                                    <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!form.customerName} style={{ flex: 2, height: 48, borderRadius: 12 }}>Continue</button>
                                ) : (
                                    <button className="btn btn-success" onClick={save} disabled={saving} style={{ flex: 2, height: 48, borderRadius: 12 }}>{saving ? 'Saving...' : 'Confirm'}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
