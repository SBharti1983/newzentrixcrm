import { useState, useCallback } from 'react';
import { Download, IndianRupee, Filter, CheckCircle, Clock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { commissionsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { PageLoader, PageError } from '../components/Feedback';

export default function Commissions() {
    const { showToast } = useToast();
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    const { data: commissions, loading, error, refetch } = useApi(
        useCallback(() => commissionsApi.list({ status: statusFilter }), [statusFilter]),
        [statusFilter]
    );

    const handleMarkPaid = async (id) => {
        setUpdatingId(id);
        try {
            await commissionsApi.update(id, { status: 'Paid' });
            showToast('Commission marked as Paid', 'success');
            refetch();
        } catch (_e) {
            showToast('Failed to update status', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    if (loading && !commissions) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const pendingTotal = commissions?.filter(c => c.status === 'Pending').reduce((acc, c) => acc + parseFloat(c.payout_amount), 0) || 0;
    const paidTotal = commissions?.filter(c => c.status === 'Paid').reduce((acc, c) => acc + parseFloat(c.payout_amount), 0) || 0;

    return (
        <div className="animate-fadeIn">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Commission & Incentives</h1>
                    <p className="page-subtitle">Automated payouts and incentive tracking engine.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={() => showToast('Payment cycle integration coming soon', 'info')}>
                        <IndianRupee size={16} /> Run Payment Cycle
                    </button>
                    <button className="btn btn-primary" onClick={() => showToast('Exporting reports...', 'success')}>
                        <Download size={16} /> Export Reports
                    </button>
                </div>
            </div>

            <div className="grid grid-4 mb-8">
                <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--navy-900), var(--navy-700))', color: 'white', border: 'none' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>Pending Payouts</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{formatCurrency(pendingTotal)}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.8 }}>{commissions?.filter(c => c.status === 'Pending').length} pending vouchers</div>
                </div>
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Total Paid (YTD)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-emerald-dark)' }}>{formatCurrency(paidTotal)}</div>
                </div>
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Active Incentives</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-800)', marginTop: 4 }}>Q4 Sales Sprint</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>+0.5% Bonus Active</div>
                </div>
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Efficiency Score</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan-dark)' }}>94%</div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Generated Payout Invoices & Statements</h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="search-bar" style={{ width: 200, padding: '4px 12px' }}>
                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                            <select
                                style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', width: '100%', outline: 'none', fontWeight: 600 }}
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="table-wrapper">
                    <table style={{ margin: 0 }}>
                        <thead style={{ background: 'var(--slate-50)' }}>
                            <tr>
                                <th style={{ padding: '16px 24px' }}>Payee Detail</th>
                                <th>Type</th>
                                <th>Deal / Booking</th>
                                <th>Rules & Value</th>
                                <th>Payout Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(commissions || []).map(c => (
                                <tr key={c.id}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--navy-900)' }}>{c.payee_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.payee_detail}</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${c.entity_type === 'Internal' ? 'badge-blue' : 'badge-purple'}`} style={{ fontSize: '10px' }}>
                                            {c.entity_type}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{c.booking_ref || 'Draft Lead'}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.lead_name} · {c.project_name}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatCurrency(c.deal_value)}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-dark)', fontWeight: 600 }}>{c.commission_rate}% base rate</div>
                                    </td>
                                    <td style={{ fontWeight: 900, color: 'var(--accent-emerald-dark)', fontSize: '1.1rem' }}>
                                        {formatCurrency(c.payout_amount)}
                                    </td>
                                    <td>
                                        <span className={`badge ${c.status === 'Paid' ? 'badge-green' : 'badge-amber'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {c.status === 'Paid' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                            {c.status}
                                        </span>
                                    </td>
                                    <td>
                                        {c.status === 'Pending' ? (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ height: 32, padding: '0 16px', fontSize: '11px', fontWeight: 800, borderRadius: 8 }}
                                                onClick={() => handleMarkPaid(c.id)}
                                                disabled={updatingId === c.id}
                                            >
                                                {updatingId === c.id ? '...' : 'Mark Paid'}
                                            </button>
                                        ) : (
                                            <button className="btn btn-ghost btn-sm btn-icon" title="Download Receipt">
                                                <Download size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!commissions?.length && (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🧾</div>
                            <div style={{ fontWeight: 700 }}>No commission records found.</div>
                            <p style={{ fontSize: '0.8rem' }}>Once deals are closed, payouts will appear here automatically.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
