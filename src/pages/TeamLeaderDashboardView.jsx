import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Clock, ChevronDown, 
    Bell, Search, Plus, MapPin, Phone, MessageSquare, 
    ChevronRight, CheckCircle, AlertCircle, Layout, Crown, Award, Zap
} from 'lucide-react';

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

const CHART_DATA = [
  { name: 'May 1', thisMonth: 4, lastMonth: 3 },
  { name: 'May 6', thisMonth: 6, lastMonth: 5 },
  { name: 'May 11', thisMonth: 5, lastMonth: 7 },
  { name: 'May 16', thisMonth: 8, lastMonth: 6 },
  { name: 'May 21', thisMonth: 9, lastMonth: 8 },
  { name: 'May 26', thisMonth: 11, lastMonth: 9 },
  { name: 'May 31', thisMonth: 14, lastMonth: 10 },
];

const KPI_STYLE = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    flex: 1
};

export default function TeamLeaderDashboardView({ user, data }) {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('This Month');
    
    const stats = data || {};
    const members = stats.agents || [];
    const team_stats = stats.team_stats || {};

    const formatRevenue = (v) => {
        if (!v) return '₹0';
        const cr = Number(v) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(1)}Cr` : `₹${(Number(v)/100000).toFixed(1)}L`;
    };

    return (
        <div style={{ padding: '24px 32px', background: COLORS.bg, minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: COLORS.slate950, letterSpacing: '-0.5px' }}>
                        Good afternoon, {user?.name || 'Squad Leader'} 👋 <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', background: '#eef2ff', color: COLORS.brand, borderRadius: '20px', marginLeft: '12px', verticalAlign: 'middle' }}>Team Leader Dashboard</span>
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
                <MetricCard title="Squad Revenue" val={formatRevenue(team_stats.total_revenue)} growth="+ 22.4%" icon={ award: Layout } color="#6366f1" />
                <MetricCard title="Squad Bookings" val={team_stats.total_bookings || 0} growth="+ 12%" icon={ award: Award } color="#8b5cf6" />
                <MetricCard title="Active Leads" val={team_stats.active_leads || 0} growth="+ 8.4%" icon={ award: Users } color="#3b82f6" />
                <MetricCard title="Lead Velocity" val="High" growth="Optimal" icon={ award: TrendingUp } color="#10b981" />
                <MetricCard title="Active Agents" val={`${members.length} Agents`} detail="All squads online" icon={ award: Users } color="#6366f1" />
                <MetricCard title="Market Index" val="92.4" growth="+ 3.2%" icon={ award: Target } color="#06b6d4" />
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
                        <PipelineMetric step="Leads" val={team_stats.active_leads || 42} />
                        <PipelineDivider />
                        <PipelineMetric step="Calls" val={Math.floor(members.length * 15)} />
                        <PipelineDivider />
                        <PipelineMetric step="Visits" val={team_stats.site_visits || 14} />
                        <PipelineDivider />
                        <PipelineMetric step="Bookings" val={team_stats.total_bookings || 8} />
                    </div>

                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={CHART_DATA}>
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
                                revenue={formatRevenue(agent.revenue || 0)}
                                bookings={agent.bookings || 0}
                                progress={Math.min(100, (agent.bookings / 5) * 100)}
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
                        {(stats.risk_leads || []).slice(0, 3).map((lead, i) => (
                             <DealItem 
                                key={i}
                                project={lead.lead_name} 
                                agent={lead.agent_name} 
                                status="High Risk" 
                                riskColor={COLORS.danger} 
                                reason={lead.note || "No contact today"} 
                            />
                        ))}
                         {(!stats.risk_leads || stats.risk_leads.length === 0) && (
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
                        <ActivityEntry 
                            time="10:00 AM" 
                            icon={Users} 
                            title="Daily Huddle" 
                            sub="Squad Alpha • Strategy Sync" 
                            action="Join"
                        />
                        <ActivityEntry 
                            time="01:00 PM" 
                            icon={Phone} 
                            title="Call Support" 
                            sub="Aarav Mehta • Live Coaching" 
                            action="Listen"
                        />
                        <ActivityEntry 
                            isLast
                            time="04:30 PM" 
                            icon={Layout} 
                            title="Site Visit Audit" 
                            sub="Skyline Heights • Lead QC" 
                            action="Audit"
                        />
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
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{members[1]?.name?.split(' ')[0] || '-'}</div>
                        </div>
                        {/* 1st */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Crown size={24} color="#fbbf24" fill="#fbbf24" style={{ position: 'absolute', top: -18, left: 16 }} />
                                <img src={`https://ui-avatars.com/api/?name=${members[0]?.name || 'Leader'}&background=random`} style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #fbbf24', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -8, left: 24, width: 24, height: 24, background: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 800 }}>1</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{members[0]?.name?.split(' ')[0] || '-'}</div>
                        </div>
                        {/* 3rd */}
                        <div style={{ textAlign: 'center' }}>
                             <div style={{ position: 'relative' }}>
                                <img src={`https://ui-avatars.com/api/?name=${members[2]?.name || 'Agent'}&background=random`} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -10, left: 12, width: 20, height: 20, background: '#f59e0b90', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800 }}>3</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{members[2]?.name?.split(' ')[0] || '-'}</div>
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
            `}</style>
        </div>
    );
}

// --- SUB-COMPONENTS (Simplified for TL Dashboard) ---

const MetricCard = ({ title, val, growth, detail, icon: Icon, color }) => (
    <div style={KPI_STYLE}>
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

const PipelineMetric = ({ step, val }) => (
    <div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950 }}>{val}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 750, color: COLORS.slate400 }}>{step}</div>
    </div>
);

const PipelineDivider = () => <div style={{ display: 'flex', alignItems: 'center', color: '#e2e8f0' }}><ChevronRight size={16} /></div>;

const InsightItem = ({ icon: Icon, color, title, desc, link }) => (
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

const AgentRow = ({ name, revenue, bookings, progress, color }) => (
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

const DealItem = ({ project, agent, status, riskColor, reason }) => (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{project}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: riskColor }}>{status}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: COLORS.slate500 }}>Agent: {agent}</div>
        <div style={{ fontSize: '0.7rem', color: COLORS.danger, fontWeight: 700, marginTop: '4px' }}>{reason}</div>
    </div>
);

const TaskCounter = ({ label, count, sub, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}10`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{count}</div>
        <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: '0.65rem', color: COLORS.slate400 }}>{sub}</div>
        </div>
    </div>
);

const ActivityEntry = ({ time, icon: Icon, title, sub, action, isLast }) => (
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
