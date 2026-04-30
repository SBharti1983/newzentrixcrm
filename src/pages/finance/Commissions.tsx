import { useState, useCallback } from 'react';
import { Download, IndianRupee, Filter, CheckCircle, Clock, Calculator as CalcIcon, X, Percent, ShieldCheck, ArrowRight, Zap, Info } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { commissionsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { PageLoader, PageError } from '../../components/feedback/Feedback';

export default function Commissions() {
    const { showToast } = useToast();
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);

    // Calculator State
    const [calc, setCalc] = useState({
        bookingValue: 12000000, // 1.2 Cr default
        baseRate: 2.5,
        incentiveRate: 0.5,
        gstRate: 18,
        tdsRate: 5,
        includeGst: true,
        deductTds: true,
    });

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
        } catch (_e) { showToast('Failed to update status', 'error'); } 
        finally { setUpdatingId(null); }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    // Calculator Logic
    const grossComm = (calc.bookingValue * calc.baseRate) / 100;
    const incentiveAmt = (calc.bookingValue * calc.incentiveRate) / 100;
    const totalGross = grossComm + incentiveAmt;
    const gstAmt = calc.includeGst ? (totalGross * calc.gstRate) / 100 : 0;
    const tdsAmt = calc.deductTds ? (totalGross * calc.tdsRate) / 100 : 0;
    const netPayout = totalGross + gstAmt - tdsAmt;

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
                    <button className="btn btn-secondary" onClick={() => setShowCalculator(true)}>
                        <CalcIcon size={16} /> Commission Calculator
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
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Payout Accuracy</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan-dark)' }}>99.8%</div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Payout Invoices & Statements</h3>
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
                                <th style={{ padding: '16px 24px' }}>Broker / Agent</th>
                                <th>Deal Detail</th>
                                <th>Incentive Plan</th>
                                <th>Net Payout</th>
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
                                        <div style={{ fontWeight: 700 }}>{c.booking_ref || 'TR-772'}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.project_name} · Val: {formatCurrency(c.deal_value)}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{c.commission_rate}% Base</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-dark)', fontWeight: 600 }}>Standard Broker Plan</div>
                                    </td>
                                    <td style={{ fontWeight: 900, color: 'var(--accent-emerald-dark)', fontSize: '1.05rem' }}>
                                        {formatCurrency(c.payout_amount)}
                                    </td>
                                    <td>
                                        <span className={`badge ${c.status === 'Paid' ? 'badge-green' : 'badge-amber'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td>
                                        {c.status === 'Pending' ? (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleMarkPaid(c.id)} disabled={updatingId === c.id}>
                                                {updatingId === c.id ? '...' : 'Release'}
                                            </button>
                                        ) : (
                                            <button className="btn btn-ghost btn-sm btn-icon"><Download size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!commissions?.length && (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</div>
                    )}
                </div>
            </div>

            {/* Calculator Slide-over */}
            {showCalculator && (
                <div className="modal-backdrop" onClick={() => setShowCalculator(false)}>
                    <div className="modal-content" style={{ maxWidth: 500, marginLeft: 'auto', height: '100vh', borderRadius: 0 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title flex items-center gap-2"><CalcIcon size={20} className="text-primary" /> Payout Estimator</h2>
                            <button className="btn-icon" onClick={() => setShowCalculator(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-xs text-muted mb-6">Simulate complex commission structures including GST, TDS, and performance bonuses.</p>
                            
                            <div className="flex flex-col gap-6">
                                <div className="form-group">
                                    <label className="form-label">Total Deal Value (Contractual)</label>
                                    <div style={{ position: 'relative' }}>
                                        <IndianRupee size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input type="number" className="form-input" style={{ paddingLeft: 36 }} value={calc.bookingValue} onChange={e => setCalc({...calc, bookingValue: e.target.value})} />
                                    </div>
                                    <div className="text-xs mt-1 font-bold text-primary">{formatCurrency(calc.bookingValue)}</div>
                                </div>

                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Base Rate (%)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Percent size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input type="number" step="0.1" className="form-input" value={calc.baseRate} onChange={e => setCalc({...calc, baseRate: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Active Bonus (%)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Zap size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-amber)' }} />
                                            <input type="number" step="0.1" className="form-input" value={calc.incentiveRate} onChange={e => setCalc({...calc, incentiveRate: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck size={14} className="text-emerald-600" /> Statutory Compliance</div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Add GST ({calc.gstRate}%)</span>
                                            <input type="checkbox" checked={calc.includeGst} onChange={e => setCalc({...calc, includeGst: e.target.checked})} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Deduct TDS ({calc.tdsRate}%)</span>
                                            <input type="checkbox" checked={calc.deductTds} onChange={e => setCalc({...calc, deductTds: e.target.checked})} />
                                        </div>
                                    </div>
                                </div>

                                {/* Results Card */}
                                <div className="p-6 rounded-3xl" style={{ background: 'var(--navy-900)', color: 'white' }}>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center opacity-60 text-xs font-bold uppercase tracking-wider">
                                            Simulation Output
                                            <div className="badge badge-blue" style={{ transform: 'scale(0.8)' }}>Live</div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Gross Commission</span>
                                            <span className="font-bold">{formatCurrency(totalGross)}</span>
                                        </div>
                                        {calc.includeGst && (
                                            <div className="flex justify-between text-sm text-cyan-300">
                                                <span>+ GST (Output)</span>
                                                <span className="font-bold">{formatCurrency(gstAmt)}</span>
                                            </div>
                                        )}
                                        {calc.deductTds && (
                                            <div className="flex justify-between text-sm text-rose-300">
                                                <span>- TDS (Withholding)</span>
                                                <span className="font-bold">{formatCurrency(tdsAmt)}</span>
                                            </div>
                                        )}
                                        <div className="my-2 border-t border-white border-opacity-10" />
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="text-xs opacity-60 font-bold">NET PAYABLE AMOUNT</div>
                                                <div className="text-2xl font-black text-emerald-400">{formatCurrency(netPayout)}</div>
                                            </div>
                                            <CalcIcon size={32} style={{ opacity: 0.1 }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 text-blue-800 text-xs">
                                    <Info size={16} />
                                    <span>This estimation is for modeling purposes only. Final payouts may vary based on milestone completions.</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCalculator(false)}>Dismiss</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => showToast('Model saved to templates', 'success')}>
                                Save Model <ArrowRight size={14} className="ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
