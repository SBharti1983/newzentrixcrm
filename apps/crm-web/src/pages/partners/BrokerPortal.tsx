import { useState, useEffect } from 'react';
import * as dateUtils from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import { 
    Home, Users, BarChart3, Bell, LogOut, ChevronRight, 
    CheckCircle, PieChart, IndianRupee, MapPin, Search, 
    Sparkles, Plus, X 
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { brokerApi, projectsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import AIPitchModal from '../../components/modals/AIPitchModal';

export default function BrokerPortal() {
    const { user, logout } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({ total_leads: 0, conversions: 0, pending_payouts: 0, ytd_earnings: 0 });
    const [leads, setLeads] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPitchModal, setShowPitchModal] = useState(null);
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', project_id: '', notes: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [s, l, p, c] = await Promise.all([
                brokerApi.getStats(),
                brokerApi.getLeads(),
                projectsApi.list(),
                brokerApi.getCommissions()
            ]);
            setStats(s);
            setLeads(l);
            setInventory(p.data || []);
            setCommissions(c);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const handleRegisterLead = async (e) => {
        e.preventDefault();
        try {
            await brokerApi.createLead(newLead);
            addToast({ type: 'success', title: 'Lead Registered', message: 'The lead has been sent to the sales team for verification.' });
            setShowLeadModal(false);
            setNewLead({ name: '', phone: '', email: '', project_id: '', notes: '' });
            fetchData();
        } catch (err) {
            addToast({ type: 'error', title: 'Error', message: 'Failed to register lead.' });
        }
    };

    if (!user) return <Navigate to="/login" replace />;

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{ width: 280, background: 'linear-gradient(180deg, #0f172a, #1e293b)', color: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 32, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', marginBottom: 24, letterSpacing: '-0.02em' }}>Zentrix<span style={{ color: 'var(--accent-cyan)' }}>Partner</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-cyan), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>
                            {user.name[0]}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>Platinum Tier</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                        { id: 'dashboard', label: 'Overview', icon: BarChart3 },
                        { id: 'leads', label: 'My Pipeline', icon: Users },
                        { id: 'inventory', label: 'Project Portfolio', icon: Home },
                        { id: 'payouts', label: 'Commission Ledger', icon: IndianRupee },
                    ].map(nav => (
                        <button key={nav.id} onClick={() => setActiveTab(nav.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: activeTab === nav.id ? 'var(--accent-cyan)' : 'transparent',
                            color: activeTab === nav.id ? '#0f172a' : 'rgba(255,255,255,0.5)',
                            fontWeight: 800, transition: 'all 0.2s', width: '100%', textAlign: 'left', fontSize: '0.9rem'
                        }}>
                            <nav.icon size={18} /> {nav.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, border: 'none', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontWeight: 800, width: '100%', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <LogOut size={18} /> Exit Portal
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ height: 80, background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <button className="btn btn-primary" style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 800 }} onClick={() => setShowLeadModal(true)}>
                            <Plus size={18} style={{ marginRight: 8 }} /> New Lead
                        </button>
                    </div>
                </div>

                <div style={{ padding: '40px' }}>
                    {activeTab === 'dashboard' && (
                        <div className="animate-fadeIn">
                            <div className="grid grid-4" style={{ marginBottom: 32, gap: 24 }}>
                                <div className="card" style={{ padding: 28, border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Pipeline Size</div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a' }}>{stats.total_leads}</div>
                                </div>
                                <div className="card" style={{ padding: 28, border: '1px solid #f1f5f9' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Converters</div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>{stats.conversions}</div>
                                </div>
                                <div className="card" style={{ padding: 28, border: '1px solid #f1f5f9' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Unpaid Brokerage</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-violet)' }}>{formatCurrency(stats.pending_payouts)}</div>
                                </div>
                                <div className="card" style={{ padding: 28, background: '#0f172a', color: 'white', border: 'none' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Lifetime Earnings</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>{formatCurrency(stats.ytd_earnings)}</div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="card-header" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 900 }}>Recent Activity</div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '16px 32px', fontSize: '0.75rem', color: '#64748b' }}>Lead Name</th>
                                            <th style={{ textAlign: 'left', padding: '16px 32px', fontSize: '0.75rem', color: '#64748b' }}>Project</th>
                                            <th style={{ textAlign: 'left', padding: '16px 32px', fontSize: '0.75rem', color: '#64748b' }}>Current Stage</th>
                                            <th style={{ textAlign: 'right', padding: '16px 32px', fontSize: '0.75rem', color: '#64748b' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leads.slice(0, 5).map(l => (
                                            <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '20px 32px', fontWeight: 800, color: '#0f172a' }}>{l.name}</td>
                                                <td style={{ padding: '20px 32px', color: '#64748b', fontWeight: 600 }}>{l.project_name || 'General Portfolio'}</td>
                                                <td style={{ padding: '20px 32px' }}>
                                                    <span className={`badge ${l.stage === 'Won' ? 'badge-green' : 'badge-blue'}`} style={{ fontWeight: 900, fontSize: '0.7rem' }}>{l.stage}</span>
                                                </td>
                                                <td style={{ padding: '20px 32px', textAlign: 'right', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>{dateUtils.formatSafeDate(l.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="animate-fadeIn grid grid-3" style={{ gap: 24 }}>
                            {inventory.map(p => (
                                <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: 160, background: '#f1f5f9', position: 'relative' }}>
                                         <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 12px', background: 'white', borderRadius: 20, fontSize: '0.7rem', fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{p.status}</div>
                                         <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} />
                                    </div>
                                    <div style={{ padding: 24, flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{p.name}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.8rem', marginTop: 4, fontWeight: 600 }}>
                                            <MapPin size={12} /> {p.location}
                                        </div>
                                        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {p.amenities?.slice(0, 3).map((a, idx) => (
                                                <span key={idx} style={{ padding: '3px 8px', background: '#f8fafc', borderRadius: 4, fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>{a}</span>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>STARTING FROM</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-violet)' }}>{p.price_range || '₹1.2 Cr+'}</div>
                                            </div>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setShowPitchModal(p)}>
                                                <Sparkles size={13} style={{ marginRight: 6 }} /> AI Pitch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'payouts' && (
                        <div className="animate-fadeIn card" style={{ padding: 0 }}>
                            <div className="card-header" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                                <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 900 }}>Your Commission Payouts</div>
                            </div>
                            <table style={{ width: '100%' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '16px 32px' }}>Client</th>
                                        <th style={{ textAlign: 'left', padding: '16px 32px' }}>Project</th>
                                        <th style={{ textAlign: 'left', padding: '16px 32px' }}>Deal Value</th>
                                        <th style={{ textAlign: 'left', padding: '16px 32px' }}>Amount</th>
                                        <th style={{ textAlign: 'right', padding: '16px 32px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commissions.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '20px 32px', fontWeight: 800 }}>{c.lead_name}</td>
                                            <td style={{ padding: '20px 32px', color: '#64748b' }}>{c.project_name}</td>
                                            <td style={{ padding: '20px 32px', fontWeight: 600 }}>{formatCurrency(c.deal_value)}</td>
                                            <td style={{ padding: '20px 32px', fontWeight: 900, color: 'var(--accent-emerald)' }}>{formatCurrency(c.payout_amount)}</td>
                                            <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                                                <span className={`badge ${c.status === 'Paid' ? 'badge-green' : 'badge-amber'}`}>{c.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {commissions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
                                                <IndianRupee size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                                <div style={{ fontWeight: 800 }}>No payout records found yet.</div>
                                                <div style={{ fontSize: '0.85rem' }}>Earnings appear here once your referred bookings are confirmed.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Pitch Modal for Projects */}
            {showPitchModal && (
                <AIPitchModal 
                    lead={{ name: 'a potential client', id: 'null' }} 
                    onClose={() => setShowPitchModal(null)}
                    fixedProject={showPitchModal} 
                />
            )}

            {/* New Lead Modal */}
            {showLeadModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3>Register New Lead</h3>
                            <button className="btn-icon" onClick={() => setShowLeadModal(false)}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleRegisterLead} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label>Lead Name</label>
                                <input required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} placeholder="Full name of the customer" />
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input required value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="+91 " />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} placeholder="example@mail.com" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Project Interest</label>
                                <select value={newLead.project_id} onChange={e => setNewLead({...newLead, project_id: e.target.value})}>
                                    <option value="">General Inquiry</option>
                                    {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Internal Notes</label>
                                <textarea rows={3} value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} placeholder="Tell us more about the customer's requirements..." />
                            </div>
                            <button className="btn btn-primary" type="submit" style={{ marginTop: 8, height: 48, fontWeight: 800 }}>Submit for Verification</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
