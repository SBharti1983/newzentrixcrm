import React, { useState, useMemo } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip,
    PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { 
    Phone, Calendar, MapPin, CalendarCheck, ChevronDown, 
    Bell, Search, MessageSquare, Flame, TrendingUp, Clock, UserCheck, 
    ChevronRight, Users, LayoutDashboard, Briefcase, 
    CheckSquare, FileBarChart, Megaphone, Settings, HelpCircle, Plus
} from 'lucide-react';

// --- DEMO DATA ---
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

const CONVERSION_DATA = [
    { name: 'Done', value: 10.3 },
    { name: 'Pending', value: 89.7 }
];

const COLORS = {
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
    cyan: '#06b6d4',
    slate950: '#0f172a',
    slate900: '#1e293b',
    slate700: '#334155',
    slate600: '#475569',
    slate400: '#94a3b8',
    slate50: '#f8fafc',
    border: '#f1f5f9'
};

// --- SUB-COMPONENTS ---

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ 
                background: '#fff', padding: '16px', borderRadius: '14px', 
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                border: '1px solid #f1f5f9', minWidth: '150px'
            }}>
                <p style={{ margin: '0 0 10px', fontWeight: 900, fontSize: '0.85rem', color: COLORS.slate950 }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                            <span style={{ fontSize: '0.75rem', color: COLORS.slate700, fontWeight: 700 }}>{entry.name}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate950 }}>{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const KPI = ({ title, value, perc, isUp, icon: Icon, color, sparkData, sparkColor, target, curr, dark, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            background: dark ? COLORS.slate900 : '#fff', 
            borderRadius: '12px', padding: '14px', 
            border: dark ? 'none' : `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', gap: '4px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        className={onClick ? 'hover-lift' : ''}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: dark ? '#cbd5e1' : COLORS.slate600 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icon && <Icon size={14} />}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{title}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: dark ? '#fff' : COLORS.slate950 }}>{value}</div>
                {!target && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isUp ? COLORS.green : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                            {isUp ? <TrendingUp size={10} /> : '↓'} {perc}
                        </div>
                    </div>
                )}
            </div>
            {!target && sparkData && (
                <div style={{ width: 50, height: 25 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                            <Area type="monotone" dataKey="v" stroke={sparkColor} fill={sparkColor} fillOpacity={0.1} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
            {target && (
                <div style={{ flex: 1, marginLeft: '16px', marginBottom: '4px' }}>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '60%', height: '100%', background: COLORS.blue, borderRadius: '3px' }} />
                    </div>
                </div>
            )}
        </div>
    </div>
);

const PriorityItem = ({ icon: Icon, color, bg, label, count, onClick, isLast }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '12px 0', 
            cursor: 'pointer',
            borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`
        }}
        className="hover-lift"
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: COLORS.slate700 }}>{label}</span>
        </div>
        <div style={{ 
            minWidth: 28, height: 22, background: '#fff1f2', color: '#e11d48', 
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '0.8rem', fontWeight: 800, padding: '0 8px'
        }}>
            {count}
        </div>
    </div>
);

const TimelineItem = ({ time, timeIcon: TimeIcon, title, sub, badge, badgeColor, badgeBg, img, icon: Icon, isLast, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', 
            borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
            cursor: 'pointer'
        }}
        className="hover-lift"
    >
        <div style={{ width: '64px', flexShrink: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950 }}>{time}</div>
            {TimeIcon && <TimeIcon size={12} style={{ color: COLORS.slate400, marginTop: '2px' }} />}
        </div>
        
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon size={14} color={COLORS.blue} />}
        </div>

        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>{title}</div>
            <div style={{ fontSize: '0.7rem', color: COLORS.slate600, marginTop: '2px' }}>{sub}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
                fontSize: '0.65rem', fontWeight: 800, color: badgeColor, background: badgeBg, 
                padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                {title.toLowerCase().includes('call') && <Flame size={10} />} {badge}
            </span>
            <ChevronRight size={14} color={COLORS.slate400} />
        </div>
    </div>
);

