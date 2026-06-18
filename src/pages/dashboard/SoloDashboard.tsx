import React, { useState, useEffect } from 'react';
import { 
    Users, Target, Zap, TrendingUp, Calendar, Phone, 
    MessageSquare, ArrowUpRight, BarChart3, Clock,
    LayoutGrid, List, Plus, Activity
} from 'lucide-react';
import { dashboardApi, leadsApi } from '../../api/client';
import { useMobile } from '../../hooks/useMobile';

export default function SoloDashboard() {
    const isMobile = useMobile();
    const [stats, setStats] = useState<any>(null);
    const [recentLeads, setRecentLeads] = useState<any[]>([]);
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

    const formatRevenue = (val: any) => {
        if (!val) return '₹0';
        const cr = Number(val) / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(val) / 100000).toFixed(1)} L`;
    };

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <Zap className="animate-pulse" size={48} color="var(--primary-color, #6366f1)" />
            <div style={{ fontWeight: 800, color: 'var(--navy-900, #0f172a)' }}>Powering your Command Center...</div>
        </div>
    );

    const kpiCards = [
        { label: 'Network Pipeline', val: stats?.leads?.active_leads || 0, icon: Target, color: '#6366F1', trend: `+${stats?.leads?.new_this_month || 0} new` },
        { label: 'Active Deals', val: stats?.bookings?.total || 0, icon: TrendingUp, color: '#10B981', trend: formatRevenue(stats?.bookings?.total_value) },
        { label: 'Follow-ups Today', val: stats?.upcoming_followups?.length || 0, icon: Clock, color: '#F59E0B', trend: 'Pending' },
        { label: 'Connected Calls', val: stats?.telephony_stats?.calls_today || 0, icon: Phone, color: '#0EA5E9', trend: `Synced: ${stats?.telephony_stats?.synced_recordings || 0}` }
    ];

    return (
        <div className="dash-premium-container" style={{ padding: isMobile ? '0 16px 16px' : '0 32px 32px', paddingTop: 0 }}>
            {/* Executive Summary */}
            <div className="flex justify-between items-center" style={{ marginBottom: '40px', paddingTop: '24px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 900, letterSpacing: '-1px', color: 'var(--navy-900, #0f172a)' }}>Welcome Boss.</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--slate-500, #64748b)', fontWeight: 600 }}>Your real estate dynasty at a glance.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2" style={{ padding: '12px 24px', background: 'white', border: '1px solid var(--border-light, #e2e8f0)', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>
                        <Calendar size={18} /> Schedule
                    </button>
                    <button className="flex items-center gap-2" style={{ padding: '12px 24px', background: 'var(--primary-color, #6366f1)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }}>
                        <Plus size={18} /> New Lead
                    </button>
                </div>
            </div>

            {/* Tactical KPI Grid */}
            <div className="dash-grid-6" style={{ gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', marginBottom: '40px' }}>
                {kpiCards.map((k, i) => (
                    <div key={i} className="enterprise-card" style={{ padding: '24px' }}>
                        <div className="top-indicator-pill" style={{ background: k.color }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${k.color}15`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <k.icon size={22} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: k.color, background: `${k.color}10`, padding: '4px 8px', borderRadius: '6px' }}>{k.trend}</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '2px', color: 'var(--navy-900, #0f172a)' }}>{k.val}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500, #64748b)' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Operational Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '32px' }}>
                
                {/* Main Pipeline Feed */}
                <div>
                    <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--navy-900, #0f172a)' }}>Active Opportunities</h2>
                        <div className="flex items-center" style={{ background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                            <button onClick={() => setViewMode('grid')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'grid' ? 'var(--primary-color, #6366f1)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--slate-500, #64748b)', borderRadius: '8px', cursor: 'pointer' }}><LayoutGrid size={16} /></button>
                            <button onClick={() => setViewMode('list')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? 'var(--primary-color, #6366f1)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--slate-500, #64748b)', borderRadius: '8px', cursor: 'pointer' }}><List size={16} /></button>
                        </div>
                    </div>

                    <div style={{ 
                        display: viewMode === 'grid' ? 'grid' : 'flex', 
                        flexDirection: viewMode === 'list' ? 'column' : 'unset',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {recentLeads.map(lead => (
                            <div key={lead.id} className="enterprise-card" style={{ padding: '20px', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '2px', color: 'var(--navy-900, #0f172a)' }}>{lead.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500, #64748b)' }}>{lead.project_name || 'Global Project'}</div>
                                    </div>
                                    <div style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: '6px', 
                                        fontSize: '0.65rem', 
                                        fontWeight: 800, 
                                        background: lead.status === 'HOT' ? '#FEE2E2' : '#F1F5F9', 
                                        color: lead.status === 'HOT' ? 'var(--accent-rose-dark, #ef4444)' : 'var(--navy-900, #0f172a)' 
                                    }}>{lead.status}</div>
                                </div>
                                
                                <div className="flex gap-2">
                                   <div className="flex items-center gap-2" style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'var(--slate-50, #f8fafc)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-500, #64748b)' }}>
                                        <Clock size={12} /> 2h ago
                                   </div>
                                   <div className="flex items-center gap-2" style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'var(--slate-50, #f8fafc)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-500, #64748b)' }}>
                                        <Phone size={12} /> {lead.phone}
                                   </div>
                                </div>

                                <div className="flex justify-between items-center" style={{ paddingTop: '16px', borderTop: '1px solid var(--slate-50, #f8fafc)' }}>
                                    <button style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'var(--primary-color, #6366f1)', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Manage Details</button>
                                    <div className="flex gap-2">
                                        <button style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border-light, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}><MessageSquare size={14} color="var(--slate-500, #64748b)" /></button>
                                        <button style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border-light, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}><Phone size={14} color="var(--slate-500, #64748b)" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar - Quick Analytics & Daily Agenda */}
                <div className="flex flex-col gap-4">
                    
                    {/* Activity Feed */}
                    <div className="enterprise-card" style={{ padding: '24px' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--navy-900, #0f172a)' }}>Global Pulse</h3>
                            <Activity size={16} color="var(--slate-500, #64748b)" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-3">
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color="#10B981" /></div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-900, #0f172a)' }}>Pipeline Growth</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-500, #64748b)', fontWeight: 600 }}>+{stats?.leads?.new_this_month || 0} leads this month</div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={18} color="var(--primary-color, #6366f1)" /></div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-900, #0f172a)' }}>Conversion Pulse</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-500, #64748b)', fontWeight: 600 }}>Steady at {stats?.leads?.win_rate || 0}%</div>
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
                        <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
                            <Zap size={16} color="#818CF8" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}>AI COPILOT</span>
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800 }}>Scale your outreach.</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#C7D2FE', lineHeight: 1.5, fontWeight: 500 }}>
                            You have {stats?.leads?.active_leads || 0} active opportunities in the pipeline. Make sure to stay connected with your prospects!
                        </p>
                        <button style={{ marginTop: '20px', padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>Launch Campaign</button>
                    </div>

                </div>

            </div>
        </div>
    );
}
