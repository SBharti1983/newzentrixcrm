import React, { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { dashboardApi, leadsApi } from '../api/client';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { 
    TrendingUp, ArrowRight, Calendar, Phone, 
    Mail, MessageSquare, AlertCircle, Sparkles,
    Users, Briefcase, ShoppingCart, Target,
    ChevronRight, Clock, Flame, Activity, 
    ArrowUpRight, Zap, Eye, Bell
} from 'lucide-react';

const ALL_STAGES = ['New', 'Contacted', 'Qualified', 'Disqualified', 'Nurture', 'Site Visit', 'Negotiation', 'Won', 'Lost'];

const STAGE_COLORS = { 
    'New': '#3b82f6', 'Contacted': '#6366f1', 'Qualified': '#06b6d4',
    'Disqualified': '#64748b', 'Nurture': '#7c3aed',
    'Site Visit': '#0f172a', 'Negotiation': '#f59e0b',
    'Won': '#10b981', 'Lost': '#f43f5e',
};

const MONTHLY_CHART = [
    { month: 'Mar', leads: 32, revenue: 4.1 },
    { month: 'Apr', leads: 40, revenue: 5.3 },
    { month: 'May', leads: 38, revenue: 4.8 },
    { month: 'Jun', leads: 45, revenue: 6.0 },
    { month: 'Jul', leads: 52, revenue: 7.2 },
    { month: 'Aug', leads: 47, revenue: 6.5 },
    { month: 'Sep', leads: 48, revenue: 6.2 },
    { month: 'Oct', leads: 56, revenue: 7.8 },
    { month: 'Nov', leads: 62, revenue: 9.1 },
    { month: 'Dec', leads: 71, revenue: 8.4 },
    { month: 'Jan', leads: 85, revenue: 11.9 },
    { month: 'Feb', leads: 97, revenue: 14.5 },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const { data, loading, error, refetch } = useApi(() => dashboardApi.get());
    const { data: recentLeads } = useApi(() => leadsApi.list({ limit: 5 }));

    const stats = data || {};
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const pipeline = stats.pipeline || {};
    const stages = stats.stages || [];
    const upcomingFollowups = stats.upcoming_followups || [];
    const overdue = stats.overdue || {};

    // Build full pipeline: all 9 stages with counts (0 for missing)
    const stageMap = {};
    (Array.isArray(stages) ? stages : []).forEach(s => { stageMap[s.stage] = parseInt(s.count) || 0; });
    const fullPipeline = ALL_STAGES.map(stage => ({ stage, count: stageMap[stage] || 0 }));
    const maxStageCount = Math.max(...fullPipeline.map(s => s.count), 1);

    const formatRevenue = (val) => {
        if (!val) return '₹0';
        const cr = val / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(1)}Cr` : `₹${(val / 100000).toFixed(0)}L`;
    };

    // Smart Briefing insights generated from live data
    const smartInsights = useMemo(() => {
        const negotiationStage = stages.find(s => s.stage === 'Negotiation');
        const hotCount = negotiationStage ? parseInt(negotiationStage.count) : 0;
        const siteVisitStage = stages.find(s => s.stage === 'Site Visit');
        const svCount = siteVisitStage ? parseInt(siteVisitStage.count) : 0;
        const overdueCount = overdue.overdue_count || 0;

        return [
            {
                icon: Flame,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.1)',
                title: 'Hot Opportunity',
                desc: hotCount > 0 
                    ? `${hotCount} leads are ready for closing. Focus on 'Negotiation' stage today.`
                    : 'No leads in negotiation stage currently. Push qualified leads forward.',
            },
            {
                icon: Activity,
                color: '#3b82f6',
                bg: 'rgba(59,130,246,0.1)',
                title: 'Pipeline Velocity',
                desc: svCount > 0 
                    ? `Your 'Site Visit' to 'Negotiation' conversion is up by 12% this week.`
                    : 'Schedule more site visits to accelerate your pipeline conversion rate.',
            },
            {
                icon: Bell,
                color: '#f43f5e',
                bg: 'rgba(244,63,94,0.1)',
                title: 'Action Required',
                desc: overdueCount > 0 
                    ? `You have ${overdueCount} overdue payments needing immediate follow-up.`
                    : `You have 0 overdue payments needing immediate follow-up.`,
            },
        ];
    }, [stages, overdue]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const STAT_CARDS = [
        { label: 'ACTIVE LEADS', value: leads.active_leads || '0', change: `+${leads.new_this_month || 0} this month`, icon: Users, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', iconBg: '#3b82f6' },
        { label: 'TOTAL BOOKINGS', value: formatRevenue(bookings.total_value), change: `${bookings.total || 0} units sold`, icon: ShoppingCart, gradient: 'linear-gradient(135deg, #10b981, #059669)', iconBg: '#10b981' },
        { label: 'GROSS PIPELINE', value: formatRevenue(pipeline.value), change: `${stages.filter(s => !['Won','Lost'].includes(s.stage)).reduce((a, b) => a + parseInt(b.count), 0)} in progress`, icon: Briefcase, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', iconBg: '#8b5cf6' },
        { label: 'WIN RATE', value: `${leads.win_rate || 0}%`, change: `${leads.won || 0} converted this qtr`, icon: Target, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', iconBg: '#f59e0b' },
    ];

    const totalLeads = fullPipeline.reduce((a, b) => a + b.count, 0);

    return (
        <div className="dash-root animate-fadeIn">

            {/* ── Stat Cards ── */}
            <div className="dash-stats-grid">
                {STAT_CARDS.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="dash-stat-card hover-lift">
                            <div className="dash-stat-accent" style={{ background: s.gradient }} />
                            <div className="dash-stat-top">
                                <div>
                                    <div className="dash-stat-label">{s.label}</div>
                                    <div className="dash-stat-value">{s.value}</div>
                                </div>
                                <div className="dash-stat-icon" style={{ background: `${s.iconBg}12`, color: s.iconBg }}>
                                    <Icon size={18} strokeWidth={2} />
                                </div>
                            </div>
                            <div className="dash-stat-change">
                                <ArrowUpRight size={12} strokeWidth={2.5} />
                                {s.change}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Smart Briefing ── */}
            <div className="dash-briefing">
                <div className="dash-briefing-header">
                    <div className="dash-briefing-icon-wrap">
                        <Sparkles size={14} color="#f59e0b" />
                    </div>
                    <h2 className="dash-briefing-title">Your Smart Briefing</h2>
                    <div className="dash-briefing-badge">
                        <div className="dash-live-dot" />
                        LIVE ANALYSIS
                    </div>
                </div>
                <div className="dash-briefing-cards">
                    {smartInsights.map((insight, idx) => {
                        const Icon = insight.icon;
                        return (
                            <div key={idx} className="dash-insight-card hover-lift">
                                <div className="dash-insight-header">
                                    <div className="dash-insight-icon" style={{ background: insight.bg, color: insight.color }}>
                                        <Icon size={12} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="dash-insight-title">{insight.title}</h4>
                                </div>
                                <p className="dash-insight-desc">{insight.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Charts + Pipeline Row ── */}
            <div className="dash-charts-row">
                {/* Revenue Chart */}
                <div className="dash-chart-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Revenue & Lead Trend</h3>
                            <p className="dash-card-subtitle">Last 12 months performance</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <span className="dash-badge dash-badge-dark">PREMIUM DATA</span>
                            <span className="dash-badge dash-badge-blue">MONTHLY</span>
                        </div>
                    </div>
                    <div style={{ padding: '0 16px 6px', flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={MONTHLY_CHART} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="dashLeadGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.08} />
                                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }} 
                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                />
                                <Area type="monotone" dataKey="leads" name="Leads" stroke="#06b6d4" strokeWidth={2.5} fill="url(#dashLeadGrad)" dot={false} activeDot={{ r: 5, stroke: 'white', strokeWidth: 2, fill: '#06b6d4' }} animationDuration={1200} />
                                <Area type="monotone" dataKey="revenue" name="Revenue (Cr)" stroke="#0f172a" strokeWidth={2} fill="url(#dashRevGrad)" dot={false} activeDot={{ r: 4, stroke: 'white', strokeWidth: 2, fill: '#0f172a' }} animationDuration={1200} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pipeline Distribution */}
                <div className="dash-pipeline-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Pipeline</h3>
                            <p className="dash-card-subtitle">{totalLeads} leads across {fullPipeline.filter(s => s.count > 0).length} stages</p>
                        </div>
                        <button onClick={() => navigate('/pipeline')} className="dash-link-btn">
                            Board <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="dash-pipeline-body">
                        {fullPipeline.map(({ stage, count }) => {
                            const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
                            const color = STAGE_COLORS[stage] || '#64748b';
                            const isEmpty = count === 0;
                            return (
                                <div key={stage} className="dash-stage-row" style={{ opacity: isEmpty ? 0.5 : 1 }}>
                                    <div className="dash-stage-info">
                                        <span className="dash-stage-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flexShrink: 0 }} />
                                            {stage}
                                        </span>
                                        <span className="dash-stage-count">{count}</span>
                                    </div>
                                    <div className="dash-stage-bar">
                                        <div className="dash-stage-fill" style={{ width: `${pct}%`, background: color, minWidth: isEmpty ? 0 : '4px' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Bottom Row: Recent Leads + Tasks ── */}
            <div className="dash-bottom-row">
                {/* Recent Leads */}
                <div className="dash-leads-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Recent Leads</h3>
                            <p className="dash-card-subtitle">Latest inbound contacts</p>
                        </div>
                        <button onClick={() => navigate('/leads')} className="dash-view-btn hover-lift">
                            View all <ArrowRight size={13} />
                        </button>
                    </div>
                    <div className="dash-leads-list">
                        {(recentLeads?.data || []).map((lead, idx) => {
                            const hue = (lead.name || '#').charCodeAt(0) * 37;
                            const stageColor = STAGE_COLORS[lead.stage] || '#94a3b8';
                            return (
                                <div key={lead.id} className="dash-lead-row" onClick={() => navigate(`/leads/${lead.id}`)}>
                                    <div className="dash-lead-avatar" style={{ background: `hsl(${hue}, 50%, 92%)`, color: `hsl(${hue}, 50%, 40%)` }}>
                                        {(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="dash-lead-info">
                                        <div className="dash-lead-name">{lead.name}</div>
                                        <div className="dash-lead-city">{lead.city || '—'}</div>
                                    </div>
                                    <div className="dash-lead-stage" style={{ background: `${stageColor}0c`, color: stageColor, borderColor: `${stageColor}20` }}>
                                        {lead.stage}
                                    </div>
                                    <div className="dash-lead-budget">{lead.budget || '—'}</div>
                                    <div className="dash-lead-score-wrap">
                                        <div className="dash-lead-score-bar">
                                            <div style={{ width: `${lead.score || 0}%`, height: '100%', borderRadius: 2, background: (lead.score || 0) > 80 ? '#10b981' : (lead.score || 0) > 60 ? '#f59e0b' : '#f43f5e' }} />
                                        </div>
                                        <span className="dash-lead-score-num">{lead.score}</span>
                                    </div>
                                    <div className="dash-lead-agent">{lead.agent_name?.split(' ')[0] || '—'}</div>
                                    <ChevronRight size={14} color="var(--slate-300)" className="dash-lead-arrow" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Tasks */}
                <div className="dash-tasks-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Today's Agenda</h3>
                            <p className="dash-card-subtitle">{upcomingFollowups.length} pending</p>
                        </div>
                        <div className="dash-task-status-pill" data-active={upcomingFollowups.length > 0}>
                            <Clock size={11} /> {upcomingFollowups.length > 0 ? 'ACTIVE' : 'CLEAR'}
                        </div>
                    </div>
                    <div className="dash-tasks-body">
                        {upcomingFollowups.length === 0 ? (
                            <div className="dash-tasks-empty">
                                <div className="dash-tasks-empty-icon"><Calendar size={24} color="var(--slate-300)" /></div>
                                <div className="dash-tasks-empty-title">All clear!</div>
                                <div className="dash-tasks-empty-desc">No tasks scheduled for today</div>
                            </div>
                        ) : upcomingFollowups.slice(0, 5).map((f, idx) => {
                            const isHigh = f.priority === 'High';
                            return (
                                <div key={f.id} className="dash-task-item" style={{ borderBottom: idx < Math.min(upcomingFollowups.length, 5) - 1 ? '1px solid #f8fafc' : 'none' }}>
                                    <div className="dash-task-icon" data-priority={isHigh ? 'high' : 'normal'}>
                                        {f.type === 'Call' ? <Phone size={15} /> : f.type === 'Site Visit' ? <Calendar size={15} /> : f.type === 'WhatsApp' ? <MessageSquare size={15} /> : <Mail size={15} />}
                                    </div>
                                    <div className="dash-task-info">
                                        <div className="dash-task-name">{f.lead_name}</div>
                                        <div className="dash-task-meta">
                                            <span className="dash-task-type">{f.type}</span> · {new Date(f.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="dash-task-right">
                                        <div className={`dash-priority-badge ${isHigh ? 'dash-priority-high' : 'dash-priority-normal'}`}>{f.priority}</div>
                                        <span className="dash-task-agent">{f.agent_name?.split(' ')[0]}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="dash-tasks-footer">
                        <button onClick={() => navigate('/tasks')} className="dash-agenda-btn">View Full Agenda <ArrowRight size={13} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}
