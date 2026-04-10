import React from 'react';
import { 
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Sparkles, Zap, Clock, ShieldCheck
} from 'lucide-react';

export default function TeamLeaderDashboardView({ user, data }) {
    const stats = data || {};
    const agents = stats.agents || [];
    const team_stats = stats.team_stats || {};

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
                    <h1 style={{ margin: 0, fontSize: '2.3rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-1.2px' }}>
                        Squad <span style={{ color: '#6366f1' }}>Tactical</span> Control
                    </h1>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>Real-time team auditing & behavioral coaching hub</p>
                </div>
                <div style={AI_BADGE} className="ai-pulse">
                    <Sparkles size={14} /> SQUAD SENTIMENT: OPTIMAL
                </div>
            </div>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                {[
                    { label: 'Team Pipeline', val: '₹12.4Cr', icon: Target, color: '#6366f1', bg: '#eef2ff' },
                    { label: 'Active Tasks', val: '42', icon: Activity, color: '#06b6d4', bg: '#ecfeff' },
                    { label: 'Lead Velocity', val: 'High', icon: TrendingUp, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Compliance Index', val: '98%', icon: ShieldCheck, color: '#8b5cf6', bg: '#f5f3ff' }
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '24px', marginBottom: '32px' }}>
                
                {/* AI Risk Radar */}
                <div className="wow-card" style={{ ...CARD_STYLE, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#ef4444' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Zap size={20} color="#ef4444" fill="#ef444420" /> Risk Intervention Radar
                        </h3>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '4px 12px', borderRadius: '12px' }}>URGENT ACTION</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(stats.risk_leads || []).map((lead, i) => (
                            <div key={i} style={{ padding: '16px', background: '#fcfdfe', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{lead.lead_name}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{lead.agent_name}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, borderLeft: '3px solid #ef444440', paddingLeft: '10px' }}>
                                    "{lead.note?.substring(0, 100)}..."
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Squad Skill Audit */}
                <div className="wow-card" style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sparkles size={20} color="#8b5cf6" /> Behavioral Talent Hunt
                        </h3>
                        <div style={AI_BADGE} className="ai-pulse">SKILL DETECTED</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(agents || []).map((agent, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'white', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#6366f115', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                                    {agent.name[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{agent.name}</div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#f5f3ff', color: '#6366f1', padding: '2px 8px', borderRadius: '6px' }}>Empathetic</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '6px' }}>Fast Closer</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b' }}>88%</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>Rapport</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
                {/* Squad Trending Inventory */}
                <div className="wow-card" style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="#06b6d4" /> Hot Mentions (Squad-wide)
                        </h3>
                        <div style={{ ...AI_BADGE, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>TRANSCRIPT AUDIT</div>
                    </div>
                    
                    <div style={{ height: '240px', width: '100%' }}>
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

                {/* Team Leader Insights */}
                <div className="wow-card" style={{ ...CARD_STYLE, background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <Sparkles size={20} color="#8b5cf6" />
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Tactical Coaching</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '8px' }}>Action Item</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 }}>
                                Review <strong>South Park</strong> call recordings for the junior squad. Sensitivity identified in pricing pitches.
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px' }}>Mentorship Alert</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 }}>
                                Senior agents are identifying <span style={{ color: '#10b981' }}>The Apex Tower</span> as the top choice for first-time buyers this week.
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                            <Clock size={32} color="#475569" style={{ opacity: 0.5 }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
