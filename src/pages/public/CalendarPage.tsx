import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { followupsApi, siteVisitsApi, leadsApi } from '../../api/client';
import {
    ChevronLeft, ChevronRight, Plus, Phone, MapPin, Mail, Calendar,
    CheckCircle2, Share2, ExternalLink, Download, Smartphone,
    Search, Printer, Clock, X, CalendarDays, ArrowRight
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useMobile } from '../../hooks/useMobile';
import * as dateUtils from '../../utils/dateUtils';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM → 8 PM

const EVENT_TYPE = {
    Call: { color: '#3b63b8', bg: 'rgba(59,99,184,0.12)', icon: '📞' },
    Email: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '📧' },
    WhatsApp: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '💬' },
    'Site Visit': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🏠' },
    Meeting: { color: '#e11d48', bg: 'rgba(225,29,72,0.12)', icon: '🤝' },
};

// ═══════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════
function buildEvents(followups: any[], siteVisits: any[]) {
    const events: Record<string, any[]> = {};
    const addEvent = (dateStr: string, event: any) => {
        if (!dateStr) return;
        events[dateStr] = events[dateStr] || [];
        events[dateStr].push(event);
    };

    (followups || []).forEach(f => {
        const dateStr = f.scheduled_at ? dateUtils.formatSafeDateISO(f.scheduled_at) : f.date;
        const timeStr = f.scheduled_at ? dateUtils.formatSafeTime(f.scheduled_at) : f.time;
        addEvent(dateStr, {
            id: `fu-${f.id}`, type: f.type || 'Call',
            title: f.lead_name || f.leadName || 'Lead',
            time: timeStr, note: f.notes || f.note,
            priority: f.priority, status: f.status,
            agentName: f.agent_name || f.agentName || '',
            source: 'followup',
        });
    });

    (siteVisits || []).forEach(v => {
        const dateStr = v.scheduled_at ? dateUtils.formatSafeDateISO(v.scheduled_at) : v.date;
        const timeStr = v.scheduled_at ? dateUtils.formatSafeTime(v.scheduled_at) : v.time;
        addEvent(dateStr, {
            id: `sv-${v.id}`, type: 'Site Visit',
            title: v.lead_name || v.leadName || 'Lead',
            time: timeStr,
            note: `${v.project_name || v.projectName || ''} · ${v.transport || ''}`,
            priority: 'High', status: v.status,
            agentName: v.agent_name || v.agentName || '',
            source: 'sitevisit',
        });
    });

    return events;
}

function daysInMonth(year: number, month: number) {
    const d = dateUtils.getNow();
    d.setFullYear(year, month + 1, 0);
    d.setHours(0, 0, 0, 0);
    return d.getDate();
}

function firstWeekday(year: number, month: number) {
    const d = dateUtils.getNow();
    d.setFullYear(year, month, 1);
    d.setHours(0, 0, 0, 0);
    return d.getDay();
}

function toDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getEventStyles(ev: any, ec: any) {
    if (ev.status === 'Completed') {
        return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
    }
    return { bg: ec.bg || 'rgba(59,99,184,0.12)', color: ec.color || '#3b63b8' };
}

function getWeekDates(centerDate: Date): Date[] {
    const d = new Date(centerDate);
    const day = d.getDay();
    return Array.from({ length: 7 }, (_, i) => {
        const wd = new Date(d);
        wd.setDate(d.getDate() - day + i);
        wd.setHours(0, 0, 0, 0);
        return wd;
    });
}

function parseTimeToHour(timeStr: string | undefined): number {
    if (!timeStr) return -1;
    // Handle "10:30 AM", "2:00 PM", "14:30", etc.
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) return parseInt(match24[1]) + parseInt(match24[2]) / 60;

    const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match12) {
        let h = parseInt(match12[1]);
        const m = parseInt(match12[2]);
        const p = match12[3].toUpperCase();
        if (p === 'PM' && h !== 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        return h + m / 60;
    }
    return -1;
}

function formatHour(h: number): string {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
}

