import { X, Printer, Download } from 'lucide-react';

export default function ProFormaInvoice({ booking, plan, onClose }) {
    if (!booking || !plan) return null;

    const total = parseFloat(String(booking.total_amount || booking.amount).replace(/[^0-9.]/g, '')) || 0;
    
    // Calculate Schedule
    const schedule = plan.schedule.map(s => ({
        ...s,
        amount: Math.round((total * s.percent) / 100)
    }));

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
            <div className="modal" style={{ maxWidth: '850px', background: 'white', padding: 0, overflow: 'hidden' }}>
                
                {/* Modal Actions (Hidden during print) */}
                <div className="no-print" style={{ 
                    padding: '16px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Pro-Forma Invoice Preview</h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                            <Printer size={14} /> Print / Export PDF
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                {/* The Invoice Content */}
                <div id="pro-forma-content" style={{ padding: '60px', color: '#1e293b', lineHeight: 1.5 }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px' }}>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>ZENTRIX <span style={{ color: '#6366f1' }}>REALTY</span></div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 200 }}>
                                12th Floor, Cyber Hub, Phase III, Gurugram, Haryana - 122002
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', marginBottom: 4 }}>PRO-FORMA</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Date: {new Date().toLocaleDateString('en-IN')}</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Ref: PF-{booking.id}-{Math.floor(Math.random() * 9000) + 1000}</div>
                        </div>
                    </div>

                    {/* Parties */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, marginBottom: '60px' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Customer Details</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{booking.customer_name || booking.customerName}</div>
                            <div style={{ color: '#475569', marginTop: 4 }}>{booking.customer_phone || 'Contact not listed'}</div>
                            <div style={{ color: '#475569' }}>{booking.customer_email || 'Email not listed'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Unit Description</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Unit: {booking.unit_no || booking.unitNo}</div>
                            <div style={{ color: '#475569', marginTop: 4 }}>Project: {booking.project_name || booking.projectName}</div>
                            <div style={{ color: '#475569' }}>Tower: Sector A-1 | Area: 1,450 sq.ft.</div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '16px', marginBottom: '60px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>Total Property Cost (Inclusive)</span>
                            <span style={{ fontWeight: 900, fontSize: '1.4rem' }}>{formatCurrency(total)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>Payment Plan Selected</span>
                            <span style={{ fontWeight: 800, color: '#6366f1' }}>{plan.name}</span>
                        </div>
                    </div>

                    {/* Detailed Schedule */}
                    <div style={{ marginBottom: '60px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 20 }}>Proposed Payment Schedule</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #1e293b' }}>
                                    <th style={{ padding: '12px 10px', fontSize: '0.85rem' }}>Milestone / Description</th>
                                    <th style={{ padding: '12px 10px', fontSize: '0.85rem' }}>Timing</th>
                                    <th style={{ padding: '12px 10px', fontSize: '0.85rem', textAlign: 'right' }}>%</th>
                                    <th style={{ padding: '12px 10px', fontSize: '0.85rem', textAlign: 'right' }}>Amount (INR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 10px', fontWeight: 700, fontSize: '0.9rem' }}>{s.milestone}</td>
                                        <td style={{ padding: '16px 10px', color: '#64748b', fontSize: '0.85rem' }}>{s.timing}</td>
                                        <td style={{ padding: '16px 10px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>{s.percent}%</td>
                                        <td style={{ padding: '16px 10px', fontSize: '0.9rem', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(s.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid #1e293b' }}>
                                    <td colSpan="2" style={{ padding: '20px 10px', fontWeight: 800 }}>GRAND TOTAL</td>
                                    <td style={{ padding: '20px 10px', textAlign: 'right', fontWeight: 800 }}>100%</td>
                                    <td style={{ padding: '20px 10px', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: '#6366f1' }}>{formatCurrency(total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, fontSize: '0.8rem', color: '#64748b' }}>
                        <div>
                            <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Terms & Conditions</div>
                            <ul style={{ paddingLeft: 16, margin: 0 }}>
                                <li>Booking is subject to availability and KYC verification.</li>
                                <li>GST and other taxes applicable as per Government norms.</li>
                                <li>Maintenance and club charges extra at the time of possession.</li>
                            </ul>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ height: 60, borderBottom: '1px solid #e2e8f0', marginBottom: 12 }} />
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>Authorized Signatory</div>
                            <div>For Zentrix Realty India Pvt Ltd</div>
                        </div>
                    </div>

                </div>

                {/* Print Styles */}
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body * { visibility: hidden; }
                        #pro-forma-content, #pro-forma-content * { visibility: visible; }
                        #pro-forma-content { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 100%; 
                            padding: 0;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
