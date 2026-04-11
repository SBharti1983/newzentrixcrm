import React, { useState, useMemo, useEffect } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip,
    PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { 
    Phone, Calendar, MapPin, CalendarCheck, ChevronDown, 
    Bell, Search, MessageSquare, Flame, TrendingUp, Clock, UserCheck, 
    ChevronRight, Users, LayoutDashboard, Briefcase, 
    CheckSquare, FileBarChart, Megaphone, Settings, HelpCircle, Plus, Smartphone,
    Sparkles, Target, Zap, ArrowUpRight, Award, Headphones
} from 'lucide-react';

const COLORS = {
    blue: '#3b82f6',
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    slate950: '#040d1a',
    slate900: '#0a1628',
    slate800: '#1e293b',
    slate700: '#334155',
    slate600: '#475569',
    slate400: '#94a3b8',
    slate200: '#e2e8f0',
    slate50: '#f8fafc',
    white: '#ffffff',
    border: 'rgba(226, 232, 240, 0.6)',
    glass: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(15, 23, 42, 0.8)'
};

const YEARLY_TREND = [
  { name: 'Jan', leads: 40, calls: 55, follow: 20, visits: 10 },
  { name: 'Feb', leads: 45, calls: 60, follow: 25, visits: 15 },
  { name: 'Mar', leads: 55, calls: 75, follow: 30, visits: 22 },
  { name: 'Apr', leads: 50, calls: 65, follow: 28, visits: 18 },
  { name: 'May', leads: 62, calls: 80, follow: 35, visits: 28 },
  { name: 'Jun', leads: 58, calls: 72, follow: 32, visits: 24 },
  { name: 'Jul', leads: 65, calls: 85, follow: 38, visits: 30 },
  { name: 'Aug', leads: 70, calls: 95, follow: 42, visits: 35 },
  { name: 'Sep', leads: 75, calls: 100, follow: 48, visits: 40 },
  { name: 'Oct', leads: 82, calls: 110, follow: 55, visits: 45 },
  { name: 'Nov', leads: 88, calls: 120, follow: 60, visits: 50 },
  { name: 'Dec', leads: 95, calls: 130, follow: 68, visits: 58 },
];

const MONTHLY_TREND = [
  { name: 'May 1', leads: 20, calls: 30, follow: 10, visits: 5 },
  { name: 'May 6', leads: 35, calls: 45, follow: 15, visits: 10 },
  { name: 'May 12', leads: 50, calls: 65, follow: 25, visits: 20 },
  { name: 'May 18', leads: 40, calls: 50, follow: 18, visits: 15 },
  { name: 'May 24', leads: 62, calls: 80, follow: 35, visits: 28 },
  { name: 'May 27', leads: 42, calls: 58, follow: 33, visits: 24 },
  { name: 'May 30', leads: 70, calls: 90, follow: 45, visits: 35 },
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.dashboard-container {
    font-family: 'Plus Jakarta Sans', sans-serif;
    perspective: 1000px;
}

.premium-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 24px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.4);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.premium-card:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 0 20px 40px rgba(0,0,0,0.06);
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.8);
}

.stat-glow {
    position: relative;
}

.stat-glow::after {
    content: '';
    position: absolute;
    inset: -20px;
    background: radial-gradient(circle, var(--glow-color, rgba(59, 130, 246, 0.1)) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
    z-index: -1;
}

.premium-card:hover .stat-glow::after {
    opacity: 1;
}

.btn-premium {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: white;
    border: none;
    border-radius: 14px;
    padding: 10px 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.2);
}

.btn-premium:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.3);
    filter: brightness(1.1);
}

.btn-accent {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
}

.btn-accent:hover {
    box-shadow: 0 12px 24px rgba(99, 102, 241, 0.4);
}

.shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    background-size: 200% 100%;
    animation: shimmer-anim 2s infinite linear;
}

