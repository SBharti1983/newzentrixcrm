import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, 
    PieChart, Pie, Cell
} from 'recharts';
import { 
    MoreHorizontal, 
    Users, Building2, DollarSign, Activity, Server, Zap, Globe,
    ArrowUpRight, ArrowDownRight,
    CreditCard,
    BarChart3, Plus, ExternalLink, RefreshCw,
    Receipt, History, Search, X
} from 'lucide-react';
import { superAdminApi } from '../api/client';
import { useToast } from '../hooks/useToast';

const COLORS = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    chartBlue: 'rgba(99, 102, 241, 0.8)',
    chartTeal: 'rgba(20, 184, 166, 0.8)',
    chartPurple: 'rgba(139, 92, 246, 0.8)',
};

const REVENUE_DATA = [
    { name: 'Jan', revenue: 45000 },
    { name: 'Feb', revenue: 52000 },
    { name: 'Mar', revenue: 48000 },
    { name: 'Apr', revenue: 61000 },
    { name: 'May', revenue: 75000 },
    { name: 'Jun', revenue: 89000 },
];

const SUBSCRIPTION_DATA = [
    { name: 'Enterprise', value: 45, color: COLORS.chartPurple },
    { name: 'Professional', value: 35, color: COLORS.chartBlue },
    { name: 'Starter', value: 20, color: COLORS.chartTeal },
];

const ACTIVITY = [
    { id: 1, action: 'New Tenant Provisioned', actor: 'System', target: 'Prime Estates', time: '12m ago', icon: Building2 },
    { id: 2, action: 'Payment Successful', actor: 'Stripe', target: 'Maya Infratech', time: '45m ago', icon: CreditCard },
    { id: 3, action: 'Storage Limit Warning', actor: 'Cloudflare', target: 'Skyline Reality', time: '1h ago', icon: Server },
    { id: 4, action: 'Plan Upgrade', actor: 'Admin', target: 'Horizon Homes', time: '3h ago', icon: Zap },
];

const KPIChart = ({ data, color }) => (
    <div style={{ height: 40, width: '100%', marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <Area 
                    type="monotone" 
                    dataKey="val" 
                    stroke={color} 
                    strokeWidth={1.5} 
                    fill={`url(#grad-${color})`} 
                    isAnimationActive={false} 
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const KPICard = ({ title, value, change, isUp, icon: Icon, color, sparkData }) => (
    <div style={{
        background: COLORS.card,
        borderRadius: '16px',
        padding: '16px',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
        flex: 1
    }} onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.04), 0 10px 20px rgba(0,0,0,0.02)';
    }} onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01)';
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ 
                width: 32, height: 32, borderRadius: '8px', 
                background: `${color}10`, display: 'flex', 
                alignItems: 'center', justifyContent: 'center' 
            }}>
                <Icon size={18} color={color} />
            </div>
            <div style={{ 
                display: 'flex', alignItems: 'center', gap: 2, 
                fontSize: '0.7rem', fontWeight: 600,
                color: isUp ? COLORS.success : COLORS.danger,
                background: isUp ? `${COLORS.success}10` : `${COLORS.danger}10`,
                padding: '2px 6px', borderRadius: '99px'
            }}>
                {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {change}
            </div>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: COLORS.textPrimary, letterSpacing: '-0.5px' }}>{value}</div>
        <KPIChart data={sparkData} color={color} />
    </div>
);

