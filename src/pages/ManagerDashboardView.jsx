import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Sparkles, Zap, Clock, ChevronRight, PhoneCall
} from 'lucide-react';
import SentimentHeatmap from '../components/SentimentHeatmap';

export default function ManagerDashboardView({ user, data, telemetry }) {
    const navigate = useNavigate();
    const stats = data || {};
    const members = stats.members || [];
    const bookings = stats.bookings || {};
    const leads = stats.leads_stats || {};

    const formatRevenue = (v) => {
        if (!v) return '₹0';
        const cr = Number(v) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)}Cr` : `₹${(Number(v)/100000).toFixed(1)}L`;
    };

    // Telemetry Safe Fallbacks
    const sentimentSpread = telemetry?.sentimentSpread || { Positive: 0, Neutral: 0, Negative: 0, Concerned: 0 };
    const leaderboard = telemetry?.leaderboard || [];

    const sentimentData = [
        { name: 'Positive', value: sentimentSpread.Positive, color: '#10b981' }, // Emerald
        { name: 'Neutral', value: sentimentSpread.Neutral, color: '#3b82f6' }, // Blue
        { name: 'Concerned', value: sentimentSpread.Concerned, color: '#f59e0b' }, // Amber
        { name: 'Negative', value: sentimentSpread.Negative, color: '#f43f5e' } // Rose
    ].filter(d => d.value > 0);

    const CARD_STYLE = {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    };

    const AI_BADGE = {
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        color: 'white',
        fontSize: '10px',
        fontWeight: 900,
        padding: '4px 10px',
        borderRadius: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    };

    return (
        <div style={{ padding: '32px', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', fontFamily: '"Inter", sans-serif' }}>
            <style>{`
                @keyframes pulse-ai {
                    0% { transform: scale(1); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
                    50% { transform: scale(1.05); box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5); }
                    100% { transform: scale(1); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
                }
                .wow-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08) !important;
                }
                .ai-pulse { animation: pulse-ai 2s infinite; }
            `}</style>

            {/* Premium Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1.2px' }}>
                        Operational <span style={{ color: '#8b5cf6' }}>Command</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>Squad performance management & behavioral auditing</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                     <div style={{ padding: '10px 20px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <Users size={18} color="#8b5cf6" />
                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{members.length} Agents Online</span>
                    </div>
                </div>
            </div>

            {/* KPI Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                {[
                    { label: 'Pipeline Value', val: formatRevenue(bookings.total_value), icon: Target, color: '#6366f1', bg: '#eef2ff' },
                    { label: 'Active Leads', val: leads.active_leads || 0, icon: Activity, color: '#06b6d4', bg: '#ecfeff' },
                    { label: 'Booking Ratio', val: `${leads.win_rate || 0}%`, icon: TrendingUp, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Squad Health', val: 'Exceptional', icon: Sparkles, color: '#8b5cf6', bg: '#f5f3ff' }
                ].map((k, i) => (
                    <div key={i} className="wow-card" style={CARD_STYLE}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <k.icon size={22} color={k.color} />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{k.val}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                {/* Global Sentiment Heatmap */}
                <div style={{ gridColumn: 'span 2' }}>
                    <SentimentHeatmap data={stats.heatmap} />
                </div>
            </div>

            {/* Middle Section: Top Agents & Alert Radar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px', marginBottom: '32px' }}>
                
                {/* AI Talent Map */}
                 <div className="wow-card" style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Zap size={20} color="#8b5cf6" fill="#8b5cf620" /> Agent "Super-Coach" Audit
                        </h3>
                        <div style={AI_BADGE} className="ai-pulse"><Sparkles size={12} /> SKILL DETECTION</div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Agent</th>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Total Calls</th>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Positive Conversations</th>
                                    <th style={{ textAlign: 'left', padding: '0 16px' }}>Win Rate (Telephony)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No call data available</td></tr>
                                )}
                                {leaderboard.map((agent, i) => {
                                    const winRate = agent.total > 0 ? ((agent.positive / agent.total) * 100).toFixed(0) : 0;
                                    return (
                                        <tr key={i} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <td style={{ padding: '16px', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ minWidth: 36, height: 36, borderRadius: '10px', background: '#8b5cf615', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>
                                                        {i === 0 ? '👑' : `#${i + 1}`}
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{agent.name}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 600, color: '#64748b' }}>
                                                {agent.total}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', background: '#ecfdf5', color: '#10b981', borderRadius: '8px' }}>
                                                    {agent.positive} Positive
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '100px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${winRate}%`, background: winRate > 50 ? '#10b981' : '#f59e0b', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{winRate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Risk Intervention Radar */}
                <div className="wow-card" style={{ ...CARD_STYLE, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#ef4444' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse-ai 1.5s infinite' }} />
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Intervention Radar</h3>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '4px 10px', borderRadius: '12px' }}>HIGH FRICTION DETECTED</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(stats.alerts || []).map((alert, i) => (
                            <div key={i} style={{ padding: '16px', background: '#fcfdfe', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{alert.lead_name}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{alert.agent_name}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, borderLeft: '3px solid #ef444440', paddingLeft: '10px' }}>
                                    "{alert.note?.substring(0, 85)}..."
                                </div>
                            </div>
                        ))}
                        {(!stats.alerts || stats.alerts.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                <Sparkles size={32} color="#e2e8f0" style={{ marginBottom: '16px' }} />
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>All squad interactions are optimal.</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
                 {/* Property Trending Index */}
                <div className="wow-card" style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="#06b6d4" /> Market Velocity Index
                        </h3>
                        <div style={{ ...AI_BADGE, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}><Target size={12} /> SQUAD TRENDS</div>
                    </div>
                    
                    <div style={{ height: '280px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.trends || []}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }} 
                                />
                                <Bar dataKey="mentions" radius={[8, 8, 0, 0]} barSize={40}>
                                    {(stats.trends || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Coaching Insights */}
                <div className="wow-card" style={{ ...CARD_STYLE, background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <Sparkles size={20} color="#8b5cf6" />
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Strategic Assets</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '8px' }}>Squad Training</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 }}>
                                AI suggests focusing on <span style={{ color: '#8b5cf6' }}>"Closing Transitions"</span> this week based on detected hesitation in late-stage calls.
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px' }}>Trending Inventory</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 }}>
                                <span style={{ color: '#10b981' }}>The Apex Tower</span> is driving 60% of all transcript mentions today. Prep your squad for high volume.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
