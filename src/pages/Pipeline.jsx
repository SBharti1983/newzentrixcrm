import { useState, useRef, useEffect } from 'react';
import { usePresence } from '../context/PresenceContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { leadsApi, projectsApi, usersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
    Plus, X, GripVertical, Search, Filter, ChevronDown, ChevronRight,
    Phone, Mail, MapPin, TrendingUp, Clock, Star, Zap, Eye, Calendar,
    ArrowRight, MoreHorizontal, AlertCircle, CheckCircle2, Target,
    DollarSign, Award, List as ViewListIcon, Sparkles, Bot, Wand2,
    Home, Handshake, Layout, Users, Table, RotateCw
} from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

const STAGE_CONFIG = {
    'New Lead': { color: '#3b82f6', bg: '#eff6ff', accent: '#3b82f6', icon: '🆕', lucide: Home },
    'Connected': { color: '#6366f1', bg: '#f5f3ff', accent: '#6366f1', icon: '📞', lucide: Phone },
    'Qualified': { color: '#06b6d4', bg: '#ecfeff', accent: '#0891b2', icon: '🛡️', lucide: Target },
    'Site Visit Scheduled': { color: '#14b8a6', bg: '#f0fdfa', accent: '#0d9488', icon: '📅', lucide: MapPin },
    'Site Visit Done': { color: '#10b981', bg: '#ecfdf5', accent: '#059669', icon: '✅', lucide: CheckCircle2 },
    'Interested': { color: '#8b5cf6', bg: '#f5f3ff', accent: '#7c3aed', icon: '⭐', lucide: Star },
    'Proposal Shared': { color: '#d946ef', bg: '#fdf4ff', accent: '#c026d3', icon: '📄', lucide: Sparkles },
    'Negotiation': { color: '#f59e0b', bg: '#fffbeb', accent: '#d97706', icon: '🤝', lucide: Handshake },
    'Won': { color: '#10b981', bg: '#ecfdf5', accent: '#059669', icon: '🏆', lucide: Award },
    'Lost': { color: '#f43f5e', bg: '#fff1f2', accent: '#e11d48', icon: '❌', lucide: X },
};

const STAGE_TAGS = {
    'New Lead': 'badge-blue',
    'Connected': 'badge-indigo',
    'Qualified': 'badge-cyan',
    'Site Visit Scheduled': 'badge-teal',
    'Site Visit Done': 'badge-emerald',
    'Interested': 'badge-violet',
    'Proposal Shared': 'badge-fuchsia',
    'Negotiation': 'badge-amber',
    'Won': 'badge-green',
    'Lost': 'badge-red'
};

const PRIORITY_CONFIG = {
    High: { color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.1)', label: '🔴 High' },
    Medium: { color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)', label: '🟡 Medium' },
    Low: { color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.1)', label: '🟢 Low' },
};

const SOURCE_COLORS = {
    Website: '#3b63b8', Referral: '#10b981',
    'Social Media': '#8b5cf6', 'Walk-in': '#f59e0b', PropTech: '#06b6d4',
};
const SOURCES = ['Website', 'Referral', 'Social Media', 'Walk-in', 'PropTech Portal', 'Google Ads', 'WhatsApp', 'Facebook Ads', 'Instagram Ads', 'Zapier'];

const DEFAULT_STAGE_CONFIG = { color: '#64748b', bg: '#f1f5f9', accent: '#64748b', light: 'rgba(100,116,139,0.1)', emoji: '❓' };

function scorePriority(score) {
    if (score >= 80) return 'High';
    if (score >= 55) return 'Medium';
    return 'Low';
}

