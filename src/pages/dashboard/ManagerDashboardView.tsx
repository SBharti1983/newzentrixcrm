import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Clock, ChevronDown, 
    Bell, Search, Plus, MapPin, Phone, MessageSquare, 
    ChevronRight, CheckCircle, AlertCircle, Layout, Crown, Award
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import LeaderboardWidget from '../../components/dashboard/LeaderboardWidget';

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

export default function ManagerDashboardView({ user, data }: any) {
    const navigate = useNavigate();
    const isMobile = useMobile();

    // Dynamic Chart Data mapping - moved inside to safely access 'data'
    const CHART_DATA = Array.isArray(data?.trends) ? data.trends.map(t => ({
        name: t.name,
        leads: parseInt(t.leads) || 0,
        calls: parseInt(t.calls) || 0,
        followups: parseInt(t.follow) || 0,
        visits: parseInt(t.visits) || 0
    })) : [
        { name: 'May 1', leads: 4, calls: 3 },
        { name: 'May 6', leads: 6, calls: 5 },
        { name: 'May 11', leads: 5, calls: 7 },
        { name: 'May 16', leads: 8, calls: 6 },
        { name: 'May 21', leads: 9, calls: 8 },
        { name: 'May 26', leads: 11, calls: 9 },
        { name: 'May 31', leads: 14, calls: 10 },
    ];

    
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const stats = data || {};
    const members = stats.members || [];
    const leadsStat = stats.leads || {};
    const bookings = stats.bookings || {};
    const upcomingFollowups = stats.upcoming_followups || [];
    const activeDeals = stats.active_deals || [];
    const pipeline = stats.pipeline || {};
    const overdue = stats.overdue || {};

    const formatRevenue = (v) => {
        if (!v) return '₹0';
        const cr = Number(v) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(1)}Cr` : `₹${(Number(v)/100000).toFixed(1)}L`;
    };

    return (
        <div style={{ padding: isMobile ? '16px' : '24px 32px', background: COLORS.bg, minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: isMobile ? '20px' : '32px', gap: isMobile ? 12 : 0 }}>
                <div style={{ display: 'none' }}>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: COLORS.slate950, letterSpacing: '-0.5px' }}>
                        {getGreeting()}, {user?.name || 'Manager'} 👋 <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', background: '#eef2ff', color: COLORS.brand, borderRadius: '20px', marginLeft: isMobile ? '0' : '12px', marginTop: isMobile ? '8px' : '0', display: isMobile ? 'inline-block' : 'inline', verticalAlign: 'middle' }}>Manager Dashboard</span>
                    </h1>
                    <p style={{ margin: '4px 0 0', color: COLORS.slate600, fontSize: '0.9rem', fontWeight: 500 }}>Here's your team performance, pipeline health and priorities for this month.</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                    {/* Filters */}
                    {!isMobile && (
                        <>
                            <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', cursor: 'pointer' }}>
                                    <Clock size={16} color={COLORS.slate600} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.slate900 }}>This Month</span>
                                    <ChevronDown size={14} color={COLORS.slate400} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', cursor: 'pointer' }}>
                                    <MapPin size={16} color={COLORS.slate600} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.slate900 }}>All Locations</span>
                                    <ChevronDown size={14} color={COLORS.slate400} />
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{ position: 'relative', width: 40, height: 40, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <Bell size={20} color={COLORS.slate600} />
                        <div style={{ position: 'absolute', top: 0, right: 2, width: 14, height: 14, background: COLORS.danger, borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff', fontWeight: 800 }}>5</div>
                    </div>

                    <div 
                        onClick={() => navigate('/leads')}
                        style={{ background: COLORS.brand, padding: isMobile ? '10px 16px' : '10px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}
                    >
                        <Plus size={18} /> Add Lead
                    </div>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="dash-stats-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <MetricCard title="Team Revenue" val={formatRevenue(bookings.total_value)} growth="+ 19.6%" icon={Layout} color="#6366f1" />
                <MetricCard title="Team Bookings" val={bookings.total || 0} growth="+ 16.6%" icon={Award} color="#8b5cf6" />
                <MetricCard title="Team Leads" val={leadsStat.active_leads || 0} growth="+ 13.9%" icon={Users} color="#3b82f6" />
                <MetricCard title="Avg. Conversion" val={`${leadsStat.win_rate || 0}%`} growth="+ 1.2%" icon={Target} color="#f59e0b" />
                <MetricCard title="Active Agents" val={`${members.filter(m => m.active_leads > 0).length} / ${members.length}`} detail="4 inactive" icon={Users} color="#6366f1" />
                <MetricCard title="Pipeline Value" val={formatRevenue(stats.pipeline?.value || 0)} growth="Active" icon={TrendingUp} color="#06b6d4" />
            </div>

            {/* Main Content Areas */}
            <div className="dash-charts-row" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                
                {/* Team Pipeline Overview */}
                <div style={{ ...KPI_STYLE, gridColumn: 'span 1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Team Pipeline Overview</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600, background: COLORS.slate100, padding: '4px 12px', borderRadius: '8px' }}>This Month vs Last Month <ChevronDown size={12} /></div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                        <PipelineMetric step="Leads" val={leadsStat.active_leads || 138} />
                        <PipelineDivider />
                        <PipelineMetric step="Calls" val={stats.telephony_stats?.calls_today || 122} />
                        <PipelineDivider />
                        <PipelineMetric step="Visits" val={stats.site_visits || 76} />
                        <PipelineDivider />
                        <PipelineMetric step="Bookings" val={bookings.total || 29} />
                        <PipelineDivider />
                        <PipelineMetric step="Revenue" val={formatRevenue(bookings.total_value) || '₹11.4L'} />
                    </div>

                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={CHART_DATA}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                />
                                <Line type="monotone" name="Leads" dataKey="leads" stroke={COLORS.brand} strokeWidth={3} dot={{ r: 4, fill: COLORS.brand, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                <Line type="monotone" name="Calls" dataKey="calls" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3, fill: COLORS.success, strokeWidth: 2, stroke: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Manager Insights */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Manager Insights</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.brand }}>View All →</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <InsightItem 
                            icon={TrendingUp} 
                            color="#10b981" 
                            title="Revenue Momentum" 
                            desc={bookings.total_value > 0 
                                ? `Team has generated ${formatRevenue(bookings.total_value)} this month. Keep it up!`
                                : `Focus on converting leads to bookings to hit the revenue target.`} 
                        />
                        <InsightItem 
                            icon={AlertCircle} 
                            color="#f59e0b" 
                            title="Follow-ups Pending" 
                            desc={overdue.overdue_count > 0 
                                ? `${overdue.overdue_count} payments or follow-ups are overdue. Review them now.`
                                : "No overdue follow-ups! Your team is on track."}
                            link={overdue.overdue_count > 0 ? "View Overdue →" : null}
                        />
                        <InsightItem 
                            icon={Target} 
                            color="#6366f1" 
                            title="Conversion Health" 
                            desc={`Your team's current win rate is ${leadsStat.win_rate || 0}%.`}
                            link="Review Strategy →"
                        />
                    </div>
                </div>

                {/* Team Performance */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Team Performance</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600, background: COLORS.slate100, padding: '4px 12px', borderRadius: '8px' }}>This Month <ChevronDown size={12} /></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {members.slice(0, 5).map((agent, i) => (
                            <AgentRow 
                                key={agent.id}
                                name={agent.name}
                                revenue={formatRevenue(agent.total_value)}
                                bookings={agent.bookings}
                                progress={Math.min(100, (agent.bookings / 10) * 100)}
                                color={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'][i % 5]}
                                avatar={agent.avatar}
                            />
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.brand, cursor: 'pointer' }}>View Full Team Performance →</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="dash-bottom-row" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1.3fr)', gap: isMobile ? '16px' : '32px' }}>
                
                {/* Deals Requiring Attention */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Deals Requiring Attention</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.brand }}>View All Deals →</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {activeDeals.length > 0 ? activeDeals.map((deal, idx) => (
                            <DealItem 
                                key={idx}
                                project={deal.project_name} 
                                config={deal.unit_no} 
                                agent={deal.agent_name || 'Assigned Agent'} 
                                status={deal.status} 
                                riskColor={deal.status === 'Cancelled' ? COLORS.danger : (deal.status === 'Pending' ? COLORS.warning : COLORS.success)} 
                                reason={formatRevenue(deal.total_amount)} 
                            />
                        )) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.slate400, fontSize: '0.8rem' }}>No recent deals found.</div>
                        )}
                    </div>
                </div>

                {/* Team Tasks */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Team Tasks</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600, background: COLORS.slate100, padding: '4px 12px', borderRadius: '8px' }}>Today <ChevronDown size={12} /></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TaskCounter label="Follow-ups" count={upcomingFollowups.length} sub={`${upcomingFollowups.filter(f => new Date(f.scheduled_at) < new Date()).length} overdue`} color={COLORS.success} />
                        <TaskCounter label="Site Visits" count={stats.site_visits || 0} sub="Scheduled" color={COLORS.brand} />
                        <TaskCounter label="New Leads" count={leadsStat.new_this_month || 0} sub="Unprocessed" color="#2dd4bf" />
                        <TaskCounter label="Pipeline Val" count={formatRevenue(pipeline.value)} sub="Active" color="#fbbf24" />
                    </div>
                </div>

                {/* Upcoming Activities */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Upcoming Activities</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.brand }}>View Calendar →</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {upcomingFollowups.slice(0, 3).map((f, idx) => (
                            <ActivityEntry 
                                key={f.id}
                                time={new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                icon={f.type === 'Call' ? Phone : Layout} 
                                title={f.type} 
                                sub={`${f.agent_name} • ${f.lead_name}`} 
                                action="Review"
                                isLast={idx === Math.min(upcomingFollowups.length, 3) - 1}
                            />
                        ))}
                        {upcomingFollowups.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.slate400, fontSize: '0.8rem' }}>No upcoming activities.</div>
                        )}
                    </div>
                </div>

                {/* Leaderboard */}
                <div style={{ gridColumn: isMobile ? 'span 1' : 'span 1' }}>
                    <LeaderboardWidget />
                </div>

            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                * { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                .tab-hover:hover { background: #f8fafc; }
            `}</style>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const MetricCard = ({ title, val, growth, detail, icon: Icon, color }: any) => (
    <div style={KPI_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '10px', background: `${color}10`, borderRadius: '12px', color: color }}>
                {Icon && <Icon size={20} />}
            </div>
            {growth && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.success }}>
                    <TrendingUp size={12} /> {growth} <span style={{ color: COLORS.slate400, fontWeight: 600 }}>vs last month</span>
                </div>
            )}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: COLORS.slate950 }}>{val}</div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: COLORS.slate600, marginTop: '2px' }}>{title}</div>
        {detail && <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.slate400, marginTop: '8px' }}>{detail}</div>}
    </div>
);

const PipelineMetric = ({ step, val }: any) => (
    <div>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: COLORS.slate950 }}>{val}</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 750, color: COLORS.slate400, textTransform: 'uppercase' }}>{step}</div>
    </div>
);

const PipelineDivider = () => (
    <div style={{ display: 'flex', alignItems: 'center', color: '#e2e8f0' }}>
        <ChevronRight size={20} />
    </div>
);

const InsightItem = ({ icon: Icon, color, title, desc, link }: any) => (
    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dotted #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <Icon size={16} color={color} />
            </div>
            <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>{title}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.slate600, marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
                {link && <div style={{ fontSize: '0.75rem', fontWeight: 750, color: COLORS.brand, marginTop: '8px', cursor: 'pointer' }}>{link}</div>}
            </div>
        </div>
    </div>
);

const AgentRow = ({ name, revenue, bookings, progress, color, avatar }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '4px 0' }}>
        <img src={avatar ? avatar : `https://ui-avatars.com/api/?name=${name}&background=random`} style={{ width: 34, height: 34, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>{name}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950 }}>{revenue}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate400 }}>{bookings}</span>
            </div>
            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: '3px' }} />
            </div>
        </div>
    </div>
);

