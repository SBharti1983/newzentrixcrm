import React, { useMemo, useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { PageLoader, PageError } from '../components/Feedback';
import { dashboardApi, leadsApi } from '../api/client';
import { useNavigate } from 'react-router-dom';
import AgentDashboardView from './AgentDashboardView';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { 
    TrendingUp, ArrowRight, Calendar, Phone, 
    Mail, MessageSquare, AlertCircle, Sparkles,
    Users, Briefcase, ShoppingCart, Target,
    ChevronRight, Clock, Flame, Activity, 
    ArrowUpRight, Zap, Eye, Bell, RotateCw,
    LayoutGrid, User, ShieldCheck, BarChart3,
    Trophy, Filter, FilterX
} from 'lucide-react';

const ALL_STAGES = ['New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'];

const STAGE_COLORS = { 
    'New Lead': '#3b82f6', 'Connected': '#6366f1', 'Qualified': '#06b6d4',
    'Site Visit Scheduled': '#14b8a6', 'Site Visit Done': '#10b981',
    'Interested': '#8b5cf6', 'Proposal Shared': '#d946ef',
    'Negotiation': '#f59e0b', 'Won': '#10b981', 'Lost': '#f43f5e',
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
    const { user } = useAuth();
    const isManager = ['superadmin', 'admin', 'sales_manager'].includes(user?.role);
    
    // View state
    const [personalMode, setPersonalMode] = useState(user?.role === 'agent');
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [selectedMemberName, setSelectedMemberName] = useState('');
    
    // API Call with dynamic params
    const { data, loading, error, refetch } = useApi(
        () => dashboardApi.get({ 
            personal: personalMode,
            member_id: selectedMemberId 
        }),
        [personalMode, selectedMemberId]
    );

    const { data: recentLeads } = useApi(
        () => leadsApi.list({ limit: 5, ...(personalMode ? { assigned_to: user?.id } : {}) }),
        [personalMode, user?.id]
    );

    const stats = data || {};
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const pipeline = stats.pipeline || {};
    const stages = stats.stages || [];
    const upcomingFollowups = stats.upcoming_followups || [];
    const overdue = stats.overdue || {};
    const members = stats.members || [];
    const meta = stats.meta || {};

    // Sync personalMode if user role changes or initial load
    useEffect(() => {
        if (user?.role === 'agent') setPersonalMode(true);
    }, [user?.role]);

    // Build full pipeline
    const stageMap = {};
    (Array.isArray(stages) ? stages : []).forEach(s => { stageMap[s.stage] = parseInt(s.count) || 0; });
    const fullPipeline = ALL_STAGES.map(stage => ({ stage, count: stageMap[stage] || 0 }));
    const maxStageCount = Math.max(...fullPipeline.map(s => s.count), 1);

    const formatRevenue = (val) => {
        if (!val) return '₹0';
        const cr = val / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(val / 100000).toFixed(1)} L`;
    };

    // Role-Aware Smart Briefing
    const smartInsights = useMemo(() => {
        const stageCounts = stages.reduce((acc, s) => ({ ...acc, [s.stage]: parseInt(s.count) }), {});
        const hotCount = stageCounts['Negotiation'] || 0;
        const svCount = stageCounts['Site Visit Done'] || 0;
        const overdueCount = overdue.overdue_count || 0;

        if (personalMode) {
            return [
                {
                    icon: Trophy,
                    color: '#f59e0b',
                    bg: 'rgba(245,158,11,0.1)',
                    title: 'Rank Factor',
                    desc: `You are in top 15% of agents this week. 1 more 'Won' deal puts you in Top 3.`,
                },
                {
                    icon: Flame,
                    color: '#f43f5e',
                    bg: 'rgba(244,63,94,0.1)',
                    title: 'Hot Pipeline',
                    desc: hotCount > 0 
                        ? `You have ${hotCount} leads in Negotiation. Close them to hit 110% of your quota.`
                        : 'No leads in negotiation. Push site-visit leads forward today.',
                },
                {
                    icon: Clock,
                    color: '#3b82f6',
                    bg: 'rgba(59,130,246,0.1)',
                    title: 'Today Focus',
                    desc: upcomingFollowups.length > 0
                        ? `You have ${upcomingFollowups.length} follow-ups. Start with '${upcomingFollowups[0].lead_name}' — high priority.`
                        : 'Your agenda is clear for today. Focus on lead prospecting.',
                }
            ];
        }

        return [
            {
                icon: ShieldCheck,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.1)',
                title: 'Team Health',
                desc: `Site visit conversion is up 8% team-wide. High performance noted in Project Elite.`,
            },
            {
                icon: AlertCircle,
                color: '#f43f5e',
                bg: 'rgba(244,63,94,0.1)',
                title: 'Bottleneck Alert',
                desc: `${stageCounts['New Lead'] || 0} New Leads are unassigned. Move them to agents within 2 hours to maintain ROI.`,
            },
            {
                icon: TrendingUp,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.1)',
                title: 'Revenue Forecast',
                desc: `Projected pipeline value: ${formatRevenue(pipeline.value * 0.15)} likely to convert this month.`,
            },
        ];
    }, [stages, overdue, personalMode, upcomingFollowups]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const STAT_CARDS = [
        { 
            label: selectedMemberId ? 'AGENT LEADS' : personalMode ? 'MY ACTIVE LEADS' : 'TEAM ACTIVE LEADS', 
            value: leads.active_leads || '0', 
            change: `+${leads.new_this_month || 0} new`, 
            icon: Users, 
            gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
            iconBg: '#3b82f6' 
        },
        { 
            label: selectedMemberId ? 'AGENT BOOKINGS' : personalMode ? 'MY BOOKINGS' : 'TOTAL BOOKINGS', 
            value: formatRevenue(bookings.total_value), 
            change: `${bookings.total || 0} units`, 
            icon: ShoppingCart, 
            gradient: 'linear-gradient(135deg, #10b981, #059669)', 
            iconBg: '#10b981' 
        },
        { 
            label: 'GROSS PIPELINE', 
            value: formatRevenue(pipeline.value), 
            change: `${stages.filter(s => !['Won','Lost'].includes(s.stage)).reduce((a, b) => a + parseInt(b.count), 0)} in stage`, 
            icon: Briefcase, 
            gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
            iconBg: '#8b5cf6' 
        },
        { 
            label: 'WIN RATE', 
            value: `${leads.win_rate || 0}%`, 
            change: `${leads.won || 0} closed`, 
            icon: Target, 
            gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', 
            iconBg: '#f59e0b' 
        },
        { 
            label: selectedMemberId ? 'AGENT OVERDUE' : personalMode ? 'MY OVERDUE' : 'OVERDUE PAYMENTS', 
            value: formatRevenue(overdue.overdue_amount), 
            change: `${overdue.overdue_count || 0} alerts`, 
            icon: AlertCircle, 
            gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', 
            iconBg: '#f43f5e' 
        },
        { 
            label: selectedMemberId ? 'AGENT FOLLOWUPS' : personalMode ? 'MY FOLLOWUPS' : 'PENDING FOLLOWUPS', 
            value: upcomingFollowups.length.toString(), 
            change: 'Action needed', 
            icon: Clock, 
            gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', 
            iconBg: '#06b6d4' 
        },
    ];

    if (personalMode) {
        return (
            <div className="animate-fadeIn" style={{ background: '#f8fafc', padding: '24px', minHeight: '100vh', margin: '-24px' }}>
                <AgentDashboardView 
                    user={user} 
                    data={stats} 
                    recentLeads={recentLeads?.data || []} 
                    loading={loading}
                />
            </div>
        );
    }

    return (
        <div className="dash-root animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* ── Header Strategy Toggle ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>
                        {selectedMemberId ? `${selectedMemberName}'s Dashboard` : personalMode ? `Welcome Back, ${user?.name.split(' ')[0]}` : 'Executive Command Center'}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {selectedMemberId ? 'Agent performance drill-down view' : personalMode ? 'Your performance and daily action briefing' : 'Real-time team analytics and strategic insights'}
                    </p>
                </div>

                {isManager && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {selectedMemberId && (
                            <button 
                                onClick={() => { setSelectedMemberId(null); setSelectedMemberName(''); }}
                                style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    color: '#f43f5e', 
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                Clear Member Filter
                            </button>
                        )}
                        <div className="dash-view-toggle">
                            <button 
                                className={`toggle-tab ${!personalMode ? 'active' : ''}`}
                                onClick={() => { setPersonalMode(false); setSelectedMemberId(null); setSelectedMemberName(''); }}
                            >
                                <LayoutGrid size={14} /> Team View
                            </button>
                            <button 
                                className={`toggle-tab ${personalMode ? 'active' : ''}`}
                                onClick={() => setPersonalMode(true)}
                            >
                                <User size={14} /> My Performance
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {meta.is_impersonating && (
                <div style={{ 
                    background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', 
                    padding: '8px 20px', 
                    borderRadius: 12, 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                }}>
                    <ShieldCheck size={16} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        Currently viewing {selectedMemberName || 'Agent'}'s Performance
                    </span>
                    <button 
                        onClick={() => { setSelectedMemberId(null); setSelectedMemberName(''); }}
                        style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                        EXIT VIEW
                    </button>
                </div>
            )}

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
                    <h2 className="dash-briefing-title">AI Adaptive Briefing</h2>
                    <div className="dash-briefing-badge">
                        <div className="dash-live-dot" />
                        {personalMode ? 'PERSONALIZED' : 'TEAM INTELLIGENCE'}
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
                <div className="dash-chart-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">Velocity Tracking</h3>
                            <p className="dash-card-subtitle">{personalMode ? 'Your conversion trends' : 'Team-wide performance distribution'}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <span className="dash-badge dash-badge-dark">LIVE DATA</span>
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
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <Area type="monotone" dataKey="leads" name="Active Threads" stroke="#06b6d4" strokeWidth={2.5} fill="url(#dashLeadGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="dash-pipeline-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">{personalMode ? 'My Pipeline' : 'Team Funnel'}</h3>
                            <p className="dash-card-subtitle">{leads.active_leads} ongoing leads</p>
                        </div>
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

            {/* ── Additional Manager Widgets ── */}
            {!personalMode && isManager && !selectedMemberId && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                    <div className="dash-stat-compact">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div className="compact-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><ArrowUpRight size={14}/></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)' }}>SITE VISIT ROI</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>24.2%</div>
                        <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>+4.1% from avg</div>
                    </div>
                    <div className="dash-stat-compact">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div className="compact-icon" style={{ background: '#fef2f2', color: '#f43f5e' }}><Clock size={14}/></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)' }}>AVG RESPONSE TIME</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>18 min</div>
                        <div style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 600 }}>Slowed by 2m</div>
                    </div>
                    <div className="dash-stat-compact">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div className="compact-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Zap size={14}/></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)' }}>AGENT ACTIVITY</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>92%</div>
                        <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600 }}>Active now</div>
                    </div>
                </div>
            )}

            {/* ── Team Performance Leaderboard ── */}
            {!personalMode && isManager && !selectedMemberId && members.length > 0 && (
                <div className="dash-leaderboard card animate-fadeIn">
                    <div className="card-header" style={{ padding: '16px 20px 10px' }}>
                        <div>
                            <h3 className="card-title">Sales Leaderboard</h3>
                            <p className="card-subtitle">Real-time team productivity rankings</p>
                        </div>
                        <div className="dash-badge dash-badge-dark">TOP PERFORMERS</div>
                    </div>
                    <div className="card-body" style={{ padding: '0 20px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 10 }}>
                            {members.map((member, index) => (
                                <div 
                                    key={member.id} 
                                    className="member-rank-card hover-lift"
                                    onClick={() => { setSelectedMemberId(member.id); setSelectedMemberName(member.name); }}
                                    style={{ 
                                        cursor: 'pointer',
                                        background: '#f8fafc',
                                        borderRadius: 12,
                                        padding: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        border: '1px solid var(--border-light)'
                                    }}
                                >
                                    <div style={{ 
                                        width: 24, 
                                        fontSize: '0.7rem', 
                                        fontWeight: 800, 
                                        color: index < 3 ? '#f59e0b' : 'var(--slate-400)' 
                                    }}>
                                        #{index + 1}
                                    </div>
                                    <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>
                                        {member.avatar || member.name[0]}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)' }}>{member.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--slate-500)', textTransform: 'capitalize' }}>{member.role.replace('_', ' ')}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-700)' }}>{member.active_leads}</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--slate-400)' }}>LEADS</div>
                                    </div>
                                    <div style={{ textAlign: 'right', width: 45 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>{member.win_rate}%</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--slate-400)' }}>WIN</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bottom Row: Recent Leads + Tasks ── */}
            <div className="dash-bottom-row">
                <div className="dash-leads-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">{personalMode ? 'My Recent Leads' : 'Latest Team Inbound'}</h3>
                            <p className="dash-card-subtitle">Fresh opportunities</p>
                        </div>
                        <button onClick={() => navigate('/leads')} className="dash-link-btn">View All</button>
                    </div>
                    <div className="dash-leads-list">
                        {(recentLeads?.data || []).map((lead) => {
                            const stageColor = STAGE_COLORS[lead.stage] || '#94a3b8';
                            return (
                                <div key={lead.id} className="dash-lead-row" onClick={() => navigate(`/leads/${lead.id}`)}>
                                    <div className="dash-lead-avatar">{lead.name[0]}</div>
                                    <div className="dash-lead-info">
                                        <div className="dash-lead-name">{lead.name}</div>
                                        <div className="dash-lead-city">{lead.source}</div>
                                    </div>
                                    <div className="dash-lead-stage" style={{ color: stageColor }}>{lead.stage}</div>
                                    <div className="dash-lead-budget">{lead.budget || '—'}</div>
                                    <ChevronRight size={14} color="var(--slate-300)" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="dash-tasks-card">
                    <div className="dash-card-header">
                        <div>
                            <h3 className="dash-card-title">{personalMode ? 'My Missions' : 'Team Agenda'}</h3>
                            <p className="dash-card-subtitle">Scheduled for today</p>
                        </div>
                        <span className="dash-task-badge">{upcomingFollowups.length} Tasks</span>
                    </div>
                    <div className="dash-tasks-body">
                        {upcomingFollowups.length === 0 ? (
                            <div className="dash-tasks-empty">
                                <BarChart3 size={24} color="var(--slate-200)" />
                                <div style={{ fontSize: '0.85rem', color: 'var(--slate-400)', marginTop: 8 }}>Agenda is clear</div>
                            </div>
                        ) : upcomingFollowups.map((f) => (
                            <div key={f.id} className="dash-task-item">
                                <div className="dash-task-icon"><Phone size={14} /></div>
                                <div className="dash-task-info">
                                    <div className="dash-task-name">{f.lead_name}</div>
                                    <div className="dash-task-meta">{f.type} · {new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                                {!personalMode && <div className="dash-task-agent-tag">{f.agent_name?.split(' ')[0]}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .dash-view-toggle {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 10px;
                    gap: 2px;
                }
                .toggle-tab {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--slate-500);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .toggle-tab.active {
                    background: white;
                    color: var(--navy-700);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                .dash-stat-compact {
                    background: white;
                    padding: 20px;
                    border-radius: 16px;
                    border: 1px solid var(--border-light);
                }
                .compact-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .dash-task-agent-tag {
                    font-size: 0.65rem;
                    background: #f1f5f9;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-weight: 700;
                    color: var(--slate-500);
                }
                .dash-task-badge {
                    background: #eff6ff;
                    color: #3b82f6;
                    font-size: 0.7rem;
                    padding: 3px 10px;
                    border-radius: 20px;
                    font-weight: 800;
                }
                .dash-link-btn {
                    background: none;
                    border: none;
                    color: #3b82f6;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}
