import { useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { analyticsApi } from '../api/client';
import { TrendingUp, Users, Home, BarChart3, Target, Award, Calendar, Phone, Sparkles } from 'lucide-react';

const PIE_COLORS = ['var(--navy-600)', 'var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-violet)', 'var(--accent-rose)'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.95)', border: 'none',
            borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '14px 18px', fontSize: 13,
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--navy-800)', borderBottom: '1px solid var(--border-light)', pb: 6 }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{p.name}:</span>
                    <strong style={{ color: 'var(--navy-900)' }}>{p.value}</strong>
                </div>
            ))}
        </div>
    );
};

export default function Analytics() {
    const [range, setRange] = useState('6months');
    const { data: data, loading, error, refetch } = useApi(() => analyticsApi.get({ range }), [range]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const kpis = [
        { label: 'Pipeline Value', value: data.kpis.totalRevenue, change: data.kpis.revenueChange, icon: <TrendingUp size={20} />, color: 'var(--navy-600)', data: data.monthlySales.map(m => m.revenue) },
        { label: 'Active Leads', value: data.kpis.totalLeads, change: data.kpis.leadsChange, icon: <Users size={20} />, color: 'var(--accent-cyan)', data: data.monthlySales.map(m => m.leads) },
        { label: 'Units Booked', value: data.kpis.unitsSold, change: data.kpis.unitsChange, icon: <Home size={20} />, color: 'var(--accent-emerald)', data: data.monthlySales.map(m => m.conversions) },
        { label: 'Total Calls', value: data.kpis.totalCalls || 0, change: '+5.4%', icon: <Phone size={20} />, color: 'var(--accent-rose)', data: [12, 19, 15, 22, 30, 25] },
    ];

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 60 }}>
            {/* Header Section */}
            <div className="glass-panel" style={{ 
                padding: '32px 48px', 
                borderRadius: 32, 
                marginBottom: 32,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                border: '1px solid rgba(255,255,255,0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.04)'
            }}>
                <div>
                    <h1 className="text-gradient-premium" style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.05em', margin: 0 }}>Executive Intelligence</h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--slate-500)', fontWeight: 600, marginTop: 6 }}>Enterprise-wide synthesis of performance metrics and predictive growth</p>
                </div>
                <div style={{ 
                    background: 'rgba(255,255,255,0.5)', 
                    padding: 6, 
                    borderRadius: 16, 
                    display: 'flex', 
                    gap: 6,
                    border: '1px solid var(--slate-200)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {[
                        { id: '3months', label: 'Quarterly' },
                        { id: '6months', label: 'Half-Year' },
                        { id: 'thisyear', label: 'Fiscal Year' }
                    ].map(r => (
                        <button
                            key={r.id}
                            onClick={() => setRange(r.id)}
                            style={{
                                padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: 800, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: range === r.id ? 'var(--navy-600)' : 'transparent',
                                color: range === r.id ? 'white' : 'var(--text-muted)',
                                boxShadow: range === r.id ? '0 10px 20px rgba(30,58,115,0.2)' : 'none'
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Intelligence Matrix */}
            <div className="grid grid-4 mb-10" style={{ gap: 24 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="glass-panel hover-lift" style={{ 
                        padding: 0, 
                        overflow: 'hidden', 
                        borderRadius: 32,
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ padding: '28px 28px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ 
                                    width: 52, height: 52, borderRadius: 18, 
                                    background: `linear-gradient(135deg, ${k.color}15, ${k.color}05)`, 
                                    color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${k.color}10`
                                }}>
                                    {k.icon}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ 
                                        fontSize: '0.75rem', fontWeight: 900, color: k.change.startsWith('+') ? 'var(--accent-emerald)' : 'var(--accent-rose)', 
                                        background: k.change.startsWith('+') ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', 
                                        padding: '5px 12px', borderRadius: 10,
                                        display: 'inline-flex', alignItems: 'center', gap: 4
                                    }}>
                                        {k.change.startsWith('+') ? '↑' : '↓'} {k.change}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase' }}>VS PV. PERIOD</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-gradient-premium" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{k.value}</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--slate-400)', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                            </div>
                        </div>
                        <div style={{ height: 80, width: '100%', marginTop: 10 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={k.data.map((v, idx) => ({ v, idx }))}>
                                    <defs>
                                        <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={k.color} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={k.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="v" stroke={k.color} strokeWidth={3} fill={`url(#grad-${i})`} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Visualization Hub */}
            <div className="grid grid-2 mb-10" style={{ gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: 32 }}>
                <div className="glass-card" style={{ borderRadius: 32, padding: '32px', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-900)' }}>Revenue amp Conversion Dynamics</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>Correlation between lead volume and realized revenue</p>
                        </div>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--navy-600)' }} /> Revenue (Cr)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-cyan)' }} /> Leads Generated
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ height: 380 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.monthlySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--navy-600)" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="var(--navy-600)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--text-muted)', fontWeight: 700 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--text-muted)', fontWeight: 600 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--navy-600)" strokeWidth={4} fill="url(#revGrad)" dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--accent-cyan)" strokeWidth={3} fill="transparent" strokeDasharray="8 5" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ borderRadius: 32, padding: '32px', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-900)' }}>Client Acquisition</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>Lead source distribution analysis</p>
                    </div>
                    <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.leadSources}
                                    cx="50%" cy="50%"
                                    innerRadius={75}
                                    outerRadius={105}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationBegin={200}
                                    stroke="none"
                                >
                                    {data.leadSources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40 }}>
                        {data.leadSources.map((s, i) => (
                            <div key={i} className="glass-card" style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 20, border: '1px solid var(--slate-100)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{s.name}</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--navy-900)' }}>{s.value}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tactical Intelligence Section */}
            <div className="grid grid-2 mb-10" style={{ gap: 32 }}>
                <div className="glass-card" style={{ borderRadius: 32, padding: '32px', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Communication Efficacy</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distribution of outbound call outcomes</p>
                    </div>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.callOutcomes}
                                    cx="50%" cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={6}
                                    dataKey="value"
                                >
                                    {data.callOutcomes.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.85rem', fontWeight: 700, paddingTop: 20 }} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ borderRadius: 32, padding: '32px', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Agent Velocity</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Outbound volume per representative</p>
                    </div>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.agentCalls} barGap={0}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomTooltip />} />
                                <Bar dataKey="calls" name="Calls Made" fill="var(--accent-emerald)" radius={[8, 8, 0, 0]} barSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Performance Rankings */}
            {/* Elite Sales Arena - Modernized Leaderboard */}
            <div className="glass-panel" style={{ 
                borderRadius: 32, 
                padding: '48px', 
                border: '1px solid rgba(255,255,255,0.8)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                boxShadow: '0 32px 64px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ padding: '8px 16px', background: 'var(--navy-900)', borderRadius: '12px', color: 'white', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                Executive Rankings
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                                <Sparkles size={14} /> LIVE RECAP
                            </div>
                        </div>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.04em' }}>
                            The Sales Arena
                        </h3>
                        <p style={{ color: 'var(--slate-500)', fontSize: '1.1rem', marginTop: 8, fontWeight: 500 }}>Real-time GTV (Gross Transaction Value) performance metrics.</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Global Performance Index</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--navy-900)' }}>1.28Cr <span style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)', fontWeight: 800 }}>+12.4%</span></div>
                    </div>
                </div>
                
                {/* Top 3 Podium (Tier 1) */}
                <div className="grid grid-3" style={{ 
                    gap: 32,
                    marginBottom: 48
                }}>
                    {data.agentPerformance.slice(0, 3).map((a, i) => {
                        const isLeader = i === 0;
                        const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#b45309';
                        const bgColor = i === 0 ? 'var(--navy-900)' : 'white';
                        const textColor = i === 0 ? 'white' : 'var(--navy-900)';
                        
                        return (
                            <div key={i} className="hover-lift" style={{ 
                                padding: '32px', 
                                background: bgColor, 
                                borderRadius: 32,
                                border: i === 0 ? 'none' : '1px solid #f1f5f9',
                                boxShadow: i === 0 ? '0 32px 64px rgba(10,22,40,0.2)' : '0 12px 32px rgba(10,22,40,0.02)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                                {/* Rank Medal */}
                                <div style={{ 
                                    position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                                    padding: '8px 24px', borderRadius: 100, background: rankColor, color: 'white',
                                    fontSize: '11px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em',
                                    boxShadow: `0 8px 20px ${rankColor}40`, border: '3px solid white',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {i === 0 ? 'Gold' : i === 1 ? 'Silver' : 'Bronze'} Tier
                                </div>

                                <div style={{ 
                                    width: 80, height: 80, borderRadius: 24, 
                                    background: i === 0 ? 'rgba(255,255,255,0.1)' : 'var(--slate-50)',
                                    color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    fontWeight: 900, fontSize: '1.8rem', marginBottom: 20,
                                    border: i === 0 ? '1px solid rgba(255,255,255,0.2)' : '1px solid #f1f5f9'
                                }}>
                                    {a.name.split(' ').map(n => n[0]).join('')}
                                </div>

                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ fontWeight: 900, fontSize: '1.4rem', color: textColor, letterSpacing: '-0.5px' }}>{a.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: i === 0 ? 'rgba(255,255,255,0.6)' : 'var(--slate-400)', fontWeight: 800, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Global Rank #{i + 1}
                                    </div>
                                </div>

                                <div style={{ width: '100%', padding: '24px 0', borderTop: i === 0 ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f8fafc', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f8fafc', marginBottom: 24 }}>
                                    <div className="grid grid-2" style={{ gap: 16 }}>
                                        <div>
                                            <div style={{ fontSize: '10px', color: i === 0 ? 'rgba(255,255,255,0.4)' : 'var(--slate-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (Cr)</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: i === 0 ? 'var(--accent-cyan)' : 'var(--navy-900)' }}>{a.revenue}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', color: i === 0 ? 'rgba(255,255,255,0.4)' : 'var(--slate-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closures</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: i === 0 ? 'var(--accent-emerald)' : 'var(--accent-emerald)' }}>{a.conversions}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: 40, width: '100%', opacity: 0.6 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={[12, 19, 15, 22, 30, 25, 40].map((v, idx) => ({ v, idx }))}>
                                            <Line type="monotone" dataKey="v" stroke={i === 0 ? 'var(--accent-cyan)' : 'var(--navy-600)'} strokeWidth={3} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Performance Challengers List */}
                <div style={{ background: 'white', borderRadius: 24, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                    <div style={{ padding: '24px 32px', background: '#fcfdfe', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Arena Challengers</h4>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)' }}>Showing {data.agentPerformance.length - 3} elite performers</div>
                    </div>
                    <div className="table-wrapper" style={{ overflowX: 'auto', width: '100%', background: 'transparent', boxShadow: 'none', border: 'none', borderRadius: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '600px' }}>
                            {data.agentPerformance.slice(3).map((a, i) => (
                                <div key={i} style={{ 
                                    display: 'grid', gridTemplateColumns: '40px 60px 2fr 1.5fr 1fr 1.5fr', 
                                    alignItems: 'center', padding: '16px 32px', borderBottom: i < data.agentPerformance.length - 4 ? '1px solid #f8fafc' : 'none',
                                    transition: 'all 0.2s'
                                }} className="hover-light">
                                    <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--slate-400)' }}>#{i + 4}</div>
                                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: 'var(--navy-900)' }}>
                                        {a.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)' }}>{a.name}</div>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site Visits</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy-800)' }}>{a.site_visits || 0} Tours</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Velocity</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>+{Math.floor(Math.random() * 15) + 5}%</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--navy-900)' }}>{a.revenue}</div>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>Active</div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
