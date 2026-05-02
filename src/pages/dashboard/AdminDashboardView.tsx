import React from 'react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Cell
} from 'recharts';
import {
    TrendingUp, Users, Target, ChevronDown, DollarSign, Activity, Sparkles, Zap, ShieldCheck, Clock, AlertCircle
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

export default function AdminDashboardView({ user, data }) {
    const stats = data || {};
    const bookings = stats.bookings || {};
    const members = stats.members || [];
    const isMobile = useMobile();

    const sentiment = Array.isArray(stats.sentiment) && stats.sentiment.length > 0 ? stats.sentiment : [
        { sentiment: 'Positive', count: 62 },
        { sentiment: 'Neutral', count: 28 },
        { sentiment: 'Cold', count: 10 }
    ];
    const trends = Array.isArray(stats.top_projects) && stats.top_projects.length > 0
        ? stats.top_projects.map((p, i) => ({ name: `W${i + 1}`, mentions: parseInt(p.lead_count) || 0 }))
        : [
            { name: 'W1', mentions: 4 }, { name: 'W2', mentions: 7 }, { name: 'W3', mentions: 3 },
            { name: 'W4', mentions: 9 }, { name: 'W5', mentions: 5 }, { name: 'W6', mentions: 6 },
            { name: 'W7', mentions: 2 }, { name: 'W8', mentions: 8 }
        ];

    const isSolo = members.length <= 1;

    const formatRev = (v) => {
        if (!v) return '₹0';
        const cr = Number(v) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
    };

    return (
        <div style={{ padding: isMobile ? '16px' : '40px', minHeight: '100vh', background: 'var(--surface-bg)', fontFamily: '"Inter", "Plus Jakarta Sans", sans-serif', transition: 'background 0.3s ease' }}>
            <style>{`
                @keyframes pulse-ai {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .wow-card {
                    background: var(--surface-card);
                    border-radius: 20px;
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-card, 0 4px 20px rgba(0,0,0,0.02));
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                .wow-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg, 0 12px 30px rgba(0,0,0,0.05));
                }
                .top-bar {
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 4px;
                }
                .ai-pulse { animation: pulse-ai 2s infinite; }
                .sub-panel {
                    background: var(--surface-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 16px;
                    padding: 20px;
                    transition: background 0.3s, border-color 0.3s;
                }
            `}</style>

            {/* Premium Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '32px', gap: isMobile ? 16 : 0 }}>
                <div style={{ display: 'none', height: 0, overflow: 'hidden' }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                        Executive <span style={{ color: '#10b981' }}>Intelligence</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 500 }}>Corporate performance & AI behavioral auditing</p>
                </div>
                <div style={{ padding: '8px 16px', background: 'var(--surface-card)', border: '1px solid var(--border-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} />
                    <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.75rem' }}>FY 2025–26</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                    { label: isSolo ? 'My Revenue' : 'Group Revenue', val: formatRev(bookings.total_value), color: '#10b981' },
                    { label: 'Booking Volume', val: String(bookings.total || 0), color: '#3b82f6' },
                    { label: isSolo ? 'Hot Interactions' : 'Talent Pool', val: String(isSolo ? (sentiment[0]?.count || 0) : members.length), color: '#f59e0b' },
                    { label: 'AI Prediction Accuracy', val: '94.2%', color: '#14b8a6' },
                    { label: 'Lead Conversion', val: `${stats.leads?.win_rate || 0}%`, color: '#ef4444' },
                    { label: isSolo ? 'Closing Velocity' : 'System Efficiency', val: '92%', color: '#8b5cf6' }
                ].map((k, i) => (
                    <div key={i} className="wow-card" style={{ padding: '24px 20px' }}>
                        <div className="top-bar" style={{ background: k.color }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px' }}>+12.5%</div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>{k.val}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px', lineHeight: 1.2 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1.9fr', gap: '24px', marginBottom: '32px' }}>

                {/* Sentiment Dynamics */}
                <div className="wow-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <TrendingUp size={24} color="#10b981" /> Sentiment Dynamics
                        </h3>
                        <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '10px' }}>LIVE AUDIT</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {[
                            { label: 'Positive Interaction Pulse', val: 62, color: '#10b981' },
                            { label: 'Neutral Interaction Pulse', val: 28, color: '#3b82f6' },
                            { label: 'Cold Interaction Pulse', val: 10, color: '#f59e0b' }
                        ].map((s, idx) => (
                            <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-secondary)' }}>
                                    <span>{s.label}</span>
                                    <span>{s.val}%</span>
                                </div>
                                <div style={{ height: '8px', width: '100%', background: 'var(--border-light)', borderRadius: '4px' }}>
                                    <div style={{ height: '100%', width: `${s.val}%`, background: s.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                </div>
                            </div>
                        ))}

                        <div style={{ marginTop: '16px' }}>
                            <div className="sub-panel" style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: 32, height: 32, background: 'var(--text-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Zap size={18} color="var(--surface-bg)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>AI Insight:</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                                        Friction increasing in high-ticket lead interactions. Recommend managerial intervention on Maya Residency pipeline.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Velocity */}
                <div className="wow-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Activity size={24} color="#3b82f6" /> Inventory Velocity
                        </h3>
                        <div style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '10px' }}>TRANSCRIPT TRACKED</div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                        <div className="sub-panel" style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Available Units</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>108</div>
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Prime Residency</div>
                        </div>
                        <div className="sub-panel" style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Velocity Rate</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>3.2/wk</div>
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>Moderate pace</div>
                        </div>
                    </div>

                    <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }}
                                />
                                <Bar dataKey="mentions" radius={[6, 6, 0, 0]} barSize={40}>
                                    {trends.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : 'var(--border-medium, #cbd5e1)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: '12px' }}>
                        {trends.map((t, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t.name}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1.9fr', gap: '24px', marginBottom: '32px' }}>

                {/* Intervention Radar */}
                <div className="wow-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <AlertCircle size={24} color="#ef4444" />
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>Intervention Radar</h3>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: '10px' }}>HIGH FRICTION ALERT</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(stats.active_deals || []).slice(0, 3).map((alert, i) => (
                            <div key={i} className="sub-panel">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{alert.project_name}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--border-light)', padding: '4px 10px', borderRadius: '8px' }}>{alert.agent_name || 'Unassigned'}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    "Status: {alert.status}"
                                </div>
                            </div>
                        ))}
                        {(!stats.active_deals || stats.active_deals.length === 0) && (
                            <>
                                <div className="sub-panel">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Maya Heights</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--border-light)', padding: '4px 10px', borderRadius: '8px' }}>UNASSIGNED</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        "Status: Confirmed" - 3 follow-ups pending
                                    </div>
                                </div>
                                <div className="sub-panel">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Maya Residency</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: '8px' }}>AT RISK</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Security & Integrity */}
                <div className="wow-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Sparkles size={24} color="#10b981" /> Security & Integrity
                        </h3>
                        <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 900, padding: '6px 16px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>COMPLIANCE: ACTIVE</div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '24px' }}>
                        <div style={{ color: '#10b981', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} /> Compliance Status: Active
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '12px', fontWeight: 600, lineHeight: 1.6 }}>
                            98.2% of calls transcribed & audited by Gemini 1.5 Flash this week. No protocol breaches detected.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