const DealItem = ({ project, config, agent, status, riskColor, reason }: any) => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
             <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=100&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 850, color: COLORS.slate950 }}>{project} • <span style={{ color: COLORS.slate600 }}>{config}</span></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.slate600 }}>{agent}</div>
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: riskColor, background: `${riskColor}10`, padding: '3px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                    {status}
                </div>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.slate400, marginTop: '4px' }}>{reason}</div>
        </div>
    </div>
);

const TaskCounter = ({ label, count, sub, color }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: `1px solid #f1f5f9`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: color, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            {count}
        </div>
        <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>{label}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.danger }}>{sub}</div>
        </div>
    </div>
);

const ActivityEntry = ({ time, icon: Icon, title, sub, action, isLast }: any) => (
    <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: isLast ? 0 : '24px' }}>
        {!isLast && <div style={{ position: 'absolute', top: 32, left: 74, bottom: 8, width: '2px', background: '#f1f5f9' }} />}
        <div style={{ width: '60px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate400, paddingTop: '10px' }}>{time}</div>
        
        <div style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#fff', color: COLORS.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 850, color: COLORS.slate950 }}>{title}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.slate600 }}>{sub}</div>
            </div>
            <button style={{ padding: '6px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, cursor: 'pointer' }}>{action}</button>
        </div>
    </div>
);
