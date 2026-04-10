import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, 
    PieChart, Pie, Cell
} from 'recharts';
import { 
    MoreHorizontal, 
    Users, Building2, DollarSign, Activity, Server, Zap,
    ArrowUpRight, ArrowDownRight,
    CreditCard,
    BarChart3, Plus, ExternalLink, RefreshCw
} from 'lucide-react';

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

export default function SuperAdminDashboardView({ tenants = [], stats = {} }) {
    const sparkMock = (range) => [...Array(10)].map((_, i) => ({ val: Math.random() * range + 10 }));

    return (
        <div style={{ 
            background: COLORS.bg, 
            minHeight: 'calc(100vh - 70px)', 
            padding: '12px 18px',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            color: COLORS.textPrimary,
            overflowX: 'hidden'
        }}>
            {/* KPI Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '12px', 
                marginBottom: '20px'
            }}>
                <KPICard 
                    title="Revenue (MRR)" 
                    value={`$${(stats?.mrr || 0).toLocaleString()}`} 
                    change="12.4%" 
                    isUp={true} 
                    icon={DollarSign} 
                    color={COLORS.success} 
                    sparkData={sparkMock(30)} 
                />
                <KPICard 
                    title="Total Tenants" 
                    value={(tenants?.length || 0).toString()} 
                    change="8.4%" 
                    isUp={true} 
                    icon={Building2} 
                    color={COLORS.primary} 
                    sparkData={sparkMock(20)} 
                />
                <KPICard 
                    title="Active Users" 
                    value={(stats?.totalUsers || 0).toLocaleString()} 
                    change="10.2%" 
                    isUp={true} 
                    icon={Users} 
                    color={COLORS.info} 
                    sparkData={sparkMock(40)} 
                />
                <KPICard 
                    title="Churn" 
                    value="1.8%" 
                    change="0.2%" 
                    isUp={false} 
                    icon={Activity} 
                    color={COLORS.danger} 
                    sparkData={sparkMock(15)} 
                />
                <KPICard 
                    title="Conv." 
                    value="9.4%" 
                    change="1.1%" 
                    isUp={true} 
                    icon={Zap} 
                    color={COLORS.chartPurple} 
                    sparkData={sparkMock(25)} 
                />
                <KPICard 
                    title="Uptime" 
                    value="99.9%" 
                    change="0.01%" 
                    isUp={true} 
                    icon={Server} 
                    color={COLORS.chartTeal} 
                    sparkData={sparkMock(5)} 
                />
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
                                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                            <MoreHorizontal size={14} color={COLORS.textSecondary} style={{ cursor: 'pointer' }} />
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

            <button style={{
                position: 'fixed', bottom: 40, right: 40, width: 56, height: 56, borderRadius: '28px',
                background: COLORS.primary, color: 'white', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Plus size={24} strokeWidth={3} />
            </button>
            <style dangerouslySetInnerHTML={{ __html: "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');" }} />
        </div>
    );
}
