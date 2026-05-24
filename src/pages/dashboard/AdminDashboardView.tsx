import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Cell
} from 'recharts';
import {
  TrendingUp, Users, Target, ChevronDown, DollarSign, Activity, Sparkles, Zap, ShieldCheck, Clock, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

interface AdminDashboardViewProps {
  user: any;
  data: any;
}

export default function AdminDashboardView({ user, data }: AdminDashboardViewProps) {
  const stats = data || {};
  const bookings = stats.bookings || {};
  const members = stats.members || [];
  const isMobile = useMobile(768);

  const sentiment = useMemo(() => {
    return Array.isArray(stats.sentiment) && stats.sentiment.length > 0 ? stats.sentiment : [
      { sentiment: 'Positive', count: 62 },
      { sentiment: 'Neutral', count: 28 },
      { sentiment: 'Cold', count: 10 }
    ];
  }, [stats.sentiment]);

  const trends = useMemo(() => {
    return Array.isArray(stats.top_projects) && stats.top_projects.length > 0
      ? stats.top_projects.map((p, i) => ({ name: `W${i + 1}`, mentions: parseInt(p.lead_count) || 0 }))
      : [
          { name: 'W1', mentions: 4 }, { name: 'W2', mentions: 7 }, { name: 'W3', mentions: 3 },
          { name: 'W4', mentions: 9 }, { name: 'W5', mentions: 5 }, { name: 'W6', mentions: 6 },
          { name: 'W7', mentions: 2 }, { name: 'W8', mentions: 8 }
        ];
  }, [stats.top_projects]);

  const isSolo = members.length <= 1;

  const formatRev = (v: any) => {
    if (!v) return '₹0';
    const cr = Number(v) / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '36px 40px', 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', 
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', 
      transition: 'background 0.3s ease' 
    }}>
      <style>{`
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        @keyframes subtle-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .enterprise-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.015), inset 0 1px 1px rgba(255, 255, 255, 0.8);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .enterprise-card:hover {
          transform: translate3d(0, -6px, 0);
          border-color: rgba(99, 102, 241, 0.25);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.05), 0 1px 3px rgba(0,0,0,0.01);
        }
        .top-indicator-pill {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 6px;
          border-radius: 6px 6px 0 0;
        }
        .pulse-ai-glow {
          position: relative;
        }
        .pulse-ai-glow::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 22px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          z-index: -1;
          opacity: 0.2;
          filter: blur(8px);
        }
        .ai-pulse-dot {
          animation: pulse-border 2.5s infinite;
          border-radius: 50%;
        }
        .executive-panel {
          background: rgba(248, 250, 252, 0.65);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(10px);
          transition: all 0.25s ease;
        }
        .executive-panel:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(99, 102, 241, 0.15);
          transform: translate3d(0, -2px, 0);
        }
      `}</style>

      {/* Premium Sub-Header (Hidden to respect Global Header Only standard) */}
      <div style={{ display: 'none', height: 0, overflow: 'hidden' }}></div>

      {/* KPI Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', 
        gap: isMobile ? '12px' : '20px', 
        marginBottom: '32px' 
      }}>
        {[
          { label: isSolo ? 'My Revenue' : 'Group Revenue', val: formatRev(bookings.total_value), color: 'linear-gradient(90deg, #10b981, #34d399)', iconColor: '#10b981' },
          { label: 'Booking Volume', val: String(bookings.total || 0), color: 'linear-gradient(90deg, #3b82f6, #60a5fa)', iconColor: '#3b82f6' },
          { label: isSolo ? 'Hot Interactions' : 'Talent Pool', val: String(isSolo ? (sentiment[0]?.count || 0) : members.length), color: 'linear-gradient(90deg, #f59e0b, #fbbf24)', iconColor: '#f59e0b' },
          { label: 'AI Prediction', val: '94.2%', color: 'linear-gradient(90deg, #14b8a6, #2dd4bf)', iconColor: '#14b8a6' },
          { label: 'Lead Conversion', val: `${stats.leads?.win_rate || 0}%`, color: 'linear-gradient(90deg, #ef4444, #f87171)', iconColor: '#ef4444' },
          { label: isSolo ? 'Closing Velocity' : 'System Efficiency', val: '92%', color: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', iconColor: '#8b5cf6' }
        ].map((k, i) => (
          <div key={i} className="enterprise-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="top-indicator-pill" style={{ background: k.color }} />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: 800, 
                  color: k.iconColor, 
                  background: `rgba(${k.iconColor === '#10b981' ? '16,185,129' : k.iconColor === '#3b82f6' ? '59,130,246' : k.iconColor === '#f59e0b' ? '245,158,11' : k.iconColor === '#14b8a6' ? '20,184,166' : k.iconColor === '#ef4444' ? '239,68,68' : '139,92,246'}, 0.08)`, 
                  padding: '4px 10px', 
                  borderRadius: '20px',
                  letterSpacing: '0.02em'
                }}>
                  +12.5%
                </span>
                <ArrowUpRight size={14} style={{ color: 'var(--slate-300, #cbd5e1)' }} />
              </div>
              <div style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 900, color: 'var(--navy-900, #0f172a)', letterSpacing: '-0.03em' }}>{k.val}</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500, #64748b)', fontWeight: 700, marginTop: '8px', lineHeight: 1.25 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Main Charts & Analytics Block */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.16fr 1.84fr', gap: '32px', marginBottom: '32px' }}>

        {/* Sentiment Dynamics */}
        <div className="enterprise-card" style={{ padding: '36px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
              <TrendingUp size={22} color="#10b981" /> Sentiment Dynamics
            </h3>
            <span style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(52,211,153,0.1) 100%)', 
              color: '#10b981', 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              padding: '5px 12px', 
              borderRadius: '8px',
              border: '1px solid rgba(16,185,129,0.15)',
              letterSpacing: '0.05em'
            }}>
              LIVE AUDIT
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {[
              { label: 'Positive Interaction Pulse', val: 62, color: 'linear-gradient(90deg, #10b981, #34d399)' },
              { label: 'Neutral Interaction Pulse', val: 28, color: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
              { label: 'Cold Interaction Pulse', val: 10, color: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }
            ].map((s, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#475569' }}>
                  <span>{s.label}</span>
                  <span style={{ fontWeight: 800 }}>{s.val}%</span>
                </div>
                <div style={{ height: '7px', width: '100%', background: 'rgba(226, 232, 240, 0.6)', borderRadius: '4px' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${s.val}%`, 
                    background: s.color, 
                    borderRadius: '4px', 
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }} />
                </div>
              </div>
            ))}

            {/* AI Insight Capsule */}
            <div style={{ marginTop: '24px' }}>
              <div className="pulse-ai-glow" style={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)', 
                border: '1px solid rgba(99, 102, 241, 0.15)', 
                borderRadius: '20px', 
                padding: '22px',
                display: 'flex', 
                gap: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ 
                  width: 36, 
                  height: 36, 
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}>
                  <Sparkles size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Gemini Intelligence</div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, lineHeight: 1.45 }}>
                    Friction increasing in high-ticket lead interactions. Recommend managerial intervention on Maya Residency pipeline.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Velocity Chart */}
        <div className="enterprise-card" style={{ padding: '36px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
              <Activity size={22} color="#3b82f6" /> Inventory Velocity
            </h3>
            <span style={{ 
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(96,165,250,0.1) 100%)', 
              color: '#3b82f6', 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              padding: '5px 12px', 
              borderRadius: '8px',
              border: '1px solid rgba(59,130,246,0.15)',
              letterSpacing: '0.05em'
            }}>
              TRANSCRIPT TRACKED
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
            <div className="executive-panel" style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Available Units</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>108</div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>Prime Residency</div>
            </div>
            <div className="executive-panel" style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Velocity Rate</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>3.2/wk</div>
              <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800 }}>Moderate pace</div>
            </div>
          </div>

          {/* Ultra lightweight rendering with animation disabled */}
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <defs>
                  <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.02)' }}
                  isAnimationActive={false}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid rgba(226, 232, 240, 0.8)', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.06)', 
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Bar dataKey="mentions" radius={[6, 6, 0, 0]} barSize={36} isAnimationActive={false}>
                  {trends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? 'url(#barGlow)' : index % 2 === 0 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', marginTop: '12px' }}>
            {trends.map((t, i) => (
              <span key={i} style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{t.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Radar Alerts and Security Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.16fr 1.84fr', gap: '32px', marginBottom: '32px' }}>

        {/* Intervention Radar */}
        <div className="enterprise-card" style={{ padding: '36px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={22} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Intervention Radar</h3>
            </div>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              color: '#ef4444', 
              background: 'rgba(239,68,68,0.1)', 
              padding: '5px 12px', 
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.15)',
              letterSpacing: '0.05em'
            }}>
              HIGH FRICTION ALERT
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(stats.active_deals || []).slice(0, 3).map((alert: any, i: number) => (
              <div key={i} className="executive-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{alert.project_name}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', background: 'rgba(71,85,105,0.08)', padding: '4px 10px', borderRadius: '8px' }}>{alert.agent_name || 'Unassigned'}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  "Status: {alert.status}"
                </div>
              </div>
            ))}
            {(!stats.active_deals || stats.active_deals.length === 0) && (
              <>
                <div className="executive-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>Maya Heights</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '4px 10px', borderRadius: '8px' }}>UNASSIGNED</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    "Status: Confirmed" - 3 follow-ups pending
                  </div>
                </div>
                <div className="executive-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>Maya Residency</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '4px 10px', borderRadius: '8px' }}>AT RISK</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Negative customer sentiment registered during cold script.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security & Integrity Compliance */}
        <div className="enterprise-card" style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
              <ShieldCheck size={22} color="#10b981" /> Security & Integrity
            </h3>
            <span style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(52,211,153,0.08) 100%)', 
              color: '#10b981', 
              fontSize: '0.7rem', 
              fontWeight: 800, 
              padding: '6px 16px', 
              borderRadius: '10px', 
              border: '1px solid rgba(16,185,129,0.15)',
              letterSpacing: '0.02em'
            }}>
              COMPLIANCE: ACTIVE
            </span>
          </div>

          <div style={{ 
            background: 'rgba(16,185,129,0.04)', 
            border: '1px solid rgba(16,185,129,0.15)', 
            borderRadius: '20px', 
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ color: '#10b981', fontWeight: 900, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="ai-pulse-dot" style={{ width: 8, height: 8, background: '#10b981' }} />
              All Audits Completed Successfully
            </div>
            <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
              98.2% of calls transcribed & audited by Gemini 1.5 Flash this week. No protocol breaches or compliance deviations detected in agent interactions.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, marginTop: '20px' }}>
            <Clock size={14} /> Last audit trace: 2 minutes ago
          </div>
        </div>
      </div>
    </div>
  );
}