export default function SuperAdminDashboardView({ tenants = [], stats = {}, subscriptions = [], onReload }) {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = React.useState('operational');
    const [finSearch, setFinSearch] = React.useState('');
    const [actionMenu, setActionMenu] = React.useState(null);
    const [showAddSub, setShowAddSub] = React.useState(false);
    const [subLoading, setSubLoading] = React.useState(false);

    const handleAddManualSub = async (e) => {
        e.preventDefault();
        setSubLoading(true);
        const formData = new FormData(e.target);
        const data = {
            tenant_id: formData.get('tenant_id'),
            plan: formData.get('plan'),
            amount: formData.get('amount'),
            method: formData.get('method'),
            gateway_sub_id: formData.get('ref')
        };

        try {
            await superAdminApi.recordManualSubscription(data);
            showToast('Manual payment successfully synchronized with global ledger.', 'success');
            setShowAddSub(false);
            if (onReload) onReload();
        } catch (err) {
            showToast('Failed to record transaction. Please verify node connectivity.', 'error');
        } finally {
            setSubLoading(false);
        }
    };

    const sparkMock = (range) => [...Array(10)].map((_, i) => ({ val: Math.random() * range + 10 }));

    return (
        <div style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
            minHeight: '100vh', 
            padding: '32px',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            color: COLORS.textPrimary,
        }}>
            <style>{`
                .wow-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08) !important;
                }
                .tab-btn {
                    padding: 10px 24px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
            `}</style>

            {/* Premium Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Global Command Center</h1>
                    <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontWeight: 500 }}>System-wide infrastructure & financial oversight.</p>
                </div>

                <div style={{ display: 'flex', background: 'white', padding: '4px', borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                    <button 
                        className="tab-btn" 
                        onClick={() => setActiveTab('operational')}
                        style={{ 
                            background: activeTab === 'operational' ? COLORS.primary : 'transparent',
                            color: activeTab === 'operational' ? 'white' : COLORS.textSecondary
                        }}
                    >
                        <Zap size={16} /> Operational
                    </button>
                    <button 
                        className="tab-btn" 
                        onClick={() => setActiveTab('financial')}
                        style={{ 
                            background: activeTab === 'financial' ? COLORS.primary : 'transparent',
                            color: activeTab === 'financial' ? 'white' : COLORS.textSecondary
                        }}
                    >
                        <CreditCard size={16} /> Financial Ledger
                    </button>
                </div>
            </div>
            {activeTab === 'operational' ? (
                <>

            {/* KPI Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '16px', 
                marginBottom: '32px'
            }}>
                {[
                    { title: "Revenue (MRR)", value: `$${(stats?.mrr || 0).toLocaleString()}`, icon: DollarSign, color: COLORS.success, bg: '#dcfce7' },
                    { title: "Total Tenants", value: (tenants?.length || 0).toString(), icon: Building2, color: COLORS.primary, bg: '#dbeafe' },
                    { title: "Active Users", value: (stats?.totalUsers || 0).toLocaleString(), icon: Users, color: '#ec4899', bg: '#fce7f3' },
                    { title: "Churn Rate", value: "1.8%", icon: Activity, color: COLORS.danger, bg: '#fee2e2' },
                    { title: "Network Conv.", value: "9.4%", icon: Zap, color: '#8b5cf6', bg: '#f5f3ff' },
                    { title: "System Uptime", value: "99.9%", icon: Server, color: '#0ea5e9', bg: '#f0f9ff' }
                ].map((k, i) => (
                    <div key={i} className="wow-card" style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        padding: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                        display: 'flex', flexDirection: 'column', gap: '4px',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <k.icon size={20} color={k.color} />
                            </div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.success, background: '#ecfdf5', padding: '3px 7px', borderRadius: '8px' }}>+5.2%</div>
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>{k.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{k.title}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
                <div style={{
                    background: COLORS.card, borderRadius: '20px', padding: '24px',
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Network Performance</h3>
                            <p style={{ color: COLORS.textSecondary, fontSize: '0.8rem', marginTop: 2 }}>Revenue & Growth</p>
                        </div>
                    </div>
                    
                    <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={REVENUE_DATA}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={2.5} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{
                    background: COLORS.card, borderRadius: '20px', padding: '24px',
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 2 }}>Tier Distribution</h3>
                    <p style={{ color: COLORS.textSecondary, fontSize: '0.8rem', marginBottom: 20 }}>Split by plan</p>
                    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={SUBSCRIPTION_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={6} dataKey="value">
                                    {SUBSCRIPTION_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{tenants?.length || 0}</div>
                            <div style={{ fontSize: '0.65rem', color: COLORS.textSecondary, fontWeight: 700 }}>TOTAL</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table and Logs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
                <div style={{
                    background: COLORS.card, borderRadius: '20px', padding: '24px',
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Management</h3>
                        <button style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 4 }}>
                            List <ExternalLink size={12} />
                        </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                    <th style={{ textAlign: 'left', padding: '10px 0', color: COLORS.textSecondary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>Workspace</th>
                                    <th style={{ textAlign: 'left', padding: '10px 0', color: COLORS.textSecondary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>Tier</th>
                                    <th style={{ textAlign: 'left', padding: '10px 0', color: COLORS.textSecondary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>Users</th>
                                    <th style={{ textAlign: 'left', padding: '10px 0', color: COLORS.textSecondary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>Status</th>
                                    <th style={{ textAlign: 'right', padding: '10px 0', color: COLORS.textSecondary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants?.slice(0, 5).map(t => (
                                    <tr key={t.id} style={{ borderBottom: `1px solid #F1F5F9` }}>
                                        <td style={{ padding: '12px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '6px', background: `${COLORS.primary}15`, color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                                                    {t.name ? t.name[0] : '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.name || 'Unnamed'}</div>
                                                    <div style={{ fontSize: '0.65rem', color: COLORS.textSecondary }}>{t.slug}.zentrixcrm.com</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 0' }}>
                                            <span style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: '#F1F5F9', color: COLORS.textPrimary }}>{t.plan?.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '12px 0', fontWeight: 600, fontSize: '0.8rem' }}>{t.max_users}</td>
                                        <td style={{ padding: '12px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.is_active ? COLORS.success : COLORS.danger }} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: t.is_active ? COLORS.success : COLORS.danger }}>{t.is_active ? 'Active' : 'Suspended'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 0', textAlign: 'right', position: 'relative' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionMenu(actionMenu === t.id ? null : t.id);
                                                }}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                            >
                                                <MoreHorizontal size={16} color={COLORS.textSecondary} />
                                            </button>

                                            {actionMenu === t.id && (
                                                <div style={{
                                                    position: 'absolute', right: 0, top: '100%', width: '160px',
                                                    background: 'white', border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                    zIndex: 100, overflow: 'hidden'
                                                }}>
                                                    <button 
                                                        onClick={() => { window.location.href = `/workspace-management?edit=${t.id}`; }}
                                                        style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'white', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                                    >
                                                        <ExternalLink size={12} /> Manage Node
                                                    </button>
                                                    <button 
                                                        onClick={() => { setActionMenu(null); }}
                                                        style={{ width: '100%', padding: '10px 16px', border: 'none', borderTop: `1px solid ${COLORS.border}`, background: 'white', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: t.is_active ? COLORS.danger : COLORS.success }}
                                                    >
                                                        {t.is_active ? 'Suspend Node' : 'Activate Node'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                        background: COLORS.card, borderRadius: '20px', padding: '24px',
                        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Audit Logs</h3>
                            <RefreshCw size={14} color={COLORS.textSecondary} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {ACTIVITY.slice(0, 3).map(log => (
                                <div key={log.id} style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><log.icon size={12} color={COLORS.textSecondary} /></div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{log.action}</div>
                                        <div style={{ fontSize: '0.65rem', color: COLORS.textSecondary }}>{log.actor} • {log.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                        borderRadius: '20px', padding: '24px', color: 'white',
                        boxShadow: '0 10px 30px rgba(30, 27, 75, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <BarChart3 size={18} color="#818CF8" />
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                                Network ARPU
                            </h3>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 4 }}>
                            $124.50
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#C7D2FE', marginTop: 2, fontWeight: 500, letterSpacing: '0.01em' }}>
                            +4.2% Growth
                        </p>
                    </div>
                </div>
            </div>
            </>
            ) : (
                <div className="animate-fadeIn">
                    {/* Financial Summary Ribbon */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                        {[
                            { label: 'Total Revenue', val: `₹${subscriptions.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0).toLocaleString()}`, icon: DollarSign, color: COLORS.success },
                            { label: 'Active Subscriptions', val: subscriptions.filter(s => s.status === 'active').length, icon: History, color: COLORS.primary },
                            { label: 'Pending Collections', val: '₹12,400', icon: Receipt, color: COLORS.warning },
                            { label: 'Churn Rate (MoM)', val: '1.2%', icon: Activity, color: COLORS.danger },
                        ].map((s, i) => (
                            <div key={i} className="wow-card" style={{ background: 'white', padding: '24px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <s.icon size={18} color={s.color} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>{s.label}</span>
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{s.val}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: 'white', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '320px' }}>
                                <Search size={18} color={COLORS.textSecondary} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search ledger by tenant or ID..." 
                                    value={finSearch}
                                    onChange={(e) => setFinSearch(e.target.value)}
                                    style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '14px', border: `1.5px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="tab-btn" onClick={() => setShowAddSub(true)} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}>Record Payment</button>
                                <button className="tab-btn" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}>Download CSV</button>
                                <button className="tab-btn" style={{ background: COLORS.primary, color: 'white' }}>Generate Report</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: COLORS.bg }}>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Transaction Terminal</th>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Plan Lifecycle</th>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>TranID</th>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Plan Duration</th>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Financial Value</th>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.filter(s => 
                                        s.tenant_name?.toLowerCase().includes(finSearch.toLowerCase()) || 
                                        s.gateway_sub_id?.toLowerCase().includes(finSearch.toLowerCase())
                                    ).map(sub => (
                                        <tr key={sub.id} style={{ borderBottom: `1px solid ${COLORS.bg}`, transition: 'background 0.2s' }}>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{sub.tenant_name}</div>
                                                <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, letterSpacing: '0.05em' }}>{sub.tenant_slug}.zentrixcrm.com</div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: `${COLORS.primary}10`, color: COLORS.primary, textTransform: 'uppercase' }}>
                                                    {sub.plan}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textPrimary, fontFamily: 'monospace' }}>{sub.gateway_sub_id?.slice(0, 12)}...</div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.textSecondary }}>Monthly</div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontWeight: 900, color: COLORS.textPrimary }}>₹{parseFloat(sub.amount || 0).toLocaleString()}</div>
                                                <div style={{ fontSize: '0.65rem', color: COLORS.textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>Via {sub.gateway}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800, background: sub.status === 'active' ? '#ecfdf5' : '#fef2f2', color: sub.status === 'active' ? '#059669' : '#dc2626' }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sub.status === 'active' ? '#10B981' : '#EF4444' }} />
                                                    {sub.status?.toUpperCase()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textSecondary }}>
                                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                    {subscriptions.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ padding: '80px', textAlign: 'center', color: COLORS.textSecondary }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧾</div>
                                                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: COLORS.textPrimary }}>No global transactions found.</div>
                                                <p>Automated billing sequences will appear here as tenants upgrade.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => { window.location.href = '/workspace-management?provision=true'; }}
                style={{
                    position: 'fixed', bottom: 40, right: 40, width: 56, height: 56, borderRadius: '28px',
                    background: COLORS.primary, color: 'white', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 1000
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                title="Provision New Workspace"
            >
                <Plus size={24} strokeWidth={3} />
            </button>
            {/* Manual Subscription Modal */}
            {showAddSub && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '32px', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Record Manual Payment</h2>
                            <button onClick={() => setShowAddSub(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.textSecondary }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAddManualSub} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Target Workspace Node</label>
                                <select name="tenant_id" required style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, fontWeight: 600, appearance: 'none', background: 'white' }}>
                                    <option value="">Select a workspace...</option>
                                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Subscription Tier</label>
                                    <select name="plan" required style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, fontWeight: 600 }}>
                                        <option value="pro_solo">Solopreneur</option>
                                        <option value="starter">Starter</option>
                                        <option value="pro">Professional</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Payment Method</label>
                                    <select name="method" required style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, fontWeight: 600 }}>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cash">Cash Settlement</option>
                                        <option value="check">Physical Check</option>
                                        <option value="upi">Direct UPI</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Final Settlement Value (INR)</label>
                                    <input type="number" name="amount" placeholder="e.g. 7900" required style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, fontWeight: 600 }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Reference / TranID</label>
                                    <input name="ref" placeholder="TXN-XXXXXX" style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, fontWeight: 600 }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setShowAddSub(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#f1f5f9', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={subLoading} style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: COLORS.primary, color: 'white', fontWeight: 800, cursor: 'pointer', opacity: subLoading ? 0.7 : 1 }}>
                                    {subLoading ? 'Synchronizing...' : 'Settle & Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');" }} />
        </div>
    );
}
