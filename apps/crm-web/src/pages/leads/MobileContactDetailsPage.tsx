import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Phone, Mail, MessageSquare, MapPin, Edit2, MoreVertical, CheckSquare,
    Calendar as CalendarIcon, TrendingUp, Sparkles, Wand2, ShieldCheck,
    ArrowRight, RefreshCw, RotateCw, ExternalLink, Brain, UserPlus, Users, Home, Target, Zap,
    Flame, Thermometer, Snowflake, BarChart2, FileText, Paperclip, ListChecks, Filter,
    Search, Pin, ChevronUp, ChevronDown, Download, Copy, Share2, Eye, X
} from 'lucide-react';
import { dialerEvents } from '../../constants/events';
import * as dateUtils from '../../utils/dateUtils';

// ─── Color Tokens ───────────────────────────────────────────────────────────
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
    slate900: '#0f172a',
    slate950: '#0f172a',
    // ── Semantic 5-color palette ──────────────────────────────────
    // Green  = Success / Contact
    emerald: '#10b981',
    emeraldDark: '#059669',
    // Blue   = Information / Trackable
    blue: '#3b82f6',
    blueDark: '#2563eb',
    // Orange = Warning / Planning
    amber: '#f59e0b',
    amberDark: '#d97706',
    // Red    = Urgent / Time-sensitive
    rose: '#f43f5e',
    roseDark: '#e11d48',
    // Purple = AI / Intelligence
    violet: '#8b5cf6',
    violetDark: '#7c3aed',
    // Alias: indigo -> blue (kept for backward compat with remaining usages)
    indigo: '#3b82f6',
};

