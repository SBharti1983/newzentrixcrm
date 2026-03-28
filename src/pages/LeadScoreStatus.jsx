import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { leadsApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import {
    Target, TrendingUp, Users, AlertCircle,
    CheckCircle2, Clock, Filter, Search,
    ChevronRight, MoreHorizontal, Sparkles,
    Brain, ShieldCheck, UserMinus, Heart,
    ArrowUpRight, ArrowDownRight, MessageSquare
} from 'lucide-react';
import { useToast } from '../hooks/useToast';

const LEAD_STATUSES = [
    { id: 'New', label: 'New', icon: Clock, color: 'var(--slate-500)', bg: 'var(--slate-50)', description: 'Freshly imported leads' },
    { id: 'Contacted', label: 'Contacted', icon: MessageSquare, color: 'var(--navy-500)', bg: 'var(--navy-50)', description: 'Initial contact made' },
    { id: 'Qualified (MQL)', label: 'Qualified (MQL)', icon: ShieldCheck, color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.05)', description: 'Marketing Qualified Lead' },
    { id: 'Sales Qualified (SQL)', label: 'Sales Qualified (SQL)', icon: Target, color: 'var(--accent-violet)', bg: 'rgba(139, 92, 246, 0.05)', description: 'Sales Qualified Lead' },
    { id: 'Won', label: 'Won', icon: CheckCircle2, color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.08)', description: 'Successfully converted' },
    { id: 'Lost', label: 'Lost', icon: AlertCircle, color: 'var(--accent-rose)', bg: 'rgba(244, 63, 94, 0.08)', description: 'Lost opportunity' },
    { id: 'Disqualified', label: 'Disqualified', icon: UserMinus, color: 'var(--accent-rose)', bg: 'rgba(244, 63, 94, 0.05)', description: 'Not a good fit' }
];

export default function LeadScoreStatus() {
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('Qualified (MQL)');
    const [updatingId, setUpdatingId] = useState(null);

    const { data: leadsRes, loading, error, refetch } = useApi(
        useCallback(() => leadsApi.list({ limit: 100 }), []),
        []
    );

    const leads = useMemo(() => leadsRes?.data || [], [leadsRes]);

    const stats = useMemo(() => {
        const counts = {};
        LEAD_STATUSES.forEach(s => counts[s.id] = 0);
        leads.forEach(l => {
            if (counts[l.stage] !== undefined) counts[l.stage]++;
        });
        return counts;
    }, [leads]);

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesTab = l.stage === activeTab;
            const matchesSearch = !search ||
                l.name?.toLowerCase().includes(search.toLowerCase()) ||
                l.email?.toLowerCase().includes(search.toLowerCase());
            return matchesTab && matchesSearch;
        }).sort((a, b) => (b.score || 0) - (a.score || 0));
    }, [leads, activeTab, search]);

    const updateStage = async (id, stage) => {
        setUpdatingId(id);
        try {
            await leadsApi.update(id, { stage });
            showToast(`Lead moved to ${stage}`, 'success');
            refetch();
        } catch (_err) {
            showToast('Failed to update status', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading && !leads.length) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn">
            <header style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.02em', marginBottom: 4 }}>
                            Lead Score & Status
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                            Advanced qualification funnel and predictive scoring management.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ background: 'white', padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                            <TrendingUp size={18} color="var(--accent-emerald)" />
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Score</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-900)' }}>
                                    {leads.length ? Math.round(leads.reduce((acc, l) => acc + (l.score || 0), 0) / leads.length) : 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Status Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                {LEAD_STATUSES.map(status => {
                    const Icon = status.icon;
                    const isActive = activeTab === status.id;
                    return (
                        <div
                            key={status.id}
                            onClick={() => setActiveTab(status.id)}
                            className="card"
                            style={{
                                padding: '20px 16px',
                                cursor: 'pointer',
                                border: isActive ? `2px solid ${status.color}` : '1px solid var(--border-light)',
                                background: isActive ? status.bg : 'white',
                                transition: 'all 0.2s ease',
                                transform: isActive ? 'translateY(-4px)' : 'none',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {isActive && <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, background: status.color, opacity: 0.1, borderRadius: '0 0 0 100%' }} />}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: isActive ? 'white' : status.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: status.color,
                                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                                }}>
                                    <Icon size={20} />
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: isActive ? status.color : 'var(--navy-900)' }}>
                                    {stats[status.id] || 0}
                                </div>
                            </div>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 4 }}>{status.label}</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>{status.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Leads Table Section */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{activeTab} Leads</h2>
                        <div className="badge-slate">{filteredLeads.length} Records</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="search-bar" style={{ width: 300 }}>
                            <Search size={18} />
                            <input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary"><Filter size={16} /> Filters</button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-light)' }}>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lead Name</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Score</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Engagement</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ marginBottom: 12 }}><Users size={40} opacity={0.3} /></div>
                                        No leads found in this stage.
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => {
                                    const scoreColor = lead.score >= 80 ? 'var(--accent-emerald)' : lead.score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)';
                                    return (
                                        <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="hover-row">
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: '50%',
                                                        background: 'var(--navy-900)', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 800, fontSize: '14px'
                                                    }}>
                                                        {lead.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{lead.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ flex: 1, height: 6, background: 'var(--slate-100)', borderRadius: 3, maxWidth: 100, overflow: 'hidden' }}>
                                                        <div style={{ width: `${lead.score}%`, height: '100%', background: scoreColor }} />
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: scoreColor, fontSize: '14px' }}>{lead.score}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span className="badge-blue" style={{ fontSize: '11px' }}>{lead.source}</span>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-emerald)', fontSize: '13px', fontWeight: 600 }}>
                                                    <ArrowUpRight size={14} /> High
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                    {LEAD_STATUSES.filter(s => s.id !== activeTab).slice(0, 2).map(next => (
                                                        <button
                                                            key={next.id}
                                                            onClick={() => updateStage(lead.id, next.id)}
                                                            className="btn btn-ghost"
                                                            style={{ fontSize: '11px', padding: '4px 8px', color: next.color }}
                                                            disabled={updatingId === lead.id}
                                                        >
                                                            To {next.label.split(' ')[0]}
                                                        </button>
                                                    ))}
                                                    <button className="icon-btn"><MoreHorizontal size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Scoring Logic Overview */}
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
                <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-800) 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                        <Brain size={120} />
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={20} color="var(--accent-cyan)" />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>Zapier Predictive Scoring</h2>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: 24, maxWidth: 500 }}>
                            Lead scores are automatically calculated using a 100-point scale based on budget, property type interest, and recent engagement patterns.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 8 }}>Demographics</div>
                                <div style={{ fontSize: '13px' }}>Location & Profile matches</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: 8 }}>Budget Fit</div>
                                <div style={{ fontSize: '13px' }}>Alignment with Inventory</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-rose)', textTransform: 'uppercase', marginBottom: 8 }}>Activity</div>
                                <div style={{ fontSize: '13px' }}>Last 7 day engagement</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 20 }}>Funnel Distribution</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {LEAD_STATUSES.map(s => {
                            const percentage = stats[s.id] ? Math.round((stats[s.id] / leads.length) * 100) : 0;
                            return (
                                <div key={s.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
                                        <span style={{ fontWeight: 700 }}>{s.label}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{percentage}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: 4, background: 'var(--slate-50)', borderRadius: 2 }}>
                                        <div style={{ width: `${percentage}%`, height: '100%', background: s.color, borderRadius: 2 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                .hover-row:hover { background: var(--navy-50) !important; }
            `}</style>
        </div>
    );
}


