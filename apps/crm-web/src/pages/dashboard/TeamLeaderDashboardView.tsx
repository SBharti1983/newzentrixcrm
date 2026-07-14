import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Clock, ChevronDown, 
    Bell, Search, Plus, MapPin, Phone, MessageSquare, 
    ChevronRight, CheckCircle, AlertCircle, Layout, Crown, Award, Zap, LucideIcon
} from 'lucide-react';
import * as dateUtils from '../../utils/dateUtils';
import { User } from '../../types/auth';
import { TeamLeaderStats, MemberPerformance } from '../../types/api';
import { useMobile } from '../../hooks/useMobile';

interface TeamLeaderDashboardViewProps {
    user: User | null;
    data: TeamLeaderStats | null;
    loading?: boolean;
}

const COLORS = {
    brand: '#6366f1',
    brandDark: '#4f46e5',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    slate950: '#0f172a',
    slate900: '#111827',
    slate800: '#1f2937',
    slate600: '#4b5563',
    slate400: '#9ca3af',
    slate100: '#f1f5f9',
    white: '#ffffff',
    bg: '#f8fafc'
};

const KPI_STYLE = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    flex: 1
};

export default function TeamLeaderDashboardView({ user, data, loading }: TeamLeaderDashboardViewProps) {
    const navigate = useNavigate();
    const isMobile = useMobile();

    // Dynamic Chart Data mapping
    const chartData = useMemo(() => {
        if (data?.trends) return data.trends.map(t => ({
            name: t.name,
            thisMonth: parseInt(String(t.leads)) || 0,
            lastMonth: Math.floor((parseInt(String(t.leads)) || 0) * 0.8)
        }));
        // Fallback demo data
        return [
            { name: 'Mon', thisMonth: 4, lastMonth: 3 },
            { name: 'Tue', thisMonth: 6, lastMonth: 5 },
            { name: 'Wed', thisMonth: 5, lastMonth: 7 },
            { name: 'Thu', thisMonth: 8, lastMonth: 6 },
            { name: 'Fri', thisMonth: 9, lastMonth: 8 },
            { name: 'Sat', thisMonth: 11, lastMonth: 9 },
            { name: 'Sun', thisMonth: 14, lastMonth: 10 },
        ];
    }, [data?.trends]);

    const members = data?.members || [];

    const getGreeting = () => {
        const hour = dateUtils.getNow().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const formatRevenue = (v: number | string | undefined) => {
        if (!v) return '₹0';
        const val = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : v;
        if (isNaN(val)) return '₹0';
        const cr = val / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(1)}Cr` : `₹${(val / 100000).toFixed(1)}L`;
    };

    return (
        <div style={{ padding: isMobile ? '0 16px 16px' : '0 32px 32px', paddingTop: 0, background: COLORS.bg, minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>
            
            {/* Header */}
            <div style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: COLORS.slate950, letterSpacing: '-0.5px' }}>
                        {getGreeting()}, {user?.name || 'Squad Leader'} 👋 <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', background: '#eef2ff', color: COLORS.brand, borderRadius: '20px', marginLeft: '12px', verticalAlign: 'middle' }}>Team Leader Dashboard</span>
                    </h1>
                    <p style={{ margin: '4px 0 0', color: COLORS.slate600, fontSize: '0.9rem', fontWeight: 500 }}>Real-time squad auditing & tactical performance management</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Filters */}
                    <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', cursor: 'pointer' }}>
                            <Clock size={16} color={COLORS.slate600} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.slate900 }}>This Month</span>
                            <ChevronDown size={14} color={COLORS.slate400} />
                        </div>
                    </div>

                    <div style={{ position: 'relative', width: 40, height: 40, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <Bell size={20} color={COLORS.slate600} />
                        <div style={{ position: 'absolute', top: 0, right: 2, width: 14, height: 14, background: COLORS.danger, borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff', fontWeight: 800 }}>3</div>
                    </div>

                    <div 
                        onClick={() => navigate('/leads')}
                        style={{ background: COLORS.brand, padding: '10px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                    >
                        <Plus size={18} /> Add Lead
                    </div>
                </div>
            </div>

            {/* KPI Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <MetricCard title="Squad Revenue" val={formatRevenue(data?.bookings?.total_value)} growth="+ 22.4%" icon={Layout} color="#6366f1" loading={loading} />
                <MetricCard title="Squad Bookings" val={data?.bookings?.total ?? 0} growth="+ 12%" icon={Award} color="#8b5cf6" loading={loading} />
                <MetricCard title="Active Leads" val={data?.leads?.active_leads ?? 0} growth="+ 8.4%" icon={Users} color="#3b82f6" loading={loading} />
                <MetricCard title="Lead Velocity" val="High" growth="Optimal" icon={TrendingUp} color="#10b981" loading={loading} />
                <MetricCard title="Active Agents" val={`${members.length} Agents`} detail="All squads online" icon={Users} color="#6366f1" loading={loading} />
                <MetricCard title="Market Index" val="92.4" growth="+ 3.2%" icon={Target} color="#06b6d4" loading={loading} />
            </div>

            {/* Main Content Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                
                {/* Squad Pipeline */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Squad Tactical Funnel</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600, background: COLORS.slate100, padding: '4px 12px', borderRadius: '8px' }}>This Week <ChevronDown size={12} /></div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                        <PipelineMetric step="Leads" val={data?.leads?.active_leads ?? 0} />
                        <PipelineDivider />
                        <PipelineMetric step="Calls" val={data?.telephony_stats?.calls_today ?? 0} />
                        <PipelineDivider />
                        <PipelineMetric step="Visits" val={data?.site_visits ?? 0} />
                        <PipelineDivider />
                        <PipelineMetric step="Bookings" val={data?.bookings?.total ?? 0} />
                    </div>

                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.brand} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.brand} stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="thisMonth" stroke={COLORS.brand} strokeWidth={3} fillOpacity={1} fill="url(#colorBrand)" dot={{ r: 4, fill: COLORS.brand, strokeWidth: 2, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tactical Insights */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Squad Strategy</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <InsightItem 
                            icon={Zap} 
                            color={COLORS.danger} 
                            title="Intervention Required" 
                            desc="3 agents showing high friction in price negotiations." 
                            link="Audit Recordings →"
                        />
                        <InsightItem 
                            icon={CheckCircle} 
                            color={COLORS.success} 
                            title="Velocity Alert" 
                            desc="South Park inventory moving 2x faster than average."
                        />
                        <InsightItem 
                            icon={Activity} 
                            color={COLORS.brand} 
                            title="Training Focus" 
                            desc="Suggested focus: 'Closing Transitions'."
                            link="Assign Training →"
                        />
                    </div>
                </div>

                {/* Squad Members */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Squad Members</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {members.slice(0, 5).map((agent, i) => (
                            <AgentRow 
                                key={agent.id}
                                name={agent.name}
                                revenue={formatRevenue(agent.total_value || 0)}
                                bookings={agent.bookings || 0}
                                progress={Math.min(100, ((agent.bookings || 0) / 5) * 100)}
                                color={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'][i % 5]}
                            />
                        ))}
                        {members.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: COLORS.slate400 }}>No squad members assigned.</div>}
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1.3fr)', gap: '32px' }}>
                
                {/* Risk Leads */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Squad Risk Radar</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(data?.active_deals || []).slice(0, 3).map((deal, i) => (
                             <DealItem 
                                key={i}
                                project={deal.project_name} 
                                agent={deal.agent_name || 'Unassigned'} 
                                status={deal.status} 
                                riskColor={deal.status === 'Cancelled' ? COLORS.danger : (deal.status === 'Pending' ? COLORS.warning : COLORS.success)} 
                                reason={formatRevenue(deal.total_amount)} 
                            />
                        ))}
                         {(!data?.active_deals || data?.active_deals.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.slate400, fontSize: '0.8rem' }}>Squad performance is optimal.</div>
                        )}
                    </div>
                </div>

                {/* Task Checklist */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Tactical Tasks</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TaskCounter label="Lead Audits" count={4} sub="Due by EOD" color={COLORS.brand} />
                        <TaskCounter label="Training Sessions" count={1} sub="10:00 AM Tomorrow" color={COLORS.success} />
                        <TaskCounter label="Reports Pending" count={2} sub="Weekly summary" color={COLORS.warning} />
                    </div>
                </div>

                {/* Upcoming Shift Activities */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Squad Agenda</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {(data?.upcoming_followups || []).slice(0, 3).map((f, idx) => (
                            <ActivityEntry 
                                key={f.id}
                                time={dateUtils.parseSafe(f.scheduled_at)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '00:00'} 
                                icon={f.type === 'Call' ? Phone : Layout} 
                                title={f.type} 
                                sub={`${f.agent_name} • ${f.lead_name}`} 
                                action="Review"
                                isLast={idx === Math.min((data?.upcoming_followups || []).length, 3) - 1}
                            />
                        ))}
                        {(!data?.upcoming_followups || data?.upcoming_followups.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.slate400, fontSize: '0.8rem' }}>No upcoming activities.</div>
                        )}
                    </div>
                </div>

                {/* Squad Leaderboard */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Squad Top 3</h3>
                    </div>
                    
                    {/* Podium */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '10px' }}>
                         {/* 2nd */}
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <img src={`https://ui-avatars.com/api/?name=${members[1]?.name || 'Agent'}&background=random`} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -10, left: 12, width: 20, height: 20, background: '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800 }}>2</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{(members[1]?.name || 'Agent').split(' ')[0]}</div>
                        </div>
                        {/* 1st */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Crown size={24} color="#fbbf24" fill="#fbbf24" style={{ position: 'absolute', top: -18, left: 16 }} />
                                <img src={`https://ui-avatars.com/api/?name=${members[0]?.name || 'Leader'}&background=random`} style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #fbbf24', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -8, left: 24, width: 24, height: 24, background: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 800 }}>1</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{(members[0]?.name || 'Agent').split(' ')[0]}</div>
                        </div>
                        {/* 3rd */}
                        <div style={{ textAlign: 'center' }}>
                             <div style={{ position: 'relative' }}>
                                <img src={`https://ui-avatars.com/api/?name=${members[2]?.name || 'Agent'}&background=random`} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -10, left: 12, width: 20, height: 20, background: '#f59e0b90', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800 }}>3</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{(members[2]?.name || 'Agent').split(' ')[0]}</div>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.brand, cursor: 'pointer' }}>View All Member Stats →</span>
                    </div>
                </div>

            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                * { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes skeletonPulse {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

// --- SUB-COMPONENTS (Simplified for TL Dashboard) ---

interface MetricCardProps {
    title: string;
    val: string | number;
    growth?: string;
    detail?: string;
    icon: LucideIcon;
    color: string;
    loading?: boolean;
}

const MetricCard = ({ title, val, growth, detail, icon: Icon, color, loading }: MetricCardProps) => (
    <div style={{ 
        ...KPI_STYLE, 
        position: 'relative', 
        overflow: 'hidden',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.3s ease'
    }}>
        {loading && (
            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px', 
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                animation: 'skeletonPulse 1.5s infinite linear'
            }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '10px', background: `${color}10`, borderRadius: '12px', color: color }}>
                {Icon && <Icon size={20} />}
            </div>
            {growth && <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.success }}>{growth}</div>}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: COLORS.slate950 }}>{val}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.slate600 }}>{title}</div>
        {detail && <div style={{ fontSize: '0.65rem', color: COLORS.slate400, marginTop: '4px' }}>{detail}</div>}
    </div>
);