const STAGE_DOT_COLORS: Record<string, string> = {
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

interface MobileContactDetailsPageProps {
    contact: any;
    id: string;
    avatarBg: string;
    initial: string;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    showStageMenu: boolean;
    setShowStageMenu: (val: boolean) => void;
    handleUpdateStage: (stage: string) => void;
    handleUpdateStatus: (status: string) => void;
    handleGenerateAISuggestion: () => void;
    generatingAISuggestion: boolean;
    aiSuggestedMessage: string;
    setAiSuggestedMessage: (msg: string) => void;
    setNewNote: (note: string) => void;
    setActivityType: (type: string) => void;
    setShowActivityBox: (val: boolean) => void;
    setShowSiteVisitScheduler: (val: boolean) => void;
    aiInsights: any;
    handleEnrich: () => void;
    enriching: boolean;
    interactions: any[];
    newNote: string;
    handleAddNote: () => void;
    activityType: string;
    showActivityBox: boolean;
}

export default function MobileContactDetailsPage({
    contact,
    id,
    avatarBg,
    initial,
    activeTab,
    setActiveTab,
    showStageMenu,
    setShowStageMenu,
    handleUpdateStage,
    handleUpdateStatus,
    handleGenerateAISuggestion,
    generatingAISuggestion,
    aiSuggestedMessage,
    setAiSuggestedMessage,
    setNewNote,
    setActivityType,
    setShowActivityBox,
    setShowSiteVisitScheduler,
    aiInsights,
    handleEnrich,
    enriching,
    interactions,
    newNote,
    handleAddNote,
    activityType,
    showActivityBox
}: MobileContactDetailsPageProps) {
    const navigate = useNavigate();
    const score = contact?.score || 0;
    const stageColor = STAGE_DOT_COLORS[contact?.stage] || C.indigo;
    const [activityFilter, setActivityFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);
    const [showTimelineSummary, setShowTimelineSummary] = useState<boolean>(false);
    const [showOverflowActions, setShowOverflowActions] = useState<boolean>(false);
    const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
    const [expandedAttachIdx, setExpandedAttachIdx] = useState<number | null>(null);
    const [showLeadInfo, setShowLeadInfo] = useState<boolean>(true);

    const toggleTaskComplete = (taskId: string) => {
        setCompletedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
            return next;
        });
    };

    // ── Derived: Lead Health ──────────────────────────────────────────────────
    const health: { label: string; color: string; bg: string; icon: React.ElementType } =
        score >= 70
            ? { label: 'Hot', color: '#ef4444', bg: '#fef2f2', icon: Flame }
            : score >= 40
            ? { label: 'Warm', color: '#f59e0b', bg: '#fffbeb', icon: Thermometer }
            : { label: 'Cold', color: '#3b82f6', bg: '#eff6ff', icon: Snowflake };

    // ── Derived: Conversion probability (score-based heuristic) ───────────────
    const convProb = Math.min(95, Math.round(score * 0.9 + 10));

    // ── Filtered interactions ─────────────────────────────────────────────────
    const filteredInteractions = useMemo(() => {
        let list = interactions;
        if (activityFilter !== 'All') {
            list = list.filter(i => i.type === activityFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(i => 
                (i.type || '').toLowerCase().includes(q) ||
                (i.note || '').toLowerCase().includes(q) ||
                (i.notes || '').toLowerCase().includes(q) ||
                (i.outcome || '').toLowerCase().includes(q) ||
                (i.agent_name || '').toLowerCase().includes(q) ||
                (i.source || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [interactions, activityFilter, searchQuery]);

    return (
        <div style={{
            background: C.slate50,
            minHeight: '100vh',
            paddingBottom: 125,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>


            <div style={{ padding: '6px 6px' }}>
                {/* Compact Native Hero Card — lead info + inline actions */}
                <div style={{
                    background: `linear-gradient(135deg, ${avatarBg}10 0%, ${avatarBg}04 60%, transparent 100%)`,
                    borderRadius: 18, padding: '14px 14px', marginBottom: 10,
                    border: `1px solid ${avatarBg}15`,
                    boxShadow: '0 1px 6px rgba(10,22,40,0.02)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Avatar with Intent Ring */}
                        <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                            <svg width="52" height="52" viewBox="0 0 52 52" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                                <circle cx="26" cy="26" r="23" fill="none" stroke={`${avatarBg}20`} strokeWidth="3" />
                                <circle cx="26" cy="26" r="23" fill="none"
                                    stroke={avatarBg} strokeWidth="3"
                                    strokeDasharray={`${(score / 100) * 144.5} 144.5`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div style={{
                                position: 'absolute', inset: 5,
                                background: avatarBg, color: 'white', borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '17px', fontWeight: 900,
                                boxShadow: `0 4px 12px ${avatarBg}40`
                            }}>
                                {initial}
                            </div>
                        </div>

                        {/* Name, Phone & Critical Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Row 1: Lead Name + Inline actions */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                                <h1 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.3px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {contact.name}
                                </h1>
                                {/* Inline lead actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    <button
                                        onClick={() => setShowStageMenu(!showStageMenu)}
                                        title="Edit Stage"
                                        style={{
                                            width: 30, height: 30, borderRadius: 8,
                                            border: '1px solid #cbd5e1', background: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Edit2 size={13} color={C.slate700} strokeWidth={2.2} />
                                    </button>
                                    <button
                                        onClick={() => dialerEvents.call(contact.id, contact.phone, contact.name)}
                                        title="Call Lead"
                                        style={{
                                            width: 30, height: 30, borderRadius: 8,
                                            border: '1px solid #bbf7d0', background: '#f0fdf4',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Phone size={13} color={C.emerald} strokeWidth={2.2} />
                                    </button>
                                    <button
                                        title="More Options"
                                        style={{
                                            width: 30, height: 30, borderRadius: 8,
                                            border: '1px solid #cbd5e1', background: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <MoreVertical size={13} color={C.slate700} strokeWidth={2.2} />
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Phone */}
                            <div style={{ fontSize: '0.76rem', color: C.slate800, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, lineHeight: '20px', marginBottom: 6 }}>
                                <span>📞</span>
                                <span>{contact.phone || '—'}</span>
                            </div>

                            {/* Row 3: Critical Info Chips (Requirement · Created Date · Owner) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate700, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    🏢 {contact.project || contact.requirement || contact.property_type || '3BHK'}
                                </span>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate700, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    📅 {contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '20 Jul 2026'}
                                </span>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate700, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    👤 {contact.agent_name || contact.assigned_agent || 'Rohan Mishra'}
                                </span>
                            </div>
                        </div>

                        {/* Score + Health mini-panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            <div style={{
                                background: 'white', borderRadius: 12, padding: '5px 8px',
                                border: `1.5px solid ${score > 80 ? '#bbf7d0' : score > 50 ? '#fde68a' : '#cbd5e1'}`,
                                boxShadow: '0 3px 10px rgba(15,23,42,0.06)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 50
                            }}>
                                <div style={{ fontSize: '0.55rem', lineHeight: 1, marginBottom: 1 }}>
                                    {score >= 80 ? '🔥🔥🔥' : score >= 50 ? '⭐⭐⭐' : '⭐'}
                                </div>
                                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: C.slate950, lineHeight: 1 }}>{score}</span>
                                <span style={{ fontSize: '0.48rem', fontWeight: 900, color: C.slate500, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: 2, whiteSpace: 'nowrap' }}>Score</span>
                            </div>
                            <div style={{
                                background: health.bg, borderRadius: 8, padding: '2px 7px',
                                border: `1px solid ${health.color}30`,
                                display: 'flex', alignItems: 'center', gap: 3
                            }}>
                                <health.icon size={10} color={health.color} strokeWidth={2.5} />
                                <span style={{ fontSize: '0.56rem', fontWeight: 900, color: health.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{health.label}</span>
                            </div>
                            <div style={{
                                background: `${C.indigo}10`, borderRadius: 8, padding: '2px 7px',
                                border: `1px solid ${C.indigo}20`,
                                display: 'flex', alignItems: 'center', gap: 3
                            }}>
                                <BarChart2 size={10} color={C.indigo} strokeWidth={2.5} />
                                <span style={{ fontSize: '0.56rem', fontWeight: 900, color: C.indigo }}>{convProb}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tiered Action Hub — 3 layers of priority */}
                <div style={{
                    marginBottom: 10, padding: '10px 10px 8px', background: 'white',
                    borderRadius: 16, border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 6px rgba(10,22,40,0.02)'
                }}>

                    {/* ── Primary row: Call · WhatsApp · Email ── */}
                    {/* Green = Contact/Success | Green = WhatsApp brand | Blue = Information */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
                        {([
                            { icon: Phone,         label: 'Call',     color: '#fff', bg: C.emerald,    shadow: `0 3px 10px ${C.emerald}50`,  action: () => dialerEvents.call(contact.id, contact.phone, contact.name) },
                            { icon: MessageSquare, label: 'WhatsApp', color: '#fff', bg: '#25d366',    shadow: '0 3px 10px #25d36650',        action: () => { setActivityType('WhatsApp'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Mail,          label: 'Email',    color: '#fff', bg: C.blue,       shadow: `0 3px 10px ${C.blue}50`,     action: () => { setActivityType('Email'); setActiveTab('Activities'); setShowActivityBox(true); } },
                        ] as const).map(act => (
                            <button
                                key={act.label}
                                onClick={act.action}
                                style={{
                                    padding: '10px 4px', borderRadius: 12,
                                    background: act.bg, border: 'none',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 4,
                                    cursor: 'pointer', boxShadow: act.shadow,
                                    transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                                }}
                            >
                                <act.icon size={17} color={act.color} strokeWidth={2.5} />
                                <span style={{ fontSize: '0.58rem', fontWeight: 900, color: act.color, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                    {act.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ── Divider ── */}
                    <div style={{ height: 1, background: '#f1f5f9', margin: '0 2px 6px' }} />

                    {/* ── Secondary row: Meeting · Note · Task ── */}
                    {/* Red = Urgent/time-sensitive | Orange = Warning/planning | Blue = Information/trackable */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
                        {([
                            { icon: CalendarIcon, label: 'Meeting', color: C.rose,    bg: '#fff1f2', border: '#fecdd3', action: () => { setActivityType('Meeting'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Edit2,        label: 'Note',    color: C.amber,   bg: '#fffbeb', border: '#fde68a', action: () => { setActivityType('Note'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: CheckSquare,  label: 'Task',    color: C.blue,    bg: '#eff6ff', border: '#bfdbfe', action: () => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); } },
                        ] as const).map(act => (
                            <button
                                key={act.label}
                                onClick={act.action}
                                style={{
                                    padding: '7px 4px', borderRadius: 10,
                                    background: act.bg, border: `1.5px solid ${act.border}`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 3,
                                    cursor: 'pointer', transition: 'opacity 0.1s ease'
                                }}
                            >
                                <act.icon size={14} color={act.color} strokeWidth={2.5} />
                                <span style={{ fontSize: '0.57rem', fontWeight: 800, color: act.color, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                    {act.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ── Overflow row: Nurture · Plan Visit · AI Draft (collapsible) ── */}
                    {/* Blue = status-info | Orange = planning/warning | Purple = AI */}
                    {showOverflowActions && (
                        <>
                            <div style={{ height: 1, background: '#f1f5f9', margin: '0 2px 6px' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 4 }}>
                                {([
                                    { icon: TrendingUp, label: contact.status === 'Nurture' ? 'Active' : 'Nurture', color: C.blue,       action: () => handleUpdateStatus(contact.status === 'Nurture' ? 'Active' : 'Nurture') },
                                    { icon: MapPin,     label: 'Plan Visit', color: C.amber,      action: () => setShowSiteVisitScheduler(true) },
                                    { icon: Sparkles,   label: 'AI Draft',   color: C.violetDark, action: handleGenerateAISuggestion },
                                ] as const).map(act => (
                                    <button
                                        key={act.label}
                                        onClick={act.action}
                                        style={{
                                            padding: '6px 4px', borderRadius: 10,
                                            background: C.slate50, border: '1px solid #e2e8f0',
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center', gap: 3,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <act.icon size={13} color={act.color} strokeWidth={2.5} />
                                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: C.slate600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            {act.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── More / Less toggle ── */}
                    <button
                        onClick={() => setShowOverflowActions(v => !v)}
                        style={{
                            width: '100%', padding: '4px 0', background: 'none', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            cursor: 'pointer', color: C.slate400
                        }}
                    >
                        {showOverflowActions
                            ? <><ChevronUp size={12} strokeWidth={2.5} /><span style={{ fontSize: '0.56rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Less</span></>
                            : <><ChevronDown size={12} strokeWidth={2.5} /><span style={{ fontSize: '0.56rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>More</span></>}
                    </button>

                </div>

                {/* Mobile Segmented Tab Switcher */}
                <div style={{
                    display: 'flex', background: 'white', borderRadius: 12,
                    padding: 3, border: '1px solid #f1f5f9', marginBottom: 10,
                    position: 'relative'
                }}>
                    {['Overview', 'Activities', 'Intelligence'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '7px 0', borderRadius: 9,
                                border: 'none', background: activeTab === tab ? C.indigo : 'transparent',
                                color: activeTab === tab ? 'white' : C.slate600,
                                fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                                boxShadow: activeTab === tab ? `0 2px 8px ${C.indigo}40` : 'none'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'Overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>


                        {/* Next Follow-up Section (Enlarged Hero Card) */}
                        {(() => {
                            const [completed, setCompleted] = useState(false);
                            const followupDate = contact?.next_followup || '24 Jul 2026';
                            const followupTime = contact?.next_followup_time || '10:30 AM';
                            const followupTitle = contact?.next_followup_title || 'Follow-up Call';

                            return (
                                <div style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    borderRadius: 20, padding: '16px',
                                    border: `1.5px solid ${completed ? C.emerald + '40' : C.indigo + '30'}`,
                                    boxShadow: `0 4px 20px ${completed ? C.emerald + '15' : C.indigo + '15'}`,
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h3 style={{
                                            fontSize: '0.72rem', fontWeight: 900, color: C.slate500,
                                            letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
                                            display: 'flex', alignItems: 'center', gap: 6
                                        }}>
                                            <CalendarIcon size={14} color={completed ? C.emerald : C.indigo} /> NEXT FOLLOW-UP
                                        </h3>
                                        <div style={{
                                            background: completed ? '#ecfdf5' : '#eff6ff',
                                            color: completed ? C.emerald : C.indigo,
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: '0.64rem', fontWeight: 900,
                                            border: `1px solid ${completed ? '#a7f3d0' : '#bfdbfe'}`
                                        }}>
                                            {completed ? 'Completed' : 'Scheduled'}
                                        </div>
                                    </div>

                                    {/* Prominent Details Display */}
                                    <div style={{
                                        background: completed ? '#f0fdf4' : 'white',
                                        padding: '14px', borderRadius: 14,
                                        border: `1px solid ${completed ? '#d1fae5' : '#e2e8f0'}`,
                                        marginBottom: 14
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem', fontWeight: 900, color: C.slate950 }}>
                                                <span>📅</span> {followupDate}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem', fontWeight: 900, color: C.slate950 }}>
                                                <span>🕥</span> {followupTime}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: completed ? C.slate500 : C.indigo, textDecoration: completed ? 'line-through' : 'none' }}>
                                            {followupTitle}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button
                                            onClick={() => {
                                                setActivityType('Task');
                                                setActiveTab('Activities');
                                                setShowActivityBox(true);
                                            }}
                                            style={{
                                                flex: 1, padding: '9px 12px', borderRadius: 10,
                                                background: 'white', border: `1.5px solid ${C.slate300}`,
                                                color: C.slate700, fontWeight: 900, fontSize: '0.72rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <RotateCw size={13} color={C.slate600} /> Reschedule
                                        </button>

                                        <button
                                            onClick={() => setCompleted(!completed)}
                                            style={{
                                                flex: 1, padding: '9px 12px', borderRadius: 10,
                                                background: completed ? C.emerald : `linear-gradient(135deg, ${C.indigo} 0%, ${C.blueDark} 100%)`,
                                                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.72rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                boxShadow: completed ? `0 2px 8px ${C.emerald}40` : `0 2px 8px ${C.indigo}40`
                                            }}
                                        >
                                            <CheckSquare size={13} color="white" /> {completed ? 'Done ✓' : 'Complete'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Dedicated Collapsible Lead Information Card (Mobile 2-Column Layout) */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            <div
                                onClick={() => setShowLeadInfo(!showLeadInfo)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Users size={14} color={C.indigo} /> Lead Information
                                </h3>
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
                                    {showLeadInfo ? <ChevronUp size={14} color={C.slate500} /> : <ChevronDown size={14} color={C.slate500} />}
                                </button>
                            </div>

                            {showLeadInfo && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                    {/* Left Column: Contact */}
                                    <div style={{ background: C.slate50, padding: '10px 12px', borderRadius: 12, border: '1px solid #eef2f7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                            Contact
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📞 Phone</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.phone || '+91 98100 00004'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>✉️ Email</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.email || 'priya@example.com'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📍 Location</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.city || contact.location || 'Mumbai'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Lead Details */}
                                    <div style={{ background: C.slate50, padding: '10px 12px', borderRadius: 12, border: '1px solid #eef2f7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                            Lead Details
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>👤 Owner</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.agent_name || contact.assigned_agent || 'Rohan Mishra'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📅 Created</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '20 Jul 2026'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>🎯 Stage</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: stageColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.stage || 'Qualified'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📢 Source</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.source || contact.lead_source || 'Facebook Campaign'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>🏷️ Industry</div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.industry || 'Real Estate'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: 0 }}>
                                    Latest Note Preview
                                </h3>
                                <Edit2 size={13} color={C.slate400} />
                            </div>
                            <div style={{
                                background: '#f8fafc', padding: '12px 14px', borderRadius: 12,
                                border: '1px solid #eef2f7',
                                fontSize: '0.76rem', color: C.slate700,
                                lineHeight: 1.5, fontWeight: 600,
                                boxShadow: 'inset 0 1px 3px rgba(15,23,42,0.03)'
                            }}>
                                {interactions[0]?.note || "Customer requested weekend visit to Sector 62 project site with family."}
                            </div>
                        </div>

                        {/* Upcoming Tasks */}
                        {(() => {
                            // Pull real task interactions; fall back to demo items when empty
                            const rawTasks = interactions.filter(i => i.type === 'Task');
                            const demoTasks = [
                                { id: '__demo_1', label: 'Send quotation', due: 'Today', priority: 'High', status: 'Pending', assignee: contact?.assigned_agent || 'Agent' },
                                { id: '__demo_2', label: 'Schedule visit', due: 'Tomorrow', priority: 'Medium', status: 'In Progress', assignee: contact?.assigned_agent || 'Agent' },
                            ];
                            const tasks = rawTasks.length > 0
                                ? rawTasks.map(t => ({
                                    id: String(t.id),
                                    label: t.note || t.notes || t.outcome || 'Task',
                                    due: t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
                                    priority: (t.priority as string) || 'Medium',
                                    status: (t.status as string) || 'Pending',
                                    assignee: t.agent_name || t.assigned_to || contact?.assigned_agent || 'Agent',
                                }))
                                : demoTasks;

                            const pendingTasks = tasks.filter(t => !completedTaskIds.has(t.id));
                            const doneTasks    = tasks.filter(t =>  completedTaskIds.has(t.id));

                            const priorityStyle = (p: string) => {
                                if (p === 'High')   return { color: C.rose,  bg: '#fff1f2', border: '#ffe4e6' };
                                if (p === 'Low')    return { color: C.emerald, bg: '#ecfdf5', border: '#a7f3d0' };
                                return              { color: C.amber, bg: '#fffbeb', border: '#fde68a' };
                            };
                            const statusStyle = (s: string) => {
                                if (s === 'Completed' || s === 'Done') return { color: C.emerald, bg: '#ecfdf5', border: '#a7f3d0' };
                                if (s === 'In Progress')               return { color: C.blue,   bg: '#eff6ff', border: '#bfdbfe' };
                                if (s === 'Overdue')                   return { color: C.rose,   bg: '#fff1f2', border: '#ffe4e6' };
                                return                                        { color: C.slate500, bg: '#f1f5f9', border: '#e2e8f0' };
                            };

                            const TaskRow = ({ task, done }: { task: typeof tasks[0]; done: boolean }) => {
                                const ps = priorityStyle(task.priority);
                                const ss = statusStyle(done ? 'Completed' : task.status);
                                return (
                                    <div style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                        padding: '10px 0',
                                        borderBottom: '1px solid #f1f5f9',
                                        opacity: done ? 0.5 : 1,
                                        transition: 'opacity 0.2s'
                                    }}>
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleTaskComplete(task.id)}
                                            style={{
                                                flexShrink: 0, marginTop: 1,
                                                width: 18, height: 18, borderRadius: 5,
                                                border: `2px solid ${done ? C.emerald : C.slate300}`,
                                                background: done ? C.emerald : 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.18s ease', padding: 0
                                            }}
                                            title={done ? 'Mark incomplete' : 'Mark complete'}
                                        >
                                            {done && (
                                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '0.76rem', fontWeight: 800, color: C.slate950,
                                                textDecoration: done ? 'line-through' : 'none',
                                                marginBottom: 4, lineHeight: 1.35
                                            }}>{task.label}</div>
                                            {/* Row: due + assignee */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.6rem', color: C.slate500, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    📅 {task.due}
                                                </span>
                                                <span style={{ fontSize: '0.6rem', color: C.slate500, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    👤 {task.assignee}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right badges: status + priority */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: '0.55rem', fontWeight: 900,
                                                color: ss.color, background: ss.bg,
                                                border: `1px solid ${ss.border}`,
                                                borderRadius: 4, padding: '1px 5px',
                                                whiteSpace: 'nowrap'
                                            }}>{done ? 'Completed' : task.status}</span>
                                            <span style={{
                                                fontSize: '0.55rem', fontWeight: 900,
                                                color: ps.color, background: ps.bg,
                                                border: `1px solid ${ps.border}`,
                                                borderRadius: 4, padding: '1px 5px',
                                                whiteSpace: 'nowrap'
                                            }}>{task.priority}</span>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <ListChecks size={14} color={C.indigo} /> Upcoming Tasks
                                            {pendingTasks.length > 0 && (
                                                <span style={{
                                                    fontSize: '0.55rem', fontWeight: 900,
                                                    color: 'white', background: C.indigo,
                                                    borderRadius: 20, padding: '1px 6px', lineHeight: 1.4
                                                }}>{pendingTasks.length}</span>
                                            )}
                                        </h3>
                                        <button
                                            onClick={() => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); }}
                                            style={{ fontSize: '0.62rem', fontWeight: 900, color: C.indigo, background: `${C.indigo}10`, border: `1px solid ${C.indigo}20`, borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
                                        >+ Add</button>
                                    </div>

                                    {/* Pending tasks */}
                                    {pendingTasks.length === 0 && doneTasks.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '16px 0', color: C.slate400, fontSize: '0.72rem', fontWeight: 700 }}>
                                            🎉 All tasks done!
                                        </div>
                                    )}
                                    {pendingTasks.map(t => <TaskRow key={t.id} task={t} done={false} />)}

                                    {/* Completed tasks (collapsed under a subtle divider) */}
                                    {doneTasks.length > 0 && (
                                        <>
                                            <div style={{ fontSize: '0.58rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '10px 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                                                Completed ({doneTasks.length})
                                                <span style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                                            </div>
                                            {doneTasks.map(t => <TaskRow key={t.id} task={t} done={true} />)}
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        {/* AI Communication Summary */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Brain size={14} color={C.violetDark} /> AI Comm Summary
                                </h3>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: C.violetDark, background: `${C.violetDark}10`, border: `1px solid ${C.violetDark}20`, borderRadius: 4, padding: '2px 6px' }}>AI Generated</span>
                            </div>

                            {/* Summary body */}
                            <div style={{
                                background: `linear-gradient(135deg, ${C.violetDark}08 0%, ${C.indigo}05 100%)`,
                                borderRadius: 12, padding: '12px 14px',
                                border: `1px solid ${C.violet}15`,
                                fontSize: '0.74rem', color: C.slate700, lineHeight: 1.55, fontWeight: 600,
                                marginBottom: 12
                            }}>
                                {aiInsights?.summary ||
                                    `Lead has shown consistent engagement across 3 touchpoints. Budget aligns with project pricing. Expressed strong interest in a weekend site visit. Recommend immediate follow-up with a personalised video walkthrough to accelerate conversion.`}
                            </div>

                            {/* Recommended next action */}
                            {(() => {
                                const nextAction: string = aiInsights?.nextAction || aiInsights?.next_action || (
                                    score >= 70 ? '📞 Call customer today'
                                    : score >= 40 ? '💬 Send WhatsApp follow-up'
                                    : '🏡 Schedule a site visit'
                                );
                                return (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                            Recommended next action
                                        </div>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            background: `linear-gradient(90deg, ${C.violetDark}12, ${C.indigo}08)`,
                                            border: `1px solid ${C.violet}25`,
                                            borderRadius: 20, padding: '5px 12px',
                                            fontSize: '0.72rem', fontWeight: 800, color: C.violetDark,
                                        }}>
                                            {nextAction}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); }}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                        padding: '8px 10px', borderRadius: 10,
                                        background: `${C.blue}10`, border: `1.5px solid ${C.blue}25`,
                                        fontSize: '0.68rem', fontWeight: 900, color: C.blue,
                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                >
                                    <CheckSquare size={13} strokeWidth={2.5} /> Create Task
                                </button>
                                <button
                                    onClick={handleGenerateAISuggestion}
                                    disabled={generatingAISuggestion}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                        padding: '8px 10px', borderRadius: 10,
                                        background: generatingAISuggestion ? `${C.emerald}08` : `${C.emerald}10`,
                                        border: `1.5px solid ${C.emerald}25`,
                                        fontSize: '0.68rem', fontWeight: 900,
                                        color: generatingAISuggestion ? C.slate400 : C.emerald,
                                        cursor: generatingAISuggestion ? 'default' : 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {generatingAISuggestion
                                        ? <><RotateCw size={13} strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                                        : <><MessageSquare size={13} strokeWidth={2.5} /> Generate WhatsApp</>
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Recent Attachments */}
                        {(() => {
                            const attachments = [
                                { name: 'Project Brochure.pdf',  size: '3.2 MB', ext: 'PDF', date: 'Today',  url: '#', color: '#ef4444', bg: '#fee2e2' },
                                { name: 'Quotation_v2.xlsx',     size: '245 KB', ext: 'XLS', date: '20 Jul', url: '#', color: '#16a34a', bg: '#dcfce7' },
                                { name: 'Site_Map_Sector62.png', size: '1.1 MB', ext: 'IMG', date: '19 Jul', url: '#', color: '#3b82f6', bg: '#dbeafe' },
                            ];

                            const handleShare = async (doc: typeof attachments[0]) => {
                                const shareData = { title: doc.name, text: `Sharing: ${doc.name}`, url: doc.url };
                                if (navigator.share) {
                                    try { await navigator.share(shareData); } catch (_) { /* cancelled */ }
                                } else {
                                    await navigator.clipboard.writeText(doc.url);
                                    alert('Link copied to clipboard');
                                }
                            };

                            return (
                                <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Paperclip size={14} color={C.slate600} /> Recent Attachments
                                        </h3>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.slate400 }}>{attachments.length} files</span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        {attachments.map((doc, idx) => {
                                            const isExpanded = expandedAttachIdx === idx;
                                            return (
                                                <div key={idx} style={{
                                                    borderRadius: 12, overflow: 'hidden',
                                                    border: `1px solid ${isExpanded ? `${doc.color}30` : '#eef2f7'}`,
                                                    marginBottom: idx < attachments.length - 1 ? 8 : 0,
                                                    transition: 'border-color 0.18s ease',
                                                    background: isExpanded ? `${doc.color}04` : C.slate50,
                                                }}>
                                                    {/* ── Main file row ── */}
                                                    <button
                                                        onClick={() => setExpandedAttachIdx(isExpanded ? null : idx)}
                                                        style={{
                                                            width: '100%', background: 'none', border: 'none',
                                                            display: 'flex', alignItems: 'center', gap: 10,
                                                            padding: '10px 12px', cursor: 'pointer', textAlign: 'left'
                                                        }}
                                                    >
                                                        {/* Coloured file-type badge */}
                                                        <div style={{
                                                            width: 36, height: 36, borderRadius: 9, background: doc.bg,
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                            justifyContent: 'center', flexShrink: 0, gap: 1
                                                        }}>
                                                            <FileText size={14} color={doc.color} strokeWidth={2} />
                                                            <span style={{ fontSize: '0.42rem', fontWeight: 900, color: doc.color, letterSpacing: '0.04em' }}>{doc.ext}</span>
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                                                            <div style={{ fontSize: '0.6rem', color: C.slate400, fontWeight: 700, marginTop: 1 }}>{doc.size} · {doc.date}</div>
                                                        </div>

                                                        {/* Chevron / close toggle */}
                                                        <div style={{
                                                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                                            background: isExpanded ? `${doc.color}15` : '#f1f5f9',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.18s ease'
                                                        }}>
                                                            {isExpanded
                                                                ? <X size={11} color={doc.color} strokeWidth={2.5} />
                                                                : <ChevronDown size={11} color={C.slate400} strokeWidth={2.5} />
                                                            }
                                                        </div>
                                                    </button>

                                                    {/* ── Inline expanded tray ── */}
                                                    {isExpanded && (
                                                        <div style={{ padding: '0 12px 12px' }}>
                                                            {/* Mini preview banner */}
                                                            <div style={{
                                                                borderRadius: 10,
                                                                border: `1px solid ${doc.color}20`,
                                                                marginBottom: 10, position: 'relative',
                                                                background: `linear-gradient(135deg, ${doc.bg} 0%, ${doc.color}08 100%)`,
                                                                height: 80,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                                            }}>
                                                                <div style={{
                                                                    width: 42, height: 42, borderRadius: 10, background: 'white',
                                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    boxShadow: `0 4px 14px ${doc.color}25`, gap: 2
                                                                }}>
                                                                    <FileText size={18} color={doc.color} strokeWidth={2} />
                                                                    <span style={{ fontSize: '0.45rem', fontWeight: 900, color: doc.color }}>{doc.ext}</span>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate800, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                                                                    <div style={{ fontSize: '0.6rem', color: C.slate500, fontWeight: 700, marginTop: 2 }}>{doc.size} · {doc.date}</div>
                                                                </div>
                                                                <span style={{
                                                                    position: 'absolute', top: 6, right: 8,
                                                                    fontSize: '0.52rem', fontWeight: 900,
                                                                    color: doc.color, background: 'white',
                                                                    borderRadius: 4, padding: '1px 5px',
                                                                    border: `1px solid ${doc.color}30`
                                                                }}>Preview</span>
                                                            </div>

                                                            {/* Three action buttons */}
                                                            <div style={{ display: 'flex', gap: 7 }}>
                                                                {/* Preview / Open */}
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                                    padding: '8px 6px', borderRadius: 9, textDecoration: 'none',
                                                                    background: `${doc.color}10`, border: `1.5px solid ${doc.color}22`,
                                                                    fontSize: '0.65rem', fontWeight: 900, color: doc.color, cursor: 'pointer'
                                                                }}>
                                                                    <Eye size={12} strokeWidth={2.5} /> Preview
                                                                </a>
                                                                {/* Download */}
                                                                <a href={doc.url} download={doc.name} style={{
                                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                                    padding: '8px 6px', borderRadius: 9, textDecoration: 'none',
                                                                    background: `${C.blue}10`, border: `1.5px solid ${C.blue}22`,
                                                                    fontSize: '0.65rem', fontWeight: 900, color: C.blue, cursor: 'pointer'
                                                                }}>
                                                                    <Download size={12} strokeWidth={2.5} /> Download
                                                                </a>
                                                                {/* Share */}
                                                                <button onClick={() => handleShare(doc)} style={{
                                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                                    padding: '8px 6px', borderRadius: 9,
                                                                    background: `${C.violet}10`, border: `1.5px solid ${C.violet}22`,
                                                                    fontSize: '0.65rem', fontWeight: 900, color: C.violetDark, cursor: 'pointer'
                                                                }}>
                                                                    <Share2 size={12} strokeWidth={2.5} /> Share
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Timeline Section */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: '0 0 16px' }}>
                                Timeline Activity Flow
                            </h3>
                            <div style={{ position: 'relative', paddingLeft: 24 }}>
                                {/* Continuous vertical rail */}
                                <div style={{
                                    position: 'absolute', left: 7, top: 6, bottom: 6,
                                    width: 2, borderRadius: 2,
                                    background: `linear-gradient(to bottom, ${C.emerald}, ${C.indigo}, ${C.slate300})`
                                }} />

                                {[
                                    { status: 'Call Completed', date: 'Today', note: 'Discussed project brochure, verified budget.', color: C.emerald, icon: '📞' },
                                    { status: 'WhatsApp Sent', date: 'Yesterday', note: 'Shared site visit video and floor plans.', color: C.indigo, icon: '💬' },
                                    { status: 'Lead Created', date: '20 Jul 2026', note: 'Assigned to Rohan Mishra via Facebook campaign.', color: C.slate400, icon: '✨' }
                                ].map((item, idx, arr) => (
                                    <div key={idx} style={{ position: 'relative', paddingBottom: idx < arr.length - 1 ? 18 : 0 }}>
                                        {/* Dot with glow ring */}
                                        <div style={{
                                            position: 'absolute', left: -21, top: 3,
                                            width: 14, height: 14, borderRadius: '50%',
                                            background: item.color,
                                            border: '2.5px solid white',
                                            boxShadow: `0 0 0 3px ${item.color}25`
                                        }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: C.slate950, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span>{item.icon}</span> {item.status}
                                            </span>
                                            <span style={{
                                                fontSize: '0.58rem', fontWeight: 800, color: item.color,
                                                background: `${item.color}12`, padding: '1px 6px', borderRadius: 4
                                            }}>{item.date}</span>
                                        </div>
                                        <span style={{ fontSize: '0.68rem', color: C.slate500, fontWeight: 600, lineHeight: 1.4, display: 'block' }}>{item.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Activities' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Quick Activity Box */}
                        {showActivityBox && (
                            <div style={{ background: 'white', borderRadius: 16, padding: '12px', border: `1.5px solid ${C.indigo}` }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: C.slate900, textTransform: 'uppercase', marginBottom: 6 }}>
                                    Log {activityType}
                                </div>
                                <textarea
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder={`Type your ${activityType} note here...`}
                                    style={{
                                        width: '100%', height: 60, borderRadius: 8, padding: '8px',
                                        border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none',
                                        marginBottom: 8, resize: 'none'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={handleAddNote}
                                        style={{ flex: 1, padding: '6px', borderRadius: 8, background: C.indigo, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                                    >
                                        Save Activity
                                    </button>
                                    <button
                                        onClick={() => setShowActivityBox(false)}
                                        style={{ padding: '6px 12px', borderRadius: 8, background: C.slate100, color: C.slate600, border: 'none', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Search and AI Summary Toggle Panel */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type="text"
                                    placeholder="Search activities..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '7px 8px 7px 28px',
                                        borderRadius: 10,
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        background: 'white',
                                        color: C.slate800
                                    }}
                                />
                                <Search size={12} color={C.slate400} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        style={{
                                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                            border: 'none', background: 'none', fontSize: '0.7rem', fontWeight: 800,
                                            color: C.slate400, cursor: 'pointer', padding: 2
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setShowTimelineSummary(!showTimelineSummary)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '7px 10px', borderRadius: 10,
                                    background: showTimelineSummary ? `${C.violet}15` : 'white',
                                    color: showTimelineSummary ? C.violetDark : C.slate600,
                                    border: `1px solid ${showTimelineSummary ? `${C.violet}35` : '#e2e8f0'}`,
                                    fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                                    whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                                }}
                            >
                                <Brain size={12} />
                                {showTimelineSummary ? 'Hide AI' : 'AI Summary'}
                            </button>
                        </div>

                        {/* Collapsible 7-day AI summary card */}
                        {showTimelineSummary && (
                            <div style={{
                                background: `linear-gradient(135deg, ${C.violet}08 0%, ${C.violet}02 100%)`,
                                border: `1px solid ${C.violet}25`,
                                borderRadius: 14,
                                padding: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                animation: 'fadeIn 0.2s ease-out'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 900, color: C.violetDark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <Sparkles size={11} /> Last 7 Days AI Activity Summary
                                </div>
                                <p style={{ margin: 0, fontSize: '0.71rem', color: C.slate700, fontWeight: 600, lineHeight: 1.45 }}>
                                    {interactions.length > 0 ? (
                                        `AI Analysis of recent logs for ${contact.name}: Lead remains highly responsive. Out of ${interactions.length} total logged events, calls have focused on premium unit configurations. The pricing details were shared recently. Next optimal nudge is setting up the in-person site tour.`
                                    ) : (
                                        `No recent events to analyze. The system is ready to compile intelligence as soon as calls or WhatsApp updates are logged for ${contact.name}.`
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Activity Filter Chips */}
                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
                            {['All', 'Call', 'WhatsApp', 'Email', 'Note', 'Task', 'Meeting'].map(f => {
                                // Semantic colour palette (point 3)
                                const chipColors: Record<string, string> = {
                                    All: C.slate500,
                                    Call: C.emerald, WhatsApp: C.emerald,           // Green → Completed / done
                                    Email: C.blue,                                    // Blue → Communication
                                    Note: C.slate500,                                 // Gray → Created / info
                                    Task: C.indigo,                                   // Purple → AI / Automation
                                    Meeting: '#f97316',                               // Orange → Meeting
                                };
                                const isActive = activityFilter === f;
                                const cc = chipColors[f] || C.slate500;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setActivityFilter(f)}
                                        style={{
                                            flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                                            fontSize: '0.62rem', fontWeight: 900, cursor: 'pointer',
                                            transition: 'all 0.18s ease',
                                            background: isActive ? cc : `${cc}10`,
                                            color: isActive ? 'white' : cc,
                                            border: `1px solid ${isActive ? cc : `${cc}25`}`,
                                            boxShadow: isActive ? `0 2px 10px ${cc}40` : 'none'
                                        }}
                                    >{f}</button>
                                );
                            })}
                        </div>

                        {/* Pinned Notes Section */}
                        {pinnedIds.length > 0 && (
                            <div style={{
                                background: '#fffbeb',
                                border: '1.5px solid #fef3c7',
                                borderRadius: 16,
                                padding: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.66rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <Pin size={11} style={{ transform: 'rotate(45deg)' }} /> Pinned Important Notes
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {interactions.filter(i => pinnedIds.includes(String(i.id))).map((item, idx, arr) => (
                                        <div key={`pinned-${item.id}`} style={{ position: 'relative', borderBottom: idx < arr.length - 1 ? '1px solid #fef3c7' : 'none', paddingBottom: idx < arr.length - 1 ? 8 : 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900 }}>
                                                    {item.type}
                                                </span>
                                                <button
                                                    onClick={() => setPinnedIds(pinnedIds.filter(id => id !== String(item.id)))}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#b45309', display: 'flex', alignItems: 'center', padding: 2 }}
                                                    title="Unpin Note"
                                                >
                                                    <Pin size={10} style={{ transform: 'rotate(45deg)', fill: '#b45309' }} />
                                                </button>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.68rem', color: C.slate600, fontWeight: 600, lineHeight: 1.45 }}>
                                                {item.note || item.notes}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interaction Timeline — point 4: full-height rail, point 6: richer empty state, Visual Polish */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '16px 14px', border: '1px solid #f1f5f9', marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: '0.68rem', fontWeight: 900, color: C.slate800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                                    Activity Timeline
                                </h3>
                                {activityFilter !== 'All' && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.slate400 }}>
                                        {filteredInteractions.length} result{filteredInteractions.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {filteredInteractions.length === 0 ? (
                                /* Enhanced empty state (point 6) */
                                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: C.slate700, marginBottom: 4 }}>
                                        {activityFilter === 'All' ? 'No activities yet' : `No ${activityFilter} activities`}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: C.slate400, fontWeight: 600, lineHeight: 1.5 }}>
                                        {activityFilter === 'All'
                                            ? 'No additional activities yet.\nCalls, notes, meetings, and messages\nwill appear here.'
                                            : `Log a ${activityFilter} using the actions above.`}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative', paddingLeft: 32 }}>
                                    {/* Full-height continuous vertical rail (point 4) */}
                                    <div style={{
                                        position: 'absolute', left: 10, top: 0, bottom: 0,
                                        width: 2, borderRadius: 2,
                                        background: 'linear-gradient(to bottom, #e2e8f0 0%, #e2e8f0 calc(100% - 12px), transparent 100%)'
                                    }} />

                                    {/* Pagination / expansion filter */}
                                        {filteredInteractions.slice(0, isTimelineExpanded ? filteredInteractions.length : 3).map((item, idx, arr) => {
                                        // ── Rich type metadata ─────────────────────────────────────────
                                        // Sub-context detection: peek at note text to pick a more specific icon
                                        const noteText = (item.note || item.notes || item.outcome || '').toLowerCase();
                                        const isQuote    = noteText.includes('quot') || noteText.includes('pricing') || noteText.includes('price');
                                        const isVisit    = noteText.includes('site visit') || noteText.includes('visit') || noteText.includes('property');
                                        const isMeetingNote = noteText.includes('meeting') || noteText.includes('met ');

                                        type TMetaShape = { color: string; bg: string; icon: string; rail: string; label: string };
                                        const TYPE_META: Record<string, TMetaShape> = {
                                            Call:            { color: C.emerald,    bg: '#dcfce7', icon: '📞', rail: C.emerald,    label: 'Call Completed'    },
                                            WhatsApp:        { color: '#16a34a',    bg: '#dcfce7', icon: '💬', rail: '#16a34a',    label: 'WhatsApp Sent'     },
                                            Email:           { color: C.blue,       bg: '#dbeafe', icon: '✉️',  rail: C.blue,       label: 'Email Sent'        },
                                            Note:            { color: C.slate500,   bg: '#f1f5f9', icon: '📝', rail: C.slate400,   label: 'Note Added'        },
                                            Meeting:         { color: '#f97316',    bg: '#ffedd5', icon: '📍', rail: '#f97316',    label: 'Meeting'           },
                                            Task:            { color: C.indigo,     bg: '#e0e7ff', icon: '✅', rail: C.indigo,     label: 'Task'              },
                                            AI:              { color: C.violetDark, bg: '#f3e8ff', icon: '🤖', rail: C.violetDark, label: 'AI Generated'      },
                                            'Status Change': { color: C.slate400,   bg: '#f8fafc', icon: '🔄', rail: C.slate300,   label: 'Status Changed'    },
                                        };

                                        const baseMeta: TMetaShape = TYPE_META[item.type] ?? { color: C.indigo, bg: '#e0e7ff', icon: '📋', rail: C.indigo, label: item.type || 'Activity' };

                                        // Override icon + label for richer sub-context
                                        let displayIcon  = baseMeta.icon;
                                        let displayLabel = baseMeta.label;

                                        if (item.type === 'Call') {
                                            if (isVisit)  { displayIcon = '🏠'; displayLabel = 'Site Visit Call'; }
                                            else           { displayIcon = '📞'; displayLabel = 'Call Completed'; }
                                        } else if (item.type === 'WhatsApp') {
                                            if (isQuote)  { displayIcon = '📄'; displayLabel = 'Quote Shared'; }
                                            else           { displayIcon = '💬'; displayLabel = 'WhatsApp Sent'; }
                                        } else if (item.type === 'Note') {
                                            if (isQuote)  { displayIcon = '📄'; displayLabel = 'Quote Shared'; }
                                            else if (isVisit) { displayIcon = '🏠'; displayLabel = 'Site Visit Note'; }
                                        } else if (item.type === 'Meeting') {
                                            displayIcon  = '📍';
                                            displayLabel = isVisit ? 'Site Visit' : 'Meeting';
                                        } else if (item.type === 'Email') {
                                            if (isQuote)  { displayIcon = '📄'; displayLabel = 'Quote Shared'; }
                                        }

                                        const meta = { ...baseMeta, icon: displayIcon };

                                        const ts = item.created_at ? new Date(item.created_at) : null;
                                        const dateLabel = ts ? ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
                                        const timeLabel = ts ? ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                                        const isLast = idx === arr.length - 1;

                                        // Auto-detect attachments based on keywords (point 3 of future enhancements)
                                        const textContent = (item.note || item.notes || '').toLowerCase();
                                        const hasAttachment = textContent.includes('brochure') || textContent.includes('pdf') || textContent.includes('quotation') || textContent.includes('pricing') || textContent.includes('agreement') || textContent.includes('doc');
                                        const attachmentName = textContent.includes('brochure') ? 'Project_Brochure_3BHK.pdf'
                                                             : textContent.includes('quotation') ? 'Price_Quotation_Sheet.pdf'
                                                             : textContent.includes('agreement') ? 'Draft_Agreement_Doc.pdf'
                                                             : 'Attachment_Document.pdf';

                                        const isPinned = pinnedIds.includes(String(item.id));

                                        return (
                                            <div key={item.id} style={{
                                                position: 'relative',
                                                paddingBottom: isLast ? 0 : 18,
                                                marginBottom: isLast ? 0 : 0
                                            }}>
                                                {/* Icon badge on rail */}
                                                <div style={{
                                                    position: 'absolute', left: -29, top: 0,
                                                    width: 22, height: 22, borderRadius: '50%',
                                                    background: meta.bg,
                                                    border: `1.5px solid ${meta.color}35`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '11px', boxShadow: `0 0 0 3px ${meta.color}12`
                                                }}>
                                                    {meta.icon}
                                                </div>

                                                {/* Header: icon + rich label left, lighter timestamp right */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 900, color: C.slate950, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <span style={{
                                                            fontSize: '13px', lineHeight: 1,
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            width: 20, height: 20, borderRadius: 6,
                                                            background: meta.bg, flexShrink: 0
                                                        }}>{meta.icon}</span>
                                                        {displayLabel}
                                                        {isPinned && <Pin size={9} style={{ color: '#d97706', transform: 'rotate(45deg)', fill: '#fbbf24' }} />}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.58rem', color: C.slate400, fontWeight: 700,
                                                        background: C.slate100, padding: '1px 7px', borderRadius: 4,
                                                        flexShrink: 0, marginLeft: 8, marginTop: 1
                                                    }}>
                                                        {dateLabel}{timeLabel ? `, ${timeLabel}` : ''}
                                                    </span>
                                                </div>


                                                {/* Note as secondary text (Visual Polish) */}
                                                {(item.note || item.notes) && (
                                                    <p style={{ margin: '0 0 6px', fontSize: '0.71rem', color: C.slate600, lineHeight: 1.5, fontWeight: 600 }}>
                                                        {item.note || item.notes}
                                                    </p>
                                                )}

                                                {/* Inline detected file attachment chip (point 3) */}
                                                {hasAttachment && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        background: C.slate50, border: '1px dashed #e2e8f0', borderRadius: 8,
                                                        padding: '5px 8px', margin: '4px 0 8px', width: '100%'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                                            <FileText size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                                                            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: C.slate700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                {attachmentName}
                                                            </span>
                                                            <span style={{ fontSize: '0.56rem', color: C.slate400, fontWeight: 600, flexShrink: 0 }}>
                                                                (2.4 MB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => alert(`Downloading attachment: ${attachmentName}`)}
                                                            style={{
                                                                border: 'none', background: 'none', cursor: 'pointer',
                                                                padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Download File"
                                                        >
                                                            <Download size={11} color={C.slate500} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Rich metadata chips */}
                                                {(item.agent_name || item.duration || item.outcome || item.source) && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
                                                        {item.agent_name && (
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 750, color: C.slate500, background: C.slate100, padding: '1px 7px', borderRadius: 4 }}>
                                                                👤 {item.agent_name}
                                                            </span>
                                                        )}
                                                        {item.duration && (
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 750, color: C.emeraldDark, background: '#dcfce7', padding: '1px 7px', borderRadius: 4 }}>
                                                                ⏱ {item.duration}
                                                            </span>
                                                        )}
                                                        {item.outcome && (
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 750, color: C.indigo, background: '#e0e7ff', padding: '1px 7px', borderRadius: 4 }}>
                                                                🎯 {item.outcome}
                                                            </span>
                                                        )}
                                                        {item.source && (
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 750, color: '#f97316', background: '#ffedd5', padding: '1px 7px', borderRadius: 4 }}>
                                                                📡 {item.source}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Quick actions direct from timeline entries (point 6) */}
                                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                                    {(item.type === 'Call' || item.type === 'WhatsApp') && (
                                                        <button
                                                            onClick={() => {
                                                                if (item.type === 'Call') {
                                                                    dialerEvents.call(contact.id, contact.phone, contact.name);
                                                                } else {
                                                                    setActivityType('WhatsApp');
                                                                    setNewNote(`Hi ${contact.name.split(' ')[0]}, following up on our chat...`);
                                                                    setShowActivityBox(true);
                                                                }
                                                            }}
                                                            style={{
                                                                border: 'none', background: 'none', padding: 0,
                                                                fontSize: '0.58rem', fontWeight: 800, color: C.indigo,
                                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                                            }}
                                                        >
                                                            {item.type === 'Call' ? '📞 Call Back' : '💬 Send Message'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            const itemStrId = String(item.id);
                                                            if (pinnedIds.includes(itemStrId)) {
                                                                setPinnedIds(pinnedIds.filter(id => id !== itemStrId));
                                                            } else {
                                                                setPinnedIds([...pinnedIds, itemStrId]);
                                                            }
                                                        }}
                                                        style={{
                                                            border: 'none', background: 'none', padding: 0,
                                                            fontSize: '0.58rem', fontWeight: 800, color: isPinned ? '#b45309' : C.slate500,
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                                        }}
                                                    >
                                                        <Pin size={9} style={{ transform: 'rotate(45deg)', fill: isPinned ? '#fbbf24' : 'none' }} />
                                                        {isPinned ? 'Pinned' : 'Pin Note'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(item.note || item.notes || '');
                                                            alert('Note copied to clipboard');
                                                        }}
                                                        style={{
                                                            border: 'none', background: 'none', padding: 0,
                                                            fontSize: '0.58rem', fontWeight: 800, color: C.slate500,
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                                        }}
                                                    >
                                                        <Copy size={9} /> Copy Note
                                                    </button>
                                                </div>

                                                {/* Subtle entry divider (Visual Polish) */}
                                                {!isLast && (
                                                    <div style={{ height: 1, background: '#f1f5f9', marginTop: 14 }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination Toggle (point 5) */}
                            {filteredInteractions.length > 3 && (
                                <button
                                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                        width: '100%', padding: '8px 0 0', marginTop: 12,
                                        border: 'none', borderTop: '1px solid #f1f5f9', background: 'none',
                                        color: C.indigo, fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {isTimelineExpanded ? (
                                        <>Collapse Timeline <ChevronUp size={12} /></>
                                    ) : (
                                        <>Show More Activities ({filteredInteractions.length - 3} remaining) <ChevronDown size={12} /></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Intelligence' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* AI Lead Intelligence Card */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: C.slate950, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Brain size={16} color={C.violetDark} /> AI Lead Intelligence
                                    </h3>
                                    <p style={{ margin: '1px 0 0', fontSize: '0.68rem', color: C.slate500 }}>Behavioral archetype & intent heatmaps.</p>
                                </div>
                                <button
                                    onClick={handleEnrich}
                                    disabled={enriching}
                                    style={{ padding: '6px 10px', borderRadius: 8, background: C.indigo, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer' }}
                                >
                                    {enriching ? 'Analyzing...' : 'Refresh'}
                                </button>
                            </div>

                            {aiInsights ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ background: `${C.violet}10`, borderRadius: 12, padding: '12px', border: `1px solid ${C.violet}20` }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 900, color: C.violetDark, textTransform: 'uppercase' }}>Archetype</div>
                                        <h4 style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 900, color: C.slate950 }}>{aiInsights.persona || 'High-Intent Buyer'}</h4>
                                    </div>

                                    <div style={{ background: C.slate50, borderRadius: 12, padding: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 900, color: C.slate500, textTransform: 'uppercase', marginBottom: 6 }}>Strategy Pointers</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {(aiInsights.talkingPoints || ['Focus on capital appreciation', 'Highlight connectivity', 'Schedule site visit']).map((tp: string, idx: number) => (
                                                <div key={idx} style={{ fontSize: '0.72rem', color: C.slate800, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Sparkles size={11} color={C.amber} /> {tp}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                                    <Brain size={28} color={C.violet} style={{ marginBottom: 6 }} />
                                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900 }}>No AI Analysis yet</h4>
                                    <p style={{ fontSize: '0.7rem', color: C.slate500, margin: '3px 0 10px' }}>Cross-reference signals to generate a conversion strategy.</p>
                                    <button
                                        onClick={handleEnrich}
                                        style={{ padding: '6px 14px', borderRadius: 8, background: C.indigo, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                                    >
                                        Unlock Intelligence
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* AI Insights Card */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: '0 0 10px' }}>
                                AI Insights
                            </h3>
                            <div style={{
                                background: C.slate50, padding: '12px', borderRadius: 14,
                                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10
                            }}>
                                <div style={{ fontSize: '0.74rem', color: C.slate800, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    📈 <span style={{ color: C.emeraldDark, fontWeight: 900 }}>High conversion probability</span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: C.slate800, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    🎯 <span>Interested in {contact.property_type || '2BHK Apartment'}</span>
                                </div>
                                <div style={{
                                    borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2,
                                    fontSize: '0.72rem', color: C.slate600, fontWeight: 700
                                }}>
                                    Best contact time: <span style={{ color: C.indigo, fontWeight: 900 }}>Evening</span>
                                </div>
                            </div>
                        </div>

                        {/* Documents Card */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.1px', margin: '0 0 10px' }}>
                                Documents
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { name: 'Quotation.pdf', size: '245 KB' },
                                    { name: 'Agreement.pdf', size: '1.2 MB' }
                                ].map((doc, idx) => (
                                    <div key={idx} style={{
                                        background: C.slate50, padding: '10px 12px', borderRadius: 12,
                                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => alert(`Opening ${doc.name}...`)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '1.2rem' }}>📄</span>
                                            <div>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: C.slate900 }}>{doc.name}</div>
                                                <div style={{ fontSize: '0.62rem', color: C.slate500, fontWeight: 700 }}>{doc.size}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: C.indigo, fontWeight: 900 }}>Download</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            {/* Dynamic Context-Aware FAB */}
            {(() => {
                // Determine most relevant action based on lead state & recent activity
                let fabConfig = {
                    label: 'Schedule Follow-up',
                    icon: CalendarIcon,
                    bg: `linear-gradient(135deg, ${C.blue} 0%, ${C.blueDark} 100%)`,
                    shadow: `0 6px 20px ${C.blue}50`,
                    action: () => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); }
                };

                if (contact?.stage === 'Site Visit Scheduled') {
                    fabConfig = {
                        label: 'Log Visit',
                        icon: MapPin,
                        bg: `linear-gradient(135deg, ${C.emerald} 0%, ${C.emeraldDark} 100%)`,
                        shadow: `0 6px 20px ${C.emerald}50`,
                        action: () => setShowSiteVisitScheduler(true)
                    };
                } else if (contact?.stage === 'Qualified') {
                    fabConfig = {
                        label: 'Create Proposal',
                        icon: FileText,
                        bg: `linear-gradient(135deg, ${C.violet} 0%, ${C.violetDark} 100%)`,
                        shadow: `0 6px 20px ${C.violet}50`,
                        action: () => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); }
                    };
                } else if (interactions[0]?.type === 'Call') {
                    fabConfig = {
                        label: 'Add Call Notes',
                        icon: Edit2,
                        bg: `linear-gradient(135deg, ${C.amber} 0%, ${C.amberDark} 100%)`,
                        shadow: `0 6px 20px ${C.amber}50`,
                        action: () => { setActivityType('Note'); setActiveTab('Activities'); setShowActivityBox(true); }
                    };
                }

                const FabIcon = fabConfig.icon;

                return (
                    <button
                        onClick={fabConfig.action}
                        style={{
                            position: 'fixed', bottom: 62, right: 14, zIndex: 45,
                            background: fabConfig.bg, color: 'white', border: 'none',
                            borderRadius: 30, padding: '10px 16px',
                            fontWeight: 900, fontSize: '0.74rem',
                            display: 'flex', alignItems: 'center', gap: 6,
                            cursor: 'pointer', boxShadow: fabConfig.shadow,
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            letterSpacing: '-0.1px'
                        }}
                    >
                        <FabIcon size={15} strokeWidth={2.5} />
                        <span>{fabConfig.label}</span>
                    </button>
                );
            })()}

            {/* Sticky Mobile Bottom Bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
                background: 'white', borderTop: '1px solid #f1f5f9',
                padding: '8px 12px', display: 'flex', gap: 8,
                boxShadow: '0 -3px 14px rgba(10,22,40,0.05)'
            }}>
                <button
                    onClick={() => dialerEvents.call(contact.id, contact.phone, contact.name)}
                    style={{
                        flex: 1, padding: '10px', borderRadius: 12,
                        background: C.emerald, color: 'white', border: 'none',
                        fontWeight: 900, fontSize: '0.78rem', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                        cursor: 'pointer', boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
                    }}
                >
                    <Phone size={14} /> Call {contact.name?.split(' ')[0]}
                </button>
                <button
                    onClick={() => { setActivityType('WhatsApp'); setActiveTab('Activities'); setShowActivityBox(true); }}
                    style={{
                        padding: '10px 16px', borderRadius: 12,
                        background: '#25D366', color: 'white', border: 'none',
                        fontWeight: 900, fontSize: '0.78rem', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                        cursor: 'pointer', boxShadow: '0 3px 10px rgba(37,211,102,0.25)'
                    }}
                >
                    <MessageSquare size={14} />
                </button>
            </div>
        </div>
    </div>
);
}