function formatWeekRange(dates: Date[]): string {
    const first = dates[0];
    const last = dates[6];
    if (first.getMonth() === last.getMonth()) {
        return `${MONTHS_SHORT[first.getMonth()]} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
    }
    return `${MONTHS_SHORT[first.getMonth()]} ${first.getDate()} – ${MONTHS_SHORT[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════════════
//  CALENDAR SKELETON (Loading State)
// ═══════════════════════════════════════════════════════════════════
function CalendarSkeleton({ isMobile }: { isMobile: boolean }) {
    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '0 12px' : '0 24px' }}>
            {/* Header skeleton */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <div style={{ width: 200, height: 28, borderRadius: 8, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                    <div style={{ width: 140, height: 16, borderRadius: 6, marginTop: 8, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {[120, 100, 90].map((w, i) => (
                        <div key={i} style={{ width: w, height: 36, borderRadius: 10, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>
            </div>
            {/* Pills skeleton */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {[80, 70, 90, 100, 80].map((w, i) => (
                    <div key={i} style={{ width: w, height: 30, borderRadius: 20, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
                ))}
            </div>
            {/* Grid skeleton */}
            <div style={{ display: 'flex', gap: 16 }}>
                <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ width: 180, height: 24, borderRadius: 6, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', margin: '0 auto' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-light)' }}>
                        {Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} style={{ background: 'white', minHeight: isMobile ? 65 : 100, padding: 8 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: `${(i % 7) * 0.05}s`, marginBottom: 8 }} />
                                {i % 3 === 0 && <div style={{ width: '80%', height: 14, borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />}
                            </div>
                        ))}
                    </div>
                </div>
                {!isMobile && (
                    <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[160, 200, 140].map((h, i) => (
                            <div key={i} className="card" style={{ height: h, padding: 18 }}>
                                <div style={{ width: '60%', height: 18, borderRadius: 6, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', marginBottom: 16 }} />
                                <div style={{ width: '90%', height: 12, borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', marginBottom: 8 }} />
                                <div style={{ width: '70%', height: 12, borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  EVENT POPOVER (Hover Details)
// ═══════════════════════════════════════════════════════════════════
function EventPopover({ event, position, onClose, onGoogleSync, onMarkDone }: {
    event: any;
    position: { top: number; left: number; direction: 'up' | 'down' };
    onClose: () => void;
    onGoogleSync: (ev: any) => void;
    onMarkDone: (ev: any) => void;
}) {
    const ec = EVENT_TYPE[event.type] || EVENT_TYPE.Meeting;
    const estyles = getEventStyles(event, ec);

    return (
        <div
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={onClose}
            style={{
                position: 'fixed',
                top: position.direction === 'down' ? position.top + 8 : 'auto',
                bottom: position.direction === 'up' ? `calc(100vh - ${position.top}px + 8px)` : 'auto',
                left: Math.min(position.left, window.innerWidth - 320),
                width: 300,
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)',
                border: '1px solid rgba(226,232,240,0.8)',
                zIndex: 5000,
                overflow: 'hidden',
                animation: 'calPopIn 0.2s ease',
            }}
        >
            {/* Header band */}
            <div style={{ padding: '14px 16px', background: estyles.bg, borderBottom: `2px solid ${estyles.color}20` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        {ec.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{event.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: estyles.bg, color: estyles.color, border: `1px solid ${estyles.color}20` }}>{event.type}</span>
                            {event.status === 'Completed' && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>✓ Done</span>}
                            {event.priority === 'High' && event.status !== 'Completed' && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>🔴 High</span>}
                        </div>
                    </div>
                </div>
            </div>
            {/* Details */}
            <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {event.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#475569' }}>
                            <Clock size={14} color="#94a3b8" /> {event.time}
                        </div>
                    )}
                    {event.agentName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#475569' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white', fontWeight: 800 }}>
                                {event.agentName.charAt(0).toUpperCase()}
                            </div>
                            {event.agentName}
                        </div>
                    )}
                    {event.note && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                            {event.note}
                        </div>
                    )}
                </div>
            </div>
            {/* Actions */}
            <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 6, borderTop: '1px solid #f1f5f9' }}>
                <button
                    onClick={() => onGoogleSync(event)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                >
                    <ExternalLink size={12} /> Google
                </button>
                {event.status !== 'Completed' && (
                    <button
                        onClick={() => onMarkDone(event)}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: '#10b981', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#059669'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#10b981'; }}
                    >
                        <CheckCircle2 size={12} /> Complete
                    </button>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  MINI CALENDAR (Sidebar)
// ═══════════════════════════════════════════════════════════════════
function MiniCalendar({ year, month, events, selectedDate, today, onSelectDate, onChangeMonth }: {
    year: number; month: number; events: Record<string, any[]>;
    selectedDate: string | null; today: string;
    onSelectDate: (d: string) => void; onChangeMonth: (dir: number) => void;
}) {
    const totalDays = daysInMonth(year, month);
    const startDay = firstWeekday(year, month);

    return (
        <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button onClick={() => onChangeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#94a3b8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                ><ChevronLeft size={14} /></button>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--navy-700)' }}>{MONTHS_SHORT[month]} {year}</div>
                <button onClick={() => onChangeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#94a3b8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                ><ChevronRight size={14} /></button>
            </div>
            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 4 }}>
                {DAYS_SHORT.map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', padding: '2px 0' }}>{d}</div>
                ))}
            </div>
            {/* Date grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: totalDays }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(year, month, day);
                    const hasEvents = (events[dateStr] || []).length > 0;
                    const isTd = dateStr === today;
                    const isSel = dateStr === selectedDate;

                    return (
                        <div key={day} onClick={() => onSelectDate(dateStr)} style={{
                            textAlign: 'center', padding: '3px 0', cursor: 'pointer',
                            position: 'relative', borderRadius: 6,
                            background: isSel ? '#2563eb' : isTd ? 'rgba(37,99,235,0.08)' : 'transparent',
                            transition: 'all 0.1s',
                        }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isTd ? 'rgba(37,99,235,0.08)' : 'transparent'; }}
                        >
                            <div style={{
                                fontSize: '0.72rem', fontWeight: isTd ? 800 : 600,
                                color: isSel ? 'white' : isTd ? '#2563eb' : '#475569',
                                lineHeight: '22px',
                            }}>{day}</div>
                            {hasEvents && (
                                <div style={{
                                    width: 4, height: 4, borderRadius: '50%',
                                    background: isSel ? 'rgba(255,255,255,0.8)' : '#f59e0b',
                                    margin: '-2px auto 0', 
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  QUICK-ADD FORM (FAB)
// ═══════════════════════════════════════════════════════════════════
function QuickAddForm({ selectedDate, today, onSubmit, onClose, leads }: {
    selectedDate: string | null; today: string;
    onSubmit: (data: any) => Promise<void>;
    onClose: () => void;
    leads: any[];
}) {
    const [form, setForm] = useState({
        lead_id: '',
        type: 'Call',
        scheduled_at: `${selectedDate || today}T10:00`,
        priority: 'High',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [leadSearch, setLeadSearch] = useState('');

    const filteredLeads = useMemo(() => {
        if (!leadSearch) return (leads || []).slice(0, 10);
        return (leads || []).filter(l => (l.name || '').toLowerCase().includes(leadSearch.toLowerCase())).slice(0, 10);
    }, [leads, leadSearch]);

    const handleSave = async () => {
        if (!form.lead_id) return;
        if (!form.scheduled_at) return;
        setSaving(true);
        try {
            await onSubmit({
                ...form,
                scheduled_at: dateUtils.parseSafe(form.scheduled_at)?.toISOString() || dateUtils.getNow().toISOString(),
            });
            onClose();
        } catch {
            // error handled by parent
        } finally {
            setSaving(false);
        }
    };

    const selectedLead = (leads || []).find(l => l.id === form.lead_id);

    return (
        <div style={{
            position: 'fixed', bottom: 90, right: 28,
            width: 360, background: 'white', borderRadius: 20,
            boxShadow: '0 24px 80px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.1)',
            border: '1px solid rgba(226,232,240,0.6)',
            zIndex: 4000, overflow: 'hidden',
            animation: 'calScaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '18px 20px', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Quick Schedule</div>
                        <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>New Follow-Up</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        <X size={16} />
                    </button>
                </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Lead search */}
                <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Lead</label>
                    {selectedLead ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{selectedLead.name}</div>
                            <button onClick={() => setForm({ ...form, lead_id: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}><X size={14} /></button>
                        </div>
                    ) : (
                        <div>
                            <input
                                type="text" placeholder="Search leads..." value={leadSearch}
                                onChange={e => setLeadSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
                            />
                            {filteredLeads.length > 0 && (
                                <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, background: 'white' }}>
                                    {filteredLeads.map(l => (
                                        <div key={l.id} onClick={() => { setForm({ ...form, lead_id: l.id }); setLeadSearch(''); }}
                                            style={{ padding: '7px 12px', fontSize: '0.82rem', cursor: 'pointer', borderBottom: '1px solid #f8fafc', fontWeight: 600 }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                                        >{l.name || l.email || l.phone}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Type + Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Type</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="form-control" style={{ fontSize: '0.82rem', borderRadius: 10, padding: '7px 10px' }}>
                            {Object.keys(EVENT_TYPE).map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Priority</label>
                        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="form-control" style={{ fontSize: '0.82rem', borderRadius: 10, padding: '7px 10px' }}>
                            {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                {/* DateTime */}
                <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Date & Time</label>
                    <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="form-control" style={{ fontSize: '0.82rem', borderRadius: 10, padding: '7px 10px' }} />
                </div>
                {/* Notes */}
                <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-control" rows={2} placeholder="Quick note..." style={{ fontSize: '0.82rem', borderRadius: 10, padding: '7px 10px', resize: 'none', fontFamily: 'inherit' }} />
                </div>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#64748b' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.lead_id} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: !form.lead_id ? '#cbd5e1' : '#0f172a', cursor: !form.lead_id ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.82rem', color: 'white', transition: 'all 0.15s' }}>
                    {saving ? 'Scheduling...' : 'Schedule'}
                </button>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function CalendarPage() {
    const { data: fuRes, loading: fuLoading, refetch: refetchFU } = useApi(() => followupsApi.list({ limit: 500 }));
    const { data: svRes, loading: svLoading, refetch: refetchSV } = useApi(() => siteVisitsApi.list({ limit: 500 }));
    const { data: leadsRes } = useApi(() => leadsApi.list({ limit: 1000 }));

    const followups = fuRes?.data || fuRes || [];
    const siteVisits = svRes?.data || svRes || [];
    const leads = leadsRes?.data || leadsRes || [];

    const now = dateUtils.getNow();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const isMobile = useMobile();
    const [view, setView] = useState(isMobile ? 'agenda' : 'month');
    const [filterType, setFilterType] = useState('All');
    const [draggingEvent, setDraggingEvent] = useState<any>(null);
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const [showSyncPortal, setShowSyncPortal] = useState(false);
    const { showToast } = useToast();

    // New enterprise states
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [popoverEvent, setPopoverEvent] = useState<any>(null);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; direction: 'up' | 'down' }>({ top: 0, left: 0, direction: 'down' });
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const popoverTimeout = useRef<any>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const isLoading = fuLoading && svLoading;

    // ── Keyboard Navigation ──────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't capture when typing in inputs
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (view === 'week') {
                    setWeekStart(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; });
                } else {
                    navigateMonth(-1);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (view === 'week') {
                    setWeekStart(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; });
                } else {
                    navigateMonth(1);
                }
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                goToToday();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedDate(null);
                setPopoverEvent(null);
                setShowQuickAdd(false);
                setShowSearch(false);
            } else if ((e.key === 'f' || e.key === 'F') && (e.ctrlKey || e.metaKey)) {
                // Don't override browser find
            } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setShowSearch(true);
                setTimeout(() => searchRef.current?.focus(), 100);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [view]);

    // ── Navigation helpers ───────────────────────────────────────
    const navigateMonth = useCallback((dir: number) => {
        setSlideDir(dir > 0 ? 'left' : 'right');
        setTimeout(() => setSlideDir(null), 300);
        if (dir > 0) {
            if (month === 11) { setMonth(0); setYear(y => y + 1); }
            else setMonth(m => m + 1);
        } else {
            if (month === 0) { setMonth(11); setYear(y => y - 1); }
            else setMonth(m => m - 1);
        }
    }, [month]);

    const goToToday = useCallback(() => {
        const now = dateUtils.getNow();
        setYear(now.getFullYear());
        setMonth(now.getMonth());
        setSelectedDate(toDateStr(now.getFullYear(), now.getMonth(), now.getDate()));
        setWeekStart(() => {
            const d = new Date(now);
            d.setDate(d.getDate() - d.getDay());
            d.setHours(0, 0, 0, 0);
            return d;
        });
    }, []);

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    // ── Google Calendar Sync ─────────────────────────────────────
    const addToGoogle = (event: any) => {
        const d = dateUtils.parseSafe(event.scheduled_at || event.date);
        if (!d) return;
        const start = d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const endD = dateUtils.getNow();
        endD.setTime(d.getTime() + 3600000);
        const end = endD.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.note || "")}`;
        window.open(url, "_blank");
    };

    // ── Mark Complete ────────────────────────────────────────────
    const markComplete = async (event: any) => {
        const id = event.id.replace(/^fu-|^sv-/, '');
        try {
            if (event.source === 'followup') {
                await followupsApi.update(id, { status: 'Completed' });
            } else {
                await siteVisitsApi.update(id, { status: 'Completed' });
            }
            showToast(`Marked "${event.title}" as complete`, 'success');
            refetchAll();
            setPopoverEvent(null);
        } catch (err: any) {
            showToast(err?.error || 'Failed to update', 'error');
        }
    };

    const refetchAll = () => { refetchFU(); refetchSV(); };

    // ── Drag & Drop ──────────────────────────────────────────────
    const handleDragStart = (e: any, ev: any) => {
        setDraggingEvent(ev);
        e.dataTransfer.setData('text/plain', ev.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: any) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: any, dateStr: string) => {
        e.preventDefault();
        if (!draggingEvent) return;
        const originalDate = draggingEvent.date;
        if (originalDate === dateStr) { setDraggingEvent(null); return; }
        const id = draggingEvent.id.replace(/^fu-|^sv-/, '');
        try {
            if (draggingEvent.source === 'followup') {
                await followupsApi.update(id, { scheduled_at: `${dateStr}T10:00:00Z` });
            } else {
                await siteVisitsApi.update(id, { scheduled_at: `${dateStr}T11:00:00Z` });
            }
            showToast(`Rescheduled ${draggingEvent.title} to ${dateStr}`, 'success');
            refetchAll();
        } catch (err: any) {
            showToast(err?.error || 'Failed to reschedule activity', 'error');
        } finally {
            setDraggingEvent(null);
            setDragOverDate(null);
        }
    };

    // ── Quick Add Submit ─────────────────────────────────────────
    const handleQuickAdd = async (data: any) => {
        try {
            await followupsApi.create(data);
            showToast('Follow-up scheduled successfully!', 'success');
            refetchAll();
        } catch (err: any) {
            showToast(err?.error || 'Failed to schedule follow-up', 'error');
            throw err;
        }
    };

    // ── Popover handlers ─────────────────────────────────────────
    const showPopover = (ev: any, target: HTMLElement) => {
        clearTimeout(popoverTimeout.current);
        const rect = target.getBoundingClientRect();
        const direction = rect.top > window.innerHeight / 2 ? 'up' : 'down';
        setPopoverPos({
            top: direction === 'down' ? rect.bottom : rect.top,
            left: rect.left,
            direction,
        });
        setPopoverEvent(ev);
    };

    const hidePopover = () => {
        popoverTimeout.current = setTimeout(() => setPopoverEvent(null), 200);
    };

    const keepPopover = () => {
        clearTimeout(popoverTimeout.current);
    };

    // ── Print handler ────────────────────────────────────────────
    const handlePrint = () => {
        window.print();
    };

    // ── ICS Export ────────────────────────────────────────────────
    const handleExportICS = () => {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthEvents = Object.entries(events)
            .filter(([d]) => d.startsWith(monthKey))
            .flatMap(([d, evs]) => (evs as any[]).map(e => ({ ...e, date: d })));

        if (monthEvents.length === 0) {
            showToast('No events to export this month', 'info');
            return;
        }

        const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ZentrixCRM//Calendar//EN"];
        monthEvents.forEach(ev => {
            const d = dateUtils.parseSafe(ev.date);
            if (!d) return;
            const start = d.toISOString().replace(/-|:|\.\d\d\d/g, "");
            const endD = new Date(d.getTime() + 3600000);
            const end = endD.toISOString().replace(/-|:|\.\d\d\d/g, "");
            lines.push("BEGIN:VEVENT", `SUMMARY:${ev.title} (${ev.type})`, `DTSTART:${start}`, `DTEND:${end}`, `DESCRIPTION:${ev.note || ''}`, "END:VEVENT");
        });
        lines.push("END:VCALENDAR");

        const blob = new Blob([lines.join("\r\n")], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zentrix-calendar-${monthKey}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${monthEvents.length} events as ICS`, 'success');
    };

    // ── Build Events ─────────────────────────────────────────────
    const events = buildEvents(followups, siteVisits);

    const totalDays = daysInMonth(year, month);
    const startDay = firstWeekday(year, month);
    const today = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

    const allEvents = Object.entries(events).flatMap(([date, evs]) => (evs as any[]).map(e => ({ ...e, date })));
    const filteredAllEvents = allEvents.filter(e => filterType === 'All' || e.type === filterType);

    // Search filtering
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return allEvents
            .filter(e => e.title.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q) || (e.agentName || '').toLowerCase().includes(q))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 15);
    }, [searchQuery, allEvents]);

    const searchHighlightDates = useMemo(() => new Set(searchResults.map(e => e.date)), [searchResults]);

    const upcomingEvents = filteredAllEvents
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
        .slice(0, 20);

    const totalThisMonth = Object.entries(events).filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).flatMap(([, ev]) => ev).length;
    const overdueCount = filteredAllEvents.filter(e => e.date < today && e.status !== 'Completed').length;

    // Week view data
    const weekDates = getWeekDates(weekStart);

    // ── Loading state ────────────────────────────────────────────
    if (isLoading) return <CalendarSkeleton isMobile={isMobile} />;

    // ═══════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '0 12px 100px' : '0 24px 24px', paddingTop: isMobile ? '16px' : '0' }}>
            {/* ─── Print Styles ─── */}
            <style>{`
                @keyframes calPopIn { from { opacity: 0; transform: scale(0.95) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes calScaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                @keyframes calSlideLeft { from { opacity: 0.6; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes calSlideRight { from { opacity: 0.6; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
                @media print {
                    body * { visibility: hidden; }
                    .cal-print-area, .cal-print-area * { visibility: visible; }
                    .cal-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .cal-no-print { display: none !important; }
                }
            `}</style>

            {/* ─── Premium Page Header ─── */}
            <div className="page-header cal-no-print" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, marginBottom: 8 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                        }}>
                            <CalendarDays size={20} color="white" />
                        </div>
                        <h1 className="page-title" style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', margin: 0, fontWeight: 950, letterSpacing: '-0.03em', color: 'var(--navy-900)' }}>
                            Calendar
                        </h1>
                    </div>
                    <p className="page-subtitle" style={{ margin: 0, paddingLeft: 52 }}>
                        {totalThisMonth} activities {isMobile ? '' : `in ${MONTHS[month]}`}
                        {overdueCount > 0 && <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}> · {overdueCount} overdue</span>}
                    </p>
                </div>
                <div className="page-actions" style={{ width: isMobile ? '100%' : 'auto', flexWrap: 'wrap', gap: 8, display: 'flex', alignItems: 'center' }}>
                    {/* Search toggle */}
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => { setShowSearch(!showSearch); setTimeout(() => searchRef.current?.focus(), 100); }}
                            style={{
                                width: showSearch ? (isMobile ? '100%' : 260) : 40, height: 40, borderRadius: showSearch ? 12 : 10,
                                border: '1px solid var(--border-medium)', background: 'white', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8, padding: showSearch ? '0 12px' : 0,
                                justifyContent: showSearch ? 'flex-start' : 'center', transition: 'all 0.25s ease', overflow: 'hidden',
                            }}>
                            <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                            {showSearch && (
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search events... (press /)"
                                    style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontFamily: 'inherit', flex: 1, background: 'transparent', fontWeight: 600, color: '#0f172a' }}
                                    onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
                                />
                            )}
                        </button>
                        {/* Search results dropdown */}
                        {showSearch && searchQuery && searchResults.length > 0 && (
                            <div style={{
                                position: 'absolute', top: 48, left: 0, width: 320,
                                background: 'white', borderRadius: 14, border: '1px solid #e2e8f0',
                                boxShadow: '0 12px 40px rgba(15,23,42,0.12)', zIndex: 3000,
                                maxHeight: 300, overflowY: 'auto',
                            }}>
                                <div style={{ padding: '8px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f1f5f9' }}>
                                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                                </div>
                                {searchResults.map((sr, i) => {
                                    const ec = EVENT_TYPE[sr.type] || EVENT_TYPE.Meeting;
                                    return (
                                        <div key={i} onClick={() => {
                                            const [y, m, d] = sr.date.split('-').map(Number);
                                            setYear(y); setMonth(m - 1); setSelectedDate(sr.date);
                                            setShowSearch(false); setSearchQuery('');
                                        }}
                                            style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                                        >
                                            <span style={{ fontSize: '1rem' }}>{ec.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{sr.title}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sr.date} · {sr.type}</div>
                                            </div>
                                            <ArrowRight size={14} color="#cbd5e1" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* View switcher */}
                    <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--border-radius-md)', padding: 3, gap: 3, flex: isMobile ? 1 : 'none' }}>
                        {['month', 'week', 'agenda'].map(v => (
                            <button key={v} onClick={() => setView(v)} style={{
                                flex: isMobile ? 1 : 'none',
                                padding: '5px 14px', borderRadius: 'var(--border-radius-sm)', border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', textTransform: 'capitalize',
                                background: view === v ? 'white' : 'transparent',
                                color: view === v ? 'var(--navy-600)' : 'var(--text-muted)',
                                boxShadow: view === v ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s',
                            }}>{v === 'month' ? '📅 Month' : v === 'week' ? '📆 Week' : '📋 Agenda'}</button>
                        ))}
                    </div>

                    {/* Today button */}
                    {!isCurrentMonth && view !== 'agenda' && (
                        <button onClick={goToToday} style={{
                            height: 40, padding: '0 16px', borderRadius: 10,
                            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            border: 'none', color: 'white', fontWeight: 700, fontSize: '0.82rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 2px 8px rgba(37,99,235,0.3)', transition: 'all 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
                        >
                            <Calendar size={14} /> Today
                        </button>
                    )}

                    {/* Sync + Print + Export */}
                    {!isMobile && (
                        <>
                            <button className="btn btn-secondary hover-lift" onClick={() => setShowSyncPortal(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid var(--border-medium)' }}>
                                <Share2 size={16} /> Sync
                            </button>
                            <button onClick={handleExportICS} style={{ height: 40, padding: '0 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid var(--border-medium)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#475569', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                            >
                                <Download size={14} /> ICS
                            </button>
                            <button onClick={handlePrint} style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid var(--border-medium)', cursor: 'pointer', color: '#475569', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                            >
                                <Printer size={16} />
                            </button>
                        </>
                    )}

                    <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}
                        style={{ width: isMobile ? '100%' : 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
                        <option value="All">All Types</option>
                        {Object.keys(EVENT_TYPE).map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* ─── Summary Pills ─── */}
            <div className="cal-no-print" style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                {Object.entries(EVENT_TYPE).map(([type, cfg]) => {
                    const cnt = filteredAllEvents.filter(e => e.type === type && e.date >= today).length;
                    return (
                        <div key={type} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px',
                            borderRadius: 20, background: filterType === type ? cfg.color : cfg.bg,
                            border: `1px solid ${cfg.color}30`,
                            fontSize: '0.78rem', fontWeight: 700,
                            color: filterType === type ? 'white' : cfg.color,
                            cursor: 'pointer', transition: 'all 0.15s',
                        }} onClick={() => setFilterType(filterType === type ? 'All' : type)}>
                            {cfg.icon} {type} <span style={{ fontWeight: 800 }}>{cnt}</span>
                        </div>
                    );
                })}
            </div>

            <div className="cal-print-area" style={{ display: 'flex', gap: 16, alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* ═══════════════════════════════════════════════════════
                    MONTH VIEW
                   ═══════════════════════════════════════════════════════ */}
                <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    {view === 'month' && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Month nav */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                                <button onClick={() => navigateMonth(-1)} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy-700)' }}>
                                    {MONTHS[month]} {year}
                                </div>
                                <button onClick={() => navigateMonth(1)} className="btn btn-ghost btn-sm btn-icon"><ChevronRight size={16} /></button>
                            </div>

                            {/* Day headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0, background: '#f8fafc', borderBottom: '1px solid var(--border-light)', padding: '10px 0' }}>
                                {DAYS.map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                                ))}
                            </div>

                            {/* Date grid */}
                            <div ref={gridRef} key={`${year}-${month}`} style={{
                                display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                                gap: '1px', background: 'var(--border-light)',
                                borderBottomLeftRadius: 'var(--border-radius-lg)', borderBottomRightRadius: 'var(--border-radius-lg)',
                                overflow: 'hidden',
                                animation: slideDir === 'left' ? 'calSlideLeft 0.25s ease' : slideDir === 'right' ? 'calSlideRight 0.25s ease' : 'none',
                            }}>
                                {Array.from({ length: startDay }).map((_, i) => (
                                    <div key={`e-${i}`} style={{ background: '#f8fafc', minHeight: isMobile ? 65 : 100 }} />
                                ))}
                                {Array.from({ length: totalDays }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = toDateStr(year, month, day);
                                    const dayEvents = (events[dateStr] || []).filter(e => filterType === 'All' || e.type === filterType);
                                    const isToday = dateStr === today;
                                    const isSelected = dateStr === selectedDate;
                                    const isWeekend = (startDay + i) % 7 === 0 || (startDay + i) % 7 === 6;
                                    const isPast = dateStr < today;
                                    const isSearchHit = searchHighlightDates.has(dateStr);

                                    return (
                                        <div key={day}
                                            onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                            onDragOver={handleDragOver}
                                            onDragEnter={() => draggingEvent && setDragOverDate(dateStr)}
                                            onDragLeave={() => setDragOverDate(null)}
                                            onDrop={(e) => handleDrop(e, dateStr)}
                                            style={{
                                                minHeight: isMobile ? 65 : 100, padding: isMobile ? '4px' : '8px',
                                                background: dragOverDate === dateStr ? 'rgba(59,99,184,0.08)'
                                                    : isSearchHit ? 'rgba(245,158,11,0.06)'
                                                    : isSelected ? 'rgba(99,102,241,0.04)'
                                                    : isToday ? 'rgba(37,99,235,0.04)' : 'white',
                                                boxShadow: isSelected ? 'inset 0 0 0 2px #2563eb'
                                                    : isSearchHit ? 'inset 0 0 0 2px #f59e0b'
                                                    : dragOverDate === dateStr ? 'inset 0 0 0 2px #3b82f6' : 'none',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                position: 'relative', zIndex: isSelected || dragOverDate === dateStr ? 10 : 1,
                                            }}
                                            onMouseEnter={e => { if (!isSelected && !draggingEvent) e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { if (!isSelected && !draggingEvent) e.currentTarget.style.background = isToday ? 'rgba(37,99,235,0.04)' : isSearchHit ? 'rgba(245,158,11,0.06)' : 'white'; }}
                                        >
                                            {/* Cell Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '2px 2px 0' }}>
                                                <div style={{
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: isToday ? '#2563eb' : 'transparent',
                                                    color: isToday ? 'white' : isWeekend ? '#ef4444' : isPast ? '#94a3b8' : '#1e293b',
                                                    fontSize: '0.8rem', fontWeight: isToday ? 800 : 700,
                                                }}>{day}</div>
                                                {dayEvents.length > 0 && (
                                                    <div style={{
                                                        minWidth: 18, height: 18, borderRadius: '50%',
                                                        background: '#f59e0b', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.68rem', fontWeight: 800, padding: '0 4px',
                                                        boxShadow: '0 1px 4px rgba(245,158,11,0.3)',
                                                    }}>{dayEvents.length}</div>
                                                )}
                                            </div>
                                            {/* Event items */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: isMobile ? 32 : 40 }}>
                                                {dayEvents.slice(0, isMobile ? 2 : 3).map((ev, j) => {
                                                    const ec = EVENT_TYPE[ev.type] || EVENT_TYPE.Meeting;
                                                    const estyles = getEventStyles(ev, ec);
                                                    return (
                                                        <div key={j} draggable="true"
                                                            onDragStart={(e) => handleDragStart(e, { ...ev, date: dateStr })}
                                                            onMouseEnter={(e) => { if (!isMobile) showPopover({ ...ev, date: dateStr }, e.currentTarget); }}
                                                            onMouseLeave={hidePopover}
                                                            style={{
                                                                fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px',
                                                                borderRadius: 5, background: estyles.bg, color: estyles.color,
                                                                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                                                cursor: 'grab', border: `1px solid ${estyles.color}15`,
                                                                opacity: draggingEvent?.id === ev.id ? 0.4 : 1,
                                                                transition: 'all 0.1s',
                                                            }}
                                                            title={`${ev.title} (${ev.type})`}
                                                        >
                                                            {isMobile ? ec.icon : `${ev.title} - ${ec.icon}`}
                                                        </div>
                                                    );
                                                })}
                                                {dayEvents.length > (isMobile ? 2 : 3) && (
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>
                                                        {isMobile ? `+${dayEvents.length - 2}` : `+${dayEvents.length - 3} more`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════
                        WEEK VIEW
                       ═══════════════════════════════════════════════════════ */}
                    {view === 'week' && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Week nav */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                                <button onClick={() => setWeekStart(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; })} className="btn btn-ghost btn-sm btn-icon">
                                    <ChevronLeft size={16} />
                                </button>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy-700)' }}>
                                    {formatWeekRange(weekDates)}
                                </div>
                                <button onClick={() => setWeekStart(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })} className="btn btn-ghost btn-sm btn-icon">
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Day headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ padding: '10px 0', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>TIME</div>
                                {weekDates.map((d, i) => {
                                    const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
                                    const isTd = ds === today;
                                    return (
                                        <div key={i} onClick={() => setSelectedDate(ds)} style={{
                                            padding: '8px 0', textAlign: 'center', cursor: 'pointer',
                                            borderLeft: '1px solid var(--border-light)',
                                        }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isTd ? '#2563eb' : '#94a3b8', textTransform: 'uppercase' }}>
                                                {DAYS[i]}
                                            </div>
                                            <div style={{
                                                fontSize: '1.1rem', fontWeight: 800,
                                                color: isTd ? 'white' : '#1e293b',
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: isTd ? '#2563eb' : 'transparent',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                margin: '2px auto 0',
                                            }}>{d.getDate()}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* All-day events bar */}
                            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border-light)', minHeight: 32 }}>
                                <div style={{ padding: '6px 4px', textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>ALL DAY</div>
                                {weekDates.map((d, i) => {
                                    const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
                                    const dayEvs = (events[ds] || []).filter(e => (filterType === 'All' || e.type === filterType) && parseTimeToHour(e.time) < 0);
                                    return (
                                        <div key={i} style={{ borderLeft: '1px solid var(--border-light)', padding: '4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {dayEvs.slice(0, 2).map((ev, j) => {
                                                const ec = EVENT_TYPE[ev.type] || EVENT_TYPE.Meeting;
                                                const estyles = getEventStyles(ev, ec);
                                                return (
                                                    <div key={j} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: estyles.bg, color: estyles.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                        onMouseEnter={e => { if (!isMobile) showPopover({ ...ev, date: ds }, e.currentTarget); }}
                                                        onMouseLeave={hidePopover}
                                                    >{ev.title}</div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Time grid */}
                            <div style={{ maxHeight: isMobile ? 400 : 560, overflowY: 'auto' }}>
                                {HOURS.map(h => (
                                    <div key={h} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: 48, borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', borderRight: '1px solid var(--border-light)' }}>
                                            {formatHour(h)}
                                        </div>
                                        {weekDates.map((d, i) => {
                                            const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
                                            const dayEvs = (events[ds] || []).filter(e => {
                                                if (filterType !== 'All' && e.type !== filterType) return false;
                                                const evHour = parseTimeToHour(e.time);
                                                return evHour >= h && evHour < h + 1;
                                            });
                                            const isNow = ds === today && Math.floor(now.getHours()) === h;
                                            return (
                                                <div key={i}
                                                    onDragOver={handleDragOver}
                                                    onDrop={e => handleDrop(e, ds)}
                                                    style={{
                                                        borderLeft: '1px solid #f1f5f9', padding: 3,
                                                        background: isNow ? 'rgba(37,99,235,0.03)' : 'transparent',
                                                        position: 'relative',
                                                    }}>
                                                    {isNow && <div style={{ position: 'absolute', left: 0, right: 0, top: `${(now.getMinutes() / 60) * 100}%`, height: 2, background: '#ef4444', zIndex: 2, borderRadius: 1 }} />}
                                                    {dayEvs.map((ev, j) => {
                                                        const ec = EVENT_TYPE[ev.type] || EVENT_TYPE.Meeting;
                                                        const estyles = getEventStyles(ev, ec);
                                                        return (
                                                            <div key={j} draggable="true"
                                                                onDragStart={e => handleDragStart(e, { ...ev, date: ds })}
                                                                onMouseEnter={e => { if (!isMobile) showPopover({ ...ev, date: ds }, e.currentTarget); }}
                                                                onMouseLeave={hidePopover}
                                                                style={{
                                                                    fontSize: '0.68rem', fontWeight: 700, padding: '3px 6px',
                                                                    borderRadius: 5, background: estyles.bg, color: estyles.color,
                                                                    borderLeft: `3px solid ${estyles.color}`,
                                                                    marginBottom: 2, cursor: 'grab',
                                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                }}
                                                                title={`${ev.title} (${ev.type}) ${ev.time || ''}`}
                                                            >
                                                                {ev.title} {ec.icon}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════
                        AGENDA VIEW
                       ═══════════════════════════════════════════════════════ */}
                    {view === 'agenda' && (
                        <div className="card">
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', fontWeight: 800, color: 'var(--navy-700)', fontSize: '1rem' }}>
                                📋 Upcoming — All Activities
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {upcomingEvents.length === 0 && (
                                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                                        <div className="empty-state-icon">📅</div>
                                        <div className="empty-state-title">No upcoming activities</div>
                                    </div>
                                )}
                                {upcomingEvents.map((e, i) => {
                                    const ec = EVENT_TYPE[e.type] || EVENT_TYPE.Meeting;
                                    const isFirstOfDate = i === 0 || upcomingEvents[i - 1].date !== e.date;
                                    return (
                                        <div key={e.id}>
                                            {isFirstOfDate && (
                                                <div style={{ padding: '10px 20px 4px', background: 'var(--slate-50)', borderTop: '1px solid var(--border-light)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--navy-600)', letterSpacing: '0.03em' }}>
                                                    {e.date === today ? '📍 Today' : e.date}
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px',
                                                borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s',
                                            }}
                                                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--slate-50)'}
                                                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10, background: ec.bg,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.1rem', flexShrink: 0,
                                                }}>{ec.icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{e.title}</span>
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: ec.bg, color: ec.color }}>{e.type}</span>
                                                        {e.priority === 'High' && <span className="badge badge-red" style={{ fontSize: '0.62rem' }}>🔴 High</span>}
                                                        {e.status === 'Completed' && <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>✓ Done</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.note}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-600)' }}>{e.time || '—'}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{e.agentName}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════
                    SIDEBAR
                   ═══════════════════════════════════════════════════════ */}
                <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Mini Calendar */}
                    {!isMobile && (
                        <MiniCalendar
                            year={year} month={month} events={events}
                            selectedDate={selectedDate} today={today}
                            onSelectDate={(d) => { setSelectedDate(d); const [y, m] = d.split('-').map(Number); setYear(y); setMonth(m - 1); }}
                            onChangeMonth={(dir) => navigateMonth(dir)}
                        />
                    )}

                    {/* Today's / Selected date activities */}
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 12, color: 'var(--navy-700)' }}>
                            {selectedDate ? (selectedDate === today ? "📍 Today's Activities" : `📅 ${selectedDate}`) : "📍 Today's Activities"}
                        </div>
                        {(() => {
                            const dayKey = selectedDate || today;
                            const dayEvs = (events[dayKey] || []).filter(e => filterType === 'All' || e.type === filterType);
                            if (dayEvs.length === 0) return (
                                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    No activities {selectedDate && selectedDate !== today ? 'on this day' : 'today'}
                                </div>
                            );
                            return dayEvs.map((ev, i) => {
                                const ec = EVENT_TYPE[ev.type] || EVENT_TYPE.Meeting;
                                return (
                                    <div key={i} style={{
                                        display: 'flex', gap: 10, padding: '10px 0',
                                        borderBottom: i < dayEvs.length - 1 ? '1px solid var(--border-light)' : 'none',
                                        alignItems: 'flex-start',
                                    }}>
                                        <div style={{ fontSize: '1.1rem', marginTop: 1 }}>{ec.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {ev.title}
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <span title="Add to Google Calendar" onClick={() => addToGoogle(ev)} style={{ cursor: 'pointer', display: 'inline-flex' }}><ExternalLink size={12} style={{ color: 'var(--slate-400)' }} /></span>
                                                    <span title="Sync to Phone" onClick={() => showToast('Syncing to phone...', 'success')} style={{ cursor: 'pointer', display: 'inline-flex' }}><Smartphone size={12} style={{ color: 'var(--slate-400)' }} /></span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ev.type} · {ev.time || 'TBD'}</div>
                                            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 1 }}>{ev.note}</div>
                                        </div>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: ev.status === 'Completed' ? 'rgba(16,185,129,0.1)' : ev.priority === 'High' ? 'rgba(244,63,94,0.1)' : 'var(--slate-100)', color: ev.status === 'Completed' ? 'var(--accent-emerald)' : ev.priority === 'High' ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                                            {ev.status === 'Completed' ? '✓' : ev.priority}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Activity Summary */}
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 12, color: 'var(--navy-700)' }}>📊 Activity Summary</div>
                        {Object.entries(EVENT_TYPE).map(([type, cfg]) => {
                            const cnt = filteredAllEvents.filter(e => e.type === type).length;
                            const done = filteredAllEvents.filter(e => e.type === type && e.status === 'Completed').length;
                            return (
                                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{type}</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color }}>{done}/{cnt}</span>
                                        </div>
                                        <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: cnt ? `${(done / cnt) * 100}%` : '0%', background: cfg.color, borderRadius: 2, transition: 'width 0.5s' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Overdue */}
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10, color: 'var(--navy-700)' }}>⚡ Overdue</div>
                        {filteredAllEvents.filter(e => e.date < today && e.status !== 'Completed').slice(0, 4).map((e, i) => {
                            const ec = EVENT_TYPE[e.type] || EVENT_TYPE.Meeting;
                            const daysDue = Math.floor(dateUtils.getDiffInDays(e.date, today));
                            return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                                    borderBottom: '1px solid var(--border-light)', fontSize: '0.8rem',
                                }}>
                                    <span style={{ fontSize: '0.9rem' }}>{ec.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{e.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.date}</div>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.1)', padding: '2px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                        {daysDue}d late
                                    </span>
                                </div>
                            );
                        })}
                        {filteredAllEvents.filter(e => e.date < today && e.status !== 'Completed').length === 0 && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>✅ All caught up!</div>
                        )}
                    </div>

                    {/* Keyboard shortcuts hint */}
                    {!isMobile && (
                        <div style={{ padding: '10px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Keyboard Shortcuts</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                                {[
                                    { key: '← →', label: 'Navigate' },
                                    { key: 'T', label: 'Today' },
                                    { key: '/', label: 'Search' },
                                    { key: 'Esc', label: 'Close' },
                                ].map(s => (
                                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: '#64748b' }}>
                                        <span style={{ padding: '1px 5px', borderRadius: 4, background: 'white', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.62rem', fontFamily: 'monospace' }}>{s.key}</span>
                                        {s.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Event Popover ─── */}
            {popoverEvent && (
                <div onMouseEnter={keepPopover} onMouseLeave={hidePopover}>
                    <EventPopover
                        event={popoverEvent}
                        position={popoverPos}
                        onClose={() => setPopoverEvent(null)}
                        onGoogleSync={addToGoogle}
                        onMarkDone={markComplete}
                    />
                </div>
            )}

            {/* ─── Quick-Add FAB ─── */}
            {!showQuickAdd && (
                <button onClick={() => setShowQuickAdd(true)} className="cal-no-print" style={{
                    position: 'fixed', bottom: 28, right: 28,
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                    border: 'none', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(15,23,42,0.3), 0 2px 8px rgba(15,23,42,0.15)',
                    zIndex: 3000, transition: 'all 0.2s',
                }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(15,23,42,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(15,23,42,0.3)'; }}
                >
                    <Plus size={24} />
                </button>
            )}
            {showQuickAdd && (
                <QuickAddForm
                    selectedDate={selectedDate}
                    today={today}
                    onSubmit={handleQuickAdd}
                    onClose={() => setShowQuickAdd(false)}
                    leads={leads}
                />
            )}

            {/* ─── Sync Matrix Portal ─── */}
            {showSyncPortal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSyncPortal(false)}>
                    <div className="card animate-scaleUp" style={{ width: 500, padding: 0, borderRadius: 24, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'var(--navy-900)', padding: '32px', color: 'white' }}>
                            <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Mobility Infrastructure</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 950, margin: 0 }}>Calendar Intelligence</h2>
                        </div>
                        <div style={{ padding: '32px' }}>
                            <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginBottom: 24, lineHeight: 1.6 }}>Sync your ZentrixCRM schedule with external platforms to receive real-time follow-up notifications directly on your mobile device.</p>

                            <div style={{ display: 'grid', gap: 16 }}>
                                <div className="hover-lift" style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--border-medium)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => showToast('ICS subscription link generated!', 'success')}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,99,184,0.1)', color: 'var(--navy-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smartphone size={24} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)' }}>Live ICS Feed</div>
                                        <div style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Subscribe from iPhone/Android for real-time sync.</div>
                                    </div>
                                    <Download size={18} color="var(--slate-300)" />
                                </div>

                                <div className="hover-lift" style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--border-medium)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => window.open('https://calendar.google.com', '_blank')}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(66,133,244,0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={24} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)' }}>Google Calendar</div>
                                        <div style={{ fontSize: '12px', color: 'var(--slate-400)' }}>One-click event deployment & two-way polling.</div>
                                    </div>
                                    <CheckCircle2 size={18} color="var(--accent-emerald)" />
                                </div>

                                <div className="hover-lift" style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--border-medium)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => showToast('Outlook Integration ready', 'info')}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,120,212,0.1)', color: '#0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Share2 size={24} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)' }}>Microsoft Outlook</div>
                                        <div style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Sync with enterprise calendar ecosystem.</div>
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '32px', height: 50, borderRadius: 14, background: 'var(--navy-900)', fontWeight: 800 }} onClick={() => setShowSyncPortal(false)}>Return to Calendar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