const ProjectChip = ({ title, leads, img }) => (
    <div style={{ flex: 1 }}>
        <div style={{ width: '100%', height: '85px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
            <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.slate950 }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: COLORS.slate500, fontWeight: 700 }}>{leads}</div>
    </div>
);

const LeadListItem = ({ name, type, time, info, details, img, isAvatar, onClick, isLast }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', gap: '14px', padding: '14px 0', 
            borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
            cursor: 'pointer'
        }}
        className="hover-lift"
    >
        <div style={{ width: 70, height: 70, borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
            <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {type === 'Hot' && <Flame size={14} color="#f97316" />} {name}
                </div>
                <div style={{ 
                    fontSize: '0.65rem', fontWeight: 800, 
                    color: type === 'Hot' ? '#f97316' : type === 'Warm' ? '#d97706' : COLORS.blue,
                    background: type === 'Hot' ? '#fff7ed' : type === 'Warm' ? '#fef3c7' : '#eff6ff',
                    padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: type === 'Hot' ? '#f97316' : type === 'Warm' ? '#fbbf24' : COLORS.blue }} />
                    {type}
                </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.slate500, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <Clock size={12} /> {time} • {info}
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.slate800, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} style={{ color: COLORS.slate400 }} /> {details || '3 BHK • ₹1.25 Cr • Elan Epic'}
            </div>
        </div>
    </div>
);

