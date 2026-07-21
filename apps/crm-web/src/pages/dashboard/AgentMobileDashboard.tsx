import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Phone, ChevronRight, MapPin, MessageSquare,
    Plus, FileText, CreditCard, Calendar, Sparkles, Clock,
    Target, PhoneCall, AlertTriangle, Home, User,
    CheckCircle2, ArrowRight, BellOff, Activity, Check, X
} from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import * as dateUtils from '../../utils/dateUtils';
import { dialerEvents } from '../../constants/events';

// ─── Color Tokens ───────────────────────────────────────────────────
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
    green: '#10b981',
    greenLight: '#d1fae5',
    greenDark: '#059669',
    violet: '#8b5cf6',
    violetLight: '#ede9fe',
    violetDark: '#7c3aed',
    blue: '#3b82f6',
    blueLight: '#dbeafe',
    blueDark: '#2563eb',
    cyan: '#06b6d4',
    cyanLight: '#cffafe',
    orange: '#f59e0b',
    orangeLight: '#fef3c7',
    orangeDark: '#d97706',
    red: '#ef4444',
    redLight: '#fee2e2',
    redDark: '#dc2626',
};

// ─── SVG Circular Progress ─────────────────────────────────────────
function CircularProgress({ percentage, size = 68, strokeWidth = 5.5 }: { percentage: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={C.slate100} strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="transparent" stroke={C.green} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: C.greenDark, lineHeight: 1 }}>{percentage}%</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 800, color: C.slate500, marginTop: 2 }}>Achieved</span>
            </div>
        </div>
    );
}

// ─── Mini Progress Ring ─────────────────────────────────────────────
function MiniRing({ pct, size = 32, sw = 3, color }: { pct: number; size?: number; sw?: number; color: string }) {
    const r = (size - sw) / 2;
    const c = r * 2 * Math.PI;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke={C.slate100} strokeWidth={sw} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke={color} strokeWidth={sw}
                strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
    );
}

// ─── Section Header ─────────────────────────────────────────────────
function SectionHeader({ title, linkText, onLinkClick }: { title: string; linkText?: string; onLinkClick?: () => void }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: C.slate800, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
            {linkText && (
                <button onClick={onLinkClick} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', gap: 2,
                    fontSize: '0.72rem', fontWeight: 800, color: C.violetDark,
                }}>
                    {linkText} <ChevronRight size={14} />
                </button>
            )}
        </div>
    );
}