interface PipelineMetricProps {
    step: string;
    val: number | string;
}

const PipelineMetric = ({ step, val }: PipelineMetricProps) => (
    <div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950 }}>{val}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 750, color: COLORS.slate400 }}>{step}</div>
    </div>
);

const PipelineDivider = () => <div style={{ display: 'flex', alignItems: 'center', color: '#e2e8f0' }}><ChevronRight size={16} /></div>;

interface InsightItemProps {
    icon: LucideIcon;
    color: string;
    title: string;
    desc: string;
    link?: string;
}

const InsightItem = ({ icon: Icon, color, title, desc, link }: InsightItemProps) => (
    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
            <Icon size={18} color={color} />
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 850, color: COLORS.slate950 }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: COLORS.slate600, lineHeight: 1.4 }}>{desc}</div>
                {link && <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.brand, marginTop: '6px' }}>{link}</div>}
            </div>
        </div>
    </div>
);

interface AgentRowProps {
    name: string;
    revenue: string;
    progress: number;
    color: string;
    bookings: number;
}

const AgentRow = ({ name, revenue, progress, color, bookings }: AgentRowProps) => (

    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950 }}>{name}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{revenue}</span>
            </div>
            <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: color }} />
            </div>
        </div>
    </div>
);

interface DealItemProps {
    project: string;
    agent: string;
    status: string;
    riskColor: string;
    reason: string;
}

