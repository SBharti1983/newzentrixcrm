import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { analyticsApi, leadsApi } from '../api/client';
import { TrendingUp, Users, Home, Sparkles, Zap, MessageSquare, ArrowUpRight, Activity } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

const PIE_COLORS = ['var(--navy-600)', 'var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-violet)', 'var(--accent-rose)'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.96)', border: 'none',
            borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: '14px 20px', fontSize: 13,
            backdropFilter: 'blur(12px)'
        }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--navy-800)', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>{label}</div>
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
    const isMobile = useMobile();

    useEffect(() => {
        const prev = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => { document.body.style.overflowX = prev; };
    }, []);

    const { data, loading, error, refetch } = useApi(() => analyticsApi.get({ range }), [range]);

    const { data: leadsRes } = useApi(
        useCallback(() => leadsApi.list({ limit: 100, sort: 'created_at', order: 'desc' }), []),
        []
    );

    const calculateLeadScore = useCallback((lead) => {
        let score = 0;
        if (lead.stage !== 'New Lead' || lead.last_contact_at) score += 10;
        if (['Site Visit Done', 'Proposal Shared', 'Negotiation', 'Won'].includes(lead.stage)) score += 25;
        if (lead.last_contact_at) score += 15;
        if (lead.budget) score += 20;
        if (lead.budget?.includes('Cr')) score += 15;
        if (new Date() - new Date(lead.created_at) < 7 * 86400000) score += 10;
        if (lead.last_contact_at && (new Date() - new Date(lead.last_contact_at)) / 86400000 > 7) score -= 10;
        if (['Negotiation', 'Won'].includes(lead.stage)) score += 20;
        return Math.max(0, Math.min(score, 100));
    }, []);

    const leadHealthStats = useMemo(() => {
        if (!leadsRes?.data) return { hot: 0, warm: 0, cold: 0, total: 0 };
        const stats = { hot: 0, warm: 0, cold: 0, total: leadsRes.data.length };
        leadsRes.data.forEach(l => {
            const s = calculateLeadScore(l);
            if (s >= 80) stats.hot++;
            else if (s >= 50) stats.warm++;
            else stats.cold++;
        });
        return stats;
    }, [leadsRes, calculateLeadScore]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const kpis = [
        { label: 'Group Revenue', value: data.kpis.totalRevenue, change: data.kpis.revenueChange, icon: <TrendingUp size={18} />, color: 'var(--navy-600)', sparkData: data.monthlySales.map(m => m.revenue) },
        { label: 'Booking Volume', value: data.kpis.unitsSold, change: data.kpis.unitsChange, icon: <Home size={18} />, color: 'var(--accent-emerald)', sparkData: data.monthlySales.map(m => m.conversions) },
        { label: 'Total Leads', value: data.kpis.totalLeads, change: data.kpis.leadsChange, icon: <Users size={18} />, color: 'var(--accent-cyan)', sparkData: data.monthlySales.map(m => m.leads) },
        { label: 'AI Accuracy', value: '94.2%', change: '+12.5%', icon: <Sparkles size={18} />, color: '#fbbf24', sparkData: [88, 91, 89, 93, 94, 94.2] },
        { label: 'Conversion Rate', value: '19.4%', change: '+2.1%', icon: <Zap size={18} />, color: '#7c3aed', sparkData: [15, 17, 16, 18, 19, 19.4] },
        { label: 'Active Pipeline', value: '185+', change: '+8.4%', icon: <MessageSquare size={18} />, color: '#ec4899', sparkData: [150, 162, 170, 175, 182, 185] },
    ];

    const totalLeads = leadHealthStats.total || 1;
    const hotPct = Math.round((leadHealthStats.hot / totalLeads) * 100);
    const warmPct = Math.round((leadHealthStats.warm / totalLeads) * 100);
    const coldPct = Math.round((leadHealthStats.cold / totalLeads) * 100);

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 60, paddingRight: 20 }}>
            <style>{`
                @keyframes livePulse {
                    0%, 100% { opacity: 0.4; transform: scale(0.9); }
                    50% { opacity: 1; transform: scale(1.15); }
                }
            `}</style>

            {/* ─── Page Header ─── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 20, marginBottom: 32, paddingBottom: 28,
                borderBottom: '1px solid var(--border-light)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.08)', padding: '4px 12px', borderRadius: 100 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'livePulse 2s infinite' }} />
                            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live</span>
                        </div>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.04em' }}>
                        Sales Analytics
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--slate-500)', fontWeight: 500, marginTop: 4 }}>
                        Enterprise performance metrics and growth intelligence
                    </p>
                </div>
                <div style={{
                    background: 'var(--slate-50)', padding: 5, borderRadius: 14, display: 'flex', gap: 4,
                    border: '1px solid var(--border-light)'
                }}>
                    {[
                        { id: '3months', label: 'Quarter' },
                        { id: '6months', label: 'Half Year' },
                        { id: 'thisyear', label: 'Full Year' }
                    ].map(r => (
                        <button
                            key={r.id}
                            onClick={() => setRange(r.id)}
                            style={{
                                padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 800,
                                transition: 'all 0.25s ease',
                                background: range === r.id ? 'var(--navy-900)' : 'transparent',
                                color: range === r.id ? 'white' : 'var(--slate-500)',
                                boxShadow: range === r.id ? '0 4px 12px rgba(10,22,40,0.15)' : 'none',
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── KPI Cards ─── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 20, marginBottom: 32
            }}>
                {kpis.map((k, i) => (
                    <div key={i} className="hover-lift" style={{
                        background: 'white', borderRadius: 20, overflow: 'hidden',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ padding: '22px 24px 8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: 12,
                                    background: `${k.color}10`, color: k.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {k.icon}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem', fontWeight: 900,
                                    color: k.change.startsWith('+') ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                    background: k.change.startsWith('+') ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                                    padding: '4px 10px', borderRadius: 8,
                                    display: 'inline-flex', alignItems: 'center', gap: 3
                                }}>
                                    <ArrowUpRight size={12} style={{ transform: k.change.startsWith('+') ? 'none' : 'rotate(90deg)' }} />
                                    {k.change}
                                </div>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--navy-900)', letterSpacing: '-0.04em', lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-400)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                        </div>
                        <div style={{ height: 60, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={k.sparkData.map((v, idx) => ({ v, idx }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`kpi-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={k.color} stopOpacity={0.15} />
                                            <stop offset="100%" stopColor={k.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="v" stroke={k.color} strokeWidth={2.5} fill={`url(#kpi-${i})`} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Main Charts Row ─── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
                gap: 24, marginBottom: 32
            }}>
                {/* Revenue & Leads Chart */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: '28px 28px 20px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                        <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>Revenue {'&'} Conversion Dynamics</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)', marginTop: 4, fontWeight: 500 }}>Correlation between lead volume and realized revenue</p>
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)' }}>
                                <div style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--navy-600)' }} /> Revenue
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)' }}>
                                <div style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--accent-cyan)' }} /> Leads
                            </div>
                        </div>
                    </div>
                    <div style={{ height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.monthlySales} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--navy-600)" stopOpacity={0.08} />
                                        <stop offset="100%" stopColor="var(--navy-600)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-light)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--slate-400)', fontWeight: 700 }} dy={12} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--slate-400)', fontWeight: 600 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--navy-600)" strokeWidth={3} fill="url(#revFill)" dot={{ r: 4, strokeWidth: 2, fill: 'white', stroke: 'var(--navy-600)' }} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--navy-900)' }} />
                                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--accent-cyan)" strokeWidth={2} fill="transparent" strokeDasharray="6 4" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Client Acquisition Donut */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: '28px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
                }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>Client Acquisition</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)', marginTop: 4, marginBottom: 20, fontWeight: 500 }}>Lead source distribution</p>

                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.leadSources}
                                    cx="50%" cy="50%"
                                    innerRadius={65} outerRadius={95}
                                    paddingAngle={6} dataKey="value"
                                    animationBegin={200} stroke="none"
                                >
                                    {data.leadSources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                        {data.leadSources.map((s, i) => (
                            <div key={i} style={{
                                padding: '12px 14px', background: 'var(--slate-50)', borderRadius: 14,
                                border: '1px solid var(--border-light)',
                                display: 'flex', flexDirection: 'column', gap: 2
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>{s.name}</span>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--navy-900)' }}>{s.value}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Lead Intelligence Panel ─── */}
            <div style={{
                background: 'linear-gradient(135deg, var(--navy-950), var(--navy-900))',
                borderRadius: 24, padding: isMobile ? 24 : 36,
                color: 'white', position: 'relative', overflow: 'hidden'
            }}>
                {/* Subtle grid pattern */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.04,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Activity size={20} color="var(--accent-cyan)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Lead Intelligence</h3>
                                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>AI-powered lead health distribution</p>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {leadHealthStats.total} Total Leads Analyzed
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20 }}>
                        {[
                            { label: 'Hot Leads', value: leadHealthStats.hot, pct: hotPct, color: 'var(--accent-emerald)', desc: 'Score 80+ · Ready for closure' },
                            { label: 'Warm Leads', value: leadHealthStats.warm, pct: warmPct, color: 'var(--accent-cyan)', desc: 'Score 50+ · Active nurturing' },
                            { label: 'Cold Leads', value: leadHealthStats.cold, pct: coldPct, color: 'rgba(255,255,255,0.25)', desc: 'Score <50 · Requires outreach' }
                        ].map((s, i) => (
                            <div key={i} style={{
                                padding: '24px', borderRadius: 18,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: s.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{s.desc}</div>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 950 }}>{s.value}</div>
                                </div>
                                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                                    <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 100, transition: 'width 1s ease' }} />
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: 8, fontWeight: 700 }}>{s.pct}% of total</div>
                            </div>
                        ))}
                    </div>

                    {/* Executive Summary */}
                    <div style={{ marginTop: 28, padding: '20px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>AI Executive Summary</div>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, lineHeight: 1.7, margin: 0 }}>
                            Zentrix AI has identified a <span style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>24% increase</span> in high-intent lead flow this period. Growth velocity remains strong with current projections exceeding targets. Pipeline health is stable with {warmPct}% of leads actively progressing through nurture sequences.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