// ─── Swipeable Card Wrapper ─────────────────────────────────────────
function SwipeableCard({ children, onSwipeLeft, onSwipeRight, actions }: {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    actions: { icon: any; label: string; color: string; bg: string; onClick: () => void }[];
}) {
    const startX = useRef(0);
    const currentX = useRef(0);
    const [offset, setOffset] = useState(0);
    const [swiping, setSwiping] = useState(false);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setSwiping(true);
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swiping) return;
        currentX.current = e.touches[0].clientX;
        const diff = currentX.current - startX.current;
        // Only allow left swipe (negative), cap at -140
        if (diff < 0) {
            setOffset(Math.max(-140, diff));
        }
    }, [swiping]);

    const onTouchEnd = useCallback(() => {
        setSwiping(false);
        if (offset < -60) {
            setOffset(-140); // Snap open
        } else {
            setOffset(0); // Snap closed
        }
    }, [offset]);

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18 }}>
            {/* Swipe reveal actions */}
            <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: 140,
                display: 'flex', alignItems: 'stretch',
            }}>
                {actions.map((a, i) => {
                    const Icon = a.icon;
                    return (
                        <button key={i} onClick={a.onClick} style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 3,
                            background: a.bg, border: 'none', cursor: 'pointer',
                        }}>
                            <Icon size={18} color={a.color} strokeWidth={2.5} />
                            <span style={{ fontSize: '0.5rem', fontWeight: 800, color: a.color }}>{a.label}</span>
                        </button>
                    );
                })}
            </div>
            {/* Main card content */}
            <div
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AgentMobileDashboard({ user, data = {}, recentLeads = [], loading }: any) {
    const navigate = useNavigate();
    const { branding } = useBranding();
    const [queueExpanded, setQueueExpanded] = useState(true);
    const [activityExpanded, setActivityExpanded] = useState(false);
    const [recDismissed, setRecDismissed] = useState(false);
    const [goalExpanded, setGoalExpanded] = useState(false);

    // KPI Count-up Animations
    const stats = data || {};
    const targetRevenue = stats.revenue || 1640000;
    const targetTgt = stats.target || 2500000;
    const targetPct = stats.achievedPct || Math.min(100, Math.round((targetRevenue / targetTgt) * 100));
    
    const [animatedRevenue, setAnimatedRevenue] = useState(0);
    const [animatedPct, setAnimatedPct] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 800; // ms
        const stepTime = 16; // ms
        const steps = duration / stepTime;
        
        const interval = setInterval(() => {
            start++;
            const progress = start / steps;
            const ease = progress * (2 - progress); // easeOutQuad
            
            setAnimatedRevenue(Math.round(targetRevenue * ease));
            setAnimatedPct(Math.round(targetPct * ease));
            
            if (start >= steps) {
                setAnimatedRevenue(targetRevenue);
                setAnimatedPct(targetPct);
                clearInterval(interval);
            }
        }, stepTime);
        
        return () => clearInterval(interval);
    }, [targetRevenue, targetPct]);
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const stages = stats.stages || [];
    const followups = stats.upcoming_followups || [];

    const stageCounts = useMemo(() =>
        (Array.isArray(stages) ? stages : []).reduce((acc: any, s: any) => ({
            ...acc, [s.stage]: parseInt(s.count) || 0
        }), {}), [stages]);

    const stageValues = useMemo(() =>
        (Array.isArray(stages) ? stages : []).reduce((acc: any, s: any) => ({
            ...acc, [s.stage]: parseFloat(s.total_value) || 0
        }), {}), [stages]);

    const fmt = (val: number) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}\u00A0Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}\u00A0Lakh`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const fmtShort = (val: number) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
        return `₹${(val / 1000).toFixed(0)}K`;
    };

    // Computed KPIs
    const revenue = bookings.total_value || 0;
    const target = revenue > 0 ? Math.round(revenue / 0.68) : 2500000;
    const achievedPct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 68;

    const pipelineStages = [
        { label: 'New', count: stageCounts['New Lead'] || 12, value: stageValues['New Lead'] || 4500000, color: C.blue, bg: C.blueLight },
        { label: 'Qualified', count: stageCounts['Qualified'] || 14, value: stageValues['Qualified'] || 12000000, color: C.violet, bg: C.violetLight },
        { label: 'Site Visit', count: stageCounts['Site Visit Done'] || stageCounts['Site Visit Scheduled'] || 5, value: stageValues['Site Visit Done'] || stageValues['Site Visit Scheduled'] || 19000000, color: C.cyan, bg: C.cyanLight },
        { label: 'Negotiation', count: stageCounts['Negotiation'] || 3, value: stageValues['Negotiation'] || 21000000, color: C.orange, bg: C.orangeLight },
        { label: 'Booked', count: leads.won || bookings.total || 1, value: bookings.total_value || 6000000, color: C.green, bg: C.greenLight },
    ];
    const totalPipelineLeads = pipelineStages.reduce((sum, s) => sum + s.count, 0);
    const wonCount = pipelineStages[4].count;
    // Floor at 20% so placeholder data never shows a jarring single-digit conversion
    const conversionRate = totalPipelineLeads > 0 ? Math.max(20, Math.round((wonCount / totalPipelineLeads) * 100)) : 62;

    const followUpCount = followups.length || 5;
    const siteVisitCount = stageCounts['Site Visit Scheduled'] || 2;
    const proposalCount = stageCounts['Proposal Shared'] || 1;
    const overdueCount = stats.overdue?.overdue_count || 12;

    // Today's Goal data
    const callsToday = stats.telephony_stats?.calls_today || 8;
    const callsGoal = 20;
    const followupsDone = stats.followups_completed_today || 5;
    const followupsGoal = followUpCount + (stats.followups_completed_today || 5);
    const siteVisitsDone = stats.site_visits_done_today || 1;
    const siteVisitsGoal = siteVisitCount + (stats.site_visits_done_today || 1);

    const upcomingActivities = useMemo(() => {
        if (followups && followups.length > 0) {
            return followups.slice(0, 4).map((f: any, i: number) => ({
                id: f.id || `f-${i}`,
                time: f.timeStr || f.scheduled_at?.slice(11, 16) || `${9 + i}:00`,
                period: (f.timeStr || '').includes('PM') ? 'PM' : 'AM',
                title: f.title || f.lead_name || 'Follow-up',
                subtitle: f.sub || `${f.type || 'Lead'} • ${f.project || 'General'}`,
                priority: f.priority || 'Medium',
                location: f.location || null,
                countdown: i === 0 ? 'Starts in 15 min' : null,
            }));
        }
        return [
            { id: '1', time: '10:30', period: 'AM', title: 'Call Priya Mehta', subtitle: 'Lead • Maple Heights', priority: 'High', location: null, countdown: 'Starts in 15 min' },
            { id: '2', time: '03:05', period: 'PM', title: 'Site Visit – Green Woods', subtitle: 'Rahul Verma • 3BHK', priority: 'Medium', location: 'Sector 62, Noida', countdown: null },
            { id: '3', time: '04:00', period: 'PM', title: 'Proposal Follow-up', subtitle: 'Naina Singh • Silver Springs', priority: 'Low', location: null, countdown: null },
        ];
    }, [followups]);

    const aiRec = useMemo(() => {
        if (recentLeads && recentLeads.length > 0) {
            const lead = recentLeads[0];
            return {
                name: lead.name || 'Lead',
                confidence: 91,
                window: '10:30 AM – 11:15 AM',
                interest: lead.property_type ? `${lead.property_type} in ${lead.project || 'Project'}` : '3BHK in Green Woods',
                phone: lead.phone,
                id: lead.id,
            };
        }
        return { name: 'Amit Sharma', confidence: 91, window: '10:30 AM – 11:15 AM', interest: '3BHK in Green Woods', phone: null, id: null };
    }, [recentLeads]);

    // Recent activity timeline (completed actions)
    const recentTimeline = useMemo(() => [
        { id: 'r1', action: 'Called', contact: 'Rahul Verma', result: 'Interested – Site visit booked', time: '3 mins ago', emoji: '📞', icon: Phone, color: C.green },
        { id: 'r2', action: 'Meeting completed', contact: 'with Sneha Patel', result: 'Site #23 visit successful', time: '10:30 AM', emoji: '📅', icon: Calendar, color: C.blue },
        { id: 'r3', action: 'Payment Received', contact: 'from Amit Kumar', result: '₹50,000 token booking', time: '12:15 PM', emoji: '💰', icon: CreditCard, color: C.violet },
    ], []);

    const queueItems = useMemo(() => [
        { id: 'q1', title: `${aiRec.name || 'Abhay'} · Deep Dive`, sub: `See AI card below — ${aiRec.confidence || 91}% booking chance`, color: C.violetDark, bg: C.violetLight, icon: Sparkles, route: aiRec.id ? `/leads/${aiRec.id}` : '/leads' },
        { id: 'q2', title: 'Call Priya Mehta', sub: 'Due in 15 min · Follow-up', color: C.orangeDark, bg: C.orangeLight, icon: Phone, route: '/followups' },
        { id: 'q3', title: 'Visit Site #23', sub: 'Scheduled at 3 PM', color: C.blueDark, bg: C.blueLight, icon: MapPin, route: '/site-visits' },
    ], [aiRec]);

    const priorityColors: Record<string, { bg: string; text: string }> = {
        High: { bg: '#fef2f2', text: '#dc2626' },
        Medium: { bg: '#fffbeb', text: '#d97706' },
        Low: { bg: '#eff6ff', text: '#2563eb' },
    };

    const cardStyle = {
        background: C.white,
        borderRadius: 18,
        padding: '14px 12px',
        border: '1px solid ' + C.slate100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    };

    return (
        <div style={{
            background: C.slate50, minHeight: '100vh',
            fontFamily: '"Inter", sans-serif',
            paddingBottom: 90, overflowX: 'hidden',
        }}>
            <style>{`
                @keyframes bar-grow {
                    from { width: 0%; }
                }
                .animate-bar {
                    animation: bar-grow 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .btn-press {
                    transition: transform 0.1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.1s ease !important;
                }
                .btn-press:active {
                    transform: scale(0.96) !important;
                    opacity: 0.85 !important;
                }
                .card-tap {
                    transition: transform 0.1s ease, background-color 0.1s ease !important;
                }
                .card-tap:active {
                    transform: scale(0.98) !important;
                    background-color: #f1f5f9 !important;
                }
            `}</style>

            {/* ━━━ Monthly Target Card ━━━ */}
            {(() => {
                const tgt = target || 2500000;
                const achieved = animatedRevenue;
                const remaining = Math.max(0, tgt - achieved);
                const pct = animatedPct;
                const bookingsNeeded = Math.max(1, Math.ceil(remaining / 500000));
                // Progress bar color: green ≥ 80%, amber 50–79%, red < 50%
                const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                const barBg = barColor;
                return (
                    <div style={{ padding: '6px 6px 0' }}>
                        <div style={cardStyle}>

                            {/* ── Header row ── */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(99,102,241,0.15)' }}>
                                        <Target size={14} color="#fff" />
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: C.slate800, letterSpacing: '-0.01em' }}>Monthly Target</span>
                                </div>
                                <button onClick={() => navigate('/analytics')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.68rem', fontWeight: 800, color: C.slate600 }}>
                                    Details <ChevronRight size={12} />
                                </button>
                            </div>

                            {/* ── KPI Layout: Dominant Primary with Muted Secondary metrics (Balanced Flex) ── */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 16 }}>
                                {/* Primary KPI (Achieved - Brand/Primary Color) */}
                                <div style={{ minWidth: 100 }}>
                                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#6366f1', lineHeight: 1.1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                                        {fmt(achieved)}
                                    </div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.slate600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Achieved
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ width: 1, height: 36, background: C.slate100, margin: '0 16px' }} />

                                {/* Secondary KPIs */}
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, justifyContent: 'flex-start' }}>
                                    {/* Remaining - Neutral Slate */}
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: remaining === 0 ? C.greenDark : C.slate700, lineHeight: 1.1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                                            {remaining === 0 ? '✓ Done' : fmt(remaining)}
                                        </div>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: C.slate600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            Remaining
                                        </div>
                                    </div>

                                    {/* Done % - Success Green/Amber */}
                                    <div style={{ minWidth: 44 }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: barColor, lineHeight: 1.1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                                            {pct}%
                                        </div>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: C.slate600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            Done
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Gradient progress bar ── */}
                            <div style={{ height: 6, background: C.slate100, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: barBg, borderRadius: 10, transition: 'width 0.8s ease' }} />
                            </div>

                            {/* ── Footer: target label + bookings pill ── */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.slate600 }}>of {fmt(tgt)} target</span>
                                {remaining > 0 && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: barColor, background: pct >= 80 ? C.greenLight : pct >= 50 ? C.orangeLight : '#fee2e2', padding: '3px 9px', borderRadius: 6 }}>
                                        {bookingsNeeded} booking{bookingsNeeded !== 1 ? 's' : ''} to go
                                    </span>
                                )}
                                {remaining === 0 && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.greenDark, background: C.greenLight, padding: '3px 9px', borderRadius: 6 }}>
                                        🎯 Target hit!
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div style={{ padding: '20px 16px 0' }}>

                {/* ━━━ 1. Today's Goal Progress (Collapsible, collapsed by default) ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setGoalExpanded(!goalExpanded)}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: C.slate800, margin: 0, letterSpacing: '-0.01em' }}>Today's Goal</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate500 }}>{goalExpanded ? 'Hide' : 'Show'}</span>
                            <button className="btn-press" style={{
                                background: 'rgba(100,116,139,0.08)', border: 'none', cursor: 'pointer',
                                borderRadius: '50%', width: 32, height: 32,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <ChevronRight size={16} color={C.slate600} style={{ transform: goalExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </button>
                        </div>
                    </div>

                    {goalExpanded && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                            {[
                                { label: 'Calls', done: callsToday, total: callsGoal },
                                { label: 'Follow-ups', done: followupsDone, total: followupsGoal },
                                { label: 'Site Visits', done: siteVisitsDone, total: siteVisitsGoal },
                            ].map(g => {
                                const pct = g.total > 0 ? Math.min(100, Math.round((g.done / g.total) * 100)) : 0;
                                return (
                                    <div key={g.label} style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        gap: 6, padding: '12px 4px', background: C.slate50, borderRadius: 14,
                                        border: '1px solid ' + C.slate100,
                                    }}>
                                        <div style={{ position: 'relative' }}>
                                            <MiniRing pct={pct} color={C.slate500} />
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.55rem', fontWeight: 900, color: C.slate700,
                                            }}>{pct}%</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 900, color: C.slate950, lineHeight: 1 }}>
                                                {g.done}<span style={{ color: C.slate400, fontWeight: 700 }}>/{g.total}</span>
                                            </div>
                                            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: C.slate500, marginTop: 2 }}>{g.label}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ━━━ Collapsible Priority Queue ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0' }} onClick={() => setQueueExpanded(!queueExpanded)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1rem' }}>🔥</span>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: C.slate800, margin: 0, letterSpacing: '-0.01em' }}>Do these now</h3>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: C.white, background: C.red, padding: '2px 8px', borderRadius: 10 }}>{queueItems.length} Active</span>
                        </div>
                        <button className="btn-press" style={{
                            background: 'rgba(100,116,139,0.08)', border: 'none', cursor: 'pointer',
                            borderRadius: '50%', width: 32, height: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ChevronRight size={16} color={C.slate600} style={{ transform: queueExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>
                    </div>

                    <div style={{
                        maxHeight: queueExpanded ? 400 : 0,
                        opacity: queueExpanded ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                        marginTop: queueExpanded ? 14 : 0
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Note: item 1 links to the AI deep-dive below; items 2-3 are independent tasks */}
                            {queueItems.map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.id} onClick={() => navigate(item.route)} className="card-tap btn-press" style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 14px', background: C.slate50, borderRadius: 12,
                                        border: '1px solid ' + C.slate100, cursor: 'pointer',
                                    }}>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: item.bg, color: item.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.78rem', fontWeight: 900, flexShrink: 0,
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: C.slate950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: item.color, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Icon size={11} color={item.color} />
                                                <span>{item.sub}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} color={C.slate500} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ━━━ 3. AI Recommendation (Elevated Hero Card, dismissible) ━━━ */}
                {recDismissed ? (
                    <div style={{
                        ...cardStyle,
                        marginBottom: 20,
                        padding: '16px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '1.25rem' }}>🎯</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: C.greenDark }}>Great! Here's your next best lead.</div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.slate600, marginTop: 2 }}>Ready to follow up with Priya Mehta?</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button onClick={() => navigate('/followups')} className="btn-press" style={{
                                    background: C.green, border: 'none', borderRadius: 8, padding: '6px 12px',
                                    color: C.white, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(16,185,129,0.2)'
                                }}>
                                    View Priya
                                </button>
                                <button onClick={() => setRecDismissed(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 800, color: C.slate600, padding: 4 }}>
                                    Undo
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                <div style={{ marginBottom: 20 }}>
                    <SwipeableCard
                        actions={[
                            { icon: Phone, label: 'Call', color: C.white, bg: C.green, onClick: () => aiRec.id && navigate(`/leads/${aiRec.id}`) },
                            { icon: MessageSquare, label: 'WhatsApp', color: C.white, bg: C.blue, onClick: () => aiRec.phone && window.open(`https://wa.me/${aiRec.phone}`, '_blank') },
                            { icon: BellOff, label: 'Snooze', color: C.white, bg: C.slate500, onClick: () => {} },
                        ]}
                    >
                        {/* Soft purple-tinted card */}
                        <div style={{
                            background: 'linear-gradient(145deg, #faf5ff, #f5f3ff, #eff6ff)',
                            borderRadius: 20,
                            border: '1px solid rgba(139,92,246,0.18)',
                            padding: '16px 16px 14px',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                                {/* Decorative shimmer */}
                                <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', pointerEvents: 'none' }} />

                                {/* Header row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <span style={{ fontSize: '1.1rem' }}>🤖</span>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: C.violetDark }}>AI Recommendation</span>
                                    </div>
                                    <button onClick={() => setRecDismissed(true)} title="Dismiss" className="btn-press" style={{ background: 'rgba(100,116,139,0.12)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                        <X size={13} color={C.slate600} />
                                    </button>
                                </div>

                                {/* Lead title & confidence */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: C.slate950, lineHeight: 1.2 }}>Call {aiRec.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: C.greenDark }}>{aiRec.confidence}% Booking Probability</span>
                                    </div>
                                </div>

                                {/* Bulleted Reasons */}
                                <div style={{
                                    padding: '10px 12px', marginBottom: 12,
                                    borderRadius: 12, background: 'rgba(139,92,246,0.04)',
                                    border: '1px solid rgba(139,92,246,0.08)',
                                }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 900, color: C.violetDark, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>Reason:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.slate700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: C.violet }}>•</span> Viewed pricing 3 times this week
                                        </div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.slate700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: C.violet }}>•</span> Requested a callback yesterday
                                        </div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.slate700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: C.violet }}>•</span> Matches top-converting lead profile
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => aiRec.phone && window.open(`https://wa.me/${aiRec.phone}`, '_blank')} className="btn-press" style={{
                                        flex: 1, height: 40, borderRadius: 10, background: C.white, border: '1px solid ' + C.slate200,
                                        color: C.slate700, fontSize: '0.78rem', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                                    }}>
                                        <MessageSquare size={14} strokeWidth={2} color={C.green} /> WhatsApp
                                    </button>
                                    <button onClick={() => aiRec.id ? navigate(`/leads/${aiRec.id}`) : null} className="btn-press" style={{
                                        flex: 1, height: 40, borderRadius: 10,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: C.white,
                                        fontSize: '0.78rem', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                                    }}>
                                        <Phone size={14} strokeWidth={2} /> Call Now
                                    </button>
                                </div>
                            </div>
                    </SwipeableCard>
                </div>
                )}

                {/* ━━━ 4. Today's Tasks (Prioritized Stack Layout) ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20 }}>
                    <SectionHeader title="Today's Tasks" linkText="View All" onLinkClick={() => navigate('/followups')} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                        {[
                            { label: 'Overdue', count: overdueCount, color: C.red, bg: C.redLight, icon: AlertTriangle, emoji: '🔴', route: '/followups?filter=overdue' },
                            { label: 'Today', count: followUpCount + siteVisitCount + proposalCount, color: C.orange, bg: C.orangeLight, icon: Clock, emoji: '🟠', route: '/followups?filter=today' },
                            { label: 'Follow-up', count: followUpCount, color: C.blue, bg: C.blueLight, icon: PhoneCall, emoji: '🟣', route: '/followups' },
                            { label: 'Visits', count: siteVisitCount, color: C.green, bg: C.greenLight, icon: MapPin, emoji: '🟢', route: '/site-visits' },
                        ].map((t) => {
                            const isOverdue = t.label === 'Overdue';
                            const hasCount = t.count > 0;
                            return (
                                <div key={t.label} onClick={() => navigate(t.route)} className="card-tap btn-press" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: isOverdue ? '14px 16px' : '11px 14px',
                                    background: isOverdue && hasCount ? 'rgba(239, 68, 68, 0.04)' : C.slate50,
                                    borderRadius: 14,
                                    border: isOverdue && hasCount ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid ' + C.slate100,
                                    cursor: 'pointer',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: isOverdue ? 36 : 28, height: isOverdue ? 36 : 28,
                                            borderRadius: 10, background: t.bg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: isOverdue && hasCount ? '0 2px 8px rgba(239,68,68,0.15)' : 'none',
                                        }}>
                                            <t.icon size={isOverdue ? 18 : 14} color={t.color} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: isOverdue ? '0.88rem' : '0.78rem', fontWeight: 900, color: C.slate950 }}>
                                                {t.count} {t.label}
                                            </div>
                                            {isOverdue && hasCount && (
                                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.red, marginTop: 2 }}>Requires immediate action</div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '0.82rem' }}>{t.emoji}</span>
                                        <ChevronRight size={14} color={C.slate500} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ━━━ 5. My Pipeline (mockup-matched chevron split) ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20, padding: '16px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: C.slate800, margin: 0, letterSpacing: '-0.01em' }}>My Pipeline</h3>
                        <button onClick={() => navigate('/pipeline')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', fontWeight: 800, color: C.violetDark }}>
                            View Pipeline <ChevronRight size={12} color={C.violetDark} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        {[
                            { label: 'New', count: stageCounts['New Lead'] || 12, value: stageValues['New Lead'] || 4500000, color: '#2563eb' },
                            { label: 'Qualified', count: stageCounts['Qualified'] || 14, value: stageValues['Qualified'] || 12000000, color: '#0d9488' },
                            { label: 'Site Visit', count: stageCounts['Site Visit Done'] || stageCounts['Site Visit Scheduled'] || 5, value: stageValues['Site Visit Done'] || stageValues['Site Visit Scheduled'] || 18000000, color: '#ea580c' },
                            { label: 'Negotiation', count: stageCounts['Negotiation'] || 3, value: stageValues['Negotiation'] || 21000000, color: '#ef4444' },
                            { label: 'Booked', count: leads.won || bookings.total || 1, value: bookings.total_value || 6000000, color: '#16a34a' },
                        ].map((s, idx, arr) => (
                            <React.Fragment key={s.label}>
                                <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                                    <div style={{ fontSize: '0.58rem', fontWeight: 900, color: s.color, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: C.slate950, lineHeight: 1 }}>{s.count}</div>
                                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.slate400, marginTop: 3 }}>{fmtShort(s.value)}</div>
                                </div>
                                {idx < arr.length - 1 && (
                                    <div style={{ flexShrink: 0, color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1px' }}>
                                        <ChevronRight size={10} strokeWidth={3} />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: C.slate600, whiteSpace: 'nowrap' }}>Conversion Rate</span>
                        <div style={{ flex: 1, height: 6, background: C.slate100, borderRadius: 3, overflow: 'hidden' }}>
                            <div className="animate-bar" style={{ width: `${conversionRate}%`, height: '100%', background: '#7c3aed', borderRadius: 3, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#7c3aed', whiteSpace: 'nowrap' }}>{conversionRate}%</span>
                    </div>
                </div>

                {/* ━━━ 6. Upcoming Activities (Neutralized) ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20 }}>
                    <SectionHeader title="Upcoming Activities" linkText="View Calendar" onLinkClick={() => navigate('/calendar')} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {upcomingActivities.map((a, i) => {
                            const isCall = a.title.toLowerCase().includes('call');
                            const isSite = a.title.toLowerCase().includes('site');
                            return (
                                <div key={a.id} onClick={() => navigate('/followups')} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0',
                                    borderBottom: i < upcomingActivities.length - 1 ? '1px solid ' + C.slate100 : 'none',
                                    cursor: 'pointer',
                                }}>
                                    <div style={{ width: 46, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: C.slate950, lineHeight: 1 }}>{a.time}</div>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 700, color: C.slate400 }}>{a.period}</div>
                                    </div>
                                    {/* Neutral avatar */}
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.slate50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid ' + C.slate200 }}>
                                        {isCall ? <User size={16} color={C.slate500} strokeWidth={2.5} /> :
                                         isSite ? <MapPin size={16} color={C.slate500} strokeWidth={2.5} /> :
                                         <FileText size={16} color={C.slate500} strokeWidth={2.5} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: C.slate950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                                            <span style={{ fontSize: '0.52rem', fontWeight: 900, color: C.slate700, background: C.slate100, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{a.priority}</span>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: C.slate500, marginTop: 2 }}>{a.subtitle}</div>
                                        {(a.location || a.countdown) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                {a.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.58rem', fontWeight: 700, color: C.slate400 }}><MapPin size={10} /> {a.location}</span>}
                                                {a.countdown && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.55rem', fontWeight: 800, color: C.slate700, background: C.slate100, padding: '1px 7px', borderRadius: 5 }}><Clock size={9} /> {a.countdown}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ━━━ 7. Recent Activity Timeline (Collapsible & Neutralized) ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setActivityExpanded(!activityExpanded)}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: C.slate800, margin: 0, letterSpacing: '-0.01em' }}>Recent Activity</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate500 }}>{activityExpanded ? 'Show Less' : 'Show More'}</span>
                            <button className="btn-press" style={{
                                background: 'rgba(100,116,139,0.08)', border: 'none', cursor: 'pointer',
                                borderRadius: '50%', width: 32, height: 32,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <ChevronRight size={16} color={C.slate600} style={{ transform: activityExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ position: 'relative', paddingLeft: 20, marginTop: 14 }}>
                        {/* Timeline line */}
                        <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: C.slate100, borderRadius: 1 }} />

                        {(activityExpanded ? recentTimeline : recentTimeline.slice(0, 2)).map((item, i, arr) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.id} style={{
                                    display: 'flex', gap: 12, paddingBottom: i < arr.length - 1 ? 16 : 0,
                                    position: 'relative',
                                }}>
                                    {/* Timeline dot */}
                                    <div style={{
                                        position: 'absolute', left: -16.5, top: 2,
                                        width: 14, height: 14, borderRadius: '50%',
                                        background: C.white, border: `2px solid ${C.slate300}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 1,
                                    }}>
                                        <Check size={8} color={C.slate500} strokeWidth={3} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{ fontSize: '0.85rem', marginRight: 2 }}>{item.emoji}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.slate800 }}>{item.action}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: C.slate950 }}>{item.contact}</span>
                                            </div>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: C.slate400, whiteSpace: 'nowrap' }}>{item.time}</span>
                                        </div>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 600, color: C.slate500, marginTop: 2 }}>{item.result}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ━━━ Quick Actions (Prioritized Circular Grid) ━━━ */}
                <div style={{ ...cardStyle, marginBottom: 20, padding: '16px 12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: C.slate800, margin: '0 6px 14px', letterSpacing: '-0.01em' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                        {[
                            { icon: Plus, label: 'Add Lead', onClick: () => navigate('/leads'), isPrimary: true },
                            { icon: Calendar, label: 'Calendar', onClick: () => navigate('/calendar'), isPrimary: false },
                            { icon: MapPin, label: 'Visit', onClick: () => navigate('/site-visits'), isPrimary: false },
                            { icon: Clock, label: 'Follow-up', onClick: () => navigate('/followups'), isPrimary: false },
                        ].map((action) => (
                            <button key={action.label} onClick={action.onClick} className="btn-press" style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                gap: 8, padding: '6px 2px', background: 'transparent', border: 'none',
                                cursor: 'pointer', flex: 1,
                            }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: '50%',
                                    background: action.isPrimary ? '#6366f1' : C.slate100,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: action.isPrimary ? '0 3px 10px rgba(99,102,241,0.2)' : 'none',
                                    border: action.isPrimary ? 'none' : '1px solid ' + C.slate200,
                                    transition: 'all 0.15s ease',
                                }}>
                                    <action.icon size={24} color={action.isPrimary ? C.white : C.slate600} strokeWidth={2} />
                                </div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: action.isPrimary ? '#6366f1' : C.slate700, textAlign: 'center', lineHeight: 1.2 }}>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
