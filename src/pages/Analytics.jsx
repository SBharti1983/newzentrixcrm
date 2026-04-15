import { useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { analyticsApi } from '../api/client';
import { TrendingUp, Users, Home, Phone, Sparkles, MessageSquare, MapPin, Zap, AlertCircle, ArrowUpRight } from 'lucide-react';
import { leadsApi } from '../api/client';
import { useCallback, useMemo } from 'react';

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
    
    // Fetch top leads for priority queue
    const { data: leadsRes, loading: leadsLoading } = useApi(
        useCallback(() => leadsApi.list({ limit: 100, sort: 'created_at', order: 'desc' }), []),
        []
    );

    const calculateLeadScore = useCallback((lead) => {
        let score = 0;
        
        const called = lead.stage !== 'New Lead' || lead.last_contact_at != null;
        const siteVisit = ['Site Visit Done', 'Proposal Shared', 'Negotiation', 'Won'].includes(lead.stage);
        const whatsappReply = !!lead.last_contact_at; // Proxy
        const budgetMatch = !!lead.budget;
        const highBudget = lead.budget && lead.budget.includes('Cr');
        const isRecent = new Date() - new Date(lead.created_at) < 7 * 24 * 60 * 60 * 1000;
        const inactiveDays = lead.last_contact_at ? (new Date() - new Date(lead.last_contact_at)) / (1000 * 60 * 60 * 24) : 10;
        const multipleVisits = ['Negotiation', 'Won'].includes(lead.stage);

        if (called) score += 10;
        if (siteVisit) score += 25;
        if (whatsappReply) score += 15;
        if (budgetMatch) score += 20;
        if (highBudget) score += 15;
        if (isRecent) score += 10;
        if (inactiveDays > 7) score -= 10;
        if (multipleVisits) score += 20;

        return Math.max(0, Math.min(score, 100));
    }, []);

    const priorityLeads = useMemo(() => {
        if (!leadsRes?.data) return [];
        return leadsRes.data
            .map(l => ({ ...l, calculatedScore: calculateLeadScore(l) }))
            .sort((a, b) => b.calculatedScore - a.calculatedScore)
            .slice(0, 5);
    }, [leadsRes, calculateLeadScore]);

    const leadHealthStats = useMemo(() => {
        if (!leadsRes?.data) return { hot: 0, warm: 0, cold: 0 };
        const stats = { hot: 0, warm: 0, cold: 0 };
        leadsRes.data.forEach(l => {
            const score = calculateLeadScore(l);
            if (score >= 80) stats.hot++;
            else if (score >= 50) stats.warm++;
            else stats.cold++;
        });
        return stats;
    }, [leadsRes, calculateLeadScore]);

    const scoreConversionData = useMemo(() => {
        if (!leadsRes?.data) return [];
        const brackets = [
            { range: '0-40 (Cold)', min: 0, max: 40, count: 0, won: 0 },
            { range: '41-70 (Warm)', min: 41, max: 70, count: 0, won: 0 },
            { range: '71-100 (Hot)', min: 71, max: 100, count: 0, won: 0 }
        ];

        leadsRes.data.forEach(l => {
            const score = calculateLeadScore(l);
            const bracket = brackets.find(b => score >= b.min && score <= b.max);
            if (bracket) {
                bracket.count++;
                if (l.stage === 'Won') bracket.won++;
            }
        });

        return brackets.map(b => ({
            name: b.range,
            rate: b.count ? Math.round((b.won / b.count) * 100) : 0,
            count: b.count
        }));
    }, [leadsRes, calculateLeadScore]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const kpis = [
        { label: 'Group Revenue', value: data.kpis.totalRevenue, change: data.kpis.revenueChange, icon: <TrendingUp size={20} />, color: 'var(--navy-600)', data: data.monthlySales.map(m => m.revenue) },
        { label: 'Booking Volume', value: data.kpis.unitsSold, change: data.kpis.unitsChange, icon: <Home size={20} />, color: 'var(--accent-emerald)', data: data.monthlySales.map(m => m.conversions) },
        { label: 'Talent Pool', value: data.kpis.totalLeads, change: data.kpis.leadsChange, icon: <Users size={20} />, color: 'var(--accent-cyan)', data: data.monthlySales.map(m => m.leads) },
        { label: 'AI Accuracy', value: '94.2%', change: '+12.5%', icon: <Sparkles size={20} />, color: '#fbbf24', data: [88, 91, 89, 93, 94, 94.2] },
        { label: 'Conversion Ratio', value: '19.4%', change: '+2.1%', icon: <Zap size={20} />, color: '#7c3aed', data: [15, 17, 16, 18, 19, 19.4] },
        { label: 'Active Pipeline', value: '185+', change: '+8.4%', icon: <MessageSquare size={20} />, color: '#ec4899', data: [150, 162, 170, 175, 182, 185] },
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
            <div className="grid grid-3 mb-10" style={{ gap: 24 }}>
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

            {/* Predictive Intelligence & Priority Queue */}
            <div className="grid grid-2 mb-10" style={{ gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
                {/* Lead Health Distribution */}
                <div className="glass-panel" style={{ borderRadius: 32, padding: 32, background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-800) 100%)', color: 'white', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={20} color="var(--accent-cyan)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white' }}>Auto-Tagging Logic</h3>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Predictive Lead Health Distribution</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {[
                            { label: '🔥 HOT LEADS', value: leadHealthStats.hot, color: 'var(--accent-rose)', desc: 'Score 80+ · Ready for closure', pct: leadsRes?.data?.length ? Math.round((leadHealthStats.hot / leadsRes.data.length) * 100) : 0 },
                            { label: '☀️ WARM LEADS', value: leadHealthStats.warm, color: 'var(--accent-amber)', desc: 'Score 50+ · Actively engaged', pct: leadsRes?.data?.length ? Math.round((leadHealthStats.warm / leadsRes.data.length) * 100) : 0 },
                            { label: '❄️ COLD LEADS', value: leadHealthStats.cold, color: 'var(--accent-cyan)', desc: 'Score <50 · Nurturing required', pct: leadsRes?.data?.length ? Math.round((leadHealthStats.cold / leadsRes.data.length) * 100) : 0 }
                        ].map((s, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: s.color, letterSpacing: '0.05em' }}>{s.label}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.desc}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{s.value}</div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{s.pct}% OF TOTAL</div>
                                    </div>
                                </div>
                                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${s.pct}%`, height: '100%', background: s.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Priority Call Queue */}
                <div className="glass-card" style={{ borderRadius: 32, padding: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Phone size={20} color="var(--navy-600)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Call Priority Queue</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Sales reps should target these leads next</p>
                            </div>
                        </div>
                        <button className="badge-blue" style={{ border: 'none', cursor: 'pointer', padding: '6px 12px' }}>View Full Queue</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {priorityLeads.map((lead, i) => (
                            <div key={i} className="hover-light" style={{ 
                                padding: '16px 20px', 
                                borderBottom: i < priorityLeads.length - 1 ? '1px solid var(--slate-100)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 16,
                                borderRadius: 16,
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ 
                                    width: 40, height: 40, borderRadius: 12, background: 'var(--navy-900)', color: 'white', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' 
                                }}>
                                    {lead.name?.[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)' }}>{lead.name}</div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <MapPin size={10} /> {lead.stage}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Sparkles size={10} /> {lead.calculatedScore} pts
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button 
                                        className="btn btn-ghost btn-sm btn-icon" 
                                        style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-emerald)10', color: 'var(--accent-emerald)' }}
                                    >
                                        <Phone size={14} />
                                    </button>
                                    <button 
                                        className="btn btn-ghost btn-sm btn-icon" 
                                        style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-cyan)10', color: 'var(--accent-cyan)' }}
                                    >
                                        <MessageSquare size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {priorityLeads.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <AlertCircle size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                                <div>No high-priority leads detected.</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Conversion Intelligence */}
            <div className="grid grid-2 mb-10" style={{ gap: 32 }}>
                <div className="glass-card" style={{ borderRadius: 32, padding: '32px' }}>
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Score vs Conversion Rate</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Realized conversion percentage by predictive score bracket</p>
                    </div>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreConversionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} unit="%" />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomTooltip />} />
                                <Bar dataKey="rate" name="Conversion Rate" fill="var(--accent-emerald)" radius={[10, 10, 0, 0]} barSize={60}>
                                    {scoreConversionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 2 ? 'var(--accent-rose)' : index === 1 ? 'var(--accent-amber)' : 'var(--accent-cyan)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ borderRadius: 32, padding: '32px' }}>
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Lead Velocity Trend</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Daily volume of high-intent leads</p>
                    </div>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.monthlySales}>
                                <defs>
                                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="leads" stroke="var(--accent-cyan)" strokeWidth={3} fill="url(#velocityGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 📈 Predictive Growth Forecast */}
            <div className="glass-panel" style={{ 
                borderRadius: 32, padding: 32, marginBottom: 40,
                background: 'linear-gradient(135deg, rgba(30,58,115,0.05) 0%, rgba(99,102,241,0.05) 100%)',
                border: '1px solid rgba(99,102,241,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--navy-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Growth Projections (Next Quarter)</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Intelligence-driven outcomes based on current lead velocity</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-emerald)', background: 'rgba(16,185,129,0.1)', padding: '4px 12px', borderRadius: 10, display: 'inline-block' }}>
                            CONFIDENCE: {data.forecast?.confidence || '85%'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-3" style={{ marginTop: 32, gap: 24 }}>
                    <div className="glass-card hover-lift" style={{ padding: 24, background: 'white', border: 'none' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Projected GTV</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--navy-900)' }}>{data.forecast?.projectedRevenue}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <ArrowUpRight size={14} /> Expected 25% Growth
                        </div>
                    </div>
                    <div className="glass-card hover-lift" style={{ padding: 24, background: 'white', border: 'none' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Forecasted Closures</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--navy-900)' }}>{data.forecast?.projectedUnits} Units</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <ArrowUpRight size={14} /> +12 New Contracts
                        </div>
                    </div>
                    <div className="glass-card hover-lift" style={{ padding: 24, background: 'white', border: 'none' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>Market Sentiment</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--accent-cyan)' }}>Bullish</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: 4 }}>Based on {data.kpis.totalLeads} active leads</div>
                    </div>
                </div>
            </div>

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
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>+{(i * 3 + 7) % 15 + 5}%</div>
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
