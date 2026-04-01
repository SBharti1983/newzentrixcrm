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
                        <RotateCw size={24} color="#7c3aed" /> Nurture Module
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
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[
                    { id: 'All', label: 'All Nurture', icon: Users, color: '#64748b', count: leadsRes?.total || 0 },
                    { id: 'Due Today', label: 'Due Today', icon: Clock, color: '#3b82f6', count: leadsRes?.counts?.dueToday || 0 },
                    { id: 'Overdue', label: 'Overdue', icon: AlertCircle, color: '#ef4444', count: leadsRes?.counts?.overdue || 0 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterType(tab.id)}
                        style={{
                            flex: 1, padding: '16px', borderRadius: '16px', background: 'white',
                            border: `2px solid ${filterType === tab.id ? tab.color : 'transparent'}`,
                            boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left'
                        }}
                    >
                        <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${tab.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <tab.icon size={20} color={tab.color} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tab.label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--navy-900)' }}>{tab.count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Leads</span></div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="card mb-4" style={{ padding: '12px 20px', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ width: 400, flex: 'none', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nurture leads..." style={{ background: 'transparent' }} />
                    </div>
                </div>
            </div>

            {/* Main Table */}
            {loading ? <PageLoader /> : error ? <PageError message={typeof error === 'string' ? error : 'Failed to load nurture data'} onRetry={refetch} /> : (
                <div className="table-wrapper" style={{ overflowX: 'auto', background: 'white', borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: 'var(--slate-50)' }}>
                                {['Lead Details', 'Nurture Intelligence', 'Reconnect Strategy', 'Agent', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '16px 20px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map(lead => {
                                const isOverdue = lead.reconnect_date && new Date(lead.reconnect_date) < new Date().setHours(0,0,0,0);
                                const isDueToday = lead.reconnect_date && new Date(lead.reconnect_date).toDateString() === new Date().toDateString();
                                
                                return (
                                    <tr key={lead.id} onClick={() => setPreviewLeadId(lead.id)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }} className="hover-row">
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="avatar avatar-sm" style={{ background: '#7c3aed', color: 'white', fontWeight: 900 }}>{lead.name?.[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>{lead.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} /> {lead.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>
                                                    {lead.nurture_reason || 'Follow up'}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Moved from: {lead.stage}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: isOverdue ? '#fef2f2' : isDueToday ? '#eff6ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Calendar size={18} color={isOverdue ? '#ef4444' : isDueToday ? '#3b82f6' : '#94a3b8'} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isOverdue ? '#ef4444' : 'var(--navy-900)' }}>
                                                        {new Date(lead.reconnect_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isOverdue ? '#ef4444' : isDueToday ? '#3b82f6' : 'var(--text-muted)' }}>
                                                        {isOverdue ? 'OVERDUE' : isDueToday ? 'DUE TODAY' : 'NEXT FOLLOW-UP'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{lead.agent_name?.[0]}</div>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lead.agent_name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-sm" onClick={() => reactivateLead(lead.id)} style={{ background: '#10b981', color: 'white', fontWeight: 800, fontSize: '0.75rem', padding: '6px 12px', border: 'none', borderRadius: '8px' }}>
                                                    <CheckCircle2 size={12} /> Reactivate
                                                </button>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(`/leads/${lead.id}`)}><Edit2 size={14} /></button>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteLead(lead.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {leads.length === 0 && (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎐</div>
                            <h3 style={{ fontWeight: 800, color: 'var(--navy-900)' }}>No Nurture Leads Found</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Adjust your filters or move leads to nurture from the main pipeline.</p>
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