@keyframes shimmer-anim {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.float-anim {
    animation: float 6s ease-in-out infinite;
}

.timeline-line {
    position: relative;
}

.timeline-line::before {
    content: '';
    position: absolute;
    left: 17px;
    top: 36px;
    bottom: -12px;
    width: 2px;
    background: linear-gradient(to bottom, #e2e8f0 0%, transparent 100%);
}
`;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ 
                background: COLORS.glassDark, backdropFilter: 'blur(16px)', 
                padding: '16px', borderRadius: '18px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)', minWidth: '180px'
            }}>
                <p style={{ margin: '0 0 12px', fontWeight: 900, fontSize: '0.9rem', color: '#fff', letterSpacing: '-0.3px' }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{entry.name}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const KPI = ({ title, value, perc, isUp, icon: Icon, color, sparkData, sparkColor, dark, onClick }) => (
    <div 
        onClick={onClick}
        className="premium-card"
        style={{ 
            padding: '20px', 
            display: 'flex', flexDirection: 'column', gap: '8px',
            cursor: onClick ? 'pointer' : 'default',
            '--glow-color': `${color}15`
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ 
                width: 44, height: 44, borderRadius: 14, 
                background: `${color}10`, color: color, 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
                {Icon && <Icon size={22} strokeWidth={2.5} />}
            </div>
            {sparkData && (
                <div style={{ width: 60, height: 30 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                            <Area type="monotone" dataKey="v" stroke={sparkColor} fill={sparkColor} fillOpacity={0.15} strokeWidth={2} dot={false} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
        
        <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 750, color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: dark ? '#fff' : COLORS.slate950, letterSpacing: '-1px' }}>{value}</div>
                {perc && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isUp ? COLORS.emerald : COLORS.rose, background: isUp ? `${COLORS.emerald}10` : `${COLORS.rose}10`, padding: '2px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isUp ? '↑' : '↓'} {perc}
                    </div>
                )}
            </div>
        </div>
    </div>
);

const TimelineItem = ({ time, title, sub, badge, badgeColor, badgeBg, img, icon: Icon, isLast, isAi, status }) => (
    <div className={`timeline-line ${isLast ? '' : 'timeline-line'}`} style={{ display: 'flex', gap: '16px', padding: '16px 0', cursor: 'pointer' }}>
        <div style={{ width: '40px', flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 850, color: COLORS.slate950 }}>{time}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: COLORS.slate400 }}>AM</div>
        </div>
        
        <div style={{ 
            width: 36, height: 36, borderRadius: '12px', 
            background: isAi ? 'linear-gradient(135deg, #8b5cf6, #d946ef)' : COLORS.white, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, 
            boxShadow: isAi ? '0 8px 16px rgba(139, 92, 246, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
            border: isAi ? 'none' : `1.5px solid ${COLORS.border}`,
            zIndex: 1
        }}>
            {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /> : (isAi ? <Sparkles size={16} color="#fff" /> : <Icon size={16} color={COLORS.blue} />)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.slate500, fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                </div>
                <div style={{ 
                    fontSize: '0.65rem', fontWeight: 850, color: badgeColor, background: badgeBg, 
                    padding: '4px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' 
                }}>
                    {badge}
                </div>
            </div>
            {isAi && (
                <div style={{ 
                    marginTop: '8px', padding: '10px 14px', borderRadius: '14px', 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(217, 70, 239, 0.05))',
                    border: '1.5px dashed rgba(139, 92, 246, 0.2)',
                    fontSize: '0.75rem', color: COLORS.violet, fontWeight: 700
                }}>
                    <Zap size={12} style={{ marginRight: '6px', display: 'inline' }} />
                    AI suggests sharing the "Premium Sky Villas" brochure before the call.
                </div>
            )}
        </div>
    </div>
);

export default function AgentDashboardView({ user, data = {}, recentLeads = [], loading }) {
    const navigate = useNavigate();
    const [trendPeriod, setTrendPeriod] = useState('Month');
    const [performancePeriod, setPerformancePeriod] = useState('May 2026');
    const [showPerfDropdown, setShowPerfDropdown] = useState(false);
    
    const stats = data || {};
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const stages = stats.stages || [];
    const followups = stats.upcoming_followups || [];
    
    const stageCounts = useMemo(() => stages.reduce((acc, s) => ({ ...acc, [s.stage]: parseInt(s.count) || 0 }), {}), [stages]);
    
    const formatCurrency = (val) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString()}`;
    };

    const sparkLines = useMemo(() => [
        [{v: 20}, {v: 25}, {v: 22}, {v: 30}, {v: 28}, {v: 45}, {v: 58}],
        [{v: 40}, {v: 45}, {v: 55}, {v: 50}, {v: 60}, {v: 65}, {v: 72}],
        [{v: 15}, {v: 18}, {v: 20}, {v: 25}, {v: 22}, {v: 28}, {v: 33}],
        [{v: 10}, {v: 12}, {v: 15}, {v: 14}, {v: 18}, {v: 20}, {v: 24}],
    ], []);

    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);

    return (
        <div className="dashboard-container" style={{ 
            height: '100%', display: 'flex', flexDirection: 'column', 
            gap: '24px', padding: '24px 32px', background: '#f8fafc', overflowY: 'auto'
        }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="animate-fadeIn">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.indigo, background: `${COLORS.indigo}10`, padding: '4px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={14} /> Elite Agent Status
                        </span>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: COLORS.slate950, letterSpacing: '-1.5px' }}>
                        Welcome home, {user?.name.split(' ')[0] || 'Partner'}! ✨
                    </h1>
                    <p style={{ color: COLORS.slate500, fontWeight: 600, fontSize: '0.95rem' }}>
                        You have <span style={{ color: COLORS.slate950 }}>{followups.length} priority calls</span> and <span style={{ color: COLORS.slate950 }}>2 site visits</span> scheduled for today.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="btn-premium" style={{ background: '#fff', color: COLORS.slate950, border: `1px solid ${COLORS.border}` }}>
                        <Calendar size={18} /> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <button className="btn-premium btn-accent" onClick={() => navigate('/leads')}>
                        <Plus size={18} strokeWidth={3} /> New Lead
                    </button>
                </div>
            </div>

            {/* 🔥 WTI Telemetry Banner 🔥 */}
            <div className="float-anim" style={{ 
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                borderRadius: '32px', padding: '32px', color: 'white', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
                position: 'relative', overflow: 'hidden'
            }}>
                <div className="shimmer" style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                        width: 64, height: 64, borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.05)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                    }}>
                        <Headphones size={32} color="#60a5fa" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Telephony Command</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '2px', letterSpacing: '-0.5px' }}>WTI Bridge Active</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '48px', position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 950, color: '#60a5fa' }}>{stats.telephony_stats?.calls_today || 12}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Calls Logged</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 950, color: COLORS.emerald }}>{stats.telephony_stats?.synced_recordings || 12}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cloud Synced</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.emerald, fontSize: '0.9rem', fontWeight: 900 }}>
                            <CheckSquare size={16} /> All Logs Clear
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: 700 }}>
                            Sync health is optimal. No pending uploads detected.
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <KPI onClick={() => navigate('/leads')} title="Total Leads" value={leads.active_leads || 42} perc="12.5%" isUp icon={Users} color={COLORS.blue} sparkData={sparkLines[0]} sparkColor={COLORS.blue} />
                <KPI onClick={() => navigate('/pipeline')} title="Pipeline Value" value={formatCurrency(stats.pipeline?.value || 94000000)} perc="₹2Cr" isUp icon={Briefcase} color={COLORS.amber} sparkData={sparkLines[1]} sparkColor={COLORS.amber} />
                <KPI onClick={() => navigate('/followups')} title="Calls Due" value={followups.length || 8} perc="Priority" isUp icon={Phone} color={COLORS.rose} sparkData={sparkLines[2]} sparkColor={COLORS.rose} />
                <KPI onClick={() => navigate('/site-visits')} title="Visits" value={stageCounts['Site Visit Done'] || 4} perc="2 Today" isUp icon={MapPin} color={COLORS.emerald} sparkData={sparkLines[3]} sparkColor={COLORS.emerald} />
            </div>

            {/* Main Charts & Side Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '24px' }}>
                
                {/* 📉 Intelligence Trend */}
                <div className="premium-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: COLORS.slate950, margin: 0, letterSpacing: '-0.5px' }}>Lead Velocity Intelligence</h3>
                            <p style={{ fontSize: '0.85rem', color: COLORS.slate500, margin: '4px 0 0', fontWeight: 600 }}>Real-time conversion and engagement tracking.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['Month', 'Year'].map(p => (
                                <button key={p} onClick={() => setTrendPeriod(p)} style={{ 
                                    padding: '6px 16px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800,
                                    background: trendPeriod === p ? COLORS.slate950 : 'transparent',
                                    color: trendPeriod === p ? '#fff' : COLORS.slate500,
                                    border: trendPeriod === p ? 'none' : `1px solid ${COLORS.border}`,
                                    cursor: 'pointer', transition: 'all 0.3s ease'
                                }}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendPeriod === 'Month' ? MONTHLY_TREND : YEARLY_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="pBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.15}/><stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="pGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.slate400, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.slate400, fontWeight: 700 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" name="New Leads" dataKey="leads" stroke={COLORS.indigo} strokeWidth={3} fill="url(#pBlue)" dot={{ r: 4, fill: COLORS.indigo, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff' }} />
                                <Area type="monotone" name="Conversions" dataKey="visits" stroke={COLORS.emerald} strokeWidth={3} fill="url(#pGreen)" dot={{ r: 4, fill: COLORS.emerald, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 📅 Today's Agenda */}
                <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.slate950, margin: 0, letterSpacing: '-0.5px' }}>Today's Agenda</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.rose, background: `${COLORS.rose}10`, padding: '4px 10px', borderRadius: '10px', display: 'inline-block', marginTop: '6px' }}>
                            {followups.length} Priority Tasks
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                        {followups.length > 0 ? followups.slice(0, 4).map((f, i) => (
                            <TimelineItem 
                                key={f.id}
                                time={new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} 
                                title={f.lead_name || 'Prospect'} 
                                sub={f.type || 'Follow up'}
                                badge={f.priority || 'Normal'}
                                badgeColor={f.priority === 'High' ? COLORS.rose : COLORS.blue}
                                badgeBg={f.priority === 'High' ? `${COLORS.rose}10` : `${COLORS.blue}10`}
                                isAi={f.is_ai_generated}
                                icon={Phone}
                                isLast={i === 3}
                            />
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.slate400 }}>
                                <Calendar size={48} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>No calls for today</div>
                            </div>
                        )}
                    </div>

                    <button className="btn-premium" style={{ width: '100%', justifyContent: 'center', background: COLORS.slate50, color: COLORS.slate900, border: `1.5px solid ${COLORS.border}` }} onClick={() => navigate('/calendar')}>
                        Full Calendar <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Bottom Row - Funnel and Hot Leads */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                
                {/* ⚖️ Funnel Distribution */}
                <div className="premium-card" style={{ padding: '28px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '24px', letterSpacing: '-0.5px' }}>Funnel Dynamics</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { label: 'Active Pipeline', color: COLORS.blue, val: leads.active_leads || 42, perc: 100 },
                            { label: 'Qualified Pool', color: COLORS.emerald, val: stageCounts['Qualified'] || 18, perc: 75 },
                            { label: 'Negotiations', color: COLORS.amber, val: stageCounts['Negotiation'] || 6, perc: 45 },
                            { label: 'Won Deals', color: COLORS.indigo, val: leads.won || 3, perc: 15 },
                        ].map(item => (
                            <div key={item.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 850, color: COLORS.slate950 }}>{item.label}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: item.color }}>{item.val}</span>
                                </div>
                                <div style={{ height: '8px', background: `${item.color}10`, borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${item.perc}%`, background: item.color, borderRadius: '4px' }} className="shimmer" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🔥 Priority Leads Hub */}
                <div className="premium-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.slate950, margin: 0, letterSpacing: '-0.5px' }}>Priority Workspace</h3>
                        <button className="btn-premium" style={{ padding: '6px 14px', fontSize: '0.75rem', background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.slate600 }} onClick={() => navigate('/leads')}>View All Leads</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {recentLeads.slice(0, 4).map((lead, i) => (
                            <div key={lead.id} className="premium-card" style={{ padding: '16px', borderRadius: '18px', background: COLORS.white, position: 'relative', overflow: 'hidden', border: `1px solid ${COLORS.border}` }} onClick={() => navigate(`/leads/${lead.id}`)}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: i % 2 === 0 ? COLORS.indigo : COLORS.emerald }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: COLORS.slate900 }}>
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.emerald, background: `${COLORS.emerald}10`, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase' }}>{lead.stage}</div>
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '4px' }}>{lead.name}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Building2 size={12} /> {lead.project_name || 'General Inquiry'}
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate950 }}>{lead.budget || '₹1.2Cr'}</div>
                                    <ArrowUpRight size={16} color={COLORS.slate300} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const Building2 = ({ size, ...props }) => <Briefcase size={size} {...props} />;
