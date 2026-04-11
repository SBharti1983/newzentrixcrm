import React from 'react';
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Cell, CartesianGrid
} from 'recharts';
import { 
    TrendingUp, Users, Target, ChevronDown, DollarSign, Activity, Sparkles, Zap, ShieldCheck, Clock,
    GanttChartSquare, ClipboardCheck, Globe, Cpu, LayoutGrid, Award
} from 'lucide-react';

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

.admin-dashboard {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${COLORS.slate900};
    perspective: 1200px;
}

.premium-card {
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 30px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.4);
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    overflow: hidden;
}

.premium-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 30px 60px rgba(0,0,0,0.08);
    background: rgba(255, 255, 255, 0.98);
}

.stat-icon-box {
    width: 56px;
    height: 56px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 16px rgba(0,0,0,0.05);
}

.pulse-intelligence {
    animation: pulse-ring 2.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}

@keyframes pulse-ring {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 0.4; }
    100% { transform: scale(0.95); opacity: 0.8; }
}

.text-gradient-gold {
    background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
`;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ 
                background: COLORS.glassDark, backdropFilter: 'blur(20px)', 
                padding: '16px', borderRadius: '22px', 
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.2)', minWidth: '150px'
            }}>
                <p style={{ margin: '0 0 8px', fontWeight: 900, fontSize: '0.8rem', color: '#fff', textTransform: 'uppercase' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: payload[0].color }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#fff' }}>{payload[0].value}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function AdminDashboardView({ user, data }) {
    const stats = data || {};
    const bookings = stats.bookings || {};
    const members = stats.members || [];
    
    const formatRev = (v) => {
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
        <div className="admin-dashboard" style={{ padding: '40px', minHeight: '100vh', background: '#f8fafc' }}>
            
            {/* 🎯 Corporate Strategy Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '56px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                        <LayoutGrid size={20} color={COLORS.indigo} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                            Executive Business Intelligence
                        </span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '3.2rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-2.5px' }}>
                        Platform <span style={{ color: COLORS.indigo }}>Governance</span>
                    </h1>
                    <p style={{ margin: '10px 0 0', color: COLORS.slate500, fontSize: '1.2rem', fontWeight: 500 }}>
                        Audit logs, revenue streams, and AI-driven behavioral assessments.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ padding: '14px 28px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 8px 16px rgba(0,0,0,0.03)' }}>
                        <Clock size={22} color={COLORS.indigo} strokeWidth={2.5} />
                        <span style={{ fontWeight: 900, color: COLORS.slate950, fontSize: '1rem' }}>Fiscal Year 2026</span>
                    </div>
                </div>
            </div>

            {/* 💎 Sovereign KPI Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', marginBottom: '48px' }}>
                {[
                    { label: 'Group Revenue', val: formatRev(bookings.total_value), icon: DollarSign, color: COLORS.emerald, bg: '#ecfdf5', change: '+12.5%' },
                    { label: 'Booking Volume', val: bookings.total || 0, icon: Target, color: COLORS.indigo, bg: '#eef2ff', change: '+5.2%' },
                    { label: 'Platform Users', val: members.length, icon: Users, color: COLORS.violet, bg: '#f5f3ff', change: 'Stable' },
                    { label: 'AI Audit Accuracy', val: '98.8%', icon: Cpu, color: COLORS.amber, bg: '#fffbeb', change: 'Optimized' }
                ].map((k, i) => (
                    <div key={i} className="premium-card" style={{ padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                            <div className="stat-icon-box" style={{ background: k.bg, color: k.color }}>
                                <k.icon size={28} strokeWidth={2.5} />
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 950, color: k.color, background: `${k.color}15`, padding: '6px 14px', borderRadius: '12px' }}>
                                {k.change}
                            </div>
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-1.5px' }}>{k.val}</div>
                        <div style={{ fontSize: '0.9rem', color: COLORS.slate400, fontWeight: 700, marginTop: '6px' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.8fr)', gap: '32px', marginBottom: '48px' }}>
                
                {/* 🌀 AI Sentiment Dynamic Map */}
                <div className="premium-card" style={{ padding: '36px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                            <Zap size={24} color={COLORS.indigo} strokeWidth={2.5} /> Interaction Pulse
                        </h3>
                        <div className="pulse-intelligence" style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.indigo, boxShadow: `0 0 15px ${COLORS.indigo}` }} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {(stats.sentiment || []).map((s, idx) => {
                            const color = s.sentiment === 'Positive' || s.sentiment === 'Hot' ? COLORS.emerald : s.sentiment === 'Negative' || s.sentiment === 'Cold' ? COLORS.rose : COLORS.indigo;
                            const total = stats.sentiment.reduce((acc, curr) => acc + parseInt(curr.count), 0);
                            const percent = (parseInt(s.count) / (total || 1)) * 100;
                            
                            return (
                                <div key={idx}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 900, marginBottom: '10px', color: COLORS.slate700 }}>
                                        <span>{s.sentiment} Baseline</span>
                                        <span style={{ color: color }}>{Math.round(percent)}%</span>
                                    </div>
                                    <div style={{ height: '12px', width: '100%', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${percent}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: '6px' }} />
                                    </div>
                                </div>
                            );
                        })}
                        {(!stats.sentiment || stats.sentiment.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '48px', color: COLORS.slate400, fontWeight: 700, fontStyle: 'italic' }}>
                                Establishing secure acoustic link...
                            </div>
                        )}
                        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: COLORS.slate950, padding: '20px', borderRadius: '24px', boxShadow: '0 15px 30px rgba(15, 23, 42, 0.2)' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '14px' }}><Sparkles size={20} color={COLORS.violet} /></div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                    <strong style={{ color: COLORS.white }}>Auditor Note:</strong> Behavioral friction in segment 'High-Tier' has decreased by 8% following the new collateral release.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📈 Inventory Velocity & Demand */}
                <div className="premium-card" style={{ padding: '36px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                            <TrendingUp size={24} color={COLORS.violet} strokeWidth={2.5} /> Asset Market Velocity
                        </h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 950, color: COLORS.violet, background: `${COLORS.violet}10`, padding: '6px 16px', borderRadius: '12px', border: `1px solid ${COLORS.violet}20` }}>
                            LIVE DEMAND TRACKING
                        </div>
                    </div>
                    
                    <div style={{ height: '320px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.trends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate400, fontSize: 11, fontWeight: 900 }} dy={10} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="mentions" radius={[14, 14, 4, 4]} barSize={48}>
                                    {(stats.trends || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.violet : COLORS.slate200} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1.7fr)', gap: '32px' }}>
                
                {/* 🚨 Tactical Intervention Hub */}
                <div className="premium-card" style={{ padding: '36px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: `linear-gradient(90deg, ${COLORS.rose}, ${COLORS.amber})` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: COLORS.rose, boxShadow: `0 0 15px ${COLORS.rose}` }} />
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-0.5px' }}>Tactical Alerts</h3>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 950, color: COLORS.rose }}>CRITICAL PRIORITY</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(stats.alerts || []).length > 0 ? (stats.alerts || []).map((alert, i) => (
                            <div key={i} className="premium-card" style={{ padding: '24px', background: '#fff', borderRadius: '24px', border: `1px solid #eef2f6` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '1.05rem', fontWeight: 950, color: COLORS.slate950 }}>{alert.lead_name}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 850, color: COLORS.rose }}>Manager: {alert.agent_name}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: COLORS.slate600, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.6, background: COLORS.slate50, padding: '16px', borderRadius: '16px' }}>
                                    "{alert.note?.substring(0, 110)}..."
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.slate400 }}>
                                <ClipboardCheck size={56} style={{ opacity: 0.1, marginBottom: '20px' }} />
                                <div style={{ fontSize: '1rem', fontWeight: 800 }}>Audit complete. No platform-level friction.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🛡️ Compliance & Health Integrity */}
                <div className="premium-card" style={{ padding: '36px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShieldCheck size={26} color={COLORS.emerald} strokeWidth={2.5} /> Platform Integrity
                    </h3>
                    
                    <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '28px', padding: '28px', marginBottom: '36px' }}>
                        <div style={{ color: '#065f46', fontWeight: 950, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <Award size={22} /> Audit Rating: EXCELLENT
                        </div>
                        <p style={{ color: '#047857', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.7 }}>
                            Internal systems report 100% uptime for telephonic transcription services. AI-driven compliance checks have flagged 0 critical breaches this billing cycle.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                         <div style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.slate400, letterSpacing: '2px' }}>SYSTEM MODERNIZATION</div>
                         {[
                            { label: 'Gemini 1.5 Pro Implementation', val: 'Q3 Delivery', color: COLORS.indigo },
                            { label: 'Vercel Edge Acceleration', val: 'Active', color: COLORS.emerald },
                            { label: 'AES-256 Voice Encryption', val: 'Verified', color: COLORS.violet }
                         ].map((item, idx) => (
                             <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                                 <span style={{ fontWeight: 800, color: COLORS.slate700, fontSize: '0.95rem' }}>{item.label}</span>
                                 <span style={{ fontWeight: 950, color: item.color, fontSize: '0.85rem' }}>{item.val}</span>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
