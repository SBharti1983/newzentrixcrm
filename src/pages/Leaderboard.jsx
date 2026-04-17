import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { analyticsApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import { Trophy, TrendingUp, Phone, Users, CheckCircle, MapPin, Award, ChevronRight } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

export default function Leaderboard() {
    const isMobile = useMobile();
    const [range, setRange] = useState('6months');
    
    // Fetch analytics data using the existing analytics endpoint
    const { data: analyticsData, loading, error, refetch } = useApi(() => analyticsApi.get({ range }), [range]);

    const leaderboard = useMemo(() => {
        if (!analyticsData?.agentPerformance) return [];
        
        let merged = analyticsData.agentPerformance.map(agent => {
            const callData = analyticsData.agentCalls?.find(c => c.name === agent.name);
            const rawRevenue = parseFloat(agent.revenue.replace(/[^0-9.]/g, '')) || 0;
            const revNum = agent.revenue.includes('Cr') ? rawRevenue * 10000000 : agent.revenue.includes('L') ? rawRevenue * 100000 : rawRevenue;
            
            // Assume an average 1.5% commission cut for gamification bounds
            const estimatedCommission = revNum * 0.015;

            return {
                ...agent,
                calls: callData ? callData.calls : 0,
                revenueNum: revNum,
                commissionVal: estimatedCommission,
                commissionFormatted: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(estimatedCommission)
            };
        });
        
        // Sort by conversions (won) as primary, then revenue as secondary
        merged.sort((a, b) => {
            if (b.conversions !== a.conversions) return b.conversions - a.conversions;
            return b.revenueNum - a.revenueNum;
        });
        
        return merged;
    }, [analyticsData]);

    if (loading && !analyticsData) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn">
            {/* Header section with Glassmorphism */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                borderRadius: '24px',
                padding: isMobile ? '24px 20px' : '24px 32px',
                marginBottom: isMobile ? '24px' : '40px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '20px'
            }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--navy-900)', margin: 0, fontWeight: 950, fontSize: isMobile ? '1.25rem' : '1.8rem', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                        <Trophy size={isMobile ? 24 : 32} color="var(--accent-violet)" /> 
                        Hall of Fame
                    </h1>
                    <p style={{ color: 'var(--navy-600)', marginTop: '4px', marginBottom: 0, fontWeight: 600, fontSize: isMobile ? '0.8rem' : '1rem' }}>
                        Performance IQ & Commission Hub
                    </p>
                </div>
                
                <select 
                    className="form-control" 
                    value={range} 
                    onChange={e => setRange(e.target.value)}
                    style={{ width: isMobile ? '100%' : '180px', background: 'white', borderRadius: '12px', height: 44 }}
                >
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="thisyear">This Year</option>
                </select>
            </div>

            {/* Top 3 Podium */}
            {leaderboard.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: isMobile ? 'flex-start' : 'center',
                    alignItems: 'flex-end',
                    gap: isMobile ? 12 : 24,
                    marginBottom: isMobile ? '32px' : '50px',
                    minHeight: isMobile ? 'auto' : '280px',
                    paddingTop: '20px',
                    overflowX: isMobile ? 'auto' : 'visible',
                    paddingBottom: isMobile ? 12 : 0,
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none'
                }} className="no-scrollbar">
                    {/* Rank 2 - Silver */}
                    {leaderboard[1] && <Podium agent={leaderboard[1]} rank={2} height={isMobile ? 140 : 180} isMobile={isMobile} />}
                    
                    {/* Rank 1 - Gold */}
                    {leaderboard[0] && <Podium agent={leaderboard[0]} rank={1} height={isMobile ? 180 : 240} isMobile={isMobile} />}
                    
                    {/* Rank 3 - Bronze */}
                    {leaderboard[2] && <Podium agent={leaderboard[2]} rank={3} height={isMobile ? 120 : 150} isMobile={isMobile} />}
                </div>
            )}

            {/* The rest of the leaderboard */}
            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 100 }}>
                    {leaderboard.map((agent, index) => (
                        <div key={agent.name} className="glass-card" style={{ padding: 20, borderRadius: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ 
                                        width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, color: 'var(--navy-600)', fontSize: '0.9rem'
                                    }}>
                                        #{index + 1}
                                    </div>
                                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', background: `linear-gradient(135deg, hsl(${index * 40 + 200}, 70%, 60%), hsl(${index * 40 + 240}, 70%, 50%))` }}>
                                        {agent.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{agent.name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--accent-emerald-dark)' }}>{agent.commissionFormatted}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>EST. PAYOUT</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px', background: 'var(--slate-50)', borderRadius: 16 }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Won</div>
                                    <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{agent.conversions} Deals</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Site Visits</div>
                                    <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{agent.site_visits} Conducted</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                    <th>Agent Name</th>
                                    <th>Conversions</th>
                                    <th>Revenue Vault</th>
                                    <th>Est. Commissions</th>
                                    <th>Site Visits</th>
                                    <th>Milestone Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((agent, index) => (
                                    <tr key={agent.name} style={{ transition: 'all 0.2s' }}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                            <div style={{ 
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: index === 0 ? 'rgba(234, 179, 8, 0.15)' : 
                                                            index === 1 ? 'rgba(148, 163, 184, 0.15)' : 
                                                            index === 2 ? 'rgba(180, 83, 9, 0.15)' : 'var(--bg-secondary)',
                                                color: index === 0 ? '#eab308' : 
                                                    index === 1 ? '#64748b' : 
                                                    index === 2 ? '#b45309' : 'var(--text-secondary)'
                                            }}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className="avatar" style={{ 
                                                    background: `linear-gradient(135deg, hsl(${index * 40 + 200}, 70%, 60%), hsl(${index * 40 + 240}, 70%, 50%))` 
                                                }}>
                                                    {agent.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{agent.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircle size={16} color="var(--accent-emerald)" />
                                                <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{agent.conversions}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 900, color: 'var(--slate-400)', fontSize: '0.85rem' }}>
                                                {agent.revenue} Closed
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-emerald-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={16} /> {agent.commissionFormatted}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                                <MapPin size={14} /> {agent.site_visits} Conducted
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--navy-800)' }}>Next Tier: ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0}).format(((agent.commissionVal || 100000) * 1.5) + 50000)}</div>
                                                <div style={{ width: '100px', height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: '75%', height: '100%', background: 'var(--accent-amber)', borderRadius: '3px' }}></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}{leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                                            <Award size={48} color="var(--border-light)" style={{ marginBottom: '16px' }} />
                                            <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No performance data available for the selected period</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Podium component for top 3
function Podium({ agent, rank, height, isMobile }) {
    const isGold = rank === 1;
    const isSilver = rank === 2;
    const isBronze = rank === 3;
    
    // Using rich premium colors
    const color = isGold ? '#eab308' : isSilver ? '#94a3b8' : '#d97706';
    const bgGradient = isGold ? 'linear-gradient(135deg, #fef08a, #eab308)' : 
                       isSilver ? 'linear-gradient(135deg, #e2e8f0, #94a3b8)' : 
                       'linear-gradient(135deg, #fcd34d, #d97706)';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: isMobile ? '110px' : '130px',
            flexShrink: 0,
            animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            animationFillMode: 'both',
            animationDelay: `${rank * 0.15}s`
        }}>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes floatAvatar {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>
            
            {/* Avatar & Name */}
            <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                marginBottom: isMobile ? '8px' : '16px', zIndex: 10,
                animation: isGold ? 'floatAvatar 4s ease-in-out infinite' : 'none'
            }}>
                {isGold && <Trophy size={isMobile ? 24 : 32} color={color} style={{ marginBottom: '4px', filter: 'drop-shadow(0 4px 6px rgba(234, 179, 8, 0.4))' }} />}
                
                <div style={{
                    width: isGold ? (isMobile ? '60px' : '80px') : (isMobile ? '48px' : '64px'),
                    height: isGold ? (isMobile ? '60px' : '80px') : (isMobile ? '48px' : '64px'),
                    borderRadius: '50%',
                    background: bgGradient,
                    padding: '3px',
                    boxShadow: `0 10px 25px ${color}40`,
                    marginBottom: '12px'
                }}>
                    <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isGold ? '1.5rem' : '1.2rem', fontWeight: 800, color: 'var(--navy-900)'
                    }}>
                        {agent.name.substring(0, 2).toUpperCase()}
                    </div>
                </div>
                
                <span style={{ fontWeight: 800, color: 'var(--navy-900)', textAlign: 'center', lineHeight: 1.2, fontSize: isMobile ? '0.85rem' : '1.05rem' }}>
                    {agent.name.split(' ')[0]}
                </span>
                <span className={`badge ${isGold ? 'badge-orange' : 'badge-slate'}`} style={{ marginTop: '4px', fontSize: '0.65rem', padding: '1px 6px' }}>
                    {agent.conversions} Won
                </span>
            </div>

            {/* Podium Bar */}
            <div style={{
                width: '100%',
                height: `${height}px`,
                background: bgGradient,
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingTop: '20px',
                boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.4), 0 -4px 16px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
                    zIndex: 1
                }} />
                <span style={{ 
                    fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 900, color: 'white', 
                    textShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2 
                }}>
                    #{rank}
                </span>
                <span style={{
                    fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)',
                    marginTop: 'auto', marginBottom: '2px', zIndex: 2, textTransform: 'uppercase'
                }}>
                    Take Home Pay
                </span>
                <span style={{
                    fontSize: isMobile ? '0.8rem' : '1.2rem', fontWeight: 900, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    marginBottom: isMobile ? '8px' : '16px', zIndex: 2
                }}>
                    {agent.commissionFormatted}
                </span>
            </div>
        </div>
    );
}
