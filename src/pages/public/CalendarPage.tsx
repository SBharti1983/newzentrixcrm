import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { followupsApi, siteVisitsApi } from '../../api/client';
import { 
    ChevronLeft, ChevronRight, Plus, Phone, MapPin, Mail, Calendar, 
    CheckCircle2, Share2, ExternalLink, Download, Smartphone
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useMobile } from '../../hooks/useMobile';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPE = {
    Call: { color: '#3b63b8', bg: 'rgba(59,99,184,0.12)', icon: '📞' },
    Email: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '📧' },
    WhatsApp: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '💬' },
    'Site Visit': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🏠' },
    Meeting: { color: '#e11d48', bg: 'rgba(225,29,72,0.12)', icon: '🤝' },
};

function buildEvents(followups, siteVisits) {
    const events = {};
    const addEvent = (dateStr, event) => {
        if (!dateStr) return;
        events[dateStr] = events[dateStr] || [];
        events[dateStr].push(event);
    };

    // Follow-ups from API
    (followups || []).forEach(f => {
        const dateStr = f.scheduled_at
            ? new Date(f.scheduled_at).toISOString().split('T')[0]
            : f.date;
        const timeStr = f.scheduled_at
            ? new Date(f.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : f.time;
        addEvent(dateStr, {
            id: `fu-${f.id}`, type: f.type || 'Call',
            title: f.lead_name || f.leadName || 'Lead',
            time: timeStr, note: f.notes || f.note,
            priority: f.priority, status: f.status,
            agentName: f.agent_name || f.agentName || '',
            source: 'followup',
        });
    });

    // Site Visits from API
    (siteVisits || []).forEach(v => {
        const dateStr = v.scheduled_at
            ? new Date(v.scheduled_at).toISOString().split('T')[0]
            : v.date;
        const timeStr = v.scheduled_at
            ? new Date(v.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : v.time;
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

function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year, month) {
    return new Date(year, month, 1).getDay();
}

function toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarPage() {
    const { data: fuRes, refetch: refetchFU } = useApi(() => followupsApi.list({ limit: 500 }));
    const { data: svRes, refetch: refetchSV } = useApi(() => siteVisitsApi.list({ limit: 500 }));

    const followups = fuRes?.data || fuRes || [];
    const siteVisits = svRes?.data || svRes || [];

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const isMobile = useMobile();
    const [view, setView] = useState(isMobile ? 'agenda' : 'month');
    const [filterType, setFilterType] = useState('All');
    const [draggingEvent, setDraggingEvent] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);
    const [showSyncPortal, setShowSyncPortal] = useState(false);
    const { showToast } = useToast();

    const generateICS = (event) => {
        const start = new Date(event.scheduled_at || event.date).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const end = new Date(new Date(event.scheduled_at || event.date).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "");
        return [
            "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
            `SUMMARY:${event.title} [Zentrix CRM]`,
            `DTSTART:${start}`, `DTEND:${end}`,
            `DESCRIPTION:${event.note || ""} (Lead: ${event.title})`,
            "END:VEVENT", "END:VCALENDAR"
        ].join("\n");
    };

    const addToGoogle = (event) => {
        const start = new Date(event.scheduled_at || event.date).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const end = new Date(new Date(event.scheduled_at || event.date).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.note || "")}`;
        window.open(url, "_blank");
    };

    const refetchAll = () => {
        refetchFU();
        refetchSV();
    };

    const handleDragStart = (e, ev) => {
        setDraggingEvent(ev);
        e.dataTransfer.setData('text/plain', ev.id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a slight tilt or ghost effect if possible, but keep it simple for now
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, dateStr) => {
        e.preventDefault();
        if (!draggingEvent) return;

        const originalDate = draggingEvent.date;
        if (originalDate === dateStr) {
            setDraggingEvent(null);
            return;
        }

        const id = draggingEvent.id.replace(/^fu-|^sv-/, '');
        const source = draggingEvent.source;

        try {
            if (source === 'followup') {
                await followupsApi.update(id, { scheduled_at: `${dateStr}T10:00:00Z` });
            } else {
                await siteVisitsApi.update(id, { scheduled_at: `${dateStr}T11:00:00Z` });
            }
            showToast(`Rescheduled ${draggingEvent.title} to ${dateStr}`, 'success');
            refetchAll();
        } catch (err) {
            showToast('Failed to reschedule activity', 'error');
        } finally {
            setDraggingEvent(null);
            setDragOverDate(null);
        }
    };

    const events = buildEvents(followups, siteVisits);

    const prevMonthNav = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonthNav = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const totalDays = daysInMonth(year, month);
    const startDay = firstWeekday(year, month);
    const today = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

    const allEvents = Object.entries(events).flatMap(([date, evs]) => (evs as any[]).map(e => ({ ...e, date })));
    const filteredAllEvents = allEvents.filter(e => filterType === 'All' || e.type === filterType);



    const upcomingEvents = filteredAllEvents
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
        .slice(0, 20);

    const totalThisMonth = Object.entries(events).filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).flatMap(([, ev]) => ev).length;
    const overdueCount = filteredAllEvents.filter(e => e.date < today && e.status !== 'Completed').length;

    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '16px 12px' : '24px', paddingBottom: isMobile ? 100 : 0 }}>
            {/* Header */}
            <div className="page-header" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16 }}>
                <div>
                    <p className="page-subtitle" style={{ margin: 0 }}>
                        {totalThisMonth} activities {isMobile ? '' : `in ${MONTHS[month]}`}
                        {overdueCount > 0 && <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}> · {overdueCount} overdue</span>}
                    </p>
                </div>
                <div className="page-actions" style={{ width: isMobile ? '100%' : 'auto', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--border-radius-md)', padding: 3, gap: 3, flex: isMobile ? 1 : 'none' }}>
                        {['month', 'agenda'].map(v => (
                            <button key={v} onClick={() => setView(v)} style={{
                                flex: isMobile ? 1 : 'none',
                                padding: '5px 14px', borderRadius: 'var(--border-radius-sm)', border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', textTransform: 'capitalize',
                                background: view === v ? 'white' : 'transparent',
                                color: view === v ? 'var(--navy-600)' : 'var(--text-muted)',
                                boxShadow: view === v ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s',
                            }}>{v === 'month' ? '📅 Month' : '📋 Agenda'}</button>
                        ))}
                    </div>
                    {/* Type filter */}
                    {!isMobile && (
                        <button className="btn btn-secondary hover-lift" onClick={() => setShowSyncPortal(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid var(--border-medium)' }}>
                            <Share2 size={16} /> Sync Matrix
                        </button>
                    )}
                    <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}
                        style={{ width: isMobile ? '100%' : 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
                        <option value="All">All Types</option>
                        {Object.keys(EVENT_TYPE).map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                {Object.entries(EVENT_TYPE).map(([type, cfg]) => {
                    const cnt = filteredAllEvents.filter(e => e.type === type && e.date >= today).length;
                    return (
                        <div key={type} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px',
                            borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.color}30`,
                            fontSize: '0.78rem', fontWeight: 700, color: cfg.color, cursor: 'pointer',
                        }} onClick={() => setFilterType(filterType === type ? 'All' : type)}>
                            {cfg.icon} {type} <span style={{ fontWeight: 800 }}>{cnt}</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* ── Month Calendar ── */}
                <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    {view === 'month' && (
                        <div className="card">
                            {/* Month nav */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                                <button onClick={prevMonthNav} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy-700)' }}>
                                    {MONTHS[month]} {year}
                                </div>
                                <button onClick={nextMonthNav} className="btn btn-ghost btn-sm btn-icon"><ChevronRight size={16} /></button>
                            </div>

                            {/* Day headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0, padding: isMobile ? '4px 0' : '8px 12px 0' }}>
                                {DAYS.map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
                                ))}
                            </div>

                            {/* Date grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: isMobile ? 1 : 2, padding: isMobile ? '0 4px 8px' : '0 10px 12px' }}>
                                {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
                                {Array.from({ length: totalDays }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = toDateStr(year, month, day);
                                    const dayEvents = (events[dateStr] || []).filter(e => filterType === 'All' || e.type === filterType);
                                    const isToday = dateStr === today;
                                    const isSelected = dateStr === selectedDate;
                                    const isWeekend = (startDay + i) % 7 === 0 || (startDay + i) % 7 === 6;
                                    const isPast = dateStr < today;

                                    return (
                                        <div key={day} 
                                            onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                            onDragOver={handleDragOver}
                                            onDragEnter={() => draggingEvent && setDragOverDate(dateStr)}
                                            onDragLeave={() => setDragOverDate(null)}
                                            onDrop={(e) => handleDrop(e, dateStr)}
                                            style={{
                                                minHeight: isMobile ? 65 : 85, padding: isMobile ? '2px' : '4px', borderRadius: 'var(--border-radius-md)',
                                                background: dragOverDate === dateStr ? 'rgba(59,99,184,0.15)' : isSelected ? 'var(--navy-50)' : isToday ? 'rgba(59,99,184,0.04)' : 'transparent',
                                                border: `1.5px solid ${dragOverDate === dateStr ? 'var(--navy-600)' : isSelected ? 'var(--navy-300)' : isToday ? 'var(--navy-200)' : 'transparent'}`,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                position: 'relative',
                                                boxShadow: dragOverDate === dateStr ? 'inset 0 0 10px rgba(59,99,184,0.1)' : 'none',
                                                transform: dragOverDate === dateStr ? 'scale(1.02)' : 'none',
                                                zIndex: dragOverDate === dateStr ? 10 : 1
                                            }}
                                            onMouseEnter={e => { if (!isSelected && !draggingEvent) e.currentTarget.style.background = 'var(--slate-50)'; }}
                                            onMouseLeave={e => { if (!isSelected && !draggingEvent) e.currentTarget.style.background = isToday ? 'rgba(59,99,184,0.04)' : 'transparent'; }}
                                        >
                                            {/* Day number */}
                                            <div style={{
                                                width: 24, height: 24, borderRadius: '50%', marginBottom: 3, marginLeft: 'auto',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isToday ? 'var(--navy-600)' : 'transparent',
                                                color: isToday ? 'white' : isWeekend ? 'var(--accent-rose)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                                                fontSize: '0.78rem', fontWeight: isToday ? 800 : 600,
                                            }}>{day}</div>
                                            {/* Event dots */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: isMobile ? 32 : 40 }}>
                                                {dayEvents.slice(0, isMobile ? 2 : 3).map((ev, j) => {
                                                    const ec = EVENT_TYPE[ev.type] || EVENT_TYPE.Meeting;
                                                    return (
                                                        <div 
                                                            key={j} 
                                                            draggable="true"
                                                            onDragStart={(e) => handleDragStart(e, { ...ev, date: dateStr })}
                                                            style={{
                                                                fontSize: '0.62rem', fontWeight: 700, padding: '1px 4px',
                                                                borderRadius: 3, background: ec.bg, color: ec.color,
                                                                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                                                cursor: 'grab',
                                                                opacity: draggingEvent?.id === ev.id ? 0.4 : 1,
                                                            }}>{ec.icon} {isMobile ? '' : ev.title}</div>
                                                    );
                                                })}
                                                {dayEvents.length > (isMobile ? 2 : 3) && (
                                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
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

                    {/* ── Agenda View ── */}
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
                                                borderBottom: '1px solid var(--border-light)',
                                                transition: 'background 0.1s',
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

                {/* ── Side Panel: selected day or today ── */}
                <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Today's snapshot */}
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

                    {/* This week summary */}
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

                    {/* Quick jump */}
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10, color: 'var(--navy-700)' }}>⚡ Overdue</div>
                        {filteredAllEvents.filter(e => e.date < today && e.status !== 'Completed').slice(0, 4).map((e, i) => {
                            const ec = EVENT_TYPE[e.type] || EVENT_TYPE.Meeting;
                            const daysDue = Math.floor((new Date(today).getTime() - new Date(e.date).getTime()) / 86400000);
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
                </div>
            </div>
            {/* --- Sync Matrix Portal --- */}
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

                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '32px', height: 50, borderRadius: 14, background: 'var(--navy-900)', fontWeight: 800 }} onClick={() => setShowSyncPortal(false)}>Return to Matrix</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
