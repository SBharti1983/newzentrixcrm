import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Phone, Mail, MessageSquare, MapPin, Edit2, MoreVertical, CheckSquare, Trash2,
    Calendar as CalendarIcon, TrendingUp, Sparkles, Wand2, ShieldCheck,
    ArrowRight, RefreshCw, RotateCw, ExternalLink, Brain, UserPlus, Users, Home, Target, Zap,
    Flame, Thermometer, Snowflake, BarChart2, FileText, Paperclip, ListChecks, Filter,
    Search, Pin, ChevronUp, ChevronDown, Download, Copy, Share2, Eye, X, Mic
} from 'lucide-react';
import { dialerEvents } from '../../constants/events';
import { leadsApi, zapierApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
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
    isListening?: boolean;
    handleVoice?: () => void;
    summarizing?: boolean;
    handleSummarize?: () => void;
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
    showActivityBox,
    isListening: externalIsListening,
    handleVoice: externalHandleVoice,
    summarizing: externalSummarizing,
    handleSummarize: externalHandleSummarize
}: MobileContactDetailsPageProps) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const score = contact?.score || 0;
    const stageColor = STAGE_DOT_COLORS[contact?.stage] || C.indigo;
    const [activityFilter, setActivityFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);

    const [internalIsListening, setInternalIsListening] = useState<boolean>(false);
    const [internalSummarizing, setInternalSummarizing] = useState<boolean>(false);

    const isListening = externalIsListening ?? internalIsListening;
    const summarizing = externalSummarizing ?? internalSummarizing;

    const handleVoice = externalHandleVoice || (() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('Voice input not supported in this browser', 'error');
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.onstart = () => setInternalIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setNewNote(newNote ? newNote + ' ' + transcript : transcript);
            };
            recognition.onend = () => setInternalIsListening(false);
            recognition.onerror = () => setInternalIsListening(false);
            recognition.start();
        } catch (err: any) {
            console.error('Speech recognition error:', err);
            showToast('Failed to start voice recognition', 'error');
            setInternalIsListening(false);
        }
    });

    const handleSummarize = externalHandleSummarize || (async () => {
        if (!newNote.trim()) {
            showToast('No content to summarize', 'warning');
            return;
        }
        setInternalSummarizing(true);
        try {
            const rawResult = await zapierApi.summarizeCall({ transcript: newNote });
            const result = rawResult?.__text || rawResult;
            if (!result || !result.summary) throw new Error('Empty summary returned');
            const summaryText = `\n\n--- AI SUMMARY ---\n${result.summary}\n\nKey Points:\n${(result.keyPoints || []).map((p: string) => `• ${p}`).join('\n')}\n\nAction Items:\n${(result.actionItems || []).map((a: string) => `• ${a}`).join('\n')}\nSentiment: ${result.sentiment || 'Neutral'}`;
            setNewNote(newNote + summaryText);
            showToast('AI Summary generated!', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Failed to generate summary', 'error');
        } finally {
            setInternalSummarizing(false);
        }
    });
    const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);
    const [showTimelineSummary, setShowTimelineSummary] = useState<boolean>(false);
    const [showOverflowActions, setShowOverflowActions] = useState<boolean>(false);
    const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
    const [expandedAttachIdx, setExpandedAttachIdx] = useState<number | null>(null);
    const [showLeadInfo, setShowLeadInfo] = useState<boolean>(true);
    const [followupCompleted, setFollowupCompleted] = useState<boolean>(false);

    // ── Edit & Options Modals State ──
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [isSavingLead, setIsSavingLead] = useState<boolean>(false);
    const [editForm, setEditForm] = useState({
        name: '', phone: '', email: '', city: '',
        requirement: '', budget: '', status: 'Active', stage: 'New Lead'
    });

    useEffect(() => {
        if (contact) {
            setEditForm({
                name: contact.name || '',
                phone: contact.phone || '',
                email: contact.email || '',
                city: contact.city || '',
                requirement: contact.requirement || contact.property_type || '',
                budget: contact.budget || '',
                status: contact.status || 'Active',
                stage: contact.stage || 'New Lead'
            });
        }
    }, [contact]);

    const handleSaveEdit = async () => {
        if (!editForm.name || !editForm.phone) {
            showToast('Name and Phone are required', 'error');
            return;
        }
        setIsSavingLead(true);
        try {
            await leadsApi.update(id, editForm);
            showToast('Lead details updated successfully', 'success');
            setShowEditModal(false);
            window.location.reload();
        } catch (err: any) {
            showToast(err?.error || err?.message || 'Failed to update lead', 'error');
        } finally {
            setIsSavingLead(false);
        }
    };

    const handleDeleteLead = async () => {
        try {
            await leadsApi.delete(id);
            showToast('Lead deleted successfully', 'success');
            navigate('/leads');
        } catch (err: any) {
            showToast(err?.error || err?.message || 'Failed to delete lead', 'error');
        }
    };

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

            <div style={{ padding: '4px 4px' }}>
                {/* Profile Header Card */}
                <div style={{
                    background: 'white', borderRadius: 16, padding: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
                    position: 'relative', overflow: 'hidden',
                    marginBottom: 12
                }}>
                    {/* Top Row: Avatar & Contact Info (Left) + Score & Badges & Actions (Right) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                        {/* Left: Avatar + Name + Phone + Last Activity + Chips */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                                    <circle cx="22" cy="22" r="19" fill="none" stroke={`${avatarBg}20`} strokeWidth="3" />
                                    <circle cx="22" cy="22" r="19" fill="none"
                                        stroke={avatarBg} strokeWidth="3"
                                        strokeDasharray={`${(score / 100) * 119.3} 119.3`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 4,
                                    background: avatarBg, color: 'white', borderRadius: 11,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '15px', fontWeight: 900,
                                    boxShadow: `0 2px 8px ${avatarBg}40`
                                }}>
                                    {initial}
                                </div>
                                <div style={{
                                    position: 'absolute', bottom: -1, right: -1,
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: C.emerald, border: '2px solid white'
                                }} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: C.slate950, letterSpacing: '-0.2px', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {contact.name}
                                    </h1>
                                    <ShieldCheck size={14} color="#3b82f6" fill="#3b82f6" style={{ flexShrink: 0, color: 'white' }} />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: C.slate800, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <span>📞</span>
                                    <span>{contact.phone || '53532532445'}</span>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: C.slate500, fontWeight: 700, marginTop: 2, marginBottom: 5 }}>
                                    Last Activity: <span style={{ color: C.emerald, fontWeight: 800 }}>Today • Log Call</span>
                                </div>

                                {/* Metadata Chips (2BHK, 21 Jul, Rohan Mishra) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: C.slate700, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        🏠 {contact.project || contact.requirement || '2BHK'}
                                    </span>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: C.slate700, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        📅 {contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '21 Jul'}
                                    </span>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: C.slate700, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        👤 {contact.agent_name || contact.assigned_agent || 'Rohan Mishra'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions (Edit & More) + Score + Warm Badge + Pipeline Stage */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {/* Edit & More Buttons Container */}
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                                    padding: '3px 6px', gap: 4, boxShadow: '0 1px 2px rgba(15,23,42,0.03)'
                                }}>
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        title="Edit Lead Details"
                                        style={{
                                            border: 'none', background: 'white', cursor: 'pointer',
                                            padding: '3px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Edit2 size={12} color={C.slate800} strokeWidth={2} />
                                    </button>
                                    <div style={{ width: 1, height: 14, background: '#cbd5e1' }} />
                                    <button
                                        onClick={() => setShowMoreOptions(true)}
                                        title="More Options"
                                        style={{
                                            border: 'none', background: 'white', cursor: 'pointer',
                                            padding: '3px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <MoreVertical size={12} color={C.slate800} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            {/* Score Card */}
                            <div style={{
                                width: 76, background: 'white', borderRadius: 8, padding: '3px 6px',
                                border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ fontSize: '0.76rem', fontWeight: 900, color: C.slate950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                    <span style={{ fontSize: '0.6rem', color: '#f59e0b' }}>⭐</span> {score}
                                </div>
                                <div style={{ fontSize: '0.45rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    SCORE
                                </div>
                            </div>

                            {/* Warm Badge */}
                            <div style={{
                                width: 76, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706',
                                borderRadius: 8, padding: '2px 0', textAlign: 'center', fontSize: '0.52rem', fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                            }}>
                                <span>🔥</span> WARM
                            </div>

                            {/* New Lead Pipeline Stage */}
                            <div style={{
                                width: 76, background: '#eff6ff', border: '1px solid #bfdbfe', color: C.blue,
                                borderRadius: 8, padding: '2px 0', textAlign: 'center', fontSize: '0.52rem', fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                            }}>
                                <span>✉</span> {contact.stage || 'New Lead'}
                            </div>
                        </div>
                    </div>

                    {/* Direct Communication Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            onClick={() => dialerEvents.call(contact.id, contact.phone, contact.name)}
                            style={{
                                flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
                                borderRadius: 8, padding: '5px 8px', fontSize: '0.64rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer'
                            }}
                        >
                            <Phone size={12} color="#16a34a" strokeWidth={2.5} /> Call
                        </button>
                        <a
                            href={`https://wa.me/${(contact.phone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
                                borderRadius: 8, padding: '5px 8px', fontSize: '0.64rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', cursor: 'pointer'
                            }}
                        >
                            <MessageSquare size={12} color="#16a34a" strokeWidth={2.5} /> WhatsApp
                        </a>
                        <a
                            href={`mailto:${contact.email || 'info@mayainfratech.in'}`}
                            style={{
                                flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', color: C.blue,
                                borderRadius: 8, padding: '5px 8px', fontSize: '0.64rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', cursor: 'pointer'
                            }}
                        >
                            <Mail size={12} color={C.blue} strokeWidth={2.5} /> Email
                        </a>
                    </div>
                </div>

                {/* Section Heading: Quick Logs */}
                <div style={{
                    fontSize: '0.62rem', fontWeight: 800, color: C.slate800,
                    letterSpacing: '0.01em', margin: '10px 4px 10px',
                    display: 'flex', alignItems: 'center', gap: 5
                }}>
                    <Zap size={13} color={C.indigo} /> Quick Logs
                </div>

                {/* Quick Log Activity Panel */}
                <div style={{
                    marginBottom: 14, padding: '6px 6px 4px', background: 'white',
                    borderRadius: 12, border: '1px solid #f1f5f9',
                    boxShadow: '0 1px 4px rgba(10,22,40,0.02)'
                }}>
                    {/* ── Primary row: Log Call · Log WhatsApp · Log Email ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 3 }}>
                        {([
                            { icon: Phone,         label: 'Log Call',     color: '#10b981', action: () => { setActivityType('Call'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: MessageSquare, label: 'Log WhatsApp', color: '#25d366', action: () => { setActivityType('WhatsApp'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Mail,          label: 'Log Email',    color: '#3b82f6', action: () => { setActivityType('Email'); setActiveTab('Activities'); setShowActivityBox(true); } },
                        ] as const).map(act => (
                            <button
                                key={act.label}
                                onClick={act.action}
                                style={{
                                    padding: '2.5px 2px', borderRadius: 7,
                                    background: 'white', border: `1px solid ${act.color}30`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 1,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                            >
                                <act.icon size={11} color={act.color} strokeWidth={2.2} />
                                <span style={{ fontSize: '0.47rem', fontWeight: 800, color: C.slate800, textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                                    {act.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ── Secondary row: Log Meeting · Add Note · Create Task ── */}
                    <div style={{ height: 1, background: '#f1f5f9', margin: '0 2px 3px' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 3 }}>
                        {([
                            { icon: CalendarIcon, label: 'Log Meeting', color: '#ef4444', action: () => { setActivityType('Meeting'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Edit2,        label: 'Add Note',    color: '#f59e0b', action: () => { setActivityType('Note'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: CheckSquare,  label: 'Create Task', color: '#6366f1', action: () => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); } },
                        ] as const).map(act => (
                            <button
                                key={act.label}
                                onClick={act.action}
                                style={{
                                    padding: '2.5px 2px', borderRadius: 7,
                                    background: 'white', border: `1px solid ${act.color}30`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 1,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                            >
                                <act.icon size={11} color={act.color} strokeWidth={2.2} />
                                <span style={{ fontSize: '0.47rem', fontWeight: 800, color: C.slate800, textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                                    {act.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ── Tertiary row: Nurture · Plan Visit · Assign Lead ── */}
                    <div style={{ height: 1, background: '#f1f5f9', margin: '0 2px 3px' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 2 }}>
                        {([
                            { icon: TrendingUp, label: contact.status === 'Nurture' ? 'Active' : 'Nurture', color: C.blue,       action: () => handleUpdateStatus(contact.status === 'Nurture' ? 'Active' : 'Nurture') },
                            { icon: MapPin,     label: 'Plan Visit', color: C.amber,      action: () => setShowSiteVisitScheduler(true) },
                            { icon: UserPlus,   label: 'Assign Lead', color: C.violetDark, action: () => { setActivityType('Assign'); setActiveTab('Activities'); setShowActivityBox(true); } },
                        ] as const).map(act => (
                            <button
                                key={act.label}
                                onClick={act.action}
                                style={{
                                    padding: '2.5px 2px', borderRadius: 7,
                                    background: 'white', border: `1px solid ${act.color}30`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 1,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                            >
                                <act.icon size={11} color={act.color} strokeWidth={2.2} />
                                <span style={{ fontSize: '0.47rem', fontWeight: 800, color: C.slate800, textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                                    {act.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Segmented Tab Switcher */}
                <div style={{
                    display: 'flex', background: 'white', borderRadius: 10,
                    padding: 2, border: '1px solid #f1f5f9', marginBottom: 6,
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* AI Recommendation Box */}
                        <div style={{
                            background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 14,
                            padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8
                        }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Sparkles size={13} color="#7e22ce" /> AI Recommendation
                                    </div>
                                    <span style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: '0.5rem', fontWeight: 900, padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        HIGH OPPORTUNITY
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.62rem', color: C.slate600, fontWeight: 600, lineHeight: 1.3, marginBottom: 8 }}>
                                    Customer requested a site visit and showed strong interest.
                                </div>

                                <div
                                    onClick={() => setShowSiteVisitScheduler(true)}
                                    style={{
                                        background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 10,
                                        padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#581c87', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span>📅</span> Schedule Site Visit
                                        </div>
                                        <div style={{ fontSize: '0.54rem', color: '#7e22ce', fontWeight: 700 }}>
                                            within 48 hours
                                        </div>
                                    </div>
                                    <ChevronRight size={14} color="#7e22ce" />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.56rem', fontWeight: 800, color: C.slate500, whiteSpace: 'nowrap' }}>Confidence: 92%</span>
                                <div style={{ flex: 1, height: 5, background: '#e9d5ff', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: '92%', height: '100%', background: 'linear-gradient(90deg, #9333ea, #7e22ce)', borderRadius: 3 }} />
                                </div>
                            </div>
                        </div>

                        {/* Summary Mini-Panel: Next Step & Open Tasks */}
                        <div style={{
                            background: '#f8fafc', borderRadius: 14, padding: '12px 14px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(15,23,42,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
                        }}>
                            {/* Next Step */}
                            <div style={{ flex: 1, minWidth: 150 }}>
                                <div style={{ fontSize: '0.54rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                                    NEXT STEP
                                </div>
                                <div style={{ fontSize: '0.74rem', fontWeight: 900, color: C.indigo, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>🏠</span> Follow-up Call
                                </div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.slate500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <span>📅</span> Tomorrow, 4:00 PM
                                </div>
                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate600, marginTop: 3 }}>
                                    Assigned to <span style={{ fontWeight: 800, color: C.slate800 }}>👤 {contact.agent_name || contact.assigned_agent || 'Rohan Mishra'}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ width: 1, height: 44, background: '#e2e8f0' }} />

                            {/* Open Tasks */}
                            <div style={{ flex: 1, minWidth: 150, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.54rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                                        OPEN TASKS
                                    </div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span>☑</span> 2 Pending
                                    </div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <span>🔔</span> 1 Due Today
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveTab('Activities')}
                                    style={{
                                        background: '#eff6ff', border: '1px solid #bfdbfe', color: C.blue,
                                        borderRadius: 16, padding: '5px 12px', fontSize: '0.6rem', fontWeight: 900,
                                        display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                                    }}
                                >
                                    View Tasks <ChevronRight size={11} color={C.blue} />
                                </button>
                            </div>
                        </div>


                        {/* Next Follow-up Section (Enlarged Hero Card) */}
                        {(() => {
                            const followupDate = contact?.next_followup || '24 Jul 2026';
                            const followupTime = contact?.next_followup_time || '10:30 AM';
                            const followupTitle = contact?.next_followup_title || 'Follow-up Call';
                            return (
                                <div style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    borderRadius: 20, padding: '16px',
                                    border: `1.5px solid ${followupCompleted ? C.emerald + '40' : C.indigo + '30'}`,
                                    boxShadow: `0 4px 20px ${followupCompleted ? C.emerald + '15' : C.indigo + '15'}`,
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{
                                            fontSize: '10px', fontWeight: 700, color: C.slate500,
                                            letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0,
                                            display: 'flex', alignItems: 'center', gap: 4
                                        }}>
                                            <CalendarIcon size={10} color={followupCompleted ? C.emerald : C.indigo} /> NEXT FOLLOW-UP
                                        </div>
                                        <div style={{
                                            background: followupCompleted ? '#ecfdf5' : '#eff6ff',
                                            color: followupCompleted ? C.emerald : C.indigo,
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: '0.64rem', fontWeight: 900,
                                            border: `1px solid ${followupCompleted ? '#a7f3d0' : '#bfdbfe'}`
                                        }}>
                                            {followupCompleted ? 'Completed' : 'Scheduled'}
                                        </div>
                                    </div>

                                    {/* Prominent Details Display */}
                                    <div style={{
                                        background: followupCompleted ? '#f0fdf4' : 'white',
                                        padding: '12px 14px', borderRadius: 14,
                                        border: `1px solid ${followupCompleted ? '#d1fae5' : '#e2e8f0'}`,
                                        marginBottom: 14
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem', fontWeight: 900, color: C.slate950 }}>
                                                <span>📅</span> {followupDate}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem', fontWeight: 900, color: C.slate950 }}>
                                                <span>🕥</span> {followupTime}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: followupCompleted ? C.slate500 : C.indigo, textDecoration: followupCompleted ? 'line-through' : 'none', marginBottom: 8 }}>
                                            {followupTitle}
                                        </div>

                                        {/* Subtle Secondary Row: Assigned To + Reminder */}
                                        <div style={{
                                            borderTop: `1px solid ${followupCompleted ? '#d1fae5' : '#f1f5f9'}`,
                                            paddingTop: 8, marginTop: 4,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            fontSize: '0.62rem', fontWeight: 700, color: C.slate500, flexWrap: 'wrap', gap: 6
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ color: C.slate400 }}>Assigned to</span>
                                                <span style={{ fontWeight: 800, color: C.slate800 }}>👤 {contact.agent_name || contact.assigned_agent || 'Rohan Mishra'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ color: C.slate400 }}>Reminder</span>
                                                <span style={{ fontWeight: 800, color: C.amberDark }}>🔔 30 min before</span>
                                            </div>
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
                                            onClick={() => setFollowupCompleted(!followupCompleted)}
                                            style={{
                                                flex: 1, padding: '9px 12px', borderRadius: 10,
                                                background: followupCompleted ? C.emerald : `linear-gradient(135deg, ${C.indigo} 0%, ${C.blueDark} 100%)`,
                                                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.72rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                boxShadow: followupCompleted ? `0 2px 8px ${C.emerald}40` : `0 2px 8px ${C.indigo}40`
                                            }}
                                        >
                                            <CheckSquare size={13} color="white" /> {followupCompleted ? 'Done ✓' : 'Complete'}
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
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate800, letterSpacing: '0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Users size={13} color={C.indigo} /> Lead Information
                                </div>
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
                                    {showLeadInfo ? <ChevronUp size={14} color={C.slate500} /> : <ChevronDown size={14} color={C.slate500} />}
                                </button>
                            </div>

                            {showLeadInfo && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                                    {/* Consolidated Sub-Card: Lead Details */}
                                    <div style={{ background: C.slate50, padding: '12px 14px', borderRadius: 14, border: '1px solid #eef2f7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: C.indigo, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            📋 Lead Details
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📞 Phone</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.phone || '+91 98100 00004'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>✉️ Email</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.email || 'priya@example.com'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📍 Location</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.city || contact.location || 'Mumbai'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>👤 Owner</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.agent_name || contact.assigned_agent || 'Rohan Mishra'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📅 Created</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '21 Jul 2026'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>🎯 Stage</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: stageColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.stage || 'New Lead'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>📢 Source</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.source || contact.lead_source || 'Website'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate500 }}>🏷️ Industry</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate800, letterSpacing: '0.01em', margin: 0 }}>
                                    Latest Note Preview
                                </div>
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
                                                fontSize: '0.58rem', fontWeight: 900,
                                                color: ss.color, background: ss.bg,
                                                border: `1px solid ${ss.border}`,
                                                borderRadius: 6, padding: '2.5px 7px',
                                                whiteSpace: 'nowrap'
                                            }}>{done ? 'Completed' : task.status}</span>
                                            <span style={{
                                                fontSize: '0.58rem', fontWeight: 900,
                                                color: ps.color, background: ps.bg,
                                                border: `1px solid ${ps.border}`,
                                                borderRadius: 6, padding: '2.5px 7px',
                                                whiteSpace: 'nowrap'
                                            }}>{task.priority}</span>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <div style={{ background: 'white', borderRadius: 16, padding: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate800, letterSpacing: '0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <ListChecks size={13} color={C.indigo} /> Upcoming Tasks
                                            {pendingTasks.length > 0 && (
                                                <span style={{
                                                    fontSize: '0.55rem', fontWeight: 900,
                                                    color: 'white', background: C.indigo,
                                                    borderRadius: 20, padding: '1px 6px', lineHeight: 1.4
                                                }}>{pendingTasks.length}</span>
                                            )}
                                        </div>
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
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate800, letterSpacing: '0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Brain size={13} color={C.violetDark} /> AI Comm Summary
                                </div>
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

                            {/* Recommended next action — Prominent Primary AI Recommendation */}
                            {(() => {
                                const nextActionLabel: string = aiInsights?.nextAction || aiInsights?.next_action || (
                                    score >= 70 ? 'Send WhatsApp Follow-up'
                                    : score >= 40 ? 'Call Customer Today'
                                    : 'Schedule Site Visit'
                                );
                                return (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                            Recommended Next Action
                                        </div>

                                        {/* Primary Highlighted Recommendation Banner */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                            background: `linear-gradient(135deg, ${C.emerald}15, ${C.indigo}08)`,
                                            border: `1.5px solid ${C.emerald}35`,
                                            borderRadius: 12, padding: '10px 12px',
                                            marginBottom: 10
                                        }}>
                                            <div style={{ fontSize: '0.74rem', fontWeight: 900, color: C.slate900, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span>🟢</span> {nextActionLabel}
                                            </div>
                                            <button
                                                onClick={handleGenerateAISuggestion}
                                                style={{
                                                    padding: '5px 11px', borderRadius: 8,
                                                    background: C.emerald, border: 'none', color: 'white',
                                                    fontSize: '0.62rem', fontWeight: 900, cursor: 'pointer',
                                                    boxShadow: `0 2px 8px ${C.emerald}40`
                                                }}
                                            >
                                                Execute
                                            </button>
                                        </div>

                                        {/* Secondary Actions */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); }}
                                                style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    padding: '6px 8px', borderRadius: 8,
                                                    background: C.slate50, border: '1px solid #e2e8f0',
                                                    fontSize: '0.64rem', fontWeight: 800, color: C.slate700, cursor: 'pointer'
                                                }}
                                            >
                                                <CheckSquare size={12} color={C.slate500} /> Create Task
                                            </button>
                                            <button
                                                onClick={handleGenerateAISuggestion}
                                                disabled={generatingAISuggestion}
                                                style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    padding: '6px 8px', borderRadius: 8,
                                                    background: C.slate50, border: '1px solid #e2e8f0',
                                                    fontSize: '0.64rem', fontWeight: 800, color: C.slate700, cursor: 'pointer'
                                                }}
                                            >
                                                <MessageSquare size={12} color={C.slate500} /> Generate WhatsApp Draft
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
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
                                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate800, letterSpacing: '0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Paperclip size={13} color={C.slate600} /> Recent Attachments
                                        </div>
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
                                                            <div style={{ fontSize: '0.62rem', color: C.slate500, fontWeight: 700, marginTop: 2 }}>{doc.ext} • {doc.size} • {doc.date}</div>
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
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate800, letterSpacing: '0.01em', margin: '0 0 16px' }}>
                                Timeline Activity Flow
                            </div>
                            <div style={{ position: 'relative', paddingLeft: 24 }}>
                                {/* Continuous vertical rail */}
                                <div style={{
                                    position: 'absolute', left: 7, top: 12, bottom: 6,
                                    width: 2, borderRadius: 2,
                                    background: `linear-gradient(to bottom, ${C.emerald}, ${C.indigo}, ${C.slate300})`
                                }} />

                                {[
                                    { status: 'Call Completed', date: 'TODAY', note: 'Discussed project brochure, verified budget.', color: C.emerald, icon: '📞' },
                                    { status: 'WhatsApp Sent', date: 'YESTERDAY', note: 'Shared site visit video and floor plans.', color: C.indigo, icon: '💬' },
                                    { status: 'Lead Created', date: '20 JUL 2026', note: 'Assigned to Rohan Mishra via Facebook campaign.', color: C.slate400, icon: '✨' }
                                ].map((item, idx, arr) => (
                                    <div key={idx} style={{ position: 'relative', paddingBottom: idx < arr.length - 1 ? 16 : 0 }}>
                                        {/* Prominent Date Separator */}
                                        <div style={{
                                            fontSize: '0.55rem', fontWeight: 900, color: C.slate500,
                                            textTransform: 'uppercase', letterSpacing: '0.08em',
                                            marginBottom: 8, marginTop: idx > 0 ? 6 : 0,
                                            display: 'flex', alignItems: 'center', gap: 6
                                        }}>
                                            <span style={{ background: '#f1f5f9', color: C.slate700, padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                                📅 {item.date}
                                            </span>
                                            <span style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                                        </div>

                                        {/* Dot with glow ring */}
                                        <div style={{
                                            position: 'absolute', left: -21, top: 22,
                                            width: 14, height: 14, borderRadius: '50%',
                                            background: item.color,
                                            border: '2.5px solid white',
                                            boxShadow: `0 0 0 3px ${item.color}25`
                                        }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                            <span style={{ fontSize: '0.76rem', fontWeight: 900, color: C.slate950, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span>{item.icon}</span> {item.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: C.slate600, fontWeight: 600, lineHeight: 1.45 }}>
                                            {item.note}
                                        </div>
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
                            <div style={{ background: 'white', borderRadius: 16, padding: '12px 14px 14px', border: `1.5px solid ${C.indigo}`, boxShadow: '0 4px 14px rgba(99, 102, 241, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: C.slate900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        Log {activityType}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {/* Voice Input Button */}
                                        <button
                                            onClick={handleVoice}
                                            type="button"
                                            title="Voice Input"
                                            style={{
                                                height: 28,
                                                padding: '0 8px',
                                                borderRadius: 8,
                                                background: isListening ? '#fee2e2' : '#f8fafc',
                                                border: `1px solid ${isListening ? '#ef4444' : '#e2e8f0'}`,
                                                color: isListening ? '#ef4444' : C.slate800,
                                                fontWeight: 800,
                                                fontSize: '0.62rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Mic size={13} color={isListening ? '#ef4444' : '#1e3a8a'} className={isListening ? 'animate-pulse' : ''} />
                                            <span>{isListening ? 'Listening...' : 'Voice'}</span>
                                        </button>

                                        {/* AI Summarize Button */}
                                        <button
                                            onClick={handleSummarize}
                                            disabled={summarizing}
                                            type="button"
                                            title="Summarize with AI"
                                            style={{
                                                height: 28,
                                                padding: '0 8px',
                                                borderRadius: 8,
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                color: C.slate800,
                                                fontWeight: 800,
                                                fontSize: '0.62rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            {summarizing ? (
                                                <RefreshCw size={11} className="animate-spin" color="#8b5cf6" />
                                            ) : (
                                                <Sparkles size={11} color="#8b5cf6" />
                                            )}
                                            <span>Summarize</span>
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder={`Type your ${activityType} note here...`}
                                    style={{
                                        width: '100%', height: 75, borderRadius: 10, padding: '10px',
                                        border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none',
                                        marginBottom: 10, resize: 'none', fontFamily: 'inherit',
                                        color: C.slate900, background: '#fcfdfe'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={handleAddNote}
                                        style={{ flex: 1, padding: '7px', borderRadius: 8, background: C.indigo, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' }}
                                    >
                                        Save Activity
                                    </button>
                                    <button
                                        onClick={() => setShowActivityBox(false)}
                                        style={{ padding: '7px 12px', borderRadius: 8, background: C.slate100, color: C.slate600, border: 'none', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Unified Search + AI Summary Toolbar */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: 'white',
                            border: `1px solid ${showTimelineSummary ? C.violet + '50' : '#e2e8f0'}`,
                            borderRadius: 10,
                            boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
                            overflow: 'hidden'
                        }}>
                            {/* Search Input Box */}
                            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                                <Search size={13} color={C.slate400} style={{ position: 'absolute', left: 10 }} />
                                <input
                                    type="text"
                                    placeholder="Search activities..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '7px 8px 7px 30px',
                                        border: 'none',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        background: 'transparent',
                                        color: C.slate800
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        style={{
                                            position: 'absolute', right: 8,
                                            border: 'none', background: 'none', fontSize: '0.7rem', fontWeight: 800,
                                            color: C.slate400, cursor: 'pointer', padding: 2
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Vertical Separator */}
                            <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

                            {/* AI Insights Action Button */}
                            <button
                                onClick={() => setShowTimelineSummary(!showTimelineSummary)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '7px 12px', border: 'none',
                                    background: showTimelineSummary ? '#f3e8ff' : 'transparent',
                                    color: showTimelineSummary ? '#7e22ce' : C.slate700,
                                    fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer',
                                    whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                                }}
                            >
                                <Sparkles size={12} color={showTimelineSummary ? '#7e22ce' : C.slate600} />
                                <span>✨ Insights</span>
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
                                    <Sparkles size={11} /> 7-Day Activity Insights
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

                        {/* Quick Engagement Activity Summary Metrics Bar */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: 14,
                            padding: '10px 14px',
                            boxShadow: '0 1px 3px rgba(15,23,42,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: C.slate950, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BarChart2 size={14} color={C.indigo} />
                                    <span>{interactions.length || 42} Total Activities</span>
                                </span>
                                <span style={{ fontSize: '0.56rem', fontWeight: 900, color: C.emeraldDark, background: '#dcfce7', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 12 }}>
                                    High Engagement
                                </span>
                            </div>

                            {/* Horizontal divider */}
                            <div style={{ height: 1, background: '#f1f5f9' }} />

                            {/* Activity Metrics Breakdown Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: C.slate700 }}>
                                    <span>📞</span>
                                    <span>{interactions.filter(i => i.type === 'Call').length || 18} Calls</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: C.slate700 }}>
                                    <span>💬</span>
                                    <span>{interactions.filter(i => i.type === 'WhatsApp').length || 12} WhatsApp</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: C.slate700 }}>
                                    <span>📅</span>
                                    <span>{interactions.filter(i => i.type === 'Meeting').length || 5} Meetings</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: C.slate700 }}>
                                    <span>📝</span>
                                    <span>{interactions.filter(i => i.type === 'Note').length || 7} Notes</span>
                                </div>
                            </div>
                        </div>

                        {/* Activity Filter Chips */}
                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
                            {['All', 'Call', 'WhatsApp', 'Email', 'Note', 'Task', 'Meeting'].map(f => {
                                const isActive = activityFilter === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setActivityFilter(f)}
                                        style={{
                                            flexShrink: 0, padding: '5px 14px', borderRadius: 20,
                                            fontSize: '0.66rem', fontWeight: isActive ? 900 : 700, cursor: 'pointer',
                                            transition: 'all 0.18s ease',
                                            background: isActive ? C.blue : 'white',
                                            color: isActive ? 'white' : C.slate600,
                                            border: `1px solid ${isActive ? C.blue : '#e2e8f0'}`,
                                            boxShadow: isActive ? `0 2px 8px ${C.blue}40` : 'none'
                                        }}
                                    >
                                        {f}
                                    </button>
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
                                <h3 style={{ fontSize: '0.68rem', fontWeight: 700, color: C.slate400, textTransform: 'none', margin: 0 }}>
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
                                        const noteText = (item.note || item.notes || item.outcome || '').toLowerCase();
                                        const isQuote    = noteText.includes('quot') || noteText.includes('pricing') || noteText.includes('price');
                                        const isVisit    = noteText.includes('site visit') || noteText.includes('visit') || noteText.includes('property');

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
                                        const isToday = ts ? (new Date().toDateString() === new Date().toDateString()) : false;
                                        const dateLabel = isToday ? 'Today' : (ts ? ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '21 Jul');
                                        const timeLabel = ts ? ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '10:25 AM';
                                        const isLast = idx === arr.length - 1;

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
                                                paddingBottom: isLast ? 0 : 14,
                                                marginBottom: isLast ? 0 : 0
                                            }}>
                                                {/* Icon badge on rail */}
                                                <div style={{
                                                    position: 'absolute', left: -29, top: 4,
                                                    width: 22, height: 22, borderRadius: '50%',
                                                    background: meta.bg,
                                                    border: `1.5px solid ${meta.color}35`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '11px', boxShadow: `0 0 0 3px ${meta.color}12`,
                                                    zIndex: 1
                                                }}>
                                                    {meta.icon}
                                                </div>

                                                {/* Enriched Activity Card container */}
                                                <div style={{
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: 12,
                                                    padding: '10px 12px',
                                                    display: 'flex', flexDirection: 'column', gap: 4
                                                }}>
                                                    {/* Header: Timestamp + Title & Action Links */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.62rem', fontWeight: 900, color: C.indigo, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                                                                <span>📅 {dateLabel}</span>
                                                                <span style={{ color: C.slate300 }}>•</span>
                                                                <span style={{ color: C.slate600, fontWeight: 800 }}>{timeLabel}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: C.slate950, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                {displayLabel}
                                                                {isPinned && <Pin size={10} style={{ color: '#d97706', transform: 'rotate(45deg)', fill: '#fbbf24' }} />}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <button
                                                                onClick={() => {
                                                                    if (isPinned) setPinnedIds(pinnedIds.filter(id => id !== String(item.id)));
                                                                    else setPinnedIds([...pinnedIds, String(item.id)]);
                                                                }}
                                                                style={{
                                                                    border: 'none', background: 'none', cursor: 'pointer',
                                                                    padding: '3px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}
                                                                title={isPinned ? "Unpin Note" : "Pin Note"}
                                                            >
                                                                <Pin size={13} color={isPinned ? '#d97706' : C.slate400} style={{ transform: 'rotate(45deg)', fill: isPinned ? '#fbbf24' : 'none' }} />
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(item.note || item.notes || displayLabel);
                                                                }}
                                                                style={{
                                                                    border: 'none', background: 'none', cursor: 'pointer',
                                                                    padding: '3px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}
                                                                title="Copy activity note"
                                                            >
                                                                <Copy size={13} color={C.slate400} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Created By */}
                                                    <div style={{ fontSize: '0.62rem', color: C.slate500, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                        <span>Created by</span>
                                                        <span style={{ fontWeight: 800, color: C.slate800 }}>👤 {item.agent_name || contact.assigned_agent || 'Rohan Mishra'}</span>
                                                    </div>

                                                    {/* Row 3: Channel Source / Location Metadata */}
                                                    <div style={{ fontSize: '0.58rem', color: C.indigo, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 6, width: 'fit-content', marginTop: 2 }}>
                                                        <span>📍 {item.source || (item.type === 'Created' || displayLabel.includes('Created') ? 'Imported from Facebook Ads' : item.type === 'WhatsApp' ? 'Synced via WhatsApp Web' : item.type === 'Call' ? 'Zentrix Cloud Dialer' : 'Log Activity')}</span>
                                                    </div>

                                                    {/* Note Content Body */}
                                                    {(item.note || item.notes) && (
                                                        <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: C.slate700, lineHeight: 1.45, fontWeight: 600, background: 'white', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                            {item.note || item.notes}
                                                        </p>
                                                    )}

                                                    {/* Attachment File Chip */}
                                                    {hasAttachment && (
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            background: 'white', border: '1px dashed #cbd5e1', borderRadius: 8,
                                                            padding: '5px 8px', marginTop: 4
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                                                <FileText size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                                                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.slate700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                    {attachmentName}
                                                                </span>
                                                                <span style={{ fontSize: '0.55rem', color: C.slate400, fontWeight: 600, flexShrink: 0 }}>
                                                                    (2.4 MB)
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => alert(`Downloading attachment: ${attachmentName}`)}
                                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px' }}
                                                                title="Download File"
                                                            >
                                                                <Download size={11} color={C.slate500} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Quick actions for Call/WhatsApp */}
                                                    {(item.type === 'Call' || item.type === 'WhatsApp') && (
                                                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
                                                        </div>
                                                    )}
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

            {/* ─── Edit Lead Modal ─────────────────────────────────────────────── */}
            {showEditModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 20, width: 440, maxWidth: '100%', padding: '20px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: C.slate950 }}>Edit Lead Details</h3>
                            <button onClick={() => setShowEditModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><X size={18} color={C.slate500} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Full Name *</label>
                                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Phone *</label>
                                <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Email</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>City</label>
                                    <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Requirement</label>
                                    <input value={editForm.requirement} onChange={e => setEditForm(p => ({ ...p, requirement: e.target.value }))} placeholder="e.g. 3BHK" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Budget</label>
                                    <input value={editForm.budget} onChange={e => setEditForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. 75L" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Status</label>
                                    <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}>
                                        <option value="Active">Active</option>
                                        <option value="Nurture">Nurture</option>
                                        <option value="Won">Won</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate700, display: 'block', marginBottom: 4 }}>Stage</label>
                                    <select value={editForm.stage} onChange={e => setEditForm(p => ({ ...p, stage: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}>
                                        {['New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveEdit} disabled={isSavingLead} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: C.indigo, color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                                {isSavingLead ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── More Options Action Sheet ──────────────────────────────────── */}
            {showMoreOptions && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 20, width: 360, maxWidth: '100%', padding: '16px 20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: C.slate950 }}>Lead Options</h3>
                            <button onClick={() => setShowMoreOptions(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><X size={16} color={C.slate500} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button
                                onClick={() => { setShowMoreOptions(false); setShowEditModal(true); }}
                                style={{ padding: '12px 14px', borderRadius: 12, background: C.slate50, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: C.slate800 }}
                            >
                                <Edit2 size={16} color={C.indigo} /> Edit Lead Details
                            </button>
                            <button
                                onClick={() => { setShowMoreOptions(false); setShowStageMenu(true); }}
                                style={{ padding: '12px 14px', borderRadius: 12, background: C.slate50, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: C.slate800 }}
                            >
                                <Target size={16} color={C.emerald} /> Change Lead Stage
                            </button>
                            <button
                                onClick={() => {
                                    if (contact?.phone) {
                                        navigator.clipboard.writeText(contact.phone);
                                        showToast('Phone number copied to clipboard!', 'success');
                                    }
                                    setShowMoreOptions(false);
                                }}
                                style={{ padding: '12px 14px', borderRadius: 12, background: C.slate50, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: C.slate800 }}
                            >
                                <Copy size={16} color={C.blue} /> Copy Phone Number
                            </button>
                            <button
                                onClick={() => {
                                    dialerEvents.call(contact.id, contact.phone, contact.name);
                                    setShowMoreOptions(false);
                                }}
                                style={{ padding: '12px 14px', borderRadius: 12, background: C.slate50, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: C.slate800 }}
                            >
                                <Phone size={16} color={C.emerald} /> Launch Call Dialer
                            </button>
                            <button
                                onClick={() => {
                                    setShowMoreOptions(false);
                                    setShowDeleteConfirm(true);
                                }}
                                style={{ padding: '12px 14px', borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 800, fontSize: '0.84rem', color: C.rose }}
                            >
                                <Trash2 size={16} color={C.rose} /> Delete Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
            {showDeleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 18, width: 380, maxWidth: '100%', padding: '24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#e11d48' }}>
                            <Trash2 size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 900, color: C.slate950 }}>Delete Lead?</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: C.slate500 }}>
                            Are you sure you want to delete <strong>"{contact?.name || 'this lead'}"</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleDeleteLead} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#e11d48', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Move Stage Selector Modal ──────────────────────────────────── */}
            {showStageMenu && (
                <div
                    onClick={() => setShowStageMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(10px)', padding: 16 }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'white', borderRadius: '24px', padding: '24px', width: 440, maxWidth: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: C.slate950 }}>Move Lead Stage</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.slate500, fontWeight: 700 }}>Current: <strong style={{ color: stageColor }}>{contact?.stage}</strong></p>
                            </div>
                            <button onClick={() => setShowStageMenu(false)} style={{ width: 32, height: 32, borderRadius: '10px', background: C.slate50, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={C.slate500} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
                            {['New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'].map(s => {
                                const isActive = contact?.stage === s;
                                const color = STAGE_DOT_COLORS[s] || C.indigo;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => { handleUpdateStage(s); setShowStageMenu(false); }}
                                        style={{
                                            padding: '12px 10px', borderRadius: '12px', border: '1.5px solid',
                                            borderColor: isActive ? color : '#f1f5f9',
                                            background: isActive ? `${color}15` : 'white',
                                            cursor: 'pointer', textAlign: 'center',
                                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                        }}
                                    >
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                                        <div style={{ fontSize: '0.72rem', fontWeight: isActive ? 900 : 700, color: isActive ? color : C.slate700 }}>{s}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
}
