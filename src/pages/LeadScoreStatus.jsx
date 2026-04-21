import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { leadsApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import {
    Target, TrendingUp, Users, AlertCircle,
    CheckCircle2, Clock, Filter, Search,
    ChevronRight, MoreHorizontal, Sparkles,
    Brain, ShieldCheck, UserMinus, Heart,
    ArrowUpRight, ArrowDownRight, MessageSquare, MapPin, Handshake, X, Award, Home, Phone
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useMobile } from '../hooks/useMobile';

const LEAD_STATUSES = [
    { id: 'New Lead', label: 'New Lead', icon: Home, color: '#3b82f6', bg: '#eff6ff', description: 'Freshly imported leads' },
    { id: 'Connected', label: 'Connected', icon: Phone, color: '#6366f1', bg: '#f5f3ff', description: 'Initial contact made' },
    { id: 'Qualified', label: 'Qualified', icon: Target, color: '#06b6d4', bg: '#ecfeff', description: 'Interest confirmed' },
    { id: 'Site Visit Scheduled', label: 'Site Visit Scheduled', icon: MapPin, color: '#14b8a6', bg: '#f0fdfa', description: 'Property visit arranged' },
    { id: 'Site Visit Done', label: 'Site Visit Done', icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5', description: 'Completed property visit' },
    { id: 'Interested', label: 'Interested', icon: Sparkles, color: '#8b5cf6', bg: '#f5f3ff', description: 'Long term interest' },
    { id: 'Proposal Shared', label: 'Proposal Shared', icon: Target, color: '#d946ef', bg: '#fdf4ff', description: 'Sent proposal' },
    { id: 'Negotiation', label: 'Negotiation', icon: Handshake, color: '#f59e0b', bg: '#fffbeb', description: 'Pricing discussion' },
    { id: 'Won', label: 'Won', icon: Award, color: '#10b981', bg: '#ecfdf5', description: 'Successfully converted' },
    { id: 'Lost', label: 'Lost', icon: X, color: '#f43f5e', bg: '#fff1f2', description: 'Lost opportunity' }
];

const getLeadTag = (score) => {
    if (score >= 80) return { label: '🔥 HOT', color: '#ef4444', bg: '#fef2f2' };
    if (score >= 50) return { label: '☀️ WARM', color: '#f59e0b', bg: '#fffbeb' };
    return { label: '❄️ COLD', color: '#3b82f6', bg: '#eff6ff' };
};

export default function LeadScoreStatus() {
    const { showToast } = useToast();
    const isMobile = useMobile();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('Qualified');
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

    const [selectedLead, setSelectedLead] = useState(null);
    const [scanningId, setScanningId] = useState(null);

    const runAIScore = async (leadId) => {
        setScanningId(leadId);
        try {
            const res = await leadsApi.post(`/${leadId}/ai-score`);
            showToast('AI Deep-Scan Complete!', 'success');
            refetch();
            if (selectedLead?.id === leadId) {
                setSelectedLead({ ...selectedLead, score: res.score, ai_analysis: res });
            }
        } catch (err) {
            showToast('Deep-Scan failed. Check connection.', 'error');
        } finally {
            setScanningId(null);
        }
    };

    const enrichedLeads = useMemo(() => {
        return leads.map(l => ({ ...l, calculatedScore: l.score || 0 }));
    }, [leads]);

    const filteredLeads = useMemo(() => {
        return enrichedLeads.filter(l => {
            const matchesTab = l.stage === activeTab;
            const matchesSearch = !search ||
                l.name?.toLowerCase().includes(search.toLowerCase()) ||
                l.email?.toLowerCase().includes(search.toLowerCase());
            return matchesTab && matchesSearch;
        }).sort((a, b) => b.calculatedScore - a.calculatedScore); // Priority Queue Sort (Highest Score First)
    }, [enrichedLeads, activeTab, search]);

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
        <div className="animate-fadeIn" style={{ paddingBottom: isMobile ? 100 : 0 }}>
            <header style={{ marginBottom: isMobile ? 24 : 32 }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.02em', marginBottom: 4 }}>
                            Lead Score & Status
                        </h1>
                        {!isMobile && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                                Advanced qualification funnel and predictive scoring management.
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, width: isMobile ? '100%' : 'auto' }}>
                        <div style={{ background: 'white', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)', flex: isMobile ? 1 : 'none', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                            <TrendingUp size={18} color="var(--accent-emerald)" />
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Score</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-900)' }}>
                                    {enrichedLeads.length ? Math.round(enrichedLeads.reduce((acc, l) => acc + l.calculatedScore, 0) / enrichedLeads.length) : 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Status Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: isMobile ? 8 : 16,
                marginBottom: 32
            }}>
                {LEAD_STATUSES.filter(s => !isMobile || s.id !== 'Proposal Shared').map(status => {
                    const Icon = status.icon;
                    const isActive = activeTab === status.id;
                    return (
                        <div
                            key={status.id}
                            onClick={() => setActiveTab(status.id)}
                            className="card"
                            style={{
                                padding: isMobile ? '6px' : '20px 16px',
                                height: isMobile ? '75px' : 'auto',
                                cursor: 'pointer',
                                border: isActive ? `2px solid ${status.color}` : '1px solid var(--border-light)',
                                background: isActive ? status.bg : 'white',
                                transition: 'all 0.2s ease',
                                transform: isActive ? 'translateY(-2px)' : 'none',
                                position: 'relative',
                                overflow: 'hidden',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? 6 : 0,
                                marginBottom: isMobile ? 4 : 12
                            }}>
                                <div style={{
                                    width: isMobile ? 20 : 40, height: isMobile ? 20 : 40, borderRadius: isMobile ? 6 : 12,
                                    background: isActive ? 'white' : status.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: status.color,
                                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                                }}>
                                    <Icon size={isMobile ? 12 : 20} />
                                </div>
                                <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 950, color: isActive ? status.color : 'var(--navy-900)', lineHeight: 1 }}>
                                    {stats[status.id] || 0}
                                </div>
                            </div>
                            <h3 style={{ 
                                fontSize: isMobile ? '10px' : '14px', 
                                fontWeight: 800, 
                                color: 'var(--navy-900)', 
                                margin: 0, 
                                whiteSpace: 'normal', 
                                textAlign: 'center',
                                lineHeight: 1.1,
                                width: '100%',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {status.label}
                            </h3>
                            {!isMobile && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>{status.description}</p>}
                        </div>
                    );
                })}
            </div>

            {/* Leads Table Section */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: isMobile ? '16px' : '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <h2 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 800, margin: 0 }}>{activeTab}</h2>
                        <div className="badge-slate" style={{ fontSize: '10px' }}>{filteredLeads.length} Records</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div className="search-bar" style={{ width: isMobile ? '100%' : 300 }}>
                            <Search size={16} />
                            <input
                                placeholder={isMobile ? "Search..." : "Search by name or email..."}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        {!isMobile && <button className="btn btn-secondary"><Filter size={16} /> Filters</button>}
                    </div>
                </div>

                <div style={{ overflowX: isMobile ? 'hidden' : 'auto' }}>
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', padding: 12, gap: 10 }}>
                            {filteredLeads.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No leads found</div>
                            ) : (
                                filteredLeads.map(lead => {
                                    const scoreColor = lead.calculatedScore >= 80 ? 'var(--accent-emerald)' : lead.calculatedScore >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)';
                                    const tag = getLeadTag(lead.calculatedScore);
                                    return (
                                        <div key={lead.id} className="card" style={{ padding: 16, border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{lead.name?.[0]}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{lead.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{tag.label}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 950, color: scoreColor }}>{lead.calculatedScore}</div>
                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Score</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {LEAD_STATUSES.filter(s => s.id !== activeTab && s.id !== 'Proposal Shared').slice(0, 2).map(next => (
                                                    <button
                                                        key={next.id}
                                                        onClick={() => updateStage(lead.id, next.id)}
                                                        className="btn btn-secondary"
                                                        style={{ flex: 1, fontSize: '11px', padding: '8px', color: next.color, borderColor: `${next.color}20` }}
                                                        disabled={updatingId === lead.id}
                                                    >
                                                        To {next.label.split(' ')[0]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-light)' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lead Name</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Score</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Engagement</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
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
                                        const scoreColor = lead.calculatedScore >= 80 ? 'var(--accent-emerald)' : lead.calculatedScore >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)';
                                        const tag = getLeadTag(lead.calculatedScore);
                                        return (
                                            <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="hover-row">
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: '50%',
                                                            background: 'var(--navy-900)', color: 'white',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 800, fontSize: '12px'
                                                        }}>
                                                            {lead.name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.85rem' }}>{lead.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.email || lead.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                                        <div style={{ flex: 1, height: 4, background: 'var(--slate-100)', borderRadius: 2, maxWidth: 60, overflow: 'hidden' }}>
                                                            <div style={{ width: `${lead.calculatedScore}%`, height: '100%', background: scoreColor }} />
                                                        </div>
                                                        <span style={{ fontWeight: 800, color: scoreColor, fontSize: '13px' }}>{lead.calculatedScore}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{
                                                        padding: '3px 8px', borderRadius: '6px',
                                                        background: tag.bg, color: tag.color,
                                                        fontSize: '10px', fontWeight: 900, display: 'inline-block'
                                                    }}>
                                                        {tag.label}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: lead.calculatedScore >= 70 ? 'var(--accent-emerald)' : 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>
                                                            <MapPin size={10} /> {lead.stage.includes('Site Visit') || lead.calculatedScore > 80 ? 'Visit Done' : 'No Visit'}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                            {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString() : 'Never'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                        <button
                                                            onClick={() => runAIScore(lead.id)}
                                                            className="btn btn-ghost"
                                                            style={{ fontSize: '10px', padding: '4px 8px', borderColor: 'var(--accent-cyan)44', color: 'var(--accent-cyan)' }}
                                                            disabled={scanningId === lead.id}
                                                        >
                                                            {scanningId === lead.id ? 'Analyzing...' : <Brain size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedLead(lead)}
                                                            className="btn btn-ghost"
                                                            style={{ fontSize: '10px', padding: '4px 8px' }}
                                                        >
                                                            Insights
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Scoring Logic Overview */}
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile ? 12 : 32 }}>
                <div className="card" style={{ padding: isMobile ? 20 : 24, background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-800) 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                        <Brain size={isMobile ? 80 : 120} />
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 12 : 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={18} color="var(--accent-cyan)" />
                            </div>
                            <h2 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>Predictive Lead Scoring</h2>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '12px' : '14px', marginBottom: 20, maxWidth: 500 }}>
                            Leads are evaluated using our custom 100-point algorithm to identify high-intent prospects.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 4 }}>Engagement</div>
                                <div style={{ fontSize: '11px' }}>Visits & Calls</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-violet)', textTransform: 'uppercase', marginBottom: 4 }}>Intent</div>
                                <div style={{ fontSize: '11px' }}>Payments</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: isMobile ? 20 : 24 }}>
                    <h2 style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 800, marginBottom: 16 }}>Funnel Distribution</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {LEAD_STATUSES.filter(s => !isMobile || s.id !== 'Proposal Shared').map(s => {
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

            {/* AI Insights Modal */}
            {selectedLead && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="card" style={{ maxWidth: 600, width: '100%', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ padding: '24px', background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-800) 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Brain size={24} color="var(--accent-cyan)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>{selectedLead.name}</h3>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>AI INTEL REPORT • CONFIDENCE: {(selectedLead.ai_analysis?.confidence * 100 || 85).toFixed(0)}%</div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLead(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <div style={{ padding: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 12 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Lead Classification</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 950, color: selectedLead.score >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                                        {selectedLead.ai_analysis?.classification || (selectedLead.score >= 80 ? 'HOT' : 'WARM')}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 12 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Predicted Close</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy-900)' }}>
                                        {selectedLead.ai_analysis?.predicted_close_date || 'Analyzing pattern...'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Sparkles size={16} color="var(--accent-violet)" />
                                    Cognitive Signals
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {(selectedLead.ai_analysis?.signals || ['Engaged Buyer', 'Price Sensitive', 'Recent Momentum']).map((sig, i) => (
                                        <div key={i} style={{ padding: '6px 12px', background: 'var(--navy-50)', color: 'var(--navy-700)', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, border: '1px solid var(--navy-100)' }}>
                                            {sig}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ background: 'linear-gradient(to right, #f5f3ff, #ede9fe)', padding: 20, borderRadius: 16, border: '1px solid #ddd6fe' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 8, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Target size={16} /> Best Next Action
                                </h4>
                                <p style={{ fontSize: '0.9rem', color: '#4c1d95', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                                    {selectedLead.ai_analysis?.action_strategy || 'Call within 2 hours to discuss the recent project floorplans. High conversion probability on next touch.'}
                                </p>
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                <button 
                                    onClick={() => runAIScore(selectedLead.id)} 
                                    className="btn btn-primary" 
                                    style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 900 }}
                                    disabled={scanningId === selectedLead.id}
                                >
                                    {scanningId === selectedLead.id ? 'Recalculating AI Engine...' : 'Run Real-time AI Deep-Scan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


