import React from 'react';
import { 
    BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import { 
    TrendingUp, Users, Target, Activity, Sparkles, Zap, Clock, ShieldCheck,
    Sword, ShieldAlert, Cpu, Award, ZapOff, CheckCircle2, ChevronRight, Fingerprint
} from 'lucide-react';

const COLORS = {
    indigo: '#6366f1',
    violet: '#8b5cf6',
    emerald: '#10b981',
    cyan: '#06b6d4',
    rose: '#f43f5e',
    amber: '#f59e0b',
    slate950: '#040d1a',
    slate900: '#0a1628',
    slate800: '#1e293b',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate50: '#f8fafc',
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassDark: 'rgba(15, 23, 42, 0.92)'
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.tl-dashboard {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${COLORS.slate900};
    perspective: 1200px;
}

.premium-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 28px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.03), inset 0 0 0 1.5px rgba(255,255,255,0.4);
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    overflow: hidden;
}

.premium-card:hover {
    transform: translateY(-8px) scale(1.005);
    box-shadow: 0 25px 50px rgba(0,0,0,0.08);
}

.shimmer-ai {
    background: linear-gradient(90deg, rgba(255,255,255,0), rgba(99, 102, 241, 0.1), rgba(255,255,255,0));
    background-size: 200% 100%;
    animation: shimmer-anim 3s infinite linear;
}

