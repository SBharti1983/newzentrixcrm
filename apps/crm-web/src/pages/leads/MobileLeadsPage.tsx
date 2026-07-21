import React, { useState, useMemo, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Phone, Mail, Filter, RotateCw, Calendar, Edit2, Trash2, X, MoreVertical,
    ChevronRight, ChevronLeft, Sparkles, SlidersHorizontal, ArrowUpDown, UserCheck, Check,
    Clock, Tag, Building2, MapPin, CheckCircle2, TrendingUp, AlertCircle
} from 'lucide-react';
import { dialerEvents } from '../../constants/events';
import * as dateUtils from '../../utils/dateUtils';

// ─── Native Mobile Color Tokens ───────────────────────────────────────────
const C = {
    white: '#ffffff',
    slate50: '#f8fafc',
    slate100: '#f1f5f9',
    slate200: '#e2e8f0',
    slate300: '#cbd5e1',
    slate400: '#94a3b8',
    slate500: '#64748b',
    slate600: '#475569',
    slate700: '#334155',
    slate800: '#1e293b',
    slate950: '#0f172a',
    emerald: '#10b981',
    emeraldLight: '#d1fae5',
    emeraldDark: '#059669',
    violet: '#8b5cf6',
    violetLight: '#ede9fe',
    violetDark: '#7c3aed',
    indigo: '#6366f1',
    indigoLight: '#e0e7ff',
    blue: '#3b82f6',
    blueLight: '#dbeafe',
    amber: '#f59e0b',
    amberLight: '#fef3c7',
    rose: '#f43f5e',
    roseLight: '#ffe4e6',
};

const STAGES = ['All', 'New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'];

const STAGE_DOT_COLORS: Record<string, string> = {
    'All': '#6366f1',
    'New Lead': '#3b82f6',
    'Connected': '#6366f1',
    'Qualified': '#06b6d4',
    'Site Visit Scheduled': '#14b8a6',
    'Site Visit Done': '#10b981',
    'Interested': '#7c4dff',
    'Proposal Shared': '#d946ef',
    'Negotiation': '#f59e0b',
    'Won': '#22c55e',
    'Lost': '#f43f5e'
};

interface MobileLeadsPageProps {
    leads: any[];
    loading: boolean;
    search: string;
    setSearch: (val: string) => void;
    filterStage: string;
    setFilterStage: (stage: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    selectedIds: Set<any>;
    toggleSelect: (id: any) => void;
    deleteLead: (id: any) => void;
    openEdit: (lead: any) => void;
    openAdd: () => void;
    fetchLeads: () => void;
    kpiMetrics?: {
        total: number;
        newToday: number;
        todayFollowups: number;
        highIntent: number;
        pipelineValue: string;
    };
    lastFetchTime?: Date | null;
}

// ─── Compact Score Progress Ring ──────────────────────────────────────────
function ScoreRing({ score, size = 40, stroke = 2.5 }: { score: number; size?: number; stroke?: number }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score > 80 ? C.emerald : score > 50 ? C.amber : C.slate400;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.slate100} strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${offset}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
        </svg>
    );
}

const getSourceChipStyle = (source: string) => {
    if (!source) return { bg: '#f1f5f9', border: '#e2e8f0', text: '#475569' };
    const s = source.toLowerCase();
    if (s.includes('facebook') || s.includes('fb')) return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' }; // light blue
    if (s.includes('whatsapp')) return { bg: '#dcfce7', border: '#bbf7d0', text: '#15803d' }; // green
    if (s.includes('website') || s.includes('direct')) return { bg: '#f3e8ff', border: '#e9d5ff', text: '#6b21a8' }; // light purple
    if (s.includes('referral') || s.includes('partner')) return { bg: '#ccfbf1', border: '#99f6e4', text: '#0f766e' }; // teal
    if (s.includes('walk') || s.includes('event')) return { bg: '#ffedd5', border: '#fed7aa', text: '#c2410c' }; // orange
    if (s.includes('google')) return { bg: '#ffe4e6', border: '#fecdd3', text: '#be123c' }; // rose
    return { bg: '#f1f5f9', border: '#e2e8f0', text: '#475569' };
};