function daysSince(dateStr) {
    return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

function parseBudgetL(budget) {
    if (!budget) return 0;
    // Remove currency, spaces, and commas for robust parsing
    const normalized = budget.replace(/[₹\s,]/g, '').toLowerCase();
    const n = parseFloat(normalized);
    if (isNaN(n)) return 0;
    
    // Check for Crore/Cr and Lakh/Lac/L
    if (normalized.includes('cr')) return n * 100;
    // If it's a raw large number (e.g. 5000000), convert to Lakhs
    if (n >= 100000) return n / 100000;
    return n;
}

const PIPELINE_STAGES = ['New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'];

const DEFAULT_LEAD = {
    name: '', email: '', phone: '', city: '', source: 'Website',
    stage: 'New Lead', status: 'Active', budget: '', property_type: '3BHK',
    project_id: '', assigned_to: '', notes: '', score: 60,
};

export default function Pipeline() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isMobile = useMobile();
    const { data: leadsRes, loading, error, refetch } = useApi(() => leadsApi.list({ limit: 200, status: 'Active' }));
    const { data: projects } = useApi(() => projectsApi.list({ status: 'Active' }));
    const { data: users } = useApi(() => usersApi.list());

    const leads = (leadsRes?.data || []).map(l => ({ ...l, priority: scorePriority(l.score) }));
    const agents = (users || []).filter(u => ['agent', 'sales_manager'].includes(u.role));
    const [dragging, setDragging] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [collapsed, setCollapsed] = useState({});
    const [selectedLead, setSelectedLead] = useState(null);
    const [showAddModal, setShowAddModal] = useState(null);
    const [addForm, setAddForm] = useState(DEFAULT_LEAD);
    const [searchQ, setSearchQ] = useState('');
    const [filterAgent, setFilterAgent] = useState('All');
    const [filterSource, setFilterSource] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');
    const [filterProject, setFilterProject] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('metrics');
    const [explorerPage, setExplorerPage] = useState(1);
    const EXPLORER_PAGE_SIZE = 10;
    const { user: currentUser } = useAuth();
    const { viewers, trackPage } = usePresence();
    const [mobileActiveStage, setMobileActiveStage] = useState(PIPELINE_STAGES[0]);
    const [showStagePicker, setShowStagePicker] = useState(null); // ID of lead for picker

    useEffect(() => {
        trackPage('/pipeline');
    }, []);

    useEffect(() => {
        setExplorerPage(1);
    }, [searchQ, filterAgent, filterSource, filterPriority, filterProject]);

    const activeViewers = (viewers['/pipeline'] || []).filter(u => u.id !== currentUser?.id);
    const dragCard = useRef(null);

    const filteredLeads = leads.filter(l => {
        const q = searchQ.toLowerCase();
        const matchQ = !q || l.name.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || l.budget?.toLowerCase().includes(q);
        const matchAgent = filterAgent === 'All' || l.assigned_to === filterAgent;
        const matchSource = filterSource === 'All' || l.source === filterSource;
        const matchPriority = filterPriority === 'All' || l.priority === filterPriority;
        const matchProject = filterProject === 'All' || String(l.project_id) === String(filterProject);
        return matchQ && matchAgent && matchSource && matchPriority && matchProject;
    });

    const byStage = s => filteredLeads.filter(l => l.stage === s);

    const stageValueL = s => byStage(s).reduce((sum, l) => sum + parseBudgetL(l.budget), 0);
    const fmtL = v => v >= 100 ? `₹${(v / 100).toFixed(1)}Cr` : `₹${v.toFixed(0)}L`;

    // ── Drag & Drop ──────────────────────────────────────────────────
    const onDragStart = (e, id) => {
        setDragging(id);
        dragCard.current = id;
        e.dataTransfer.effectAllowed = 'move';
    };
    const onDragOver = (e, stage) => { e.preventDefault(); setDragOver(stage); };
    const onDrop = async (e, stage) => {
        e.preventDefault();
        try {
            await leadsApi.update(dragging, { stage });
            refetch();
        } catch { showToast('Failed to move lead', 'error'); }
        setDragging(null); setDragOver(null);
    };
    const onDragEnd = () => { setDragging(null); setDragOver(null); };

    // ── Metrics ──────────────────────────────────────────────────────
    const won = leads.filter(l => l.stage === 'Won').length;
    const lost = leads.filter(l => l.stage === 'Lost').length;
    const active = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length;
    const convRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    const totalPipelineVal = fmtL(
        leads.filter(l => l.stage !== 'Lost').reduce((s, l) => s + parseBudgetL(l.budget), 0)
    );



    // ── Add lead ─────────────────────────────────────────────────────
    const saveNewLead = async () => {
        if (!addForm.name || !addForm.phone) { showToast('Name and phone required', 'error'); return; }
        try {
            await leadsApi.create(addForm);
            showToast('Lead added!', 'success');
            refetch();
        } catch (err) { showToast(err.error || 'Failed to add lead', 'error'); }
        setShowAddModal(null);
        setAddForm(DEFAULT_LEAD);
    };

    // ── Card detail edit ─────────────────────────────────────────────
    const mvStage = async (lead, dir) => {
        let idx = PIPELINE_STAGES.indexOf(lead.stage);
        if (idx === -1) idx = 0; // Default to first stage if unknown
        const next = PIPELINE_STAGES[idx + dir];
        if (!next) return;
        try {
            await leadsApi.update(lead.id, { stage: next });
            setSelectedLead(prev => prev ? { ...prev, stage: next } : null);
            refetch();
        } catch { showToast('Failed to update stage', 'error'); }
    };

    if (loading && !leadsRes) return <PageLoader />;
    if (error && !leadsRes) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn" style={{ maxWidth: '100%', overflowX: 'hidden', minHeight: 0, paddingBottom: isMobile ? 100 : 60, padding: isMobile ? '8px 12px' : '24px' }}>
            {/* Ultra-Compact Enterprise Command Header */}
            <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 16, flexWrap: 'wrap', gap: isMobile ? 10 : 16, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.4)', animation: 'pulse-dialer 2s infinite' }} />
                        <h1 style={{ fontSize: isMobile ? '1.05rem' : '1.3rem', fontWeight: 900, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Revenue Pipeline</h1>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
                        gap: 8, 
                        borderLeft: isMobile ? 'none' : '1px solid #e2e8f0', 
                        paddingLeft: isMobile ? 0 : 16, 
                        flex: 1,
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        {[
                            { label: 'Pipeline', val: totalPipelineVal, icon: <DollarSign size={isMobile ? 12 : 14}/>, color: '#3b82f6' },
                            { label: 'Active', val: active, icon: <Zap size={isMobile ? 12 : 14}/>, color: '#f59e0b' },
                            { label: 'Win', val: `${convRate}%`, icon: <Award size={isMobile ? 12 : 14}/>, color: '#10b981' },
                            { label: 'Lost', val: lost, icon: <TrendingUp size={isMobile ? 12 : 14} style={{ transform: 'rotate(90deg)' }}/>, color: '#ef4444' },
                        ].map(s => (
                            <div key={s.label} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: isMobile ? 6 : 8, 
                                background: '#f8fafc', 
                                padding: isMobile ? '6px 10px' : '8px 12px', 
                                borderRadius: 8, 
                                border: '1px solid #e2e8f0' 
                            }}>
                                <div style={{ color: s.color, display: 'flex' }}>{s.icon}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontSize: isMobile ? '0.6rem' : '0.65rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.label}</span>
                                    <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 900, color: 'var(--navy-900)' }}>{s.val}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                    <div style={{ display: 'flex', background: '#f8fafc', padding: 2, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        {[
                            { id: 'metrics', label: 'Metrics', icon: TrendingUp },
                            { id: 'kanban', label: 'Kanban', icon: Target }
                        ].map(m => (
                            <button
                                key={m.id}
                                className={`btn btn-sm ${viewMode === m.id ? 'btn-white shadow-sm' : 'btn-ghost'}`}
                                onClick={() => setViewMode(m.id)}
                                style={{ borderRadius: 6, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800, gap: 6, color: viewMode === m.id ? 'var(--navy-900)' : 'var(--slate-500)' }}
                            >
                                <m.icon size={14} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>{m.label}</span>
                            </button>
                        ))}
                    </div>
                    <button className="hover-lift" style={{ background: 'var(--navy-900)', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => { setAddForm(DEFAULT_LEAD); setShowAddModal('New'); }}>
                        <Plus size={14} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Add Lead</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                ENTERPRISE COMMAND TILES: PIPELINE INTELLIGENCE
            ══════════════════════════════════════════════════════ */}
            {!(isMobile && viewMode === 'kanban') && (
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(10, 1fr)', 
                gap: isMobile ? 6 : 8, 
                marginBottom: 20,
            }}>
                {PIPELINE_STAGES.map((stage) => {
                    if (isMobile && stage === 'Proposal Shared') return null;
                    const sc = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                    const stageLeads = byStage(stage);
                    const count = stageLeads.length;
                    const val = stageValueL(stage);
                    const isEmpty = count === 0;

                    return (
                        <div key={stage} 
                            style={{
                                background: isEmpty ? 'rgba(248, 250, 252, 0.5)' : 'white',
                                borderRadius: '12px',
                                padding: isMobile ? '8px' : '10px 12px',
                                border: '1px solid #eef2f6',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: isEmpty ? 'none' : '0 4px 15px rgba(10, 22, 40, 0.03)',
                                minHeight: isMobile ? 65 : 75
                            }}
                            className="hover-lift"
                        >
                            {/* Accent Glow Lip */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isEmpty ? '#f1f5f9' : sc.accent }} />
                            
                            {/* Ghost Icon background for depth */}
                            <div style={{ position: 'absolute', right: -3, bottom: -3, opacity: 0.04, fontSize: isMobile ? '2rem' : '3rem', pointerEvents: 'none', transform: 'rotate(-10deg)' }}>
                                {sc.emoji || '💼'}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, minWidth: 0 }}>
                                <span style={{ fontSize: isMobile ? '0.58rem' : '0.6rem', fontWeight: 900, color: isEmpty ? '#94a3b8' : 'var(--navy-600)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {stage}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 'auto' }}>
                                <div style={{ 
                                    fontSize: isMobile ? '1.1rem' : '1.3rem', 
                                    fontWeight: 1000, 
                                    color: isEmpty ? '#cbd5e1' : 'var(--navy-950)',
                                    lineHeight: 1,
                                    letterSpacing: '-0.03em'
                                }}>
                                    {count}
                                </div>
                                {val > 0 && (
                                    <div style={{ 
                                        fontSize: isMobile ? '0.5rem' : '0.72rem', 
                                        fontWeight: 850, 
                                        color: sc.color,
                                        background: `${sc.bg}cc`,
                                        padding: '1px 4px',
                                        borderRadius: '4px',
                                        border: `1px solid ${sc.color}15`
                                    }}>
                                        {fmtL(val)}
                                    </div>
                                )}
                            </div>

                            {/* Micro Indicator Bar */}
                            {!isEmpty && (
                                <div style={{ marginTop: 8, height: 2, width: '100%', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '40%', background: sc.accent, borderRadius: 10 }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}

            {/* Compressed Search & Filters Hub */}
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                padding: '10px 14px', 
                borderRadius: '12px', 
                border: '1px solid #eef2f6', 
                marginBottom: 16, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                position: 'sticky',
                top: isMobile ? 0 : 0, 
                zIndex: 50,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 15px rgba(10, 22, 40, 0.02)'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search timeline & index..."
                        style={{
                            width: '100%', padding: '6px 12px 6px 36px', borderRadius: '6px', border: 'none',
                            background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600, outline: 'none', color: 'var(--navy-900)'
                        }}
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                    />
                </div>
                <button onClick={() => setShowFilters(f => !f)} className="hover-lift" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', background: showFilters ? 'var(--navy-900)' : '#f8fafc', border: showFilters ? 'none' : '1px solid #e2e8f0', color: showFilters ? 'white' : 'var(--navy-900)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <Filter size={12} /> Filters {(filterAgent !== 'All' || filterSource !== 'All' || filterPriority !== 'All' || filterProject !== 'All') && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}/>}
                </button>
            </div>

            {showFilters && (
                <div style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <select className="select" value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                        <option value="All">All Agents</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select className="select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                        <option value="All">All Projects</option>
                        {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="select" value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                        <option value="All">All Sources</option>
                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                        <option value="All">All Priorities</option>
                        {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                METRICS VIEW
            ══════════════════════════════════════════════════════ */}
            {viewMode === 'metrics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* --- TOP ROW CONTROLS --- */}
                        <div className={isMobile ? 'flex-column' : 'grid'} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: 'stretch' }}>
                            {/* Visual Sales Funnel */}
                            <div className="card" style={{ flex: '1.6 1 0%', minWidth: 0, padding: isMobile ? '14px' : '16px 20px', background: 'white', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 800, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Target size={isMobile ? 16 : 18} className="text-primary" /> Visual Sales Funnel
                                    </h3>
                                    <div style={{ display: 'flex', gap: isMobile ? 8 : 12, paddingRight: isMobile ? 0 : 8 }}>
                                        <div style={{ textAlign: 'right', width: isMobile ? 'auto' : 80 }}><div style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 900, color: 'var(--accent-emerald-dark)' }}>{convRate}%</div><div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Success</div></div>
                                        <div style={{ textAlign: 'right', width: isMobile ? 'auto' : 70 }}><div style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 900, color: 'var(--navy-600)' }}>{active}</div><div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Flow</div></div>
                                    </div>
                                </div>
                                <div className="pipeline-funnel-grid" style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 12 : 24, alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    {/* SVG Funnel - hidden on mobile for cleaner layout */}
                                    {!isMobile && (
                                    <div className="pipeline-funnel-graph" style={{ position: 'relative', flex: '0 0 340px', height: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%', minWidth: 0 }}>
                                        <svg width="100%" height="280" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet">
                                            <defs>
                                                <filter id="fShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="2" /><feOffset dx="0" dy="2" /><feComponentTransfer><feFuncA type="linear" slope="0.1" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                                                {PIPELINE_STAGES.map((stage, i) => (
                                                    <linearGradient key={`grad-${i}`} id={`grad-side-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor={STAGE_CONFIG[stage]?.accent} stopOpacity="0.85" /><stop offset="100%" stopColor={STAGE_CONFIG[stage]?.accent} stopOpacity="1" />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            {PIPELINE_STAGES.map((stage, i) => {
                                                const count = byStage(stage).length;
                                                const h = 24; const gap = 4; const y = i * (h + gap);
                                                const topW = 380 - (i * 22); const botW = 380 - ((i + 1) * 22);
                                                const x1 = (400 - topW) / 2; const x2 = x1 + topW; const x3 = (400 - botW) / 2 + botW; const x4 = (400 - botW) / 2;
                                                const points = `${x1},${y} ${x2},${y} ${x3},${y + h} ${x4},${y + h}`;
                                                return (
                                                    <g key={stage} className="funnel-segment" style={{ cursor: 'pointer' }}>
                                                        <polygon points={points} fill={`url(#grad-side-${i})`} filter="url(#fShadow)" />
                                                        <text x="200" y={y + (h / 2) + 4} textAnchor="middle" fill="white" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', pointerEvents: 'none', letterSpacing: '0.05em' }}>{stage} ({count})</text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', gap: 2, maxHeight: isMobile ? 'none' : 280, overflowY: isMobile ? 'visible' : 'auto', minWidth: 0, width: '100%', paddingRight: isMobile ? 0 : 4 }}>
                                        {/* Headers for columns */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1.2fr) minmax(0, 1fr) 50px 32px' : 'minmax(0, 1.4fr) minmax(0, 1fr) 70px 40px', gap: isMobile ? '4px' : '8px', padding: '2px 8px', marginBottom: 2 }}>
                                            <div style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stage</div>
                                            <div style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Progression</div>
                                            <div style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Value</div>
                                            <div style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>#</div>
                                        </div>
                                        {(() => {
                                            const maxCount = Math.max(1, ...PIPELINE_STAGES.map(s => byStage(s).length));
                                            return PIPELINE_STAGES.map((stage) => {
                                                const count = byStage(stage).length; const cfg = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                                                const pct = `${(count / maxCount) * 100}%`;
                                                return (
                                                    <div key={stage} style={{ padding: isMobile ? '4px 6px' : '2px 6px', background: 'var(--slate-50)', borderRadius: '4px', borderLeft: `3px solid ${cfg.accent}`, display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1.2fr) minmax(0, 1fr) 50px 32px' : 'minmax(0, 1.4fr) minmax(0, 1fr) 70px 40px', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
                                                        <div style={{ fontSize: isMobile ? '0.6rem' : '0.55rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage}</div>
                                                        {/* Volume Sparkline */}
                                                        <div style={{ height: isMobile ? '4px' : '3px', background: 'var(--slate-200)', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
                                                            <div style={{ width: pct, height: '100%', background: cfg.accent, borderRadius: '2px', transition: 'width 0.5s ease' }}></div>
                                                        </div>
                                                        <div style={{ fontSize: isMobile ? '0.65rem' : '0.6rem', fontWeight: 800, color: 'var(--navy-800)', textAlign: 'right' }}>{fmtL(stageValueL(stage))}</div>
                                                        <div style={{ fontSize: isMobile ? '0.7rem' : '0.6rem', fontWeight: 900, color: cfg.accent, textAlign: 'right' }}>{count}</div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* High Value Opportunities */}
                            <div className="card" style={{ flex: '1 1 0%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                                    <div className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Zap size={16} style={{ color: 'var(--accent-amber-dark)' }} /> High Value Opportunities
                                    </div>
                                </div>
                                <div className="card-body" style={{ padding: '8px 16px', flex: 1, overflowY: 'auto' }}>
                                    {[...leads].sort((a, b) => parseBudgetL(b.budget) - parseBudgetL(a.budget)).slice(0, 5).map((l, i) => (
                                        <div key={l.id} onClick={() => setSelectedLead(l)} className="hover-lift" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: i === 0 ? 'rgba(245,158,11,0.03)' : 'white' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: `hsl(${l.id * 47 % 360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                                                {l.name[0]}
                                            </div>

                                            {/* Left Column: Client Core Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--navy-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{l.city || 'Undisclosed City'}</div>
                                            </div>

                                            {/* Right Column: Value & Funnel Position */}
                                            <div style={{ textAlign: 'right', minWidth: 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                <div style={{ fontWeight: 900, color: 'var(--navy-600)', fontSize: '0.8rem' }}>
                                                    {l.budget ? (parseBudgetL(l.budget) > 0 ? fmtL(parseBudgetL(l.budget)) : l.budget) : '—'}
                                                </div>
                                                <div style={{ fontSize: '0.55rem', fontWeight: 800, color: STAGE_CONFIG[l.stage]?.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', textAlign: 'right' }}>
                                                    {l.stage}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* --- BOTTOM ROW: LIVE PIPELINE DATA --- */}
                        <div className="card" style={{ padding: 0, background: 'white', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ padding: isMobile ? '12px 16px' : '16px 20px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                                <h3 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <ViewListIcon size={16} color="var(--blue-500)" /> Explorer
                                </h3>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate-500)' }}>{isMobile ? 'Active deals' : 'Displaying active deals sorted by engagement'}</div>
                            </div>
                            
                            {/* Grid Header - Hidden on mobile */}
                            {!isMobile && (
                                <div style={{ padding: '0 24px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1.8fr) 1fr 1fr 1.2fr 1fr 1.4fr 1fr 40px', padding: '16px 0', borderBottom: '1px solid var(--slate-100)' }}>
                                        {['Lead Details', 'Location', 'Budget', 'Stage', 'Priority', 'Agent', 'Score', ''].map((h, i) => (
                                            <div key={i} style={{
                                                fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                textAlign: i === 6 || i === 7 ? 'right' : 'left'
                                            }}>{h}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flexible Data List / Cards on Mobile */}
                            <div style={{ padding: isMobile ? '8px' : '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '8px' }}>
                                {filteredLeads.slice((explorerPage - 1) * EXPLORER_PAGE_SIZE, explorerPage * EXPLORER_PAGE_SIZE).map((l, i) => {
                                    const cfg = STAGE_CONFIG[l.stage] || DEFAULT_STAGE_CONFIG;
                                    const pc = PRIORITY_CONFIG[l.priority] || PRIORITY_CONFIG.Low;
                                    const avatarHue = (l.name.charCodeAt(0) * 47) % 360;

                                    if (isMobile) {
                                        return (
                                            <div key={l.id} onClick={() => setSelectedLead(l)} style={{ 
                                                padding: '12px', border: '1px solid #e2e8f0', borderRadius: 12, 
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `hsl(${avatarHue}, 70%, 55%)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>{l.name[0]}</div>
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-900)' }}>{l.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{l.budget || '—'} · {l.stage}</div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} color="var(--slate-400)" />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={l.id}
                                            className="hover-lift"
                                            onClick={() => setSelectedLead(l)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'minmax(250px, 1.8fr) 1fr 1fr 1.2fr 1fr 1.4fr 1fr 40px',
                                                background: 'white',
                                                borderRadius: '12px',
                                                padding: '16px 20px',
                                                alignItems: 'center',
                                                border: '1px solid var(--slate-100)',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                margin: '0 -20px'
                                            }}>
                                            {/* (Row contents unchanged for desktop...) */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{
                                                    width: 42, height: 42, borderRadius: '10px',
                                                    background: `linear-gradient(135deg, hsl(${avatarHue}, 80%, 65%), hsl(${avatarHue - 30}, 80%, 45%))`,
                                                    color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    fontWeight: 900, fontSize: '1rem',
                                                    boxShadow: `0 4px 10px hsla(${avatarHue}, 80%, 55%, 0.3)`
                                                }}>
                                                    {(l.name || 'A')[0]}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)' }}>{l.name}</div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>{l.email || 'No email provided'}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-600)' }}>{l.city || '—'}</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--navy-900)' }}>{l.budget ? (parseBudgetL(l.budget) > 0 ? fmtL(parseBudgetL(l.budget)) : l.budget) : '—'}</div>
                                            <div><span style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{cfg.icon && <span style={{ fontSize: '0.8rem' }}>{cfg.icon}</span>}{l.stage}</span></div>
                                            <div><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: pc.bg, color: pc.color, border: `1px solid ${pc.color}20` }}>{l.priority}</span></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: 'var(--slate-600)' }}>{(l.agent_name || 'U')[0]}</div><span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)' }}>{l.agent_name || 'Unassigned'}</span></div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}><span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--navy-900)', lineHeight: '1' }}>{l.score}</span><div style={{ height: 4, width: 36, background: 'var(--slate-100)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}><div style={{ height: '100%', width: `${l.score}%`, background: l.score > 80 ? 'var(--accent-emerald)' : l.score > 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }} /></div></div></div>
                                            <div style={{ textAlign: 'right' }}><div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--slate-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}><ChevronRight size={16} /></div></div>
                                        </div>
                                    );
                                })}

                                {/* Pagination Footer */}
                                {filteredLeads.length > EXPLORER_PAGE_SIZE && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--slate-100)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>
                                            Showing <span style={{ color: 'var(--navy-900)', fontWeight: 800 }}>{Math.min(filteredLeads.length, (explorerPage - 1) * EXPLORER_PAGE_SIZE + 1)}</span> to <span style={{ color: 'var(--navy-900)', fontWeight: 800 }}>{Math.min(filteredLeads.length, explorerPage * EXPLORER_PAGE_SIZE)}</span> of <span style={{ color: 'var(--navy-900)', fontWeight: 800 }}>{filteredLeads.length}</span> leads
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button 
                                                onClick={() => setExplorerPage(p => Math.max(1, p - 1))}
                                                disabled={explorerPage === 1}
                                                className="hover-lift"
                                                style={{ 
                                                    padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, 
                                                    border: '1px solid var(--slate-200)', background: explorerPage === 1 ? 'var(--slate-50)' : 'white', 
                                                    color: explorerPage === 1 ? 'var(--slate-400)' : 'var(--navy-900)', 
                                                    cursor: explorerPage === 1 ? 'not-allowed' : 'pointer',
                                                    boxShadow: explorerPage === 1 ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                Previous
                                            </button>
                                            <button 
                                                onClick={() => setExplorerPage(p => p + 1)}
                                                disabled={explorerPage * EXPLORER_PAGE_SIZE >= filteredLeads.length}
                                                className="hover-lift"
                                                style={{ 
                                                    padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, 
                                                    border: '1px solid var(--slate-200)', background: explorerPage * EXPLORER_PAGE_SIZE >= filteredLeads.length ? 'var(--slate-50)' : 'white', 
                                                    cursor: explorerPage * EXPLORER_PAGE_SIZE >= filteredLeads.length ? 'not-allowed' : 'pointer',
                                                    boxShadow: explorerPage * EXPLORER_PAGE_SIZE >= filteredLeads.length ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
            )}

            {/* ══════════════════════════════════════════════════════
                KANBAN VIEW
            ══════════════════════════════════════════════════════ */}
            {viewMode === 'kanban' && (
                <div style={{ 
                    flex: 1, 
                    minHeight: 0, 
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    overflow: 'hidden'
                }}>
                    {/* Mobile Stage Selector Tab bar */}
                    {isMobile && (
                        <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            gap: 8, 
                            padding: '0 12px 12px', 
                            borderBottom: '1px solid #f1f5f9',
                            marginBottom: 12,
                            background: 'white'
                        }}>
                            {PIPELINE_STAGES.map(stage => {
                                const count = byStage(stage).length;
                                const isActive = mobileActiveStage === stage;
                                const cfg = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                                return (
                                    <button 
                                        key={stage}
                                        onClick={() => setMobileActiveStage(stage)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '10px',
                                            border: '1px solid',
                                            borderColor: isActive ? cfg.color : '#e2e8f0',
                                            background: isActive ? cfg.bg : 'white',
                                            color: isActive ? cfg.color : '#64748b',
                                            fontWeight: isActive ? 900 : 700,
                                            fontSize: '0.72rem',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            transition: 'all 0.2s',
                                            boxShadow: isActive ? `0 2px 8px ${cfg.color}20` : 'none'
                                        }}
                                    >
                                        {cfg.emoji || cfg.icon} {stage}
                                        <span style={{ fontSize: '0.65rem', opacity: 0.6, background: isActive ? 'white' : '#f1f5f9', padding: '2px 6px', borderRadius: 99 }}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="pipeline-board hide-scrollbar" style={{ 
                        display: 'flex', 
                        gap: isMobile ? 0 : 16, 
                        flex: 1,
                        height: '100%', 
                        padding: isMobile ? '0 12px' : '0 4px', 
                        overflowX: isMobile ? 'hidden' : 'auto',
                        WebkitOverflowScrolling: 'touch',
                        paddingBottom: isMobile ? '80px' : '0'
                    }}>
                        {(isMobile ? [mobileActiveStage] : PIPELINE_STAGES).map((stage) => {
                            const stageLeads = byStage(stage);
                            const cfg = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                            const isOver = dragOver === stage;
                            const isCollapsed = collapsed[stage];
                            const val = stageValueL(stage);

                            return (
                                <div key={stage}
                                    className="pipeline-column"
                                    style={{
                                        borderTop: isMobile ? 'none' : `4px solid ${cfg.accent}`,
                                        outline: isOver ? `2px dashed ${cfg.accent}` : 'none',
                                        background: isOver ? `linear-gradient(${cfg.bg}, white)` : (isMobile ? 'transparent' : '#fcfdfe'),
                                        transition: 'all 0.2s ease',
                                        width: isMobile ? '100%' : '320px',
                                        flexShrink: 0,
                                        height: '100%',
                                        scrollSnapAlign: isMobile ? 'center' : 'none',
                                        borderRadius: isMobile ? '0' : '16px',
                                        boxShadow: isMobile ? 'none' : '0 8px 24px rgba(10, 22, 40, 0.04)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        maxHeight: '100%',
                                        border: isMobile ? 'none' : '1px solid #eef2f6'
                                    }}
                                    onDragOver={e => onDragOver(e, stage)}
                                    onDrop={e => onDrop(e, stage)}
                                >
                                    {/* Column Header (Hidden on Mobile as Tabs provide context) */}
                                    {!isMobile && (
                                    <div className="pipeline-col-header" style={{ gap: 8, padding: '12px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
                                        {isCollapsed ? (
                                            <button onClick={() => setCollapsed(c => ({ ...c, [stage]: false }))}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{cfg.emoji || '📁'}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: cfg.color, writingMode: 'vertical-lr', textOrientation: 'mixed', letterSpacing: '0.04em' }}>{stage}</span>
                                                <span className="pipeline-col-count" style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 20, fontSize: '10px' }}>{stageLeads.length}</span>
                                            </button>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '10px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                                        {cfg.emoji || '📁'}
                                                    </div>
                                                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                                            <span className="pipeline-col-name" style={{ fontWeight: 900, color: 'var(--navy-900)', fontSize: '0.9rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage}</span>
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>{stageLeads.length}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: cfg.color, marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {fmtL(val)} <ChevronRight size={10} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                    <button onClick={() => { setAddForm({ ...DEFAULT_LEAD, stage }); setShowAddModal(stage); }}
                                                        style={{ border: 'none', background: 'rgba(15, 22, 40, 0.04)', cursor: 'pointer', color: 'var(--navy-600)', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                        className="hover-lift" title="Add lead">
                                                        <Plus size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    )}

                                    {!isCollapsed && (
                                        <div className="pipeline-col-body" style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                            {stageLeads.map(lead => {
                                                const pc = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.Medium;
                                                const isDragging = dragging === lead.id;
                                                const avatarBg = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#ec4899', '#f97316'][(lead.name || 'A').charCodeAt(0) % 10];

                                                return (
                                                    <div key={lead.id}
                                                        className="kanban-card"
                                                        draggable={!isMobile}
                                                        onDragStart={e => !isMobile && onDragStart(e, lead.id)}
                                                        onDragEnd={onDragEnd}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                                        style={{
                                                            opacity: isDragging ? 0.35 : 1,
                                                            background: 'white',
                                                            borderRadius: isMobile ? '12px' : '14px',
                                                            padding: isMobile ? '8px 12px' : '12px',
                                                            border: '1px solid #f1f5f9',
                                                            boxShadow: isDragging ? 'none' : (isMobile ? '0 2px 6px rgba(10, 22, 40, 0.03)' : '0 4px 12px rgba(10, 22, 40, 0.03)'),
                                                            display: 'flex',
                                                            flexDirection: isMobile ? 'row' : 'column',
                                                            alignItems: isMobile ? 'center' : 'stretch',
                                                            gap: isMobile ? 12 : 10,
                                                            cursor: isMobile ? 'pointer' : 'grab',
                                                            transition: 'all 0.2s ease',
                                                            marginBottom: isMobile ? 8 : 0
                                                        }}
                                                    >
                                                        {/* Avatar/Info */}
                                                        <div style={{ 
                                                            width: isMobile ? 36 : 40, 
                                                            height: isMobile ? 36 : 40, 
                                                            borderRadius: isMobile ? '10px' : '12px', 
                                                            background: `linear-gradient(135deg, ${avatarBg}, ${avatarBg}cc)`, 
                                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                            fontSize: isMobile ? '11px' : '13px', fontWeight: 1000, flexShrink: 0,
                                                            boxShadow: `0 4px 10px ${avatarBg}33`
                                                        }}>
                                                            {(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                        </div>

                                                        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <div style={{ fontWeight: 950, fontSize: isMobile ? '0.88rem' : '0.94rem', color: 'var(--navy-950)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{lead.name}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-emerald-dark)' }}>{lead.budget || '₹60L'}</span>
                                                                {!isMobile && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />}
                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>{lead.city || 'Pune'}</span>
                                                                {isMobile && (
                                                                    <div style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 900, background: pc.bg, color: pc.color, textTransform: 'uppercase' }}>{lead.priority}</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {!isMobile && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                {/* Project Badge */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 750, color: 'var(--navy-600)', background: 'rgba(59, 99, 184, 0.04)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(59, 99, 184, 0.08)' }}>
                                                                    <Home size={12} strokeWidth={3} />
                                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.project || 'Zentrix Elite'}</span>
                                                                </div>

                                                                {/* Tags */}
                                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 1000, background: pc.bg, color: pc.color, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{lead.priority}</span>
                                                                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                                                                    <span style={{ fontSize: '10px', fontWeight: 850, color: 'var(--slate-500)' }}>{lead.source}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Action End (Mobile) */}
                                                        {isMobile && (
                                                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                                                    <Phone size={14} strokeWidth={3} />
                                                                </a>
                                                                <button onClick={e => { e.stopPropagation(); setSelectedLead(lead); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59, 99, 184, 0.1)', color: 'var(--navy-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                                                                    <ChevronRight size={16} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Stats Footer (Desktop) */}
                                                        {!isMobile && (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f8fafc', paddingTop: 10, marginTop: 4 }}>
                                                                <div style={{ fontWeight: 1000, fontSize: '0.95rem', color: 'var(--accent-emerald-dark)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <Zap size={14} fill="var(--accent-emerald)" color="transparent" />
                                                                    {lead.budget || '₹60L'}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                                                                    <Calendar size={11} strokeWidth={2.5} />Today
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Minimalist Ghost Slot */}
                                            {stageLeads.length < 1 && (
                                                <div style={{ border: '1.5px dashed var(--border-light)', borderRadius: 12, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, background: 'var(--slate-50)' }}>
                                                    {isOver ? '📥 Release to Move' : 'Empty Stage'}
                                                </div>
                                            )}

                                            <button onClick={() => { setAddForm({ ...DEFAULT_LEAD, stage }); setShowAddModal(stage); }}
                                                className="add-lead-btn"
                                                style={{
                                                    width: '100%', padding: '10px', border: '1px dashed var(--border-light)',
                                                    borderRadius: '10px', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
                                                    fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    marginTop: 'auto', transition: 'all 0.15s'
                                                }}
                                            >
                                                <Plus size={14} /> Add Lead
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}



            {/* ══════════════════════════════════════════════════════
                LEAD DETAIL PANEL (slide-over)
            ══════════════════════════════════════════════════════ */}
            {selectedLead && (() => {
                const l = leads.find(x => x.id === selectedLead.id) || selectedLead;
                const cfg = STAGE_CONFIG[l.stage] || DEFAULT_STAGE_CONFIG;
                const pc = PRIORITY_CONFIG[l.priority] || PRIORITY_CONFIG.Medium;
                const stageIdx = PIPELINE_STAGES.indexOf(l.stage);
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
                        onClick={() => setSelectedLead(null)}>
                        {/* Dim overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,22,40,0.45)', backdropFilter: 'blur(2px)' }} />
                        {/* Panel */}
                        <div style={{
                            position: 'relative', 
                            width: isMobile ? '100%' : 420, 
                            background: 'white', 
                            height: '100%',
                            display: 'flex', 
                            flexDirection: 'column', 
                            boxShadow: '-4px 0 40px rgba(10,22,40,0.18)',
                            animation: isMobile ? 'fadeIn 0.3s ease' : 'slideInRight 0.25s ease',
                        }} onClick={e => e.stopPropagation()}>
                            {/* Panel Header */}
                            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border-light)', background: cfg.light }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                        background: `hsl(${(l.id || '0').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 60%, 55%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.1rem', fontWeight: 800, color: 'white',
                                    }}>
                                        {(l.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{l.name}</div>
                                            <button
                                                onClick={() => navigate(`/leads/${l.id}`)}
                                                style={{ padding: '2px 8px', borderRadius: 4, background: 'white', border: '1px solid var(--border-light)', fontSize: '0.65rem', fontWeight: 600, color: '#0091ae', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <Eye size={12} /> View Full Record
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: cfg.accent, color: 'white' }}>{l.stage}</span>
                                            <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: pc.bg, color: pc.color }}>{l.priority} Priority</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedLead(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                                        <X size={18} />
                                    </button>
                                </div>
                                {/* Advanced Stage Switcher */}
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setShowStagePicker(showStagePicker === l.id ? null : l.id)}
                                        className="btn btn-primary btn-sm" 
                                        style={{ 
                                            width: '100%', 
                                            justifyContent: 'center', 
                                            fontSize: '0.8rem', 
                                            fontWeight: 900, 
                                            padding: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            background: cfg.accent,
                                            border: 'none',
                                            boxShadow: `0 4px 12px ${cfg.accent}25`
                                        }}
                                    >
                                        <ChevronRight size={16} strokeWidth={3} /> Change Stage to Desired...
                                    </button>

                                    {showStagePicker === l.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: 8,
                                            background: 'white',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 30px rgba(10, 22, 40, 0.15)',
                                            border: '1px solid #eef2f6',
                                            zIndex: 50,
                                            padding: 6,
                                            animation: 'slideInY 0.2s ease'
                                        }}>
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(2, 1fr)', 
                                                gap: 4 
                                            }}>
                                                {PIPELINE_STAGES.map((s) => {
                                                    const sc = STAGE_CONFIG[s] || DEFAULT_STAGE_CONFIG;
                                                    const active = s === l.stage;
                                                    return (
                                                        <button 
                                                            key={s}
                                                            onClick={async () => {
                                                                try {
                                                                    await leadsApi.update(l.id, { stage: s });
                                                                    setSelectedLead(prev => ({ ...prev, stage: s }));
                                                                    setShowStagePicker(null);
                                                                    refetch();
                                                                } catch { showToast('Failed', 'error'); }
                                                            }}
                                                            style={{
                                                                padding: '10px 8px',
                                                                borderRadius: '8px',
                                                                border: '1px solid',
                                                                borderColor: active ? sc.accent : '#f1f5f9',
                                                                background: active ? sc.bg : 'white',
                                                                color: active ? sc.color : 'var(--navy-600)',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 800,
                                                                textAlign: 'left',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.1s'
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '0.9rem' }}>{sc.emoji}</span>
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Panel Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Score */}
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', background: 'var(--slate-50)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-light)' }}>
                                    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                                        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="26" cy="26" r="22" fill="none" stroke="var(--slate-100)" strokeWidth="5" />
                                            <circle cx="26" cy="26" r="22" fill="none"
                                                stroke={l.score > 80 ? '#10b981' : l.score > 60 ? '#f59e0b' : '#f43f5e'}
                                                strokeWidth="5"
                                                strokeDasharray={`${(l.score / 100) * 138.2} 138.2`}
                                                strokeLinecap="round" />
                                        </svg>
                                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>{l.score}</span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Lead Score</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.score >= 80 ? 'Hot lead 🔥 — high conversion probability' : l.score >= 55 ? 'Warm lead — follow up soon' : 'Cold lead — needs nurturing'}</div>
                                    </div>
                                </div>

                                {/* Details grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        { icon: '💰', label: 'Budget', value: l.budget },
                                        { icon: '🏠', label: 'Property', value: l.property_type },
                                        { icon: '🏢', label: 'Project', value: l.project_name },
                                        { icon: '📍', label: 'City', value: l.city },
                                        { icon: '📅', label: 'Last Contact', value: l.last_contact_at ? new Date(l.last_contact_at).toLocaleDateString('en-IN') : '—' },
                                        { icon: '📣', label: 'Source', value: l.source },
                                        { icon: '👤', label: 'Agent', value: l.agent_name || '—' },
                                        { icon: '📊', label: 'Stage', value: l.stage },
                                    ].map(row => (
                                        <div key={row.label} style={{ background: 'var(--slate-50)', borderRadius: 'var(--border-radius-sm)', padding: '10px 12px', border: '1px solid var(--border-light)' }}>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{row.icon} {row.label}</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{row.value || '—'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Contact */}
                                <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Contact Info</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                        <Phone size={13} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600 }}>{l.phone || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                        <Mail size={13} style={{ color: 'var(--navy-500)', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600 }}>{l.email || '—'}</span>
                                    </div>
                                </div>

                                {/* Notes */}
                                {l.notes && (
                                    <div style={{ background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', marginBottom: 6 }}>📝 Notes</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{l.notes}</div>
                                    </div>
                                )}

                                {/* Stage pipeline stepper */}
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Pipeline Progress</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                        {PIPELINE_STAGES.map((s, i) => {
                                            const sc = STAGE_CONFIG[s] || DEFAULT_STAGE_CONFIG;
                                            const active = s === l.stage;
                                            const done = PIPELINE_STAGES.indexOf(l.stage) > i && l.stage !== 'Lost';
                                            const isLast = i === PIPELINE_STAGES.length - 1;
                                            return (
                                                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
                                                    <button onClick={async () => {
                                                        try { await leadsApi.update(l.id, { stage: s }); setSelectedLead(prev => ({ ...prev, stage: s })); refetch(); }
                                                        catch { showToast('Failed', 'error'); }
                                                    }} title={s} style={{
                                                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                                        background: active ? sc.accent : done ? 'var(--accent-emerald)' : 'var(--slate-100)',
                                                        border: `2px solid ${active ? sc.accent : done ? 'var(--accent-emerald)' : 'var(--border-light)'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', fontSize: '0.7rem', color: active || done ? 'white' : 'var(--text-muted)',
                                                        fontWeight: 700, transition: 'all 0.15s', boxShadow: active ? `0 0 0 3px ${sc.accent}30` : 'none',
                                                    }}>{sc.emoji}</button>
                                                    {!isLast && <div style={{ height: 2, flex: 1, background: done ? 'var(--accent-emerald)' : 'var(--slate-100)', transition: 'all 0.3s' }} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>New</span>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Lost</span>
                                    </div>
                                </div>
                            </div>

                            {/* Panel Footer */}
                            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
                                <button className="btn btn-danger btn-sm" style={{ fontSize: '0.78rem' }}
                                    onClick={async () => {
                                        try { await leadsApi.update(l.id, { stage: 'Lost' }); setSelectedLead(null); refetch(); }
                                        catch { showToast('Failed', 'error'); }
                                    }}>
                                    ❌ Mark Lost
                                </button>
                                <button className="btn btn-success btn-sm" style={{ fontSize: '0.78rem', flex: 1 }}
                                    onClick={async () => {
                                        try { await leadsApi.update(l.id, { stage: 'Won' }); setSelectedLead(null); refetch(); }
                                        catch { showToast('Failed', 'error'); }
                                    }}>
                                    🏆 Mark Won
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ══════════════════════════════════════════════════════
                ADD LEAD MODAL
            ══════════════════════════════════════════════════════ */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Lead to {showAddModal}</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowAddModal(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Customer full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-control" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input className="form-control" value={addForm.city} onChange={e => setAddForm({ ...addForm, city: e.target.value })} placeholder="Mumbai" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Budget</label>
                                    <input className="form-control" value={addForm.budget} onChange={e => setAddForm({ ...addForm, budget: e.target.value })} placeholder="₹85L" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Source</label>
                                    <select className="form-control" value={addForm.source} onChange={e => setAddForm({ ...addForm, source: e.target.value })}>
                                        {['Website', 'Referral', 'Social Media', 'Walk-in', 'PropTech'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Property Type</label>
                                    <select className="form-control" value={addForm.property_type} onChange={e => setAddForm({ ...addForm, property_type: e.target.value })}>
                                        {['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Penthouse', 'Commercial'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Project</label>
                                    <select className="form-control" value={addForm.project_id} onChange={e => setAddForm({ ...addForm, project_id: e.target.value })}>
                                        <option value="">Any project</option>
                                        {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign To</label>
                                    <select className="form-control" value={addForm.assigned_to} onChange={e => setAddForm({ ...addForm, assigned_to: e.target.value })}>
                                        <option value="">Select agent</option>
                                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stage</label>
                                    <select className="form-control" value={addForm.stage} onChange={e => setAddForm({ ...addForm, stage: e.target.value })}>
                                        {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Lead Score (0–100)</label>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <input type="range" min={0} max={100} value={addForm.score}
                                            onChange={e => setAddForm({ ...addForm, score: parseInt(e.target.value) })}
                                            style={{ flex: 1, accentColor: addForm.score > 80 ? '#10b981' : addForm.score > 60 ? '#f59e0b' : '#f43f5e' }} />
                                        <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: 36, color: addForm.score > 80 ? 'var(--accent-emerald)' : addForm.score > 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{addForm.score}</span>
                                    </div>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-control" rows={2} value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Any relevant notes..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveNewLead} disabled={!addForm.name}>
                                <Plus size={14} /> Add to Pipeline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
