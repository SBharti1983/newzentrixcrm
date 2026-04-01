import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { analyticsApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import { Trophy, TrendingUp, Phone, Users, CheckCircle, MapPin, Award } from 'lucide-react';

export default function Leaderboard() {
    const [range, setRange] = useState('6months');
    
    // Fetch analytics data using the existing analytics endpoint
    const { data: analyticsData, loading, error, refetch } = useApi(() => analyticsApi.get({ range }), [range]);

    const leaderboard = useMemo(() => {
        if (!analyticsData?.agentPerformance) return [];
        
        let merged = analyticsData.agentPerformance.map(agent => {
            const callData = analyticsData.agentCalls?.find(c => c.name === agent.name);
            return {
                ...agent,
                calls: callData ? callData.calls : 0,
                // Parse revenue string "₹1.50Cr" to a number for sorting
                revenueNum: parseFloat(agent.revenue.replace(/[^0-9.]/g, '')) || 0
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
                borderRadius: 'var(--border-radius-xl)',
                padding: '24px 32px',
                marginBottom: '40px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--navy-900)', margin: 0 }}>
                        <Trophy size={28} color="var(--accent-violet)" /> 
                        Sales Leaderboard
                    </h1>
                    <p className="page-subtitle" style={{ color: 'var(--navy-600)', marginTop: '6px', marginBottom: 0 }}>
                        Track and celebrate top performing agents across the organization
                    </p>
                </div>
                
                <select 
                    className="form-control" 
                    value={range} 
                    onChange={e => setRange(e.target.value)}
                    style={{ width: '180px', background: 'white', boxShadow: 'var(--shadow-sm)' }}
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
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: '20px',
                    marginBottom: '50px',
                    minHeight: '280px',
                    paddingTop: '20px'
                }}>
                    {/* Rank 2 - Silver */}
                    {leaderboard[1] && <Podium agent={leaderboard[1]} rank={2} height={180} />}
                    
                    {/* Rank 1 - Gold */}
                    {leaderboard[0] && <Podium agent={leaderboard[0]} rank={1} height={240} />}
                    
                    {/* Rank 3 - Bronze */}
                    {leaderboard[2] && <Podium agent={leaderboard[2]} rank={3} height={150} />}
                </div>
            )}

            {/* The rest of the leaderboard table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                <th>Agent Name</th>
                                <th>Conversions</th>
                                <th>Revenue Generated</th>
                                <th>Leads Handled</th>
                                <th>Site Visits</th>
                                <th>Total Calls</th>
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
                                        <div className="badge badge-green" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                                            {agent.revenue}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                            <Users size={14} /> {agent.leads}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                            <MapPin size={14} /> {agent.site_visits}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                            <Phone size={14} /> {agent.calls}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {leaderboard.length === 0 && (
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
        </div>
    );
}

// Podium component for top 3
function Podium({ agent, rank, height }) {
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
            width: '130px',
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
                marginBottom: '16px', zIndex: 10,
                animation: isGold ? 'floatAvatar 4s ease-in-out infinite' : 'none'
            }}>
                {isGold && <Trophy size={32} color={color} style={{ marginBottom: '8px', filter: 'drop-shadow(0 4px 6px rgba(234, 179, 8, 0.4))' }} />}
                
                <div style={{
                    width: isGold ? '80px' : '64px',
                    height: isGold ? '80px' : '64px',
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
                
                <span style={{ fontWeight: 800, color: 'var(--navy-900)', textAlign: 'center', lineHeight: 1.2, fontSize: '1.05rem' }}>
                    {agent.name.split(' ')[0]}
                </span>
                <span className={`badge ${isGold ? 'badge-orange' : 'badge-slate'}`} style={{ marginTop: '6px', fontSize: '0.75rem', padding: '2px 8px' }}>
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
                    fontSize: '2.5rem', fontWeight: 900, color: 'white', 
                    textShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2 
                }}>
                    #{rank}
                </span>
                <span style={{
                    fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)',
                    marginTop: 'auto', marginBottom: '16px', zIndex: 2
                }}>
                    {agent.revenue}
                </span>
            </div>
        </div>
    );
}