// ─── Mobile Lead Card (2-Row Ultra-Compact Native Layout) ─────────────────
const MobileCard = memo(({ lead, isSelected, search, onSelect, onDelete, onEdit, onCall, onNavigate }: any) => {
    const leadScore = typeof lead.score === 'number' ? lead.score : 0;
    const scoreColor = leadScore > 80 ? C.emerald : leadScore > 50 ? C.amber : C.slate400;
    const accentBg = leadScore > 80
        ? 'linear-gradient(90deg, #10b981, #06d6a0)'
        : leadScore > 50
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : 'linear-gradient(90deg, #cbd5e1, #e2e8f0)';

    const nameSeed = (String(lead.name || '#')).charCodeAt(0);
    const avatarBg = isSelected ? C.indigo : `hsl(${nameSeed * 47 + 180}, 70%, 36%)`;
    const initials = isSelected ? '✓' : String(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2);
    const sourceChip = getSourceChipStyle(lead.source);

    return (
        <div
            onClick={() => onNavigate(lead.id)}
            style={{
                background: isSelected ? 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)' : 'white',
                borderRadius: 14,
                border: isSelected ? `1.5px solid ${C.indigo}` : '1px solid #f1f5f9',
                padding: '9px 11px',
                marginBottom: 6,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.15)' : '0 2px 10px rgba(15,23,42,0.06)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.15s ease'
            }}
        >
            {/* Top gradient accent line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: accentBg, borderRadius: '14px 14px 0 0'
            }} />

            {/* Row 1: Avatar + Name & Phone + Co-located Lead Actions (Edit ✏️ & Options ⋮ / Call 📞) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6, marginTop: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <div
                        onClick={e => { e.stopPropagation(); onSelect(lead.id); }}
                        style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}
                    >
                        <ScoreRing score={leadScore} size={38} stroke={2.5} />
                        <div style={{
                            position: 'absolute', inset: 4,
                            background: avatarBg,
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 900, fontSize: '12px',
                            textTransform: 'uppercase'
                        }}>
                            {initials}
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 850, fontSize: '0.88rem', color: C.slate950, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lead.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: C.slate600, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                            <Phone size={11} style={{ color: C.emerald, flexShrink: 0 }} />
                            <span>{lead.phone || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Co-located Lead Action Buttons: Call 📞, Edit ✏️ and Options ⋮ */}
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button
                        onClick={() => onCall(lead.id, lead.phone, lead.name)}
                        title="Call Lead"
                        style={{
                            width: 32, height: 32, borderRadius: 8,
                            border: '1px solid #bbf7d0', background: '#f0fdf4',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <Phone size={14} style={{ color: '#059669' }} strokeWidth={2.2} />
                    </button>
                    <button
                        onClick={() => onEdit(lead)}
                        title="Edit Lead"
                        style={{
                            width: 32, height: 32, borderRadius: 8,
                            border: '1px solid #cbd5e1', background: '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <Edit2 size={14} style={{ color: C.slate700 }} strokeWidth={2.2} />
                    </button>
                    <button
                        onClick={() => onDelete(lead.id)}
                        title="Delete Lead / Options"
                        style={{
                            width: 32, height: 32, borderRadius: 8,
                            border: '1px solid #cbd5e1', background: '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <MoreVertical size={14} style={{ color: C.slate700 }} strokeWidth={2.2} />
                    </button>
                </div>
            </div>

            {/* Row 2: Stage, Score, Property & Date Pills */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 4, borderTop: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', flex: 1, minWidth: 0 }}>
                    <span style={{
                        fontSize: '0.58rem', fontWeight: 900, padding: '2px 7px', borderRadius: 6,
                        background: `${STAGE_DOT_COLORS[lead.stage] || C.indigo}15`,
                        color: STAGE_DOT_COLORS[lead.stage] || C.indigo,
                        border: `1px solid ${STAGE_DOT_COLORS[lead.stage] || C.indigo}25`,
                        textTransform: 'uppercase', flexShrink: 0
                    }}>
                        {lead.stage || 'New Lead'}
                    </span>
                    <span style={{
                        fontSize: '0.58rem', fontWeight: 900, color: scoreColor,
                        display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
                        background: `${scoreColor}16`, padding: '2px 6px', borderRadius: 6,
                        border: `1px solid ${scoreColor}30`
                    }}>
                        ⭐ {leadScore} pts
                    </span>
                    <span style={{ fontSize: '0.62rem', color: C.slate500, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.property_type || 'Property Pending'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Calendar size={11} style={{ color: C.indigo }} />
                    <span style={{ fontSize: '0.62rem', color: C.slate500, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never'}
                    </span>
                </div>
            </div>
        </div>
    );
});

// ─── Main Standalone Mobile Leads Page ───────────────────────────────────
export default function MobileLeadsPage({
    leads,
    loading,
    search,
    setSearch,
    filterStage,
    setFilterStage,
    filterStatus,
    setFilterStatus,
    selectedIds,
    toggleSelect,
    deleteLead,
    openEdit,
    openAdd,
    fetchLeads,
    kpiMetrics,
    lastFetchTime
}: MobileLeadsPageProps) {
    const navigate = useNavigate();
    const [sortOption, setSortOption] = useState<'score' | 'newest' | 'name'>('score');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Calculate live counts per stage for filter chips
    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = { All: leads.length };
        leads.forEach(l => {
            const st = l.stage || 'New Lead';
            counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [leads]);

    // Reset page to 1 whenever filters/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStage, filterStatus, search, sortOption]);

    // Filter & Sort leads
    const filteredLeads = useMemo(() => {
        let result = [...leads];

        if (filterStage !== 'All') {
            result = result.filter(l => (l.stage || 'New Lead') === filterStage);
        }

        if (filterStatus !== 'All') {
            result = result.filter(l => (l.status || 'Active') === filterStatus);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(l =>
                l.name?.toLowerCase().includes(q) ||
                l.phone?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q) ||
                l.project_name?.toLowerCase().includes(q)
            );
        }

        if (sortOption === 'score') {
            result.sort((a, b) => (b.score || 0) - (a.score || 0));
        } else if (sortOption === 'newest') {
            result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        } else if (sortOption === 'name') {
            result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return result;
    }, [leads, filterStage, filterStatus, search, sortOption]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredLeads.length);
    const paginatedLeads = useMemo(() => {
        return filteredLeads.slice(startIdx, endIdx);
    }, [filteredLeads, startIdx, endIdx]);

    return (
        <div style={{
            background: C.slate50,
            minHeight: '100vh',
            paddingBottom: 125,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Top Compact Native Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 30,
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #f1f5f9',
                padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: 6
            }}>
                {/* Search Bar before Refresh Button */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f8fafc', borderRadius: 9,
                    padding: '0 10px', border: '1px solid #cbd5e1',
                    flex: 1, minWidth: 0, height: 32
                }}>
                    <Search size={14} color={C.indigo} style={{ flexShrink: 0 }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search leads..."
                        style={{
                            border: 'none', background: 'transparent', width: '100%',
                            fontSize: '0.78rem', color: C.slate950, outline: 'none', fontWeight: 650
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            title="Clear search"
                            style={{
                                border: 'none', background: C.slate200, borderRadius: '50%',
                                width: 16, height: 16, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0
                            }}
                        >
                            <X size={10} color={C.slate700} />
                        </button>
                    )}
                </div>

                <button
                    onClick={fetchLeads}
                    title="Refresh Data"
                    style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: C.slate100, border: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0
                    }}
                >
                    <RotateCw size={13} className={loading ? 'animate-spin' : ''} color={C.slate700} />
                </button>
                <button
                    onClick={openAdd}
                    style={{
                        padding: '0 10px', height: 32, borderRadius: 9,
                        background: C.indigo, color: 'white', border: 'none',
                        fontWeight: 800, fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', gap: 4,
                        cursor: 'pointer', boxShadow: '0 3px 8px rgba(99,102,241,0.2)',
                        flexShrink: 0, whiteSpace: 'nowrap'
                    }}
                >
                    <Plus size={14} /> Add Lead
                </button>
            </div>

            <div style={{ padding: '8px 10px 0' }}>
                {/* Compact Horizontal KPI Metric Cards Ribbon */}
                <div style={{
                    display: 'flex', gap: 6, paddingBottom: 6, paddingTop: 2,
                    overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
                }}>
                    {[
                        { label: 'Total Leads', val: kpiMetrics?.total || leads.length, icon: TrendingUp, color: C.indigo, bg: C.indigoLight },
                        { label: 'New Today', val: kpiMetrics?.newToday || 0, icon: Sparkles, color: C.emerald, bg: C.emeraldLight },
                        { label: 'Follow-up', val: kpiMetrics?.todayFollowups || 0, icon: Clock, color: C.amber, bg: C.amberLight },
                        { label: 'High Intent', val: kpiMetrics?.highIntent || 0, icon: AlertCircle, color: C.rose, bg: C.roseLight },
                    ].map(metric => (
                        <div key={metric.label} style={{
                            flex: 1, minWidth: 78, padding: '7px 9px',
                            background: 'white',
                            borderRadius: 10,
                            border: `1px solid ${C.slate200}`,
                            borderTop: `2.5px solid ${metric.color}`,
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                            display: 'flex', flexDirection: 'column', gap: 2,
                            position: 'relative', overflow: 'hidden'
                        }}>
                            {/* Top row: Number on left, icon on right */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{
                                    fontSize: '1.35rem', fontWeight: 900, color: C.slate950,
                                    lineHeight: 1, letterSpacing: '-0.03em'
                                }}>
                                    {metric.val}
                                </span>
                                <div style={{
                                    width: 22, height: 22, borderRadius: 6,
                                    background: `${metric.color}15`, border: `1px solid ${metric.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <metric.icon size={11} color={metric.color} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Bottom row: Label */}
                            <span style={{ fontSize: '0.56rem', fontWeight: 800, color: C.slate600, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {metric.label}
                            </span>
                        </div>
                    ))}
                </div>


                {/* Horizontal Stage Filter Pills with Live Category Counts */}
                <div style={{
                    display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8,
                    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
                }}>
                    {STAGES.map(stage => {
                        const isActive = filterStage === stage;
                        const dotColor = STAGE_DOT_COLORS[stage] || C.indigo;
                        const count = stageCounts[stage] || 0;
                        return (
                            <button
                                key={stage}
                                onClick={() => setFilterStage(stage)}
                                className="btn-press"
                                style={{
                                    flexShrink: 0, padding: '6px 11px', minHeight: 34, borderRadius: 12,
                                    border: isActive ? `1.5px solid ${dotColor}` : '1px solid #cbd5e1',
                                    background: isActive ? `${dotColor}15` : 'white',
                                    color: isActive ? dotColor : C.slate700,
                                    fontSize: '0.74rem', fontWeight: isActive ? 900 : 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                    whiteSpace: 'nowrap', transition: 'all 0.12s ease',
                                    boxShadow: isActive ? `0 2px 8px ${dotColor}30` : '0 1px 3px rgba(15,23,42,0.04)'
                                }}
                            >
                                {stage !== 'All' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
                                <span>{stage}</span>
                                <span style={{
                                    fontSize: '0.62rem', fontWeight: 900, padding: '1px 6px', borderRadius: 8,
                                    background: isActive ? `${dotColor}25` : C.slate100,
                                    color: isActive ? dotColor : C.slate600, marginLeft: 1
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sort & Pagination Summary Bar (Increased 13-14px font size) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '4px 2px 0' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: C.slate700, letterSpacing: '-0.1px' }}>
                        {filteredLeads.length > 0 ? `Showing ${startIdx + 1}–${endIdx} of ${filteredLeads.length}` : '0 leads'}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ArrowUpDown size={13} color={C.slate500} />
                        <select
                            value={sortOption}
                            onChange={e => setSortOption(e.target.value as any)}
                            style={{
                                border: 'none', background: 'transparent',
                                fontSize: '0.8rem', fontWeight: 800, color: C.indigo,
                                outline: 'none', cursor: 'pointer'
                            }}
                        >
                            <option value="score">Sort by Score</option>
                            <option value="newest">Sort by Newest</option>
                            <option value="name">Sort by Name</option>
                        </select>
                    </div>
                </div>

                {/* Card List with Edge States & Progressive Load More */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                background: 'white', borderRadius: 14, padding: '11px',
                                border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10,
                                boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#cbd5e1' }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        <div style={{ width: '60%', height: 12, borderRadius: 4, background: '#cbd5e1' }} />
                                        <div style={{ width: '40%', height: 10, borderRadius: 4, background: '#e2e8f0' }} />
                                    </div>
                                    <div style={{ width: 65, height: 22, borderRadius: 7, background: '#e2e8f0' }} />
                                </div>
                                <div style={{ width: '100%', height: 26, borderRadius: 8, background: '#f8fafc' }} />
                            </div>
                        ))}
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div>
                        {search.trim() ? (
                            /* No Search Results Edge State */
                            <div style={{
                                padding: '36px 20px', textAlign: 'center', background: 'white',
                                borderRadius: 16, border: '1.5px dashed #cbd5e1', margin: '8px 0',
                                boxShadow: '0 4px 14px rgba(15,23,42,0.04)'
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%', background: '#eff6ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 12px', border: '1px solid #bfdbfe'
                                }}>
                                    <Search size={22} color={C.indigo} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: C.slate950 }}>
                                    No leads matching "{search}"
                                </h3>
                                <p style={{ fontSize: '0.74rem', color: C.slate600, margin: '6px 0 16px', lineHeight: 1.4 }}>
                                    Check for typos or clear your search to view all {leads.length} leads.
                                </p>
                                <button
                                    onClick={() => setSearch('')}
                                    style={{
                                        padding: '9px 18px', background: C.indigo, color: 'white',
                                        borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.78rem',
                                        cursor: 'pointer', boxShadow: '0 3px 10px rgba(99,102,241,0.25)'
                                    }}
                                >
                                    Clear Search Query
                                </button>
                            </div>
                        ) : (
                            /* Stage Empty / No Leads Edge State */
                            <div style={{
                                padding: '36px 20px', textAlign: 'center', background: 'white',
                                borderRadius: 16, border: '1.5px dashed #cbd5e1', margin: '8px 0',
                                boxShadow: '0 4px 14px rgba(15,23,42,0.04)'
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%', background: '#f5f3ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 12px', border: '1px solid #ddd6fe'
                                }}>
                                    <Sparkles size={22} color={C.indigo} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: C.slate950 }}>
                                    No leads in "{filterStage}"
                                </h3>
                                <p style={{ fontSize: '0.74rem', color: C.slate600, margin: '6px 0 16px', lineHeight: 1.4 }}>
                                    There are currently no leads assigned to this stage.
                                </p>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setFilterStage('All')}
                                        style={{
                                            padding: '8px 14px', background: C.slate100, color: C.slate700,
                                            borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer'
                                        }}
                                    >
                                        View All Leads
                                    </button>
                                    <button
                                        onClick={openAdd}
                                        style={{
                                            padding: '8px 14px', background: C.indigo, color: 'white',
                                            borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer'
                                        }}
                                    >
                                        + Add Lead
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {paginatedLeads.map(lead => (
                            <MobileCard
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedIds.has(lead.id)}
                                search={search}
                                onSelect={toggleSelect}
                                onDelete={deleteLead}
                                onEdit={openEdit}
                                onCall={(id: any, num: any, name: any) => dialerEvents.call(id, num, name)}
                                onNavigate={(id: any) => navigate(`/leads/${id}`)}
                            />
                        ))}

                        {/* Modern Progressive "Load More" Mobile Action */}
                        {endIdx < filteredLeads.length && (
                            <div style={{ marginTop: 12, marginBottom: 12 }}>
                                <button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    style={{
                                        width: '100%', padding: '11px 16px', borderRadius: 14,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        color: 'white', border: 'none', fontWeight: 900, fontSize: '0.82rem',
                                        cursor: 'pointer', boxShadow: '0 6px 18px rgba(99,102,241,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                    }}
                                >
                                    Load More Leads ({filteredLeads.length - endIdx} remaining)
                                </button>
                                <div style={{
                                    width: '100%', height: 4, background: C.slate200, borderRadius: 2,
                                    marginTop: 8, overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${(endIdx / filteredLeads.length) * 100}%`,
                                        height: '100%', background: C.indigo, transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        )}

                        {endIdx >= filteredLeads.length && filteredLeads.length > 0 && (
                            <div style={{ padding: '12px 0', textAlign: 'center', color: C.slate600, fontSize: '0.74rem', fontWeight: 800 }}>
                                ✨ Showing all {filteredLeads.length} leads
                            </div>
                        )}

                        {/* Native Mobile Pagination Controls Bar (Spacious 34px Touch Targets) */}
                        {totalPages > 1 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'white', borderRadius: 14, padding: '8px 12px',
                                border: '1px solid #e2e8f0', marginTop: 10, marginBottom: 16,
                                boxShadow: '0 2px 8px rgba(15,23,42,0.04)'
                            }}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '7px 12px', minHeight: 34, borderRadius: 10,
                                        background: currentPage === 1 ? C.slate50 : C.indigoLight,
                                        color: currentPage === 1 ? C.slate400 : C.indigo,
                                        border: 'none', fontWeight: 800, fontSize: '0.74rem',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>

                                {/* Page Pill Indicators */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {Array.from({ length: totalPages }).map((_, idx) => {
                                        const pageNum = idx + 1;
                                        if (
                                            totalPages <= 5 ||
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            Math.abs(pageNum - currentPage) <= 1
                                        ) {
                                            const isActive = pageNum === currentPage;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: 9,
                                                        border: isActive ? `1.5px solid ${C.indigo}` : '1px solid #cbd5e1',
                                                        background: isActive ? C.indigo : 'white',
                                                        color: isActive ? 'white' : C.slate700,
                                                        fontWeight: 900, fontSize: '0.75rem',
                                                        cursor: 'pointer', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            (pageNum === 2 && currentPage > 3) ||
                                            (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                                        ) {
                                            return <span key={pageNum} style={{ fontSize: '0.7rem', color: C.slate400 }}>...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '7px 12px', minHeight: 34, borderRadius: 10,
                                        background: currentPage === totalPages ? C.slate50 : C.indigoLight,
                                        color: currentPage === totalPages ? C.slate400 : C.indigo,
                                        border: 'none', fontWeight: 800, fontSize: '0.74rem',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
