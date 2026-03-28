import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { followupsApi, siteVisitsApi } from '../api/client';
import { ChevronLeft, ChevronRight, Plus, Phone, MapPin, Mail, Calendar } from 'lucide-react';

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
    const { data: fuRes } = useApi(() => followupsApi.list({ limit: 500 }));
    const { data: svRes } = useApi(() => siteVisitsApi.list({ limit: 500 }));

    const followups = fuRes?.data || fuRes || [];
    const siteVisits = svRes?.data || svRes || [];

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const [view, setView] = useState('month');
    const [filterType, setFilterType] = useState('All');

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

    const allEvents = Object.entries(events).flatMap(([date, evs]) => evs.map(e => ({ ...e, date })));
    const filteredAllEvents = allEvents.filter(e => filterType === 'All' || e.type === filterType);



    const upcomingEvents = filteredAllEvents
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
        .slice(0, 20);

    const totalThisMonth = Object.entries(events).filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).flatMap(([, ev]) => ev).length;
    const overdueCount = filteredAllEvents.filter(e => e.date < today && e.status !== 'Completed').length;

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Calendar</h1>
                    <p className="page-subtitle">
                        {totalThisMonth} activities in {MONTHS[month]} · {filteredAllEvents.filter(e => e.date >= today).length} upcoming
                        {overdueCount > 0 && <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}> · ⚠️ {overdueCount} overdue</span>}
                    </p>
                </div>
                <div className="page-actions">
                    <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--border-radius-md)', padding: 3, gap: 3 }}>
                        {['month', 'agenda'].map(v => (
                            <button key={v} onClick={() => setView(v)} style={{
                                padding: '5px 14px', borderRadius: 'var(--border-radius-sm)', border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', textTransform: 'capitalize',
                                background: view === v ? 'white' : 'transparent',
                                color: view === v ? 'var(--navy-600)' : 'var(--text-muted)',
                                boxShadow: view === v ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s',
                            }}>{v === 'month' ? '📅 Month' : '📋 Agenda'}</button>
                        ))}
                    </div>
                    {/* Type filter */}
                    <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}
                        style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
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

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* ── Month Calendar ── */}
                <div style={{ flex: 1, minWidth: 0 }}>
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, padding: '8px 12px 0' }}>
                                {DAYS.map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
                                ))}
                            </div>

                            {/* Date grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 10px 12px' }}>
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
                                        <div key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                            style={{
                                                minHeight: 72, padding: '4px', borderRadius: 'var(--border-radius-md)',
                                                background: isSelected ? 'var(--navy-50)' : isToday ? 'rgba(59,99,184,0.04)' : 'transparent',
                                                border: `1.5px solid ${isSelected ? 'var(--navy-300)' : isToday ? 'var(--navy-200)' : 'transparent'}`,
                                                cursor: 'pointer', transition: 'all 0.12s',
                                            }}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--slate-50)'; }}
                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(59,99,184,0.04)' : 'transparent'; }}
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {dayEvents.slice(0, 3).map((ev, j) => {
                                                    const ec = EVENT_TYPE[ev.type] || EVENT_TYPE.Meeting;
                                                    return (
                                                        <div key={j} style={{
                                                            fontSize: '0.62rem', fontWeight: 700, padding: '1px 4px',
                                                            borderRadius: 3, background: ec.bg, color: ec.color,
                                                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                                        }}>{ec.icon} {ev.title}</div>
                                                    );
                                                })}
                                                {dayEvents.length > 3 && (
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>+{dayEvents.length - 3} more</div>
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
                <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 2 }}>{ev.title}</div>
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
                            const daysDue = Math.floor((new Date(today) - new Date(e.date)) / 86400000);
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
        </div>
    );
}
