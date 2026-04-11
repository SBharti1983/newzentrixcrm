import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Sparkles, Zap, Clock, ChevronRight, PhoneCall,
    Award, ShieldAlert, Cpu, BarChart3, Fingerprint, Layers, Rocket, Globe, Boxes
} from 'lucide-react';
import SentimentHeatmap from '../components/SentimentHeatmap';

const COLORS = {
    indigo: '#6366f1',
    violet: '#8b5cf6',
    emerald: '#10b981',
    cyan: '#06b6d4',
    amber: '#f59e0b',
    rose: '#f43f5e',
    slate950: '#040d1a',
    slate900: '#0a1628',
    slate800: '#1e293b',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate50: '#f8fafc',
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(15, 23, 42, 0.9)'
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.manager-dashboard {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${COLORS.slate900};
    perspective: 1200px;
}

.premium-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 28px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.4);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
}

.premium-card:hover {
    transform: translateY(-8px) rotateX(1deg);
    box-shadow: 0 25px 50px rgba(0,0,0,0.07);
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.8);
}

.manager-header-gradient {
    background: linear-gradient(135deg, ${COLORS.slate950} 0%, ${COLORS.slate800} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.command-btn {
    padding: 12px 24px;
    border-radius: 16px;
    font-weight: 800;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

.command-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
}

@keyframes pulse-radar {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 0.4; }
    100% { transform: scale(0.95); opacity: 0.8; }
}

.radar-dot {
    animation: pulse-radar 2s infinite;
}

.shimmer-text {
    background: linear-gradient(90deg, #fff, #a855f7, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer-anim 3s linear infinite;
}

@keyframes shimmer-anim {
    to { background-position: 200% center; }
}
`;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ 
                background: COLORS.glassDark, backdropFilter: 'blur(20px)', 
                padding: '16px', borderRadius: '20px', 
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', minWidth: '160px'
            }}>
                <p style={{ margin: '0 0 8px', fontWeight: 900, fontSize: '0.85rem', color: '#fff' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: payload[0].color }} />
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{payload[0].value}</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>mentions</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function ManagerDashboardView({ user, data, telemetry }) {
    const navigate = useNavigate();
    const stats = data || {};
    const members = stats.members || [];
    const bookings = stats.bookings || {};
    const leads = stats.leads || {};
    
    // Telemetry Safe Fallbacks
    const leaderboard = telemetry?.leaderboard || [];

    const formatRevenue = (v) => {
        if (!v) return '₹0';
        const cr = Number(v) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)}Cr` : `₹${(Number(v)/100000).toFixed(1)}L`;
    };

    React.useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);

    return (
        <div className="manager-dashboard" style={{ padding: '32px 40px', minHeight: '100vh', background: '#f8fafc' }}>
            
            {/* 👑 Premium Command Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.emerald, boxShadow: `0 0 10px ${COLORS.emerald}` }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 850, color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            Executive Command Center
                        </span>
                    </div>
                    <h1 className="manager-header-gradient" style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-2px' }}>
                        Squad Performance <span style={{ color: COLORS.indigo }}>Radar</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: COLORS.slate500, fontSize: '1.1rem', fontWeight: 600 }}>
                        Synthesizing behavioral audits and market velocity for {user?.name || 'Director'}.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    <div className="command-btn">
                        <Users size={18} color={COLORS.indigo} strokeWidth={2.5} />
                        <span>{members.length} Agents</span>
                    </div>
                    <button className="command-btn" style={{ background: COLORS.slate950, color: 'white', border: 'none', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.2)' }}>
                        <Rocket size={18} strokeWidth={2.5} /> Deploy Strategy
                    </button>
                </div>
            </div>

            {/* 📊 Core KPIs with Glass Depth */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px', marginBottom: '40px' }}>
                {[
                    { label: 'Pipeline Velocity', val: formatRevenue(bookings.total_value), icon: Target, color: COLORS.indigo, sub: '↑ 14% vs last week' },
                    { label: 'Inbound Flow', val: leads.active_leads || 0, icon: Boxes, color: COLORS.cyan, sub: 'Active lead pool' },
                    { label: 'Conversion IQ', val: `${leads.win_rate || 0}%`, icon: Fingerprint, color: COLORS.emerald, sub: 'Squad-wide average' },
                    { label: 'Network Health', val: 'Elite', icon: Globe, color: COLORS.violet, sub: 'No critical alerts' }
                ].map((k, i) => (
                    <div key={i} className="premium-card" style={{ padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ 
                                width: 52, height: 52, borderRadius: '18px', background: `${k.color}10`, color: k.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 0 0 1px ${k.color}20`
                            }}>
                                <k.icon size={26} strokeWidth={2.5} />
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: COLORS.slate400, transform: 'rotate(45deg)' }}>
                                <Rocket size={14} />
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-1px' }}>{k.val}</div>
                        <div style={{ fontSize: '0.85rem', color: COLORS.slate900, fontWeight: 800, marginTop: '4px' }}>{k.label}</div>
                        <div style={{ fontSize: '0.75rem', color: k.color, fontWeight: 700, marginTop: '12px', opacity: 0.8 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* 🗺️ Global Sentiment Visualizer */}
            <div className="premium-card" style={{ padding: '32px', marginBottom: '40px', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-0.5px' }}>Sentiment Interaction Heatmap</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: COLORS.slate500, fontWeight: 500 }}>Correlating property mentions with customer rapport scores.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                         <div style={{ padding: '6px 14px', borderRadius: '10px', background: `${COLORS.indigo}10`, color: COLORS.indigo, fontSize: '0.75rem', fontWeight: 900 }}>REAL-TIME FEED</div>
                    </div>
                </div>
                <SentimentHeatmap data={stats.heatmap} />
            </div>

            {/* 🤖 AI Talent Audit & Risk Radar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px', marginBottom: '40px' }}>
                
                {/* AI Performance Audit */}
                 <div className="premium-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                                <Cpu size={24} color={COLORS.violet} strokeWidth={2.5} /> Squad Intelligence Audit
                            </h3>
                        </div>
                        <div style={{ 
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontSize: '0.7rem', fontWeight: 900, 
                            padding: '6px 16px', borderRadius: '12px', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' 
                        }}>
                             BEHAVIORAL DETECTION ON
                        </div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                            <thead>
                                <tr style={{ color: COLORS.slate400, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Tactical Unit (Agent)</th>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Engagement</th>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Sentiment Delta</th>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Closure Index</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: COLORS.slate400, fontWeight: 800 }}>Establishing secure link to agent data...</td></tr>
                                )}
                                {leaderboard.map((agent, i) => {
                                    const winRate = agent.total > 0 ? ((agent.positive / agent.total) * 100).toFixed(0) : 0;
                                    return (
                                        <tr key={i} style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '20px' }}>
                                            <td style={{ padding: '20px', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{ width: 44, height: 44, borderRadius: '14px', background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#f1f5f9', color: i === 0 ? '#fff' : COLORS.slate600, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '0.9rem', boxShadow: i === 0 ? '0 8px 16px rgba(245, 158, 11, 0.3)' : 'none' }}>
                                                        {i === 0 ? '🏆' : i + 1}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: COLORS.slate950 }}>{agent.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: COLORS.slate400, fontWeight: 700 }}>{agent.total} Conversations</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px', fontWeight: 800, color: COLORS.slate700 }}>
                                                {agent.total} calls
                                            </td>
                                            <td style={{ padding: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.emerald, fontWeight: 900, fontSize: '0.8rem' }}>
                                                    <TrendingUp size={14} /> {agent.positive} Positive
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ flex: 1, minWidth: '80px', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${winRate}%`, background: `linear-gradient(90deg, ${COLORS.indigo}, ${COLORS.cyan})`, borderRadius: '5px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.slate950 }}>{winRate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Risk Intervention Radar with Pulsing Ring */}
                <div className="premium-card" style={{ padding: '32px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, ${COLORS.rose}, ${COLORS.amber})` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="radar-dot" style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.rose, boxShadow: `0 0 15px ${COLORS.rose}` }} />
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-0.5px' }}>Friction Radar</h3>
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 950, color: COLORS.rose, background: `${COLORS.rose}10`, padding: '6px 12px', borderRadius: '10px', border: `1px solid ${COLORS.rose}20` }}>SCANNING INTERACTIONS</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(stats.alerts || []).length > 0 ? (stats.alerts || []).map((alert, i) => (
                            <div key={i} className="premium-card" style={{ padding: '20px', background: '#fff', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 950, color: COLORS.slate950 }}>{alert.lead_name}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 850, color: COLORS.rose }}>Agent: {alert.agent_name}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: COLORS.slate600, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, background: `${COLORS.slate50}`, padding: '12px', borderRadius: '12px' }}>
                                    "{alert.note?.substring(0, 100)}..."
                                </div>
                                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button style={{ background: 'transparent', border: 'none', color: COLORS.indigo, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Intervene Now <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.slate400 }}>
                                <ShieldAlert size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Interaction health is optimal. No behavioral friction detected.</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row - Supply/Demand & AI Coaching */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px' }}>
                
                {/* Property Trending Index */}
                <div className="premium-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                            <BarChart3 size={24} color={COLORS.cyan} strokeWidth={2.5} /> Market Velocity Index
                        </h3>
                        <div style={{ padding: '6px 14px', borderRadius: '10px', background: `${COLORS.cyan}10`, color: COLORS.cyan, fontSize: '0.75rem', fontWeight: 900 }}>30-DAY WINDOW</div>
                    </div>
                    
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.trends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate400, fontSize: 11, fontWeight: 900 }} dy={10} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="mentions" radius={[12, 12, 4, 4]} barSize={40}>
                                    {(stats.trends || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.cyan : COLORS.slate200} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Coaching Hub with Dark Premium Theme */}
                <div className="premium-card" style={{ padding: '32px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={24} color={COLORS.violet} />
                        </div>
                        <h3 className="shimmer-text" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, letterSpacing: '-0.5px' }}>Strategic Assets</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <Layers size={16} color={COLORS.violet} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.violet, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Squad Training</div>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
                                AI behavior sensors suggest focusing on <span style={{ color: COLORS.violet, fontWeight: 800 }}>"Closing Transitions"</span> this week based on detected hesitation.
                            </div>
                        </div>
                        
                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <Award size={16} color={COLORS.emerald} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.emerald, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inventory Velocity</div>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
                                <span style={{ color: COLORS.emerald, fontWeight: 800 }}>The Apex Tower</span> mentions are up 40%. Deploy additional inventory collateral to the squad's document hub.
                            </div>
                        </div>

                        <button style={{ 
                            marginTop: '10px', width: '100%', padding: '16px', borderRadius: '18px', border: 'none',
                            background: `linear-gradient(90deg, ${COLORS.indigo}, ${COLORS.violet})`, 
                            color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 12px 24px rgba(99, 102, 241, 0.3)', transition: 'all 0.3s ease'
                        }}>
                             Generate Full Squad Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
