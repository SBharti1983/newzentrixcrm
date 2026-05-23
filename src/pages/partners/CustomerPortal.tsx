import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Building2, CreditCard, FileText, Settings, Download, Search, CheckCircle2, Key, Bell } from 'lucide-react';

export default function CustomerPortal() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Simulate customer specific data
    const customerData = {
        name: user?.name || "Premium Member",
        properties: [
            { id: 1, name: "Skyline Residences - Tower C", unit: "C-1402", type: "3BHK Luxury", status: "Under Construction", possession: "Dec 2026", progress: 65, paid: "₹45L", total: "₹1.2Cr" }
        ],
        documents: [
            { id: 101, name: "Allotment Letter", date: "15 Oct 2025", p: true },
            { id: 102, name: "Payment Receipt #1", date: "15 Oct 2025", p: true },
            { id: 103, name: "Agreement to Sale", date: "10 Nov 2025", p: false }
        ],
        payments: [
            { id: "TX122", date: "15 Oct 2025", amount: "₹10,00,000", status: "Completed", desc: "Booking Token" },
            { id: "TX145", date: "01 Nov 2025", amount: "₹35,00,000", status: "Completed", desc: "1st Installment (20%)" },
            { id: "TX199", date: "15 Dec 2025", amount: "₹15,00,000", status: "Upcoming", desc: "Plinth Level Completion" }
        ]
    };

    return (
        <div className="animate-fadeIn">
            {/* Customer Header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--navy-800) 0%, var(--navy-600) 100%)',
                padding: '40px 40px 0',
                borderRadius: 'var(--border-radius-lg)',
                color: 'white',
                marginBottom: 24,
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 1, paddingBottom: 30, display: 'none', height: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>ZENTRIX EXCLUSIVE</div>
                            </div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em', color: 'white' }}>Welcome back, {(customerData.name || 'Member').split(' ')[0]}</h1>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', margin: '0 0 8px', display: 'flex', gap: 12 }}>
                                <span>📧 {user?.email || 'customer@example.com'}</span>
                                <span>📱 +91 98765 43210</span>
                            </p>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>View your property portfolio, payments, and legal documents.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}><Bell size={16} /> Notifications</button>
                            <button className="btn" style={{ background: 'white', color: 'var(--navy-800)', border: 'none' }}><Settings size={16} /> Settings</button>
                        </div>
                    </div>
                </div>

                {/* Tabs inside header */}
                <div style={{ display: 'flex', gap: 30, position: 'relative', zIndex: 1 }}>
                    {[
                        { id: 'overview', label: 'Portfolio Overview', icon: Building2 },
                        { id: 'payments', label: 'Payment Schedule', icon: CreditCard },
                        { id: 'documents', label: 'My Documents', icon: FileText }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                background: 'transparent', border: 'none',
                                padding: '16px 4px', color: activeTab === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                                borderBottom: activeTab === t.id ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                                fontWeight: activeTab === t.id ? 700 : 600,
                                fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Decorative BG element */}
                <div style={{ position: 'absolute', right: '-10%', top: '-50%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'overview' && (
                <div className="grid grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)' }}>
                    {/* Property Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {customerData.properties.map(p => (
                            <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
                                <div style={{ height: 160, background: 'url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80) center/cover', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                                        {p.status}
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-800)', margin: 0 }}>{p.name}</h3>
                                                <span style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--navy-100)', color: 'var(--navy-700)', fontSize: '0.75rem', fontWeight: 700 }}>Unit {p.unit}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{p.type} • Expected Possession: {p.possession}</div>
                                        </div>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('documents')}><Key size={14} /> View Allotment</button>
                                    </div>

                                    <div style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>PROJECT PROGRESS</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--navy-600)' }}>{p.progress}%</div>
                                        </div>
                                        <div className="progress-bar" style={{ height: 8 }}>
                                            <div className="progress-fill" style={{ width: `${p.progress}%`, background: 'var(--accent-cyan)' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>AMOUNT PAID</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald-dark)' }}>{p.paid}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL AGREEMENT VALUE</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-800)' }}>{p.total}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Stats / Recent Activity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="card">
                            <div className="card-header"><div className="card-title">Recent Activity</div></div>
                            <div className="card-body">
                                {[
                                    { icon: '📄', title: 'Agreement generated', date: '2 days ago' },
                                    { icon: '💰', title: 'Payment of ₹35L received', date: '1 Nov 2025' },
                                    { icon: '🏠', title: 'Unit Allotted: C-1402', date: '15 Oct 2025' },
                                ].map((act, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                        <div style={{ width: 40, height: 40, background: 'var(--slate-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{act.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{act.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.date}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card" style={{ background: 'var(--accent-violet-dark)', color: 'white' }}>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                                <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <CheckCircle2 size={30} color="#fff" />
                                </div>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>Need Assistance?</h3>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 20px' }}>Your Relationship Manager, Rahul, is here to help you.</p>
                                <button className="btn" style={{ background: 'white', color: 'var(--accent-violet-dark)', border: 'none', width: '100%' }}>Contact RM</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="card-title">Payment Schedule</div>
                            <div className="card-subtitle">Track your installments and upcoming dues</div>
                        </div>
                        <button className="btn btn-primary"><CreditCard size={14} /> Pay Upcoming</button>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref ID</th>
                                    <th>Description</th>
                                    <th>Due / Paid Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerData.payments.map((tx) => (
                                    <tr key={tx.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{tx.id}</td>
                                        <td style={{ fontWeight: 600 }}>{tx.desc}</td>
                                        <td>{tx.date}</td>
                                        <td style={{ fontWeight: 800 }}>{tx.amount}</td>
                                        <td>
                                            <span className={`badge ${tx.status === 'Completed' ? 'badge-green' : 'badge-amber'}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td>
                                            {tx.status === 'Completed' ? (
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}><Download size={14} /> Receipt</button>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 12px' }}>Pay Now</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'documents' && (
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div className="card-title">Legal Documents</div>
                                <div className="card-subtitle">Securely access your property files</div>
                            </div>
                            <div className="search-bar" style={{ width: 250 }}>
                                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                                <input placeholder="Search documents..." />
                            </div>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Document Name</th>
                                        <th>Generated On</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerData.documents.map((doc) => (
                                        <tr key={doc.id}>
                                            <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, background: 'var(--slate-50)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                    <FileText size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{doc.name}</span>
                                            </td>
                                            <td>{doc.date}</td>
                                            <td>
                                                <span className={`badge ${doc.p ? 'badge-green' : 'badge-slate'}`}>
                                                    {doc.p ? 'Available' : 'Processing'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-secondary btn-sm" disabled={!doc.p}><Download size={14} /> Download</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div >
                )
            }
        </div >
    );
}
