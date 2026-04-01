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
    Phone, Mail, MapPin, TrendingUp, Clock, Star, Zap, Eye,
    ArrowRight, MoreHorizontal, AlertCircle, CheckCircle2, Target,
    DollarSign, Award, List as ViewListIcon, Sparkles, Bot, Wand2,
    Home, Handshake, Layout, Users, Table, RotateCw
} from 'lucide-react';

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
    const n = parseFloat(budget.replace(/[₹\s]/g, ''));
    if (budget.includes('Cr')) return n * 100;
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
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('kanban');
    const { user: currentUser } = useAuth();
    const { viewers, trackPage } = usePresence();

    useEffect(() => {
        trackPage('/pipeline');
    }, []);

    const activeViewers = (viewers['/pipeline'] || []).filter(u => u.id !== currentUser?.id);
    const dragCard = useRef(null);

    const filteredLeads = leads.filter(l => {
        const q = searchQ.toLowerCase();
        const matchQ = !q || l.name.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || l.budget?.toLowerCase().includes(q);
        const matchAgent = filterAgent === 'All' || l.assigned_to === filterAgent;
        const matchSource = filterSource === 'All' || l.source === filterSource;
        const matchPriority = filterPriority === 'All' || l.priority === filterPriority;
        return matchQ && matchAgent && matchSource && matchPriority;
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
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-left">
                    <h1 className="page-title">Sales Pipeline</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <p className="page-subtitle">Visualize and manage your lead funnel stages</p>
                        
                        {/* Real-time Presence */}
                        {activeViewers.length > 0 && (
                            <div className="presence-indicator" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--slate-50)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border-light)' }}>
                                <div className="avatar-group">
                                    {activeViewers.map(u => (
                                        <div key={u.id} className="avatar avatar-xs" title={`${u.name} is on this board`}>
                                            {u.avatar || u.name[0]}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs text-muted font-bold">TEAM SYNCED</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="page-actions" style={{ gap: 12 }}>
                    {/* View Switcher Ribbon */}
                    <div style={{ display: 'flex', background: 'var(--slate-100)', padding: 4, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                        {[
                            { id: 'metrics', label: 'Metrics', icon: TrendingUp },
                            { id: 'kanban', label: 'Kanban', icon: Target },
                            { id: 'matrix', label: 'Matrix', icon: ViewListIcon }
                        ].map(m => (
                            <button
                                key={m.id}
                                className={`btn btn-sm ${viewMode === m.id ? 'btn-white shadow-sm' : 'btn-ghost'}`}
                                onClick={() => setViewMode(m.id)}
                                style={{ borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, gap: 6, opacity: viewMode === m.id ? 1 : 0.6 }}
                            >
                                <m.icon size={13} /> {m.label}
                            </button>
                        ))}
                    </div>

                    <button className="btn btn-primary" onClick={() => { setAddForm(DEFAULT_LEAD); setShowAddModal('New'); }}>
                        <Plus size={15} /> Add Lead
                    </button>
                </div>
            </div>

            {/* Stage Metrics Ribbon (Colorful Version) */}
            <div className="card" style={{ padding: '3px 6px', borderRadius: 12, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', background: 'white', marginBottom: 8, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px', width: '100%' }}>
                    {PIPELINE_STAGES.map((stage, i) => {
                        const sc = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                        const count = byStage(stage).length;
                        const val = stageValueL(stage);
                        const Icon = sc.lucide || Target;
                        
                        return (
                            <div key={stage} style={{ 
                                display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', 
                                borderRadius: 8, background: sc.bg, border: `1px solid ${sc.color}15`,
                                minWidth: 0, overflow: 'hidden'
                            }}>
                                <div style={{ width: 22, height: 22, borderRadius: '6px', background: 'white', color: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                    <Icon size={11} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.6rem', color: 'var(--navy-950)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.split(' ')[0]}</span>
                                        <span style={{ fontWeight: 800, color: sc.color, fontSize: '0.6rem', flexShrink: 0 }}>{count}</span>
                                    </div>
                                    <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 1 }}>{fmtL(val)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Search & Filters (Compact Style) */}
            <div className="card shadow-sm" style={{ padding: '6px 12px', borderRadius: 12, background: 'white', border: '1px solid var(--border-light)', marginBottom: 8, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                        <input
                            type="text"
                            placeholder="Search leads by name, city, budget, project..."
                            className="form-control"
                            style={{ 
                                paddingLeft: 40, borderRadius: 8, border: '1px solid var(--border-light)', 
                                background: 'var(--slate-50)', height: 36, fontSize: '0.82rem', fontWeight: 500 
                            }}
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                        />
                        {searchQ && (
                            <button onClick={() => setSearchQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 1, height: 24, background: 'var(--border-light)', margin: '0 4px' }} />
                        <button onClick={() => setShowFilters(f => !f)} className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-outline'}`} style={{ borderRadius: 8, gap: 6, height: 36, fontSize: '0.78rem', fontWeight: 700, padding: '0 12px' }}>
                            <Filter size={15} /> Filters
                            {(filterAgent !== 'All' || filterSource !== 'All' || filterPriority !== 'All') &&
                                <span style={{ background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>!</span>
                            }
                        </button>
                    </div>
                </div>
                {showFilters && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px dotted var(--border-light)' }}>
                        <select className="form-control" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
                            style={{ width: 'auto', minWidth: 160, fontSize: '0.85rem', borderRadius: 10 }}>
                            <option value="All">All Agents</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select className="form-control" value={filterSource} onChange={e => setFilterSource(e.target.value)}
                            style={{ width: 'auto', minWidth: 160, fontSize: '0.85rem', borderRadius: 10 }}>
                            <option value="All">All Sources</option>
                            {SOURCES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <select className="form-control" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                            style={{ width: 'auto', minWidth: 160, fontSize: '0.85rem', borderRadius: 10 }}>
                            <option value="All">All Priorities</option>
                            {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                        </select>
                        {(filterAgent !== 'All' || filterSource !== 'All' || filterPriority !== 'All') && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-rose)', fontWeight: 700 }}
                                onClick={() => { setFilterAgent('All'); setFilterSource('All'); setFilterPriority('All'); }}>
                                <RotateCw size={14} style={{ marginRight: 6 }} /> Reset
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
                METRICS VIEW
            ══════════════════════════════════════════════════════ */}
            {/* ── Metrics View: Professional Command Layout ── */}
            {viewMode === 'metrics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Top Row: KPIs and Funnel Chart */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 2fr', gap: 20, alignItems: 'stretch' }}>
                        {/* KPI Grid */}
                        <div className="grid grid-2" style={{ gap: 16 }}>
                            {[
                                { label: 'Pipeline Value', value: totalPipelineVal, icon: <DollarSign size={20} />, color: 'var(--navy-600)', bg: 'rgba(30,58,115,0.05)', border: 'rgba(30,58,115,0.1)' },
                                { label: 'Active Leads', value: active, icon: <Zap size={20} />, color: 'var(--accent-cyan-dark)', bg: 'rgba(6,182,212,0.05)', border: 'rgba(6,182,212,0.1)' },
                                { label: 'Win Rate', value: `${convRate}%`, icon: <Award size={20} />, color: 'var(--accent-emerald-dark)', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.1)' },
                                { label: 'Lost Leads', value: lost, icon: <TrendingUp size={20} style={{ transform: 'rotate(90deg)' }} />, color: 'var(--accent-rose-dark)', bg: 'rgba(244,63,94,0.05)', border: 'rgba(244,63,94,0.1)' },
                            ].map(s => (
                                <div key={s.label} className="hover-lift" style={{ background: s.bg, borderRadius: '16px', border: `1px solid ${s.border}`, padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>{s.icon}</div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--navy-800)', lineHeight: 1 }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Funnel Card */}
                        <div className="card" style={{ padding: '24px 32px', background: 'white', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Target size={18} className="text-primary" /> Visual Sales Funnel
                                </h3>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-emerald-dark)' }}>{convRate}%</div><div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Success</div></div>
                                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-600)' }}>{active}</div><div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Flow</div></div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, alignItems: 'center', flex: 1 }}>
                                <div style={{ position: 'relative', height: 260 }}>
                                    <svg width="100%" height="260" viewBox="0 0 500 320" preserveAspectRatio="xMidYMid meet">
                                        <defs>
                                            <filter id="fShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" /><feOffset dx="0" dy="4" /><feComponentTransfer><feFuncA type="linear" slope="0.15" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                                            {PIPELINE_STAGES.map((stage, i) => (
                                                <linearGradient key={`grad-${i}`} id={`grad-side-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor={STAGE_CONFIG[stage]?.accent} stopOpacity="0.85" /><stop offset="100%" stopColor={STAGE_CONFIG[stage]?.accent} stopOpacity="1" />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        {PIPELINE_STAGES.map((stage, i) => {
                                            const count = byStage(stage).length;
                                            const h = 35; const gap = 4; const y = i * (h + gap);
                                            const topW = 420 - (i * 45); const botW = 420 - ((i + 1) * 45);
                                            const x1 = (500 - topW) / 2; const x2 = x1 + topW; const x3 = (500 - botW) / 2 + botW; const x4 = (500 - botW) / 2;
                                            const points = `${x1},${y} ${x2},${y} ${x3},${y + h} ${x4},${y + h}`;
                                            return (
                                                <g key={stage} className="funnel-segment" style={{ cursor: 'pointer' }}>
                                                    <polygon points={points} fill={`url(#grad-side-${i})`} filter="url(#fShadow)" />
                                                    <text x="250" y={y + (h / 2) + 4} textAnchor="middle" fill="white" style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', pointerEvents: 'none' }}>{stage.split(' ')[0]} ({count})</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {PIPELINE_STAGES.slice(0, 6).map((stage) => {
                                        const count = byStage(stage).length; const cfg = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                                        return (
                                            <div key={stage} style={{ padding: '8px 12px', background: 'var(--slate-50)', borderRadius: '10px', borderLeft: `3px solid ${cfg.accent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stage}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--navy-800)' }}>{fmtL(stageValueL(stage))}</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.accent }}>{count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Detailed Performance and Opportunities */}
                    <div className="grid grid-2" style={{ gap: 24, alignItems: 'start' }}>
                        {/* Stage Performance Table */}
                        <div className="card" style={{ padding: 0 }}>
                            <div className="card-header" style={{ padding: '24px' }}>
                                <div className="card-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <ViewListIcon size={18} style={{ color: 'var(--navy-600)' }} /> Stage Performance
                                </div>
                            </div>
                            <div className="card-body" style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--slate-50)' }}>
                                            {['Stage', 'Leads', 'Pipeline Value', 'Avg. Score'].map(h => (
                                                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border-light)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PIPELINE_STAGES.map((stage, i) => {
                                            const sl = byStage(stage);
                                            const cfg = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                                            const avgScore = sl.length ? Math.round(sl.reduce((a, l) => a + (parseInt(l.score) || 0), 0) / sl.length) : 0;
                                            return (
                                                <tr key={stage} style={{ borderBottom: i === PIPELINE_STAGES.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                                    <td style={{ padding: '16px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.accent }} /><span style={{ fontWeight: 700, color: 'var(--navy-800)' }}>{stage}</span></div></td>
                                                    <td style={{ padding: '16px 20px' }}><span style={{ fontWeight: 800, color: cfg.accent }}>{sl.length}</span></td>
                                                    <td style={{ padding: '16px 20px', fontWeight: 700 }}>{fmtL(stageValueL(stage))}</td>
                                                    <td style={{ padding: '16px 20px' }}>{sl.length ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ height: 6, width: 40, background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${avgScore}%`, background: avgScore > 80 ? 'var(--accent-emerald)' : avgScore > 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }} /></div><span style={{ fontWeight: 700 }}>{avgScore}</span></div> : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* High Value Opportunities */}
                        <div className="card" style={{ padding: 0 }}>
                            <div className="card-header" style={{ padding: '24px' }}><div className="card-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={18} style={{ color: 'var(--accent-amber-dark)' }} /> High Value Opportunities</div></div>
                            <div className="card-body" style={{ padding: '0 24px 24px' }}>
                                {[...leads].sort((a, b) => parseBudgetL(b.budget) - parseBudgetL(a.budget)).slice(0, 6).map((l, i) => (
                                    <div key={l.id} onClick={() => setSelectedLead(l)} className="hover-lift" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer', background: i === 0 ? 'rgba(245,158,11,0.03)' : 'white' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: `hsl(${l.id * 47 % 360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>{l.name[0]}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>{l.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.city}</div></div>
                                        <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 900, color: 'var(--navy-600)', fontSize: '0.95rem' }}>{l.budget}</div><div style={{ fontSize: '0.65rem', fontWeight: 700, color: STAGE_CONFIG[l.stage]?.color }}>{l.stage}</div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                KANBAN VIEW
            ══════════════════════════════════════════════════════ */}
            {viewMode === 'kanban' && (
                <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflow: 'hidden' }}>
                    <div className="pipeline-board">
                        {PIPELINE_STAGES.map((stage) => {
                            const stageLeads = byStage(stage);
                            const cfg = STAGE_CONFIG[stage] || DEFAULT_STAGE_CONFIG;
                            const isOver = dragOver === stage;
                            const isCollapsed = collapsed[stage];
                            const val = stageValueL(stage);

                            return (
                                <div key={stage}
                                    className="pipeline-column"
                                    style={{
                                        borderTop: `4px solid ${cfg.accent}`,
                                        outline: isOver ? `2px dashed ${cfg.accent}` : 'none',
                                        background: isOver ? `linear-gradient(${cfg.bg}, white)` : 'var(--slate-50)',
                                        transition: 'all 0.15s',
                                        width: '100%',
                                        height: '100%',
                                        minWidth: 0,
                                        borderRadius: '12px 12px 0 0',
                                        boxShadow: 'var(--shadow-sm)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden'
                                    }}
                                    onDragOver={e => onDragOver(e, stage)}
                                    onDrop={e => onDrop(e, stage)}
                                >
                                    {/* Column Header */}
                                    <div className="pipeline-col-header" style={{ gap: 4, padding: '4px 6px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
                                        {isCollapsed ? (
                                            <button onClick={() => setCollapsed(c => ({ ...c, [stage]: false }))}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
                                                <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: cfg.color, writingMode: 'vertical-lr', textOrientation: 'mixed', letterSpacing: '0.04em' }}>{stage}</span>
                                                <span className="pipeline-col-count" style={{ background: cfg.bg, color: cfg.color }}>{stageLeads.length}</span>
                                            </button>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ width: 26, height: 26, borderRadius: '8px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                                        {cfg.emoji || '📁'}
                                                    </div>
                                                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                                                            <span className="pipeline-col-name" style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '0.8rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage}</span>
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--slate-100)', padding: '2px 6px', borderRadius: 99, flexShrink: 0 }}>{stageLeads.length}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: cfg.color, marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {fmtL(val)} pipe <ChevronRight size={10} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                    <button onClick={() => { setAddForm({ ...DEFAULT_LEAD, stage }); setShowAddModal(stage); }}
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 8, transition: 'all 0.2s' }}
                                                        className="hover-lift" title="Add lead">
                                                        <Plus size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {!isCollapsed && (
                                        <div className="pipeline-col-body" style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                            {stageLeads.map(lead => {
                                                const pc = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.Medium;
                                                const isDragging = dragging === lead.id;
                                                const avatarBg = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#ec4899', '#f97316'][(lead.name || 'A').charCodeAt(0) % 10];

                                                return (
                                                    <div key={lead.id}
                                                        className="kanban-card"
                                                        draggable
                                                        onDragStart={e => onDragStart(e, lead.id)}
                                                        onDragEnd={onDragEnd}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                                        style={{ 
                                                            opacity: isDragging ? 0.35 : 1,
                                                            background: 'white',
                                                            borderRadius: '12px',
                                                            padding: '10px',
                                                            border: '1px solid #e2e8f0',
                                                            boxShadow: isDragging ? 'none' : '0 2px 8px rgba(10,22,40,0.04)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 8,
                                                            cursor: 'grab'
                                                        }}
                                                    >
                                                        {/* Top: Info */}
                                                        <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                                                            <div style={{ width: 34, height: 34, borderRadius: '10px', background: avatarBg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>
                                                                {(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                                            </div>
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--navy-950)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{lead.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.city || 'Pune'}</div>
                                                            </div>
                                                        </div>

                                                        {/* Project Badge */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-600)', background: 'var(--slate-50)', padding: '5px 8px', borderRadius: '8px' }}>
                                                            <Home size={11} style={{ opacity: 0.6 }} />
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.project || 'Zentrix Elite'}</span>
                                                        </div>

                                                        {/* Tags */}
                                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, background: pc.bg, color: pc.color }}>{lead.priority}</span>
                                                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{lead.source}</span>
                                                        </div>

                                                        {/* Stats Footer */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 2 }}>
                                                            <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Zap size={12} fill="var(--accent-emerald)" color="transparent" />
                                                                {lead.budget || '₹60L'}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Today</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Minimalist Ghost Slot */}
                                            {stageLeads.length < 1 && (
                                                <div style={{ border: '1.5px dashed var(--border-light)', borderRadius: 12, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, background: 'var(--slate-50)' }}>
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
                MATRIX VIEW (TABLE)
            ══════════════════════════════════════════════════════ */}
            {viewMode === 'matrix' && (
                <div style={{ padding: '0 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                    <div className="card" style={{ padding: 0, background: 'white', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: 'var(--slate-50)' }}>
                                        {['Lead Details', 'Location', 'Budget', 'Stage', 'Priority', 'Agent', 'Score', ''].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 24px', textAlign: 'left', fontSize: '0.68rem', 
                                                fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', 
                                                letterSpacing: '0.05em', borderBottom: '1px solid var(--border-light)' 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map((l, i) => {
                                        const cfg = STAGE_CONFIG[l.stage] || DEFAULT_STAGE_CONFIG;
                                        const pc = PRIORITY_CONFIG[l.priority] || PRIORITY_CONFIG.Low;
                                        return (
                                            <tr key={l.id} 
                                                className="hover-lift" 
                                                onClick={() => setSelectedLead(l)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    borderBottom: i === filteredLeads.length - 1 ? 'none' : '1px solid var(--border-light)',
                                                }}>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ 
                                                            width: 40, height: 40, borderRadius: '8px', 
                                                            background: 'var(--slate-50)',
                                                            color: 'var(--navy-600)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem',
                                                            boxShadow: 'inset 0 0 0 1px var(--border-light)'
                                                        }}>
                                                            {l.name[0]}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-950)' }}>{l.name}</div>
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{l.city || '—'}</td>
                                                <td style={{ padding: '16px 24px', fontSize: '1rem', fontWeight: 900, color: 'var(--navy-800)' }}>{l.budget}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ 
                                                        padding: '4px 14px', borderRadius: 20, fontSize: '0.72rem', 
                                                        fontWeight: 700, background: cfg.bg, color: cfg.color,
                                                        border: `1px solid ${cfg.color}20`
                                                    }}>{l.stage}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ 
                                                        padding: '4px 14px', borderRadius: 20, fontSize: '0.72rem', 
                                                        fontWeight: 700, background: pc.bg, color: pc.color,
                                                        border: `1px solid ${pc.color}20`
                                                    }}>{l.priority}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{l.agent_name || 'Unassigned'}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ height: 6, width: 44, background: 'var(--slate-100)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                                                            <div style={{ height: '100%', width: `${l.score}%`, background: l.score > 80 ? 'var(--accent-emerald)' : l.score > 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--navy-950)' }}>{l.score}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    <ChevronRight size={18} style={{ color: 'var(--slate-300)' }} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
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
                            position: 'relative', width: 420, background: 'white', height: '100%',
                            display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(10,22,40,0.18)',
                            animation: 'slideInRight 0.25s ease',
                        }} onClick={e => e.stopPropagation()}>
                            {/* Panel Header */}
                            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border-light)', background: cfg.light }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                        background: `hsl(${(l.id || '0').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % 360}, 60%, 55%)`,
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
                                {/* Stage mover */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => mvStage(l, -1)} disabled={stageIdx === 0}
                                        className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', flex: 1, opacity: stageIdx === 0 ? 0.4 : 1 }}>
                                        ← Prev Stage
                                    </button>
                                    <button onClick={() => mvStage(l, 1)} disabled={stageIdx === PIPELINE_STAGES.length - 1}
                                        className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', flex: 1, opacity: stageIdx === PIPELINE_STAGES.length - 1 ? 0.4 : 1 }}>
                                        Next Stage →
                                    </button>
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
