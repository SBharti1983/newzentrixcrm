import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Home, Users, BarChart3, Bell, LogOut, ChevronRight, CheckCircle, PieChart, IndianRupee, MapPin } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function BrokerPortal() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    // MOCK BROKER DATA
    const brokerData = {
        name: 'Urban Realty Partners',
        tier: 'Platinum Broker',
        totalLeads: 45,
        conversions: 8,
        pendingPayouts: '₹5,00,000',
        ytdEarnings: '₹12,50,000'
    };

    const REFERRED_LEADS = [
        { id: 'L-101', name: 'Amit Desai', project: 'Skyline Residences', status: 'Site Visit', date: 'Oct 24, 2025' },
        { id: 'L-102', name: 'Neha Sharma', project: 'Oasis Gardens', status: 'Negotiation', date: 'Oct 22, 2025' },
        { id: 'L-103', name: 'Raj Kumar', project: 'Skyline Residences', status: 'Booked', date: 'Oct 15, 2025' },
    ];

    const INVENTORY = [
        { project: 'Skyline Residences', unit: 'B-405', type: '3BHK', size: '1450 sqft', price: '₹1.2Cr', status: 'Available' },
        { project: 'Skyline Residences', unit: 'C-902', type: '2BHK', size: '1050 sqft', price: '₹85L', status: 'Available' },
        { project: 'Oasis Gardens', unit: 'A-101', type: '4BHK Villa', size: '3200 sqft', price: '₹3.5Cr', status: 'Available' },
    ];

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{ width: 280, background: 'linear-gradient(180deg, var(--navy-900), var(--navy-800))', color: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: 20 }}>Zentrix<span style={{ color: 'var(--accent-cyan)' }}>Partner</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                            UR
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>{brokerData.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{brokerData.tier}</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                        { id: 'leads', label: 'My Leads', icon: Users },
                        { id: 'inventory', label: 'Live Inventory', icon: Home },
                        { id: 'payouts', label: 'Payouts', icon: IndianRupee },
                    ].map(nav => (
                        <button key={nav.id} onClick={() => setActiveTab(nav.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: activeTab === nav.id ? 'var(--accent-cyan)' : 'transparent',
                            color: activeTab === nav.id ? 'var(--navy-900)' : 'rgba(255,255,255,0.7)',
                            fontWeight: activeTab === nav.id ? 700 : 600, transition: 'all 0.2s', width: '100%', textAlign: 'left'
                        }}>
                            <nav.icon size={18} /> {nav.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: 'none', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontWeight: 600, width: '100%', cursor: 'pointer' }}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ height: 70, background: 'white', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-800)', margin: 0, textTransform: 'capitalize' }}>Partner {activeTab.replace('-', ' ')}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button className="btn btn-primary btn-sm">+ Register New Lead</button>
                        <div style={{ position: 'relative' }}>
                            <Bell size={20} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--accent-rose)', borderRadius: '50%' }} />
                        </div>
                    </div>
                </div>

                <div style={{ padding: 32 }}>
                    {activeTab === 'dashboard' && (
                        <div className="animate-fadeIn">
                            <div className="grid grid-3" style={{ marginBottom: 24 }}>
                                <div className="card" style={{ padding: 24, borderTop: '4px solid var(--accent-cyan)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Referred Leads</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy-800)', marginTop: 8 }}>{brokerData.totalLeads}</div>
                                </div>
                                <div className="card" style={{ padding: 24, borderTop: '4px solid var(--accent-emerald)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Successful Conversions</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald-dark)', marginTop: 8 }}>{brokerData.conversions}</div>
                                </div>
                                <div className="card" style={{ padding: 24, borderTop: '4px solid var(--accent-violet)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Payouts</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-violet-dark)', marginTop: 8 }}>{brokerData.pendingPayouts}</div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Recent Lead Status</div>
                                </div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Lead Name</th>
                                            <th>Project</th>
                                            <th>Date Registered</th>
                                            <th>Current Stage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {REFERRED_LEADS.map(l => (
                                            <tr key={l.id}>
                                                <td style={{ fontWeight: 700 }}>{l.name}</td>
                                                <td>{l.project}</td>
                                                <td>{l.date}</td>
                                                <td><span className={`badge ${l.status === 'Booked' ? 'badge-green' : 'badge-blue'}`}>{l.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="animate-fadeIn card">
                            <div className="card-header">
                                <div className="card-title">Live Availability</div>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Project</th>
                                        <th>Unit</th>
                                        <th>Type & Size</th>
                                        <th>Base Price</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {INVENTORY.map((i, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 700 }}>{i.project}</td>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{i.unit}</td>
                                            <td>{i.type} · {i.size}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--navy-600)' }}>{i.price}</td>
                                            <td><span className="badge badge-green">{i.status}</span></td>
                                            <td><button className="btn btn-secondary btn-sm">Pitch to Lead</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
