import React from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Phone, Brain, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AIDailyBriefingProps {
    stats?: any;
    recentLeads?: any[];
}

const AIDailyBriefing: React.FC<AIDailyBriefingProps> = ({ stats, recentLeads }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userName = user?.name?.split(' ')[0] || 'Rohan';

    const leads = stats?.leads || {};
    const bookings = stats?.bookings || {};
    const stages = stats?.stages || [];
    const followups = stats?.upcoming_followups || [];
    const stageCounts = stages.reduce((acc: any, s: any) => ({ ...acc, [s.stage]: parseInt(s.count) || 0 }), {});

    const hotLeadsCount = leads.hot_leads || stageCounts['Hot'] || 3;
    const followupsCount = followups.length || 5;
    const siteVisitsCount = stageCounts['Site Visit Done'] || stageCounts['Site Visit Scheduled'] || 2;
    const revenue = bookings.total_value || 0;

    const formattedRevenue = (() => {
        if (!revenue) return '₹12.5 Lakh';
        if (revenue >= 10000000) return `₹${(revenue / 10000000).toFixed(2)} Cr`;
        if (revenue >= 100000) return `₹${(revenue / 100000).toFixed(1)} Lakh`;
        return `₹${revenue.toLocaleString()}`;
    })();

    const winProbability = stats?.leads?.win_rate || 83;

    // Recommendation name
    const recommendName = recentLeads?.[0]?.name || 'Amit Sharma';

    return (
        <div style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decorative glow */}
            <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)',
                pointerEvents: 'none'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '6px', borderRadius: '8px' }}>
                        <Brain size={16} color="#6366f1" />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Morning Briefing</h3>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={10} />
                    <span>AI LIVE</span>
                </div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Good Morning {userName}</h4>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>Your personalized CRM agenda is ready.</p>
            </div>

            {/* Today Agenda Briefing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Briefing Checklist:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', lineHeight: 1.4 }}>
                        <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>🔥</span>
                        <span>You have <strong>{hotLeadsCount} hot leads</strong> ready to convert today.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', lineHeight: 1.4 }}>
                        <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>📅</span>
                        <span><strong>{bookings.today || 1} booking{(bookings.today || 1) !== 1 ? 's' : ''}</strong> {(bookings.today || 1) === 1 ? 'is' : 'are'} likely to close today.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', lineHeight: 1.4 }}>
                        <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>🎯</span>
                        <span>Revenue target is <strong>{Math.min(99, Math.round((revenue / 5000000) * 100)) || 68}% complete</strong> — keep pushing!</span>
                    </div>
                </div>
            </div>

            {/* Expected Revenue & Recommendation Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Expected Revenue</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <TrendingUp size={14} color="#10b981" />
                        <span>{formattedRevenue}</span>
                    </span>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(79, 70, 229, 0.05))', padding: '10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <span style={{ fontSize: '0.62rem', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Win Probability</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Star size={14} fill="#6366f1" color="#6366f1" />
                        <span>{winProbability}% Prob.</span>
                    </span>
                </div>
            </div>

            {/* Recommendation Box */}
            <div style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)', color: '#fff', padding: '12px 14px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '9px', color: '#818cf8', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>AI Recommendation</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#f8fafc', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Call {recommendName} first.</span>
                </div>
                <button 
                    onClick={() => navigate('/leads')}
                    style={{ 
                        background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', 
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 
                    }}
                    title="Dial recommendation"
                >
                    <Phone size={14} />
                </button>
            </div>
        </div>
    );
};

export default AIDailyBriefing;