// --- MAIN DASHBOARD VIEW ---
export default function AgentDashboardView({ user, data = {}, recentLeads = [], loading }) {
    const navigate = useNavigate();
    const [trendPeriod, setTrendPeriod] = useState('Month');
    const [performancePeriod, setPerformancePeriod] = useState('This Month');
    const [showPerfDropdown, setShowPerfDropdown] = useState(false);
    
    // --- DATA MAPPING ---
    const stats = useMemo(() => {
        if (performancePeriod === 'This Month') return data;
        // Mock data for different months
        const monthMap = {
            'Jan': { totalLeads: 120, callsMade: 850, followups: 45, siteVisits: 12, won: 5, revenue: 12500000 },
            'Feb': { totalLeads: 145, callsMade: 920, followups: 52, siteVisits: 18, won: 8, revenue: 18500000 },
            'Mar': { totalLeads: 180, callsMade: 1100, followups: 70, siteVisits: 25, won: 12, revenue: 28000000 },
            'Apr': { totalLeads: 160, callsMade: 980, followups: 62, siteVisits: 20, won: 10, revenue: 22000000 },
            'This Year': { totalLeads: 850, callsMade: 5600, followups: 450, siteVisits: 120, won: 65, revenue: 145000000 }
        };
        const mData = monthMap[performancePeriod] || data;
        return {
            leads: { active_leads: mData.totalLeads, calls: mData.callsMade },
            bookings: { total: mData.won, total_value: mData.revenue },
            upcoming_followups: Array(mData.followups || 0).fill({}),
            stages: [{ stage: 'Site Visit Done', count: mData.siteVisits }]
        };
    }, [performancePeriod, data]);
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const stages = stats.stages || [];
    const followups = stats.upcoming_followups || [];
    
    const stageCounts = stages.reduce((acc, s) => ({ ...acc, [s.stage]: parseInt(s.count) || 0 }), {});
    
    const kpiData = {
        totalLeads: leads.active_leads || 0,
        callsMade: leads.calls || 0,
        followups: followups.length || 0,
        siteVisits: stageCounts['Site Visit Done'] || 0,
        won: bookings.total || 0,
        revenue: bookings.total_value || 0
    };

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
        [{v: 6}, {v: 7}, {v: 6.5}, {v: 8}, {v: 7.5}, {v: 9}, {v: 9.5}],
    ], []);

    return (
        <div style={{ 
            height: '100%', display: 'flex', flexDirection: 'column', 
            gap: '16px', padding: '16px 20px', fontFamily: '"Inter", sans-serif',
            background: '#f8fafc', overflowY: 'auto'
        }}>
            {/* Upper Header Segment */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: COLORS.slate950, marginTop: '4px', letterSpacing: '-0.02em' }}>
                        Good afternoon, {user?.name || 'Agent'} 👋
                    </h1>
                </div>

                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 750, color: COLORS.slate600 }}>Performance for</span>
                        <div 
                            onClick={() => setShowPerfDropdown(!showPerfDropdown)}
                            style={{ 
                                background: '#fff', padding: '8px 16px', borderRadius: '12px', 
                                border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', 
                                gap: '8px', cursor: 'pointer', minWidth: '140px', justifyContent: 'space-between',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        >
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950 }}>{performancePeriod}</span>
                            <ChevronDown size={14} color={COLORS.slate400} />
                        </div>

                        {/* Add Lead Split Button */}
                        <div 
                            onClick={() => navigate('/leads')}
                            style={{ 
                                display: 'flex', alignItems: 'stretch', height: '36px', 
                                borderRadius: '12px', overflow: 'hidden', 
                                boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(92%)'; }}
                            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                        >
                            <div style={{ 
                                background: COLORS.blue, padding: '0 16px', display: 'flex', 
                                alignItems: 'center', gap: '8px', color: '#fff',
                                fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s'
                            }}>
                                <Plus size={16} strokeWidth={3} />
                                Add Lead
                            </div>
                            <div style={{ 
                                background: COLORS.blue, width: '32px', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', color: '#fff',
                                borderLeft: '1px solid rgba(255,255,255,0.2)',
                                transition: 'all 0.2s'
                            }}>
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    {showPerfDropdown && (
                        <div style={{ 
                            position: 'absolute', top: '100%', right: 0, marginTop: '8px', 
                            background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.border}`,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, width: '180px',
                            maxHeight: '300px', overflowY: 'auto'
                        }}>
                            {['This Month', 'This Year', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(p => (
                                <div 
                                    key={p} 
                                    onClick={() => { setPerformancePeriod(p); setShowPerfDropdown(false); }}
                                    style={{ 
                                        padding: '10px 16px', fontSize: '0.8rem', fontWeight: 700, 
                                        color: performancePeriod === p ? COLORS.blue : COLORS.slate700,
                                        cursor: 'pointer', transition: 'background 0.2s',
                                        background: performancePeriod === p ? '#eff6ff' : 'transparent',
                                        borderBottom: `1px solid ${COLORS.border}`
                                    }}
                                    className="hover-bg-slate"
                                >
                                    {p}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                <KPI onClick={() => navigate('/leads')} title="Total Leads" value={kpiData.totalLeads} perc="77%" isUp icon={Users} color={COLORS.blue} sparkData={sparkLines[0]} sparkColor={COLORS.blue} />
                <KPI onClick={() => navigate('/call-records')} title="Calls Made" value={kpiData.callsMade || 72} perc="12%" isUp icon={Phone} color={COLORS.green} sparkData={sparkLines[1]} sparkColor={COLORS.green} />
                <KPI onClick={() => navigate('/followups')} title="Follow-ups" value={kpiData.followups} perc="18%" isUp icon={Calendar} color="#8b5cf6" sparkData={sparkLines[2]} sparkColor="#8b5cf6" />
                <KPI onClick={() => navigate('/site-visits')} title="Site Visits" value={kpiData.siteVisits} perc="20%" isUp icon={MapPin} color={COLORS.cyan} sparkData={sparkLines[3]} sparkColor={COLORS.cyan} />
                <KPI onClick={() => navigate('/bookings')} title="Bookings" value={`${kpiData.won} / 10`} target={10} curr={kpiData.won} icon={CalendarCheck} color={COLORS.blue} />
                <KPI onClick={() => navigate('/analytics')} dark title="Revenue" value={formatCurrency(kpiData.revenue)} perc="10%" isUp sparkData={sparkLines[4]} sparkColor={COLORS.blue} />
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                
                {/* Activity Trend */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Lead Activity Trend</h3>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                {[
                                    { l: 'Leads', c: COLORS.blue },
                                    { l: 'Calls', c: COLORS.green },
                                    { l: 'Follow-ups', c: COLORS.orange },
                                    { l: 'Site Visits', c: COLORS.cyan }
                                ].map(item => (
                                    <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.c }} />
                                        {item.l}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div 
                                onClick={() => setTrendPeriod(trendPeriod === 'Month' ? 'Year' : 'Month')}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '4px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.75rem', fontWeight: 750, color: COLORS.slate950, cursor: 'pointer' }}
                            >
                                This {trendPeriod} <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '220px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendPeriod === 'Month' ? MONTHLY_TREND : YEARLY_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.green} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.orange} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.orange} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" name="Leads" dataKey="leads" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#colorBlue)" dot={{ r: 4, fill: COLORS.blue, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Calls" dataKey="calls" stroke={COLORS.green} strokeWidth={2.5} fill="url(#colorGreen)" dot={{ r: 4, fill: COLORS.green, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Follow-ups" dataKey="follow" stroke={COLORS.orange} strokeWidth={2.5} fill="url(#colorOrange)" dot={{ r: 4, fill: COLORS.orange, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Site Visits" dataKey="visits" stroke={COLORS.cyan} strokeWidth={2.5} fill="url(#colorCyan)" dot={{ r: 4, fill: COLORS.cyan, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, display: 'flex', gap: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ flex: 2 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '16px', whiteSpace: 'nowrap' }}>Conversion Funnel</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {[
                                { label: 'Leads', val: '85%', color: COLORS.blue, growth: '8%' },
                                { label: 'Calls', val: '65%', color: COLORS.green, growth: '12%' },
                                { label: 'Follow-ups', val: '45%', color: COLORS.green, growth: '18%' },
                                { label: 'Site Visits', val: '35%', color: COLORS.green, growth: '20%' },
                                { label: 'Bookings', val: '20%', color: COLORS.blue, growth: '10%', count: kpiData.won }
                            ].map(item => (
                                <div key={item.label}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950, marginBottom: '6px' }}>{item.label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ flex: 1, height: '8px', background: COLORS.slate50, borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: item.val, background: item.color, borderRadius: '4px' }} />
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.label === 'Bookings' ? COLORS.slate600 : COLORS.green, whiteSpace: 'nowrap' }}>
                                            {item.label === 'Bookings' ? `${item.count} ${item.growth}` : `↑ ${item.growth}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: '130px', height: '130px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[{ value: 10.3 }, { value: 89.7 }]}
                                        cx="50%" cy="50%"
                                        innerRadius={50}
                                        outerRadius={65}
                                        startAngle={90}
                                        endAngle={450}
                                        paddingAngle={0}
                                        dataKey="value"
                                    >
                                        <Cell fill={COLORS.blue} />
                                        <Cell fill="#eff6ff" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ position: 'absolute', textAlign: 'center', top: '50%', transform: 'translateY(-50%)' }}>
                            <div style={{ fontSize: '0.65rem', color: COLORS.slate500, fontWeight: 750 }}>Conversion Rate</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: COLORS.slate950, margin: '2px 0' }}>10.3%</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.green }}>↑ 1.2%</div>
                        </div>
                    </div>
                </div>

                {/* Today's Priorities */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Today's Priorities</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f97316', background: '#fff7ed', padding: '4px 10px', borderRadius: '14px' }}>5 Pending</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <PriorityItem onClick={() => navigate('/followups')} icon={Calendar} label="Follow-ups Due" count={kpiData.followups} color={COLORS.orange} bg="#fff7ed" />
                        <PriorityItem onClick={() => navigate('/site-visits')} icon={UserCheck} label="Site Visits Scheduled" count={kpiData.siteVisits} color="#3b82f6" bg="#eff6ff" />
                        <PriorityItem isLast onClick={() => navigate('/pipeline')} icon={Flame} label="Hot Leads to Contact" count={stageCounts['Negotiation'] || 0} color="#f97316" bg="#fff7ed" />
                    </div>
                    <button 
                        onClick={() => navigate('/calendar')}
                        style={{ 
                            width: '100%', padding: '10px', marginTop: '14px', borderRadius: '12px', 
                            background: '#eff6ff', border: 'none', color: COLORS.slate700, 
                            fontSize: '0.85rem', fontWeight: 750, display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s'
                        }}
                        className="hover-lift"
                    >
                        <Calendar size={16} /> View Calendar
                    </button>
                </div>
            </div>

            {/* Bottom Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr', gap: '16px' }}>
                
                {/* Activities */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Upcoming Activities</h3>
                        <div 
                            onClick={() => navigate('/calendar')}
                            style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                            View Calendar <ChevronRight size={12} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <TimelineItem 
                            time="12:30 PM" 
                            title="Site Visit - Mahesh S. Tiwari" 
                            sub="Aviation Sky Villa • 3 BHK" 
                            badge="In 15 min" 
                            badgeColor={COLORS.green} 
                            badgeBg="#ecfdf5" 
                            img="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=64&q=80" 
                            onClick={() => navigate('/site-visits')}
                        />
                        <TimelineItem 
                            time="3:00 PM" 
                            title="Call - Anil Wadhwa" 
                            sub="3 BHK • Interested in 3 BHK" 
                            badge="High Priority" 
                            badgeColor="#f97316" 
                            badgeBg="#fff7ed" 
                            icon={Phone} 
                            onClick={() => navigate('/call-records')}
                        />
                        <TimelineItem 
                            time="4:30 PM" 
                            title="Follow-up - Meera Talwar" 
                            sub="Elan Epic • Budget: ₹1.2 Cr" 
                            badge="Today" 
                            badgeColor={COLORS.blue} 
                            badgeBg="#eff6ff" 
                            img="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&q=80" 
                            isLast
                            onClick={() => navigate('/followups')}
                        />
                    </div>
                </div>

                {/* Performance Overview */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Performance Overview</h3>
                        <div 
                            onClick={() => setPerformancePeriod(performancePeriod === 'Month' ? 'Year' : 'Month')}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '4px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.75rem', fontWeight: 750, color: COLORS.slate950, cursor: 'pointer' }}
                        >
                            This {performancePeriod} <ChevronDown size={14} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        {[
                            { label: 'Avg. Response Time', val: '24 mins', sub: '↓ 8% better', color: COLORS.green },
                            { label: 'Deals in Pipeline', val: '12', sub: '↑ 2 new', color: COLORS.green },
                            { label: 'Win Rate', val: '31%', sub: '↑ 4%', color: COLORS.green },
                            { label: 'Avg. Deal Size', val: '₹1.58 Cr', sub: '↑ 6%', color: COLORS.green }
                        ].map(m => (
                            <div key={m.label} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.slate600, marginBottom: '6px' }}>{m.label}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '4px' }}>{m.val}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: m.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {m.sub}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '12px' }}>Top Performing Projects</h4>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <ProjectChip title="Elan Epic" leads="12 Leads" img="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80" />
                            <ProjectChip title="Alpine Heights" leads="8 Leads" img="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" />
                            <ProjectChip title="Aviation Sky Villa" leads="6 Leads" img="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80" />
                        </div>
                    </div>
                </div>

                {/* Hot Leads */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Hot Leads</h3>
                        <div 
                            onClick={() => navigate('/leads')}
                            style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                            View All <ChevronRight size={12} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <LeadListItem name="Preeti Sharma" type="Hot" time="3:00 PM" info="Jan Wilgy" details="3 BHK • ₹1.25 Cr • Elan Epic" img="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80" onClick={() => navigate('/leads/1')} />
                        <LeadListItem name="Sunita Yadav" type="Warm" time="4:30 PM" info="Call back" details="2 BHK • ₹85 L • Elan Epic" img="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" onClick={() => navigate('/leads/2')} />
                        <LeadListItem isLast name="Ravi Malhotra" type="Cold" time="Tomorrow" info="Site Visit" details="4 BHK • ₹2.10 Cr • Alpine Heights" img="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" onClick={() => navigate('/leads/3')} />
                    </div>
                </div>

            </div>

             <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                * {
                    transition: all 0.1s ease;
                }

                input::placeholder {
                    color: ${COLORS.slate400};
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}
