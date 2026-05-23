import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { leadsApi, notificationsApi } from '../../api/client';
import { Search, Filter, Phone, Edit2, Users, Calendar, RotateCw, AlertCircle, Clock, ArrowRight, Sparkles, TrendingUp, Menu, Wand2 } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import * as dateUtils from '../../utils/dateUtils';
import { useToast } from '../../hooks/useToast';
import ContactPreviewSidebar from '../../components/shared/ContactPreviewSidebar';
import { Lead } from '../../types/api';


const NURTURE_REASONS = ['Budget issue', 'Timeline delay', 'No response', 'Inventory mismatch', 'Contacted - Follow up later', 'Looking for better options'];

export default function NurtureLeads() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [previewLeadId, setPreviewLeadId] = useState(null);
    const isMobile = useMobile();
    const [draftingId, setDraftingId] = useState(null);

    const generateAIDraft = async (lead: Lead) => {

        try {
            setDraftingId(lead.id);
            const res = await notificationsApi.nurtureDraft({ lead_id: lead.id, channel: 'WhatsApp' });
            if (res.draft) {
                await navigator.clipboard.writeText(res.draft);
                showToast('AI Smart-Draft copied to clipboard!', 'success');
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to generate AI draft', 'error');
        } finally {
            setDraftingId(null);
        }
    };

    useEffect(() => {
        const prev = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => { document.body.style.overflowX = prev; };
    }, []);

    const params = useMemo(() => {
        const p: Record<string, string | number> = { limit, page, status: 'Nurture' };

        if (search.trim()) p.q = search.trim();
        if (filterType === 'Due Today') p.nurture_due = 'true';
        else if (filterType === 'Overdue') p.nurture_overdue = 'true';
        return p;
    }, [limit, page, search, filterType]);

    const { data: leadsRes, loading, error, refetch } = useApi(
        useCallback(() => leadsApi.list(params), [params]),
        [params]
    );

    const leads = leadsRes?.data || [];

    const reactivateLead = async (id) => {
        try {
            await leadsApi.update(id, { status: 'Active' });
            showToast('Lead moved back to Active Pipeline', 'success');
            refetch();
        } catch (err: any) {
            showToast(err?.error || 'Failed to reactivate lead', 'error');
        }
    };

    const totalCount = leadsRes?.total || 0;
    const dueCount = leadsRes?.nurture?.due_today || 0;
    const overdueCount = leadsRes?.nurture?.overdue || 0;

    // Compute nurture age stats
    const nurtureStats = useMemo(() => {
        if (!leads.length) return { avgDays: 0, reengageReady: 0 };
        let totalDays = 0;
        let ready = 0;
        leads.forEach(l => {
            const days = l.created_at ? Math.floor(dateUtils.getDiffInDays(l.created_at)) : 0;
            totalDays += days;
            if (days >= 14) ready++;
        });
        return { avgDays: Math.round(totalDays / leads.length), reengageReady: ready };
    }, [leads]);

    return (
        <div className="animate-fadeIn" style={{ 
            paddingLeft: isMobile ? 16 : 0, 
            paddingRight: isMobile ? 16 : 20, 
            paddingBottom: 80 
        }}>
            {/* ─── Page Actions ─── */}
            <div style={{
                display: 'flex', 
                justifyContent: 'flex-end',
                alignItems: 'center', 
                marginBottom: 20, 
                gap: 10
            }}>
                <button className="btn btn-secondary btn-sm" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RotateCw size={14} className={loading ? 'animate-spin' : ''} /> <span style={{ fontSize: '0.75rem' }}>Refresh</span>
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/leads')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Users size={14} /> <span style={{ fontSize: '0.75rem' }}>Active Pipeline</span>
                </button>
            </div>

            {/* ─── KPI Strategy Cards ─── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
                gap: isMobile ? 8 : 20, 
                marginBottom: 32
            }}>
                {[
                    { id: 'All', label: 'Nurture Pool', value: totalCount, sub: 'Total Leads', icon: Users, color: '#7c3aed', bg: '#7c3aed08' },
                    { id: 'Due Today', label: 'Due Today', value: dueCount, sub: 'Action Required', icon: Clock, color: '#3b82f6', bg: '#3b82f608' },
                    { id: 'Overdue', label: 'Overdue', value: overdueCount, sub: 'Escalated', icon: AlertCircle, color: '#ef4444', bg: '#ef444408' },
                    { id: 'AvgAge', label: 'Avg. Nurture Age', value: `${nurtureStats.avgDays}d`, sub: 'Days in Pipeline', icon: TrendingUp, color: '#f59e0b', bg: '#f59e0b08' },
                    { id: 'Ready', label: 'Re-engage Ready', value: nurtureStats.reengageReady, sub: '14+ Days', icon: Sparkles, color: '#10b981', bg: '#10b98108' },
                ].filter(card => !isMobile || (card.id !== 'AvgAge' && card.id !== 'Ready')).map((card, i) => {
                    const isClickable = !['AvgAge', 'Ready'].includes(card.id);
                    const isActive = isClickable && filterType === card.id;
                    return (
                        <div
                            key={i}
                            onClick={isClickable ? () => setFilterType(card.id) : undefined}
                            style={{
                                padding: isMobile ? '10px 8px' : '10px 16px', borderRadius: 14, background: 'white',
                                border: `1px solid ${isActive ? card.color : 'var(--border-light)'}`,
                                boxShadow: isActive ? `0 4px 12px ${card.color}12` : '0 1px 3px rgba(0,0,0,0.02)',
                                cursor: isClickable ? 'pointer' : 'default',
                                transition: 'all 0.25s ease',
                                transform: isActive ? 'translateY(-1px)' : 'none',
                                textAlign: isMobile ? 'center' : 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: isMobile ? 'center' : 'space-between', 
                                alignItems: 'center', 
                                marginBottom: 4
                            }}>
                                <div style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 8, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <card.icon size={isMobile ? 12 : 14} color={card.color} />
                                </div>
                                {!isMobile && isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: card.color }} />}
                            </div>
                            <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 950, color: isActive ? card.color : 'var(--navy-900)', letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</div>
                        </div>
                    );
                })}

            </div>

            {/* ─── Search & Filter Bar ─── */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                marginBottom: 20,
                gap: 12
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    background: 'white', borderRadius: 12, border: '1px solid var(--border-light)',
                    width: isMobile ? '100%' : 340, boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                    <Search size={16} color="var(--slate-400)" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search leads, phones, agents..."
                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 500, color: 'var(--navy-900)', width: '100%' }}
                    />
                </div>
                {!isMobile && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-400)' }}>
                            {leads.length} of {totalCount} leads
                        </span>
                        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Filter size={14} /> Filters
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Data Content ─── */}
            {loading ? <PageLoader /> : error ? <PageError message={typeof error === 'string' ? error : 'Failed to load nurture data'} onRetry={refetch} /> : (
                isMobile ? (
                    /* Mobile Card View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {leads.map((lead: Lead) => (

                            <MobileNurtureCard 
                                key={lead.id} 
                                lead={lead} 
                                onReactivate={() => reactivateLead(lead.id)}
                                onClick={() => setPreviewLeadId(lead.id)}
                                onEdit={() => navigate(`/leads/${lead.id}`)}
                                draftingId={draftingId}
                                generateAIDraft={generateAIDraft}
                            />
                        ))}
                    </div>
                ) : (
                    /* Desktop Table View */
                    <div style={{
                        background: 'white', borderRadius: 20, overflow: 'hidden',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
                    }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: 'var(--slate-50)' }}>
                                    {['Lead Client', 'Stage', 'Nurture Reason', 'Reconnect Date', 'Assigned To', 'Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 24px', fontSize: '0.68rem', fontWeight: 800,
                                            color: 'var(--slate-400)', textTransform: 'uppercase',
                                            letterSpacing: '0.06em', textAlign: 'left',
                                            borderBottom: '1px solid var(--border-light)',
                                            position: 'sticky', top: 0, background: 'var(--slate-50)', zIndex: 5
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead, i) => {
                                    const isOverdue = lead.reconnect_date && dateUtils.isOverdue(lead.reconnect_date) && !dateUtils.isSameDay(lead.reconnect_date);
                                    const isDueToday = lead.reconnect_date && dateUtils.isSameDay(lead.reconnect_date);

                                    const lcReason = (lead.nurture_reason || '').toLowerCase();
                                    let pillCol = '#6366f1'; let pillBg = '#eef2ff';
                                    if (lcReason.includes('budget')) { pillCol = '#eab308'; pillBg = '#fefce8'; }
                                    else if (lcReason.includes('response')) { pillCol = '#f43f5e'; pillBg = '#fff1f2'; }
                                    else if (lcReason.includes('timeline') || lcReason.includes('later')) { pillCol = '#3b82f6'; pillBg = '#eff6ff'; }

                                    return (
                                        <tr
                                            key={lead.id}
                                            onClick={() => setPreviewLeadId(lead.id)}
                                            style={{
                                                cursor: 'pointer', transition: 'background 0.15s',
                                                borderBottom: i < leads.length - 1 ? '1px solid var(--border-light)' : 'none'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            {/* Lead Client */}
                                            <td style={{ padding: '14px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                                        background: `hsl(${(lead.id || '0').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360}, 55%, 50%)`,
                                                        color: 'white', fontWeight: 800, fontSize: '0.85rem',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>{lead.name?.[0]}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--navy-900)' }}>{lead.name}</div>
                                                        <div style={{ fontSize: '0.73rem', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                            <Phone size={10} /> {lead.phone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Stage */}
                                            <td style={{ padding: '14px 24px' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--navy-700)' }}>{lead.stage}</div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', marginTop: 2 }}>Prior Stage</div>
                                            </td>

                                            {/* Nurture Reason */}
                                            <td style={{ padding: '14px 24px' }}>
                                                <span style={{
                                                    fontSize: '0.68rem', fontWeight: 800, color: pillCol,
                                                    background: pillBg, border: `1px solid ${pillCol}25`,
                                                    padding: '4px 10px', borderRadius: 8,
                                                    textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap'
                                                }}>
                                                    {lead.nurture_reason || 'General Follow Up'}
                                                </span>
                                            </td>

                                            {/* Reconnect Date */}
                                            <td style={{ padding: '14px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                        background: isOverdue ? '#fef2f2' : isDueToday ? '#eff6ff' : 'var(--slate-50)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <Calendar size={13} color={isOverdue ? '#ef4444' : isDueToday ? '#3b82f6' : '#94a3b8'} />
                                                    </div>
                                                    <div>
                                                        <div style={{
                                                            fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap',
                                                            color: isOverdue ? '#dc2626' : 'var(--navy-900)'
                                                        }}>
                                                            {lead.reconnect_date && dateUtils.parseSafe(lead.reconnect_date)
                                                                ? dateUtils.formatCustom(lead.reconnect_date, { day: '2-digit', month: 'short', year: 'numeric' })
                                                                : 'Not Scheduled'}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                                                            color: isOverdue ? '#ef4444' : isDueToday ? '#3b82f6' : 'var(--slate-400)'
                                                        }}>
                                                            {isOverdue ? '⚠ Overdue' : isDueToday ? 'Due Today' : 'Scheduled'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Assigned To */}
                                            <td style={{ padding: '14px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                                                        background: 'var(--slate-100)', color: 'var(--navy-700)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '10px', fontWeight: 800, border: '1px solid var(--slate-200)'
                                                    }}>{lead.agent_name?.[0]}</div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-800)' }}>{lead.agent_name || 'Unassigned'}</span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '14px 24px' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => reactivateLead(lead.id)}
                                                        style={{
                                                            background: 'var(--accent-emerald)', color: 'white',
                                                            fontWeight: 800, fontSize: '0.72rem', padding: '6px 14px',
                                                            border: 'none', borderRadius: 8, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 5,
                                                            boxShadow: '0 2px 8px rgba(16,185,129,0.2)',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <ArrowRight size={12} /> Reactivate
                                                    </button>
                                                    <button
                                                        onClick={() => generateAIDraft(lead)}
                                                        disabled={draftingId === lead.id}
                                                        style={{
                                                            width: 32, height: 32, borderRadius: 8,
                                                            background: 'linear-gradient(135deg, #7c3aed15, #3b82f615)', 
                                                            border: '1px solid #7c3aed30',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: draftingId === lead.id ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease'
                                                        }}
                                                        title="Generate AI Smart-Draft"
                                                    >
                                                        <Wand2 size={13} className={draftingId === lead.id ? 'animate-pulse' : ''} color="#7c3aed" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                                        style={{
                                                            width: 32, height: 32, borderRadius: 8,
                                                            background: 'var(--slate-50)', border: '1px solid var(--border-light)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <Edit2 size={13} color="var(--slate-500)" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {leads.length === 0 && (
                        <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 20, background: '#7c3aed08',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px'
                            }}>
                                <RotateCw size={28} color="#7c3aed" style={{ opacity: 0.5 }} />
                            </div>
                            <h3 style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--navy-900)', marginBottom: 8 }}>No Nurture Leads Found</h3>
                            <p style={{ color: 'var(--slate-400)', fontSize: '0.88rem', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
                                Move stagnant leads from the active pipeline into the Nurture phase for long-term re-engagement tracking.
                            </p>
                            <button
                                onClick={() => navigate('/leads')}
                                className="btn btn-primary btn-sm"
                                style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                <ArrowRight size={14} /> Go to Pipeline
                            </button>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalCount > limit && (
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid var(--border-light)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-400)' }}>
                                Page {page} of {Math.ceil(totalCount / limit)}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border-light)',
                                        background: 'white', fontSize: '0.78rem', fontWeight: 700,
                                        cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1
                                    }}
                                >Previous</button>
                                <button
                                    disabled={page >= Math.ceil(totalCount / limit)}
                                    onClick={() => setPage(p => p + 1)}
                                    style={{
                                        padding: '16px 16px', borderRadius: 8, border: '1px solid var(--border-light)',
                                        background: 'var(--navy-900)', color: 'white', fontSize: '0.78rem', fontWeight: 700,
                                        cursor: page >= Math.ceil(totalCount / limit) ? 'not-allowed' : 'pointer'
                                    }}
                                >Next</button>
                            </div>
                        </div>
                    )}
                </div>
                )
            )}

            {/* Contact Preview Sidebar */}
            {previewLeadId && (
                <ContactPreviewSidebar
                    contactId={previewLeadId}
                    onClose={() => setPreviewLeadId(null)}
                />
            )}
        </div>
    );
}

function MobileNurtureCard({ lead, onReactivate, onClick, onEdit, draftingId, generateAIDraft }: { lead: Lead, onReactivate: () => void, onClick: () => void, onEdit: () => void, draftingId: string | number | null, generateAIDraft: (lead: Lead) => void }) {

    const isOverdue = lead.reconnect_date && dateUtils.isOverdue(lead.reconnect_date) && !dateUtils.isSameDay(lead.reconnect_date);
    const isDueToday = lead.reconnect_date && dateUtils.isSameDay(lead.reconnect_date);

    const lcReason = (lead.nurture_reason || '').toLowerCase();
    let pillCol = '#6366f1'; let pillBg = '#eef2ff';
    if (lcReason.includes('budget')) { pillCol = '#eab308'; pillBg = '#fefce8'; }
    else if (lcReason.includes('response')) { pillCol = '#f43f5e'; pillBg = '#fff1f2'; }
    else if (lcReason.includes('timeline') || lcReason.includes('later')) { pillCol = '#3b82f6'; pillBg = '#eff6ff'; }

    return (
        <div 
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
            }}
        >
            {/* Header: Name & ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `hsl(${(lead.id || '0').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360}, 55%, 50%)`,
                        color: 'white', fontWeight: 900, fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{lead.name?.[0]}</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)' }}>{lead.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontWeight: 600 }}>
                            <Phone size={10} strokeWidth={3} /> {lead.phone}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--navy-700)' }}>{lead.stage}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', marginTop: 2 }}>Prior Stage</div>
                </div>
            </div>

            {/* Mid: Reason & Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Reason</div>
                   <span style={{
                        fontSize: '0.65rem', fontWeight: 800, color: pillCol,
                        background: pillBg, border: `1px solid ${pillCol}25`,
                        padding: '3px 8px', borderRadius: 6,
                        textTransform: 'uppercase', letterSpacing: '0.02em'
                    }}>
                        {lead.nurture_reason || 'General'}
                    </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Reconnect</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <Calendar size={12} color={isOverdue ? '#ef4444' : isDueToday ? '#3b82f6' : '#94a3b8'} />
                        <span style={{
                            fontSize: '0.8rem', fontWeight: 900,
                            color: isOverdue ? '#dc2626' : 'var(--navy-900)'
                        }}>
                            {lead.reconnect_date && dateUtils.parseSafe(lead.reconnect_date) ? dateUtils.formatCustom(lead.reconnect_date, { day: '2-digit', month: 'short' }) : 'TBD'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer: Agent & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: 'var(--slate-100)', color: 'var(--navy-700)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 800, border: '1px solid var(--slate-200)'
                    }}>{lead.agent_name?.[0]}</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-800)' }}>{lead.agent_name || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onReactivate(); }}
                        style={{
                            background: 'var(--accent-emerald)', color: 'white',
                            fontWeight: 900, fontSize: '0.7rem', padding: '8px 16px',
                            border: 'none', borderRadius: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 10px rgba(16,185,129,0.2)'
                        }}
                    >
                        <ArrowRight size={14} /> Reactivate
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); generateAIDraft(lead); }}
                        disabled={draftingId === lead.id}
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'white', border: '1.5px solid #7c3aed40',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <Wand2 size={16} className={draftingId === lead.id ? 'animate-pulse' : ''} color="#7c3aed" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'white', border: '1px solid var(--border-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <Edit2 size={14} color="var(--slate-500)" />
                    </button>
                </div>
            </div>
        </div>
    );
}
