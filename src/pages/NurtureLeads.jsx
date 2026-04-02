import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { leadsApi, usersApi } from '../api/client';
import { Search, Filter, Phone, Mail, Edit2, Trash2, X, Users, Calendar, RotateCw, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ContactPreviewSidebar from '../components/ContactPreviewSidebar';
import { dialerEvents } from '../constants/events';

const NURTURE_REASONS = ['Budget issue', 'Timeline delay', 'No response', 'Inventory mismatch', 'Contacted - Follow up later', 'Looking for better options'];

export default function NurtureLeads() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All'); // 'All', 'Due Today', 'Overdue'
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [previewLeadId, setPreviewLeadId] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

    // API params
    const params = useMemo(() => {
        const p = { limit, page, status: 'Nurture' };
        if (search.trim()) p.q = search.trim();
        
        if (filterType === 'Due Today') {
            p.nurture_due = 'true';
        } else if (filterType === 'Overdue') {
            p.nurture_overdue = 'true'; // I'll need to support this in the backend
        }
        
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
        } catch (err) {
            showToast(err.error || 'Failed to reactivate lead', 'error');
        }
    };

    const deleteLead = async (id) => {
        if (!window.confirm('Delete this lead?')) return;
        try {
            await leadsApi.delete(id);
            showToast('Lead deleted', 'success');
            refetch();
        } catch (err) {
            showToast(err.error || 'Failed to delete lead', 'error');
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-left">
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <RotateCw size={24} color="#7c3aed" /> Nurture Leads
                    </h1>
                    <p className="page-subtitle">Managing long-term follow-ups and re-engagement</p>
                </div>
                
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
                        <RotateCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/leads')}>
                        <Users size={15} /> Back to Pipeline
                    </button>
                </div>
            </div>

            {/* Strategy Bar / Tabs */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, marginTop: 8 }}>
                {[
                    { id: 'All', label: 'Total Nurture Pool', icon: Users, color: 'var(--navy-600)', bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', count: leadsRes?.total || 0, sub: 'Active in Nurture' },
                    { id: 'Due Today', label: 'Action Required', icon: Clock, color: 'var(--accent-blue)', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', count: leadsRes?.counts?.dueToday || 0, sub: 'Due Today' },
                    { id: 'Overdue', label: 'Escalated Leads', icon: AlertCircle, color: 'var(--accent-rose)', bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', count: leadsRes?.counts?.overdue || 0, sub: 'Overdue Follow-ups' }
                ].map(tab => {
                    const isActive = filterType === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setFilterType(tab.id)}
                            style={{
                                flex: 1, padding: '16px 20px', borderRadius: '16px', background: 'white',
                                border: `1px solid ${isActive ? tab.color : 'var(--border-light)'}`,
                                boxShadow: isActive ? `0 8px 24px ${tab.color}15` : 'var(--shadow-sm)',
                                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                                transform: isActive ? 'translateY(-2px)' : 'none'
                            }}
                        >
                            <div style={{ width: 48, height: 48, borderRadius: '12px', background: tab.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
                                <tab.icon size={22} color={tab.color} strokeWidth={2.5}/>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{tab.label}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: isActive ? tab.color : 'var(--navy-900)', lineHeight: 1 }}>{tab.count}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{tab.sub}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="search-bar" style={{ width: 320, background: 'white', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                    <Search size={16} style={{ color: 'var(--slate-400)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads, phones, or agents..." style={{ fontSize: '0.85rem', fontWeight: 500 }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" style={{ background: 'white', border: '1px solid var(--border-light)', color: 'var(--navy-700)' }}><Filter size={14}/> Advanced Filters</button>
                </div>
            </div>

            {/* Main Table */}
            {loading ? <PageLoader /> : error ? <PageError message={typeof error === 'string' ? error : 'Failed to load nurture data'} onRetry={refetch} /> : (
                <div className="table-wrapper" style={{ overflowX: 'auto', background: 'white', borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: 'var(--slate-50)' }}>
                                {['Lead Client', 'Dormancy Context', 'Reconnect Strategy', 'Assigned Rep', 'Manage'].map(h => (
                                    <th key={h} style={{ padding: '14px 24px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead, i) => {
                                const isOverdue = lead.reconnect_date && new Date(lead.reconnect_date) < new Date().setHours(0,0,0,0);
                                const isDueToday = lead.reconnect_date && new Date(lead.reconnect_date).toDateString() === new Date().toDateString();
                                
                                // Dynamic pill logic for reason
                                const lcReason = (lead.nurture_reason || '').toLowerCase();
                                let pillCol = '#6366f1'; let pillBg = '#eef2ff';
                                if (lcReason.includes('budget')) { pillCol = '#eab308'; pillBg = '#fefce8'; }
                                else if (lcReason.includes('response')) { pillCol = '#f43f5e'; pillBg = '#fff1f2'; }
                                else if (lcReason.includes('timeline') || lcReason.includes('later')) { pillCol = '#3b82f6'; pillBg = '#eff6ff'; }

                                return (
                                    <tr key={lead.id} onClick={() => setPreviewLeadId(lead.id)} style={{ cursor: 'pointer', transition: 'background 0.2s', background: 'white' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ padding: '16px 24px', borderBottom: i === leads.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div className="avatar" style={{ width: 36, height: 36, borderRadius: '10px', background: `hsl(${(lead.id || '0').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % 360}, 60%, 55%)`, color: 'white', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{lead.name?.[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-950)' }}>{lead.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                        <Phone size={10} style={{ color: 'var(--slate-400)' }}/> {lead.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', borderBottom: i === leads.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: pillCol, background: pillBg, border: `1px solid ${pillCol}30`, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                    {lead.nurture_reason || 'General Follow Up'}
                                                </span>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From Stage: <span style={{ color: 'var(--navy-600)', fontWeight: 800 }}>{lead.stage}</span></div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', borderBottom: i === leads.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: isOverdue ? '#fee2e2' : isDueToday ? '#dbeafe' : '#f1f5f9', border: `1px solid ${isOverdue ? '#fca5a5' : isDueToday ? '#bfdbfe' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Calendar size={16} color={isOverdue ? '#ef4444' : isDueToday ? '#3b82f6' : '#64748b'} strokeWidth={2.5}/>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isOverdue ? '#dc2626' : 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {new Date(lead.reconnect_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {isOverdue && <AlertCircle size={12} color="#dc2626" />}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isOverdue ? '#dc2626' : isDueToday ? '#2563eb' : 'var(--text-muted)' }}>
                                                        {isOverdue ? 'ACTION OVERDUE' : isDueToday ? 'ACTION DUE TODAY' : 'SCHEDULED RECONNECT'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', borderBottom: i === leads.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--slate-100)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, border: '1px solid var(--slate-200)', flexShrink: 0 }}>{lead.agent_name?.[0]}</div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-800)' }}>{lead.agent_name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', borderBottom: i === leads.length - 1 ? 'none' : '1px solid var(--border-light)' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <button className="btn btn-sm hover-lift" onClick={() => reactivateLead(lead.id)} style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #059669)', color: 'white', fontWeight: 800, fontSize: '0.75rem', padding: '6px 14px', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <RotateCw size={12} /> Reactivate
                                                </button>
                                                <button className="btn btn-ghost btn-sm btn-icon hover-lift" onClick={() => navigate(`/leads/${lead.id}`)} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}><Edit2 size={14} color="var(--navy-600)"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {leads.length === 0 && (
                        <div style={{ padding: '80px', textAlign: 'center', background: 'white' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '20px', opacity: 0.5 }}>🎐</div>
                            <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--navy-900)', marginBottom: 8 }}>No Nurture Leads Found</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>Use the main pipeline pipeline to move stagnant deals into the Nurture phase.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Sidebar for Preview */}
            {previewLeadId && (
                <ContactPreviewSidebar
                    contactId={previewLeadId}
                    onClose={() => setPreviewLeadId(null)}
                    refetch={refetch}
                />
            )}
        </div>
    );
}