const DealItem = ({ project, agent, status, riskColor, reason }: DealItemProps) => (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{project}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: riskColor }}>{status}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: COLORS.slate600 }}>Agent: {agent}</div>
        <div style={{ fontSize: '0.7rem', color: COLORS.danger, fontWeight: 700, marginTop: '4px' }}>{reason}</div>
    </div>
);

interface TaskCounterProps {
    label: string;
    count: number;
    sub: string;
    color: string;
}

const TaskCounter = ({ label, count, sub, color }: TaskCounterProps) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}10`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{count}</div>
        <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: '0.65rem', color: COLORS.slate400 }}>{sub}</div>
        </div>
    </div>
);

interface ActivityEntryProps {
    time: string;
    icon: LucideIcon;
    title: string;
    sub: string;
    action: string;
    isLast: boolean;
}

const ActivityEntry = ({ time, icon: Icon, title, sub, action, isLast }: ActivityEntryProps) => (
    <div style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: isLast ? 0 : '16px' }}>
        <div style={{ width: '45px', fontSize: '0.65rem', fontWeight: 800, color: COLORS.slate400, paddingTop: '10px' }}>{time}</div>
        <div style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Icon size={16} color={COLORS.brand} />
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 850 }}>{title}</div>
                <div style={{ fontSize: '0.65rem', color: COLORS.slate600 }}>{sub}</div>
            </div>
            <button style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>{action}</button>
        </div>
    </div>
);
