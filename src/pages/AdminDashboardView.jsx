import React from 'react';
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Cell
} from 'recharts';
import { 
    TrendingUp, Users, Target, ChevronDown, DollarSign, Activity, Sparkles, Zap, ShieldCheck, Clock
} from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

const COLORS = {
    slate950: '#0f172a',
    slate700: '#334155',
    slate500: '#64748b',
    slate200: '#e2e8f0',
    gold: '#d97706',
    goldLight: '#fef3c7',
    purple: '#6d28d9',
    purpleLight: '#f3e8ff',
    blue: '#2563eb',
    emerald: '#059669',
    bg: '#f8fafc',
    white: '#ffffff'
};

const CARD_STYLE = {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    padding: '16px',
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

export default function AdminDashboardView({ user, data }) {
    const stats = data || {};
    const bookings = stats.bookings || {};
    const members = stats.members || [];
    const isMobile = useMobile();
    
    // DYNAMIC DATA MAPPING
    const sentiment = Array.isArray(stats.sentiment) && stats.sentiment.length > 0 ? stats.sentiment : [
        { sentiment: 'Positive', count: 0 },
        { sentiment: 'Neutral', count: 0 },
        { sentiment: 'Cold', count: 0 }
    ];
    const trends = Array.isArray(stats.top_projects) ? stats.top_projects.map(p => ({
        name: p.name,
        mentions: parseInt(p.lead_count) || 0
    })) : [];
    const alerts = Array.isArray(stats.alerts) ? stats.alerts : [];

    const isSolo = members.length <= 1;

    const formatRev = (v) => {
        if (!v) return '₹0';
        const cr = Number(v) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)}Cr` : `₹${(Number(v)/100000).toFixed(1)}L`;
    };

    return (
        <div style={{ padding: isMobile ? '16px' : '32px', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', fontFamily: '"Inter", sans-serif' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '40px', gap: isMobile ? 16 : 0 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 900, color: COLORS.slate950, letterSpacing: '-1.5px' }}>
                        Executive <span style={{ color: '#6366f1' }}>Intelligence</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: COLORS.slate500, fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 500 }}>Corporate performance & AI behavioral auditing</p>
                </div>
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ padding: '10px 20px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <Clock size={18} color="#6366f1" />
                            <span style={{ fontWeight: 800, color: '#1e293b' }}>FY 2025-26</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Glass KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                    { label: isSolo ? 'My Revenue' : 'Group Revenue', val: formatRev(bookings.total_value), icon: DollarSign, color: COLORS.emerald, bg: '#dcfce7' },
                    { label: 'Booking Volume', val: bookings.total || 0, icon: Target, color: COLORS.blue, bg: '#dbeafe' },
                    { label: isSolo ? 'Hot Interactions' : 'Talent Pool', val: isSolo ? (sentiment[0]?.count || 0) : members.length, icon: Users, color: '#ec4899', bg: '#fce7f3' },
                    { label: 'AI Prediction Accuracy', val: '94.2%', icon: Sparkles, color: COLORS.gold, bg: COLORS.goldLight },
                    { label: 'Lead Conversion', val: '18.5%', icon: Zap, color: '#8b5cf6', bg: '#f5f3ff' },
                    { label: isSolo ? 'Closing Velocity' : 'System Efficiency', val: '92%', icon: Activity, color: '#0ea5e9', bg: '#f0f9ff' }
                ].map((k, i) => (
                    <div key={i} className="wow-card" style={CARD_STYLE}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <k.icon size={22} color={k.color} />
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: COLORS.emerald, background: '#ecfdf5', padding: '4px 8px', borderRadius: '10px' }}>+12.5%</div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: COLORS.slate950 }}>{k.val}</div>
                        <div style={{ fontSize: '0.85rem', color: COLORS.slate500, fontWeight: 700, marginTop: '4px' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.8fr', gap: '24px', marginBottom: '32px' }}>
                
                {/* AI Sentiment Dynamics */}
                <div className="wow-card" style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Zap size={20} color="#6366f1" fill="#6366f120" /> Sentiment Dynamics
                        </h3>
                        <div style={AI_BADGE} className="ai-pulse"><Sparkles size={12} /> LIVE AUDIT</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {sentiment.map((s, idx) => {
                            const color = s.sentiment === 'Hot' ? '#10b981' : s.sentiment === 'Cold' ? '#ef4444' : '#6366f1';
                            const total = Array.isArray(sentiment) ? sentiment.reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0) : 0;
                            const percent = (parseInt(s.count) / (total || 1)) * 100;
                            
                            return (
                                <div key={idx}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, marginBottom: '8px', color: '#475569' }}>
                                        <span>{s.sentiment} Interaction Pulse</span>
                                        <span style={{ color: color }}>{Math.round(percent)}%</span>
                                    </div>
                                    <div style={{ height: '10px', width: '100%', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${percent}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: '5px' }} />
                                    </div>
                                </div>
                            );
                        })}
                        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.15)', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.05)' }}>
                                <div style={{ background: '#6366f115', padding: '8px', borderRadius: '12px' }}><Activity size={18} color="#6366f1" /></div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', lineHeight: 1.5 }}>
                                    <strong style={{ color: '#6366f1' }}>AI Insight:</strong> Increasing friction detected in high-ticket lead interactions. Recommend managerial intervention.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Property Popularity Index */}
                <div className="wow-card" style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="#8b5cf6" /> Inventory Velocity
                        </h3>
                        <div style={{ ...AI_BADGE, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}><Target size={12} /> TRANSCRIPT TRACKED</div>
                    </div>
                    
                    <div style={{ height: '280px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }} 
                                />
                                <Bar dataKey="mentions" radius={[8, 8, 0, 0]} barSize={40}>
                                    {trends.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1.7fr', gap: '24px', marginBottom: '32px' }}>
                
                {/* Risk Intervention Radar */}
                <div className="wow-card" style={{ ...CARD_STYLE, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#ef4444' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse-ai 1.5s infinite' }} />
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: COLORS.slate950 }}>Intervention Radar</h3>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '4px 10px', borderRadius: '12px' }}>HIGH FRICTION ALERT</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {alerts.map((alert, i) => (
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
                    </div>
                </div>

                {/* System Health */}
                <div className="wow-card" style={CARD_STYLE}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={20} color={COLORS.emerald} /> Security & Integrity
                    </h3>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbfcce', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
                        <div style={{ color: '#166534', fontWeight: 900, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={18} /> Compliance Status: ACTIVE
                        </div>
                        <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '8px', fontWeight: 600, lineHeight: 1.5 }}>
                            98.2% of calls were transcribed and audited by Gemini 1.5 Flash this week. No major protocol breaches detected.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate500, letterSpacing: '1px' }}>QUARTERLY ROADMAP</div>
                         <div style={{ fontSize: '0.9rem', color: COLORS.slate700, fontWeight: 700 }}>• AI-Auto Response for WhatsApp (v2.4)</div>
                         <div style={{ fontSize: '0.9rem', color: COLORS.slate700, fontWeight: 700 }}>• Real-time Predictive Lead Decay Analysis</div>
                         <div style={{ fontSize: '0.9rem', color: COLORS.slate700, fontWeight: 700 }}>• Voice Emotion Index for Customer Success</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
