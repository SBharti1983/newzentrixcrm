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

export default function ManagerDashboardView({ user, data }) {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('This Month');
    
    const stats = data || {};
    const members = stats.members || [];
    const leadsStat = stats.leads || {};
    const bookings = stats.bookings || {};

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
                        Good afternoon, {user?.name || 'Ravi Kumar'} 👋 <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', background: '#eef2ff', color: COLORS.brand, borderRadius: '20px', marginLeft: '12px', verticalAlign: 'middle' }}>Manager Dashboard</span>
                    </h1>
                    <p style={{ margin: '4px 0 0', color: COLORS.slate600, fontSize: '0.9rem', fontWeight: 500 }}>Here's your team performance, pipeline health and priorities for this month.</p>
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
                    <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', cursor: 'pointer' }}>
                            <MapPin size={16} color={COLORS.slate600} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.slate900 }}>All Locations</span>
                            <ChevronDown size={14} color={COLORS.slate400} />
                        </div>
                    </div>

                    <div style={{ position: 'relative', width: 40, height: 40, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <Bell size={20} color={COLORS.slate600} />
                        <div style={{ position: 'absolute', top: 0, right: 2, width: 14, height: 14, background: COLORS.danger, borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff', fontWeight: 800 }}>5</div>
                    </div>

                    <div 
                        onClick={() => navigate('/leads')}
                        style={{ background: COLORS.brand, padding: '10px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                    >
                        <Plus size={18} /> Add Lead <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            {/* KPI Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <MetricCard title="Team Revenue" val={formatRevenue(bookings.total_value)} growth="+ 19.6%" icon={ award: Layout } color="#6366f1" />
                <MetricCard title="Team Bookings" val={bookings.total || 0} growth="+ 16.6%" icon={ award: Award } color="#8b5cf6" />
                <MetricCard title="Team Leads" val={leadsStat.active_leads || 0} growth="+ 13.9%" icon={ award: Users } color="#3b82f6" />
                <MetricCard title="Avg. Conversion" val={`${leadsStat.win_rate || 0}%`} growth="+ 1.2%" icon={ award: Target } color="#f59e0b" />
                <MetricCard title="Active Agents" val={`${members.filter(m => m.active_leads > 0).length} / ${members.length}`} detail="4 inactive this month" icon={ award: Users } color="#6366f1" />
            </div>

            {/* Main Content Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                
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
                                <Line type="monotone" name="This Month" dataKey="thisMonth" stroke={COLORS.brand} strokeWidth={3} dot={{ r: 4, fill: COLORS.brand, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                <Line type="monotone" name="Last Month" dataKey="lastMonth" stroke={COLORS.slate400} strokeWidth={2} strokeDasharray="5 5" dot={false} />
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
                            title="Great Progress!" 
                            desc={`Team revenue is ${leadsStat.win_rate > 10 ? '19.6%' : '10.2%'} higher than last month.`} 
                        />
                        <InsightItem 
                            icon={AlertCircle} 
                            color="#f59e0b" 
                            title="Follow-ups Pending" 
                            desc="12 leads haven't been followed up in 24 hrs."
                            link="View Leads →"
                        />
                        <InsightItem 
                            icon={Target} 
                            color="#6366f1" 
                            title="Focus Opportunity" 
                            desc="3 deals worth ₹2.6L are in proposal stage."
                            link="Review Deals →"
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
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1.3fr)', gap: '32px' }}>
                
                {/* Deals Requiring Attention */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Deals Requiring Attention</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.brand }}>View All Deals →</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <DealItem project="Skyline Heights" config="3 BHK" agent="Aarav Mehta" status="High Risk" riskColor={COLORS.danger} reason="No contact • 2 days" />
                        <DealItem project="Green Valley" config="2 BHK" agent="Rahul Verma" status="Follow-up Due" riskColor={COLORS.warning} reason="Due today" />
                        <DealItem project="Palm Springs" config="4 BHK" agent="Neha Patel" status="Proposal Pending" riskColor={COLORS.brand} reason="Since 3 days" />
                    </div>
                </div>

                {/* Team Tasks */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Team Tasks</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600, background: COLORS.slate100, padding: '4px 12px', borderRadius: '8px' }}>Today <ChevronDown size={12} /></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TaskCounter label="Follow-ups" count={5} sub="2 overdue" color={COLORS.success} />
                        <TaskCounter label="Site Visits" count={8} sub="1 rescheduled" color={COLORS.brand} />
                        <TaskCounter label="Call Reports" count={3} sub="Pending submission" color="#2dd4bf" />
                        <TaskCounter label="Deal Updates" count={2} sub="Awaiting approval" color="#fbbf24" />
                    </div>
                </div>

                {/* Upcoming Activities */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Upcoming Activities</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.brand }}>View Calendar →</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        <ActivityEntry 
                            time="11:00 AM" 
                            icon={Layout} 
                            title="Site Visit" 
                            sub="Rahul & Priya • Skyline Heights" 
                            action="Confirm"
                        />
                        <ActivityEntry 
                            time="02:30 PM" 
                            icon={Phone} 
                            title="Follow-up Call" 
                            sub="Aman Gupta • Green Valley" 
                            action="Call"
                        />
                        <ActivityEntry 
                            isLast
                            time="04:00 PM" 
                            icon={Users} 
                            title="Client Meeting" 
                            sub="InvestCorp • Project Discussion" 
                            action="Join"
                        />
                    </div>
                </div>

                {/* Leaderboard */}
                <div style={KPI_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLORS.slate950 }}>Leaderboard</h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600, background: COLORS.slate100, padding: '4px 12px', borderRadius: '8px' }}>This Month <ChevronDown size={12} /></div>
                    </div>
                    
                    {/* Podium */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '10px' }}>
                         {/* 2nd */}
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <img src={`https://ui-avatars.com/api/?name=${members[1]?.name || 'Priya'}&background=random`} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -10, left: 12, width: 20, height: 20, background: '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800 }}>2</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{members[1]?.name?.split(' ')[0] || 'Priya'}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate900 }}>{formatRevenue(members[1]?.total_value || 280000)}</div>
                        </div>
                        {/* 1st */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Crown size={24} color="#fbbf24" fill="#fbbf24" style={{ position: 'absolute', top: -18, left: 16 }} />
                                <img src={`https://ui-avatars.com/api/?name=${members[0]?.name || 'Aman'}&background=random`} style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #fbbf24', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -8, left: 24, width: 24, height: 24, background: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 800 }}>1</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{members[0]?.name?.split(' ')[0] || 'Aman'}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate900 }}>{formatRevenue(members[0]?.total_value || 390000)}</div>
                        </div>
                        {/* 3rd */}
                        <div style={{ textAlign: 'center' }}>
                             <div style={{ position: 'relative' }}>
                                <img src={`https://ui-avatars.com/api/?name=${members[2]?.name || 'Anil'}&background=random`} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', marginBottom: '6px' }} />
                                <div style={{ position: 'absolute', top: -10, left: 12, width: 20, height: 20, background: '#f59e0b90', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800 }}>3</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{members[2]?.name?.split(' ')[0] || 'Anil'}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate900 }}>{formatRevenue(members[2]?.total_value || 230000)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        {members.slice(3, 5).map((m, i) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate400, width: 12 }}>{i + 4}</span>
                                    <img src={`https://ui-avatars.com/api/?name=${m.name}`} style={{ width: 24, height: 24, borderRadius: '6px' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.slate800 }}>{m.name}</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950 }}>{formatRevenue(m.total_value)}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.brand, cursor: 'pointer' }}>View Full Leaderboard →</span>
                    </div>
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

const MetricCard = ({ title, val, growth, detail, icon: Icon, color }) => (
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

const PipelineMetric = ({ step, val }) => (
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

const InsightItem = ({ icon: Icon, color, title, desc, link }) => (
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

const AgentRow = ({ name, revenue, bookings, progress, color, avatar }) => (
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

const DealItem = ({ project, config, agent, status, riskColor, reason }) => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
             <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=100&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 850, color: COLORS.slate950 }}>{project} • <span style={{ color: COLORS.slate500 }}>{config}</span></div>
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

const TaskCounter = ({ label, count, sub, color }) => (
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

const ActivityEntry = ({ time, icon: Icon, title, sub, action, isLast }) => (
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
