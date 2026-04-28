import React, { useState, useEffect } from 'react';
import { 
    Users, Target, Zap, TrendingUp, Calendar, Phone, 
    MessageSquare, ArrowUpRight, BarChart3, Clock,
    LayoutGrid, List, Plus, Search, Activity
} from 'lucide-react';
import { dashboardApi, leadsApi } from '../api/client';
import { usePresence } from '../context/PresenceContext';

const COLORS = {
    primary: '#6366F1',
    accent: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    bg: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#64748B'
};

export default function SoloDashboard() {
    const [stats, setStats] = useState(null);
    const [recentLeads, setRecentLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // grid | list

    useEffect(() => {
        const load = async () => {
            try {
                const [sData, lData] = await Promise.all([
                    dashboardApi.get(),
                    leadsApi.list({ limit: 8 })
                ]);
                setStats(sData);
                setRecentLeads(Array.isArray(lData?.data) ? lData.data : []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <Zap className="animate-pulse" size={48} color={COLORS.primary} />
            <div style={{ fontWeight: 800, color: COLORS.text }}>Powering your Command Center...</div>
        </div>
    );

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Executive Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-2px' }}>Welcome Boss.</h1>
                    <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontWeight: 500 }}>Your real estate dynasty at a glance.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button style={{ padding: '12px 24px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={18} /> Schedule
                    </button>
                    <button style={{ padding: '12px 24px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }}>
                        <Plus size={18} /> New Lead
                    </button>
                </div>
            </div>

            {/* Tactical KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {[
                    { label: 'Network Pipeline', val: stats?.totalLeads || 0, icon: Target, color: COLORS.primary, trend: '+12%' },
                    { label: 'Active Deals', val: stats?.hotLeads || 0, icon: TrendingUp, color: COLORS.success, trend: '+4' },
                    { label: 'Follow-ups Today', val: stats?.pendingFollowups || 0, icon: Clock, color: COLORS.warning, trend: 'Due' },
                    { label: 'Connected Calls', val: stats?.totalCalls || 0, icon: Phone, color: '#0EA5E9', trend: '88%' }
                ].map((k, i) => (
                    <div key={i} style={{ background: COLORS.card, padding: '24px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${k.color}15`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <k.icon size={22} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: k.color, background: `${k.color}10`, padding: '4px 8px', borderRadius: '6px' }}>{k.trend}</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '2px' }}>{k.val}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Operational Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
                
                {/* Main Pipeline Feed */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Active Opportunities</h2>
                        <div style={{ display: 'flex', background: 'white', padding: '4px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                            <button onClick={() => setViewMode('grid')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'grid' ? COLORS.primary : 'transparent', color: viewMode === 'grid' ? 'white' : COLORS.textSecondary, borderRadius: '8px', cursor: 'pointer' }}><LayoutGrid size={16} /></button>
                            <button onClick={() => setViewMode('list')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? COLORS.primary : 'transparent', color: viewMode === 'list' ? 'white' : COLORS.textSecondary, borderRadius: '8px', cursor: 'pointer' }}><List size={16} /></button>
                        </div>
                    </div>

                    <div style={{ 
                        display: viewMode === 'grid' ? 'grid' : 'flex', 
                        flexDirection: viewMode === 'list' ? 'column' : 'unset',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {recentLeads.map(lead => (
                            <div key={lead.id} style={{ 
                                background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '20px', padding: '20px',
                                display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '2px' }}>{lead.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>{lead.project_name || 'Global Project'}</div>
                                    </div>
                                    <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, background: lead.status === 'HOT' ? '#FEE2E2' : '#F1F5F9', color: lead.status === 'HOT' ? COLORS.danger : COLORS.textPrimary }}>{lead.status}</div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px' }}>
                                   <div style={{ flex: 1, padding: '8px', borderRadius: '10px', background: COLORS.bg, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                        <Clock size={12} color={COLORS.textSecondary} /> 2h ago
                                   </div>
                                   <div style={{ flex: 1, padding: '8px', borderRadius: '10px', background: COLORS.bg, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                        <Phone size={12} color={COLORS.textSecondary} /> {lead.phone}
                                   </div>
                                </div>

                                <div style={{ paddingTop: '16px', borderTop: `1px solid ${COLORS.bg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: COLORS.primary, color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Manage Details</button>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={14} color={COLORS.textSecondary} /></button>
                                        <button style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={14} color={COLORS.textSecondary} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar - Quick Analytics & Daily Agenda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Activity Feed */}
                    <div style={{ background: COLORS.card, borderRadius: '28px', border: `1px solid ${COLORS.border}`, padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Global Pulse</h3>
                            <Activity size={16} color={COLORS.textSecondary} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color={COLORS.success} /></div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Pipeline Growth</div>
                                    <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>+5 leads in last 24h</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={18} color={COLORS.primary} /></div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Conversion Pulse</div>
                                    <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>Steady at 4.2%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights Card */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', 
                        borderRadius: '28px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden' 
                    }}>
                        <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><Zap size={80} /></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '12px' }}>
                            <Zap size={16} color="#818CF8" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}>AI COPILOT</span>
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800 }}>Scale your outreach.</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#C7D2FE', lineHeight: 1.5 }}>
                            You have 3 hot leads that haven't been contacted in 48h. Launch a nudge campaign?
                        </p>
                        <button style={{ marginTop: '20px', padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>Launch Campaign</button>
                    </div>

                </div>

            </div>
        </div>
    );
}