@keyframes shimmer-anim {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes pulse-emerald {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.emerald-pulse { animation: pulse-emerald 2s infinite; }
`;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ 
                background: COLORS.glassDark, backdropFilter: 'blur(20px)', 
                padding: '14px', borderRadius: '18px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)', minWidth: '140px'
            }}>
                <p style={{ margin: '0 0 8px', fontWeight: 900, fontSize: '0.8rem', color: '#fff', textTransform: 'uppercase' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: payload[0].color }} />
                    <span style={{ fontSize: '1rem', fontWeight: 950, color: '#fff' }}>{payload[0].value}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function TeamLeaderDashboardView({ user, data }) {
    const stats = data || {};
    const agents = stats.members || []; 
    const kpis = stats.leads || {}; 

    React.useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);

    return (
        <div className="tl-dashboard" style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* ⚔️ Tactical Command Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <Sword size={20} color={COLORS.indigo} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.indigo, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            Squad Tactical Control
                        </span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-2px' }}>
                        Frontline <span style={{ color: COLORS.indigo }}>Intelligence</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: COLORS.slate500, fontSize: '1.1rem', fontWeight: 600 }}>
                        Monitoring behavioral audits and squad-wide rapaport velocity.
                    </p>
                </div>
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', background: `${COLORS.emerald}10`, 
                    padding: '12px 24px', borderRadius: '20px', border: `1.5px solid ${COLORS.emerald}20` 
                }}>
                    <div className="emerald-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.emerald }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.emerald, textTransform: 'uppercase' }}>
                        SQUAD SENTIMENT: OPTIMAL
                    </span>
                </div>
            </div>

            {/* 📈 Tactical KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px', marginBottom: '40px' }}>
                {[
                    { label: 'Team Pipeline', val: '₹14.2Cr', icon: Target, color: COLORS.indigo, bg: '#eef2ff' },
                    { label: 'Live Engagement', val: agents.length || 0, icon: Activity, color: COLORS.cyan, bg: '#ecfeff' },
                    { label: 'Conversion Delta', val: 'High', icon: TrendingUp, color: COLORS.emerald, bg: '#f0fdf4' },
                    { label: 'Behavioral Index', val: '98%', icon: ShieldCheck, color: COLORS.violet, bg: '#f5f3ff' }
                ].map((k, i) => (
                    <div key={i} className="premium-card" style={{ padding: '28px' }}>
                        <div style={{ 
                            width: 52, height: 52, borderRadius: '18px', background: k.bg, color: k.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                            boxShadow: `inset 0 0 0 1px ${k.color}15`
                        }}>
                            <k.icon size={26} strokeWidth={2.5} />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-1.2px' }}>{k.val}</div>
                        <div style={{ fontSize: '0.85rem', color: COLORS.slate500, fontWeight: 750, marginTop: '4px' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '32px', marginBottom: '40px' }}>
                
                {/* 🛡️ Risk Intervention Radar */}
                <div className="premium-card" style={{ padding: '32px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: `linear-gradient(90deg, ${COLORS.rose}, ${COLORS.amber})` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                            <ShieldAlert size={26} color={COLORS.rose} strokeWidth={2.5} /> High Friction Radar
                        </h3>
                        <div style={{ fontSize: '0.7rem', fontWeight: 950, color: COLORS.rose, background: `${COLORS.rose}10`, padding: '6px 14px', borderRadius: '12px', border: `1px solid ${COLORS.rose}25` }}>
                            URGENT LOGS
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(stats.alerts || []).length > 0 ? (stats.alerts || []).map((lead, i) => (
                            <div key={i} className="premium-card" style={{ padding: '20px', background: '#fff', border: '1.2px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.slate950 }}>{lead.lead_name}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.rose }}>Agent: {lead.agent_name}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: COLORS.slate600, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.6, background: COLORS.slate50, padding: '14px', borderRadius: '14px', borderLeft: `3px solid ${COLORS.rose}40` }}>
                                    "{lead.note?.substring(0, 110)}..."
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.slate400 }}>
                                <CheckCircle2 size={56} style={{ opacity: 0.1, marginBottom: '20px' }} />
                                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>No frontline friction detected. Squad is stable.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🧬 Squad Behavioral Audit */}
                <div className="premium-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                            <Cpu size={24} color={COLORS.violet} strokeWidth={2.5} /> Talent Detection Matrix
                        </h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.violet, className: 'ai-pulse' }} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(agents.slice(0, 5) || []).map((agent, i) => (
                            <div key={i} className="shimmer-ai" style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '16px', background: 'rgba(255,255,255,0.5)', borderRadius: '24px', border: '1.2px solid #f1f5f9' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '16px', background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.cyan})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 950, fontSize: '1rem', boxShadow: '0 6px 12px rgba(99, 102, 241, 0.2)' }}>
                                    {agent.name[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900, fontSize: '1rem', color: COLORS.slate950 }}>{agent.name}</div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, background: `${COLORS.violet}10`, color: COLORS.violet, padding: '4px 10px', borderRadius: '8px' }}>Empathetic</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, background: `${COLORS.emerald}10`, color: COLORS.emerald, padding: '4px 10px', borderRadius: '8px' }}>High Intent</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 950, color: COLORS.slate950 }}>{(85 + (i * 2))}%</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.slate400, textTransform: 'uppercase' }}>Rapport</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px' }}>
                {/* 📉 Squad Demand Tracker */}
                <div className="premium-card" style={{ padding: '36px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                            <TrendingUp size={24} color={COLORS.cyan} strokeWidth={2.5} /> Hot Mentions Index
                        </h3>
                        <div style={{ fontSize: '0.75rem', fontWeight: 950, color: COLORS.cyan, background: `${COLORS.cyan}10`, padding: '6px 16px', borderRadius: '12px', border: `1px solid ${COLORS.cyan}25` }}>TRANSCRIPT AUDIT</div>
                    </div>
                    
                    <div style={{ height: '260px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.trends || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate400, fontSize: 11, fontWeight: 900 }} dy={10} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="mentions" radius={[12, 12, 4, 4]} barSize={44}>
                                    {(stats.trends || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.cyan : COLORS.slate200} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 🧠 Tactical Coaching Pulse */}
                <div className="premium-card" style={{ padding: '36px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '34px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={24} color={COLORS.violet} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, letterSpacing: '-0.5px' }}>Tactical Assets</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <Zap size={16} color={COLORS.violet} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 950, color: COLORS.violet, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SQUAD TRAINING</div>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
                                Review <span style={{ color: COLORS.white, fontWeight: 800 }}>The Apex Tower</span> call logs for the junior squad. Sensitivity identified in closing pitches.
                            </div>
                        </div>
                        
                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <CheckCircle2 size={16} color={COLORS.emerald} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 950, color: COLORS.emerald, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SQUAD MOMENTUM</div>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
                                Overall squad sentiment is up <span style={{ color: COLORS.emerald, fontWeight: 900 }}>12%</span> this week. Recommend individual shout-outs for performance.
                            </div>
                        </div>

                        <button style={{ 
                            marginTop: '10px', width: '100%', padding: '16px', borderRadius: '18px', border: 'none',
                            background: `linear-gradient(90deg, ${COLORS.indigo}, ${COLORS.violet})`, 
                            color: 'white', fontWeight: 950, fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 12px 24px rgba(99, 102, 241, 0.4)', transition: 'all 0.3s ease'
                        }}>
                             Deploy Squad Briefing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
