import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { leadsApi, projectsApi, usersApi, notificationsApi, channelPartnersApi } from '../api/client';
import { Plus, Search, Filter, Phone, Mail, Edit2, Trash2, X, Users, Tag, MessageSquare, Home, Handshake, Layout, Table, RotateCw } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ContactPreviewSidebar from '../components/ContactPreviewSidebar';
import { dialerEvents } from '../constants/events';

const STAGES = ['New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'];
const STAGE_COLORS = {
    'New Lead': 'badge-blue',
    'Connected': 'badge-indigo',
    'Qualified': 'badge-cyan',
    'Site Visit Scheduled': 'badge-teal',
    'Site Visit Done': 'badge-emerald',
    'Interested': 'badge-violet',
    'Proposal Shared': 'badge-fuchsia',
    'Negotiation': 'badge-amber',
    'Won': 'badge-green',
    'Lost': 'badge-red'
};
const STAGE_BG = {
    'New Lead': 'rgba(59, 130, 246, 0.08)',
    'Connected': 'rgba(99, 102, 241, 0.08)',
    'Qualified': 'rgba(6, 182, 212, 0.08)',
    'Site Visit Scheduled': 'rgba(20, 184, 166, 0.08)',
    'Site Visit Done': 'rgba(16, 185, 129, 0.08)',
    'Interested': 'rgba(124, 77, 255, 0.08)',
    'Proposal Shared': 'rgba(217, 70, 239, 0.08)',
    'Negotiation': 'rgba(245, 158, 11, 0.08)',
    'Won': 'rgba(34, 197, 94, 0.08)',
    'Lost': 'rgba(244, 63, 94, 0.08)'
};

const SOURCE_COLORS = {
    Website: 'badge-blue',
    Referral: 'badge-green',
    'Social Media': 'badge-violet',
    'Walk-in': 'badge-amber',
    'PropTech Portal': 'badge-cyan',
    'Google Ads': 'badge-rose',
    'WhatsApp': 'badge-emerald',
    'Facebook Ads': 'badge-blue',
    'Instagram Ads': 'badge-pink',
    'Zapier': 'badge-amber'
};
const SOURCES = ['Website', 'Referral', 'Social Media', 'Walk-in', 'PropTech Portal', 'Google Ads', 'WhatsApp', 'Facebook Ads', 'Instagram Ads', 'Zapier'];
const NURTURE_REASONS = ['Budget issue', 'Timeline delay', 'No response', 'Inventory mismatch', 'Contacted - Follow up later', 'Looking for better options'];

const DEFAULT_FORM = {
    name: '', email: '', phone: '', city: '', source: 'Website',
    stage: 'New Lead', status: 'Active', budget: '', property_type: '2BHK', project_id: '',
    assigned_to: '', channel_partner_id: '', notes: '', score: 50,
    nurture_reason: '', reconnect_date: '',
};

export default function Leads() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [filterStage, setFilterStage] = useState('All');
    const [filterSource, setFilterSource] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterNurtureDue, setFilterNurtureDue] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [saving, setSaving] = useState(false);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [previewLeadId, setPreviewLeadId] = useState(null);
    const fileInputRef = useRef(null);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState(null); // 'assign', 'stage', 'delete', 'message'
    const [bulkValue, setBulkValue] = useState('');
    const [bulkMessage, setBulkMessage] = useState({ subject: '', body: '', channel: 'WhatsApp' });
    const [bulkLoading, setBulkLoading] = useState(false);

    // API params — rebuild on filter change
    const params = useMemo(() => {
        const p = { limit, page };
        if (filterStage !== 'All') p.stage = filterStage;
        if (filterSource !== 'All') p.source = filterSource;
        if (filterStatus !== 'All') p.status = filterStatus;
        if (filterNurtureDue) p.nurture_due = 'true';
        if (search.trim()) p.q = search.trim();
        return p;
    }, [limit, page, filterStage, filterSource, filterStatus, search, filterNurtureDue]);

    const { data: leadsRes, loading, error, refetch } = useApi(
        useCallback(() => leadsApi.list(params), [params]),
        [filterStage, filterSource, filterStatus, search, page, limit]
    );

    // Reset selection and page when filtering changes
    useEffect(() => {
        setSelectedIds(new Set());
        setPage(1);
    }, [filterStage, filterSource, filterStatus, search, filterNurtureDue]);
    const { data: projects } = useApi(useCallback(() => projectsApi.list({ status: 'Active' }), []));
    const { data: users } = useApi(useCallback(() => usersApi.list(), []));
    const { data: channelPartners } = useApi(useCallback(() => channelPartnersApi.list(), []));

    const leads = leadsRes?.data || [];
    const agents = (users || []).filter(u => ['agent', 'sales_manager'].includes(u.role));

    const openAdd = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowModal(true); };
    const openEdit = (lead) => {
        setForm({
            name: lead.name, email: lead.email || '', phone: lead.phone || '',
            city: lead.city || '', source: lead.source, stage: lead.stage, status: lead.status || 'Active',
            budget: lead.budget || '', property_type: lead.property_type || '3BHK',
            project_id: lead.project_id || '', assigned_to: lead.assigned_to || '',
            channel_partner_id: lead.channel_partner_id || '',
            notes: lead.notes || '', score: lead.score,
            nurture_reason: lead.nurture_reason || '',
            reconnect_date: lead.reconnect_date ? lead.reconnect_date.split('T')[0] : '',
        });
        setEditingId(lead.id);
        setShowModal(true);
    };

    const saveLead = async () => {
        if (!form.name || !form.phone) { showToast('Name and phone are required', 'error'); return; }
        if (form.status === 'Nurture' && (!form.nurture_reason || !form.reconnect_date)) {
            showToast('Nurture reason and Reconnect date are mandatory', 'error');
            return;
        }
        setSaving(true);
        try {
            // Sanitize form: convert empty strings to null for optional/FK fields
            const sanitized = { ...form };
            ['email', 'city', 'budget', 'property_type', 'project_id', 'assigned_to', 'channel_partner_id', 'notes', 'reconnect_date', 'nurture_reason'].forEach(k => {
                if (sanitized[k] === '' || sanitized[k] === undefined) sanitized[k] = null;
            });
            // Ensure score is a valid number
            if (typeof sanitized.score !== 'number' || isNaN(sanitized.score)) sanitized.score = 50;

            if (editingId) {
                await leadsApi.update(editingId, sanitized);
                showToast('Lead updated successfully', 'success');
            } else {
                await leadsApi.create(sanitized);
                showToast('Lead added successfully', 'success');
            }
            setShowModal(false);
            // Await refetch so errors are caught here instead of crashing silently
            try {
                await refetch();
            } catch (_refetchErr) {
                // Refetch error is non-critical — useApi already sets error state
                console.warn('[Leads] Refetch after save failed, data will refresh on next interaction.');
            }
        } catch (err) {
            console.error('[Leads] Save error:', err);
            const rawMsg = typeof err === 'object' ? (err.error || err.message || JSON.stringify(err)) : String(err);
            const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
            showToast(msg || 'Failed to save lead', 'error');
        } finally {
            setSaving(false);
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

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction) return;
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        try {
            if (bulkAction === 'delete') {
                if (window.confirm(`Delete ${ids.length} selected leads?`)) {
                    await leadsApi.bulkDelete({ leadIds: ids });
                    showToast(`${ids.length} leads deleted`, 'success');
                }
            } else if (bulkAction === 'assign' && bulkValue) {
                await leadsApi.bulkUpdate({ leadIds: ids, updates: { assigned_to: bulkValue } });
                showToast(`${ids.length} leads reassigned`, 'success');
            } else if (bulkAction === 'stage' && bulkValue) {
                await leadsApi.bulkUpdate({ leadIds: ids, updates: { stage: bulkValue } });
                showToast(`${ids.length} leads moved to ${bulkValue}`, 'success');
            } else if (bulkAction === 'status' && bulkValue) {
                await leadsApi.bulkUpdate({ leadIds: ids, updates: { status: bulkValue } });
                showToast(`${ids.length} leads updated to status: ${bulkValue}`, 'success');
            } else if (bulkAction === 'message') {
                if (!bulkMessage.body) {
                    showToast('Message body is required', 'error');
                    setBulkLoading(false);
                    return;
                }
                const recipients = ids.map(id => leads.find(l => l.id === id)).filter(Boolean);
                const res = await notificationsApi.bulkSend({
                    channels: [bulkMessage.channel],
                    recipients: recipients,
                    subject: bulkMessage.subject,
                    body: bulkMessage.body
                });
                showToast(res.message, 'success');
            }
            setSelectedIds(new Set());
            setBulkAction(null);
            refetch();
        } catch (err) {
            showToast(err.error || 'Bulk operation failed', 'error');
        } finally {
            setBulkLoading(false);
        }
    };

    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            setBulkLoading(true);
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000/api') + '/leads/import', {
                method: 'POST',
                headers: { Authorization: `Bearer ${sessionStorage.getItem('zentrix_token')}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            showToast(`Imported ${data.imported} leads (${data.duplicates} duplicates skipped)`, 'success');
            refetch();
        } catch (err) {
            showToast(err.message || 'Failed to import leads', 'error');
        } finally {
            setBulkLoading(false);
            e.target.value = null;
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-left">
                    <h1 className="page-title">Lead Management</h1>
                    <p className="page-subtitle">{leadsRes?.total || 0} total leads</p>
                </div>
                

                <div className="page-actions">
                    <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn btn-secondary btn-sm" onClick={() => refetch()} title="Refresh Data">
                        <RotateCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={bulkLoading}>
                        <Filter size={14} /> Import
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={openAdd}>
                        <Plus size={15} /> Add Lead
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4" style={{ padding: '12px 20px', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ width: 340, flex: 'none', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads by name, city, budget..." style={{ background: 'transparent' }} />
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-control form-control-sm" style={{ width: 130 }} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
                            <option value="All">All Stages</option>
                            {STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <select className="form-control form-control-sm" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Nurture">Nurture</option>
                            <option value="Won">Won</option>
                            <option value="Lost">Lost</option>
                        </select>
                        <select className="form-control form-control-sm" style={{ width: 160 }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                            <option value="All">All Sources</option>
                            {SOURCES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>

                    <button 
                        className={`btn btn-sm ${filterNurtureDue ? 'btn-primary' : 'btn-ghost'}`} 
                        style={{ color: filterNurtureDue ? 'white' : 'var(--accent-rose)', fontWeight: 700 }}
                        onClick={() => setFilterNurtureDue(!filterNurtureDue)}
                    >
                        🎯 Nurture Due
                    </button>
                    
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
                        <Filter size={14} /> Filters
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {loading ? <PageLoader /> : error ? <PageError message={typeof error === 'string' ? error : 'Failed to load data'} onRetry={refetch} /> : (
                <>
                {leads.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-title">No leads found</div>
                        <div className="empty-state-text">Try adjusting filters or add a new lead.</div>
                    </div>
                ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto', background: 'white', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '1000px', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 40, paddingRight: 0 }}>
                                        <input
                                            type="checkbox"
                                            checked={leads.length > 0 && selectedIds.size === leads.length}
                                            onChange={toggleSelectAll}
                                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                        />
                                    </th>
                                    {['Lead', 'Contact', 'Status', 'Stage', 'Source', 'Budget', 'Score', 'Assigned To', 'Last Contact', 'Actions'].map((h, i) => {
                                        const widths = {
                                            'Lead': '170px',
                                            'Contact': '170px',
                                            'Status': '75px',
                                            'Stage': '95px',
                                            'Source': '85px',
                                            'Budget': '85px',
                                            'Score': '55px',
                                            'Assigned To': '100px',
                                            'Last Contact': '125px',
                                            'Actions': '135px'
                                        };
                                        const isSticky = h === 'Actions';
                                        return (
                                            <th key={h} style={{ 
                                                width: widths[h] || 'auto',
                                                minWidth: widths[h] || 'auto',
                                                textAlign: 'center',
                                                padding: '12px 10px',
                                                fontSize: '0.75rem',
                                                textTransform: 'uppercase',
                                                fontWeight: 800,
                                                color: 'var(--slate-500)',
                                                borderBottom: '1px solid var(--border-light)',
                                                background: 'var(--slate-50)',
                                                position: isSticky ? 'sticky' : 'static',
                                                right: isSticky ? 0 : 'auto',
                                                zIndex: isSticky ? 30 : 1,
                                                boxShadow: isSticky ? '-4px 0 8px rgba(0,0,0,0.06)' : 'none',
                                                whiteSpace: 'nowrap'
                                            }}>{h}</th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map(lead => {
                                    const leadScore = typeof lead.score === 'number' ? lead.score : 0;
                                    return (
                                    <tr
                                        key={lead.id}
                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                        onMouseEnter={() => setHoveredRow(lead.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        style={{ cursor: 'pointer', background: selectedIds.has(lead.id) ? 'var(--navy-50)' : undefined }}
                                    >
                                        <td onClick={e => e.stopPropagation()} style={{ paddingRight: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(lead.id)}
                                                onChange={() => toggleSelect(lead.id)}
                                                style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="avatar avatar-sm" style={{ background: `hsl(${(String(lead.name || '#')).charCodeAt(0) * 47 + 180}, 60%, 55%)`, flexShrink: 0 }}>
                                                    {String(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('')}
                                                </div>
                                                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ 
                                                        height: 18, 
                                                        opacity: hoveredRow === lead.id ? 1 : 0, 
                                                        visibility: hoveredRow === lead.id ? 'visible' : 'hidden',
                                                        transition: 'all 0.15s ease',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPreviewLeadId(lead.id); }}
                                                            style={{ 
                                                                background: '#ffffff', 
                                                                border: '1px solid #cbd6e2', 
                                                                borderRadius: 4, 
                                                                padding: '1px 6px', 
                                                                fontSize: '10px', 
                                                                color: '#516f90', 
                                                                cursor: 'pointer',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                lineHeight: '1'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f5f8fa'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                                        >
                                                            Preview
                                                        </button>
                                                    </div>
                                                    <div 
                                                        data-tooltip={lead.name || ''}
                                                        style={{ 
                                                            fontWeight: 700, 
                                                            fontSize: '0.85rem', 
                                                            whiteSpace: 'nowrap', 
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            color: 'var(--navy-900)'
                                                        }}
                                                    >
                                                        {lead.name || '—'}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {lead.property_type || '—'} · {lead.project_name?.split(' ')[0] || 'Any'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span style={{ 
                                                        color: 'var(--text-secondary)', 
                                                        overflowWrap: 'anywhere',
                                                        lineHeight: 1.1,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>{lead.email || '—'}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Phone size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{lead.phone || '—'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 600, 
                                                padding: '3px 8px', 
                                                borderRadius: 12, 
                                                background: lead.status === 'Won' ? '#dcfce7' : lead.status === 'Lost' ? '#ffe4e6' : lead.status === 'Nurture' ? '#f3e8ff' : '#f1f5f9',
                                                color: lead.status === 'Won' ? '#166534' : lead.status === 'Lost' ? '#9f1239' : lead.status === 'Nurture' ? '#6b21a8' : '#475569'
                                            }}>
                                                {lead.status || 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}><span className={`badge ${STAGE_COLORS[lead.stage] || 'badge-slate'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{lead.stage || '—'}</span></td>
                                        <td style={{ textAlign: 'center' }}><span className={`badge ${SOURCE_COLORS[lead.source] || 'badge-slate'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{lead.source || '—'}</span></td>
                                        <td style={{ fontWeight: 600, textAlign: 'center', fontSize: '0.8rem' }}>{lead.budget || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                <div className="progress-bar" style={{ width: 40, height: 5 }}>
                                                    <div className="progress-fill" style={{ width: `${leadScore}%`, background: leadScore > 80 ? '#10b981' : leadScore > 60 ? '#f59e0b' : '#f43f5e' }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{leadScore}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                <div className="avatar avatar-sm" style={{ background: `hsl(${(lead.agent_avatar || 'XX').charCodeAt(0) * 60 + 200}, 55%, 50%)`, width: 24, height: 24, fontSize: '10px' }}>
                                                    {lead.agent_avatar || '?'}
                                                </div>
                                                <span style={{ fontSize: '0.75rem' }}>{lead.agent_name?.split(' ')[0] || '—'}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                            {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                        </td>
                                        <td onClick={e => e.stopPropagation()} style={{ 
                                            textAlign: 'center',
                                            position: 'sticky',
                                            right: 0,
                                            background: hoveredRow === lead.id ? 'var(--slate-50)' : selectedIds.has(lead.id) ? 'var(--navy-50)' : 'white',
                                            zIndex: 30,
                                            boxShadow: '-4px 0 8px rgba(0,0,0,0.06)',
                                            padding: '8px 12px'
                                        }}>
                                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                                <button className="btn btn-ghost btn-icon" onClick={() => dialerEvents.call(lead.id, lead.phone, lead.name)} data-tooltip="Call" style={{ width: 32, height: 32 }}><Phone size={16} style={{ color: '#00a38d' }} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(lead)} data-tooltip="Edit" style={{ width: 32, height: 32 }}><Edit2 size={16} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => deleteLead(lead.id)} data-tooltip="Delete" style={{ color: 'var(--accent-rose)', width: 32, height: 32 }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {leadsRes && (
                            <div style={{
                                position: 'sticky',
                                bottom: 0,
                                zIndex: 10,
                                padding: '12px 16px',
                                borderTop: '1px solid var(--border-light)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(252, 253, 253, 0.95)',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Showing <strong>{leads.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to <strong>{Math.min(page * limit, leadsRes.total || 0)}</strong> of <strong>{leadsRes.total || 0}</strong> leads
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <select
                                        value={limit}
                                        onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
                                        style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: 4, fontSize: '0.78rem', background: 'white' }}
                                    >
                                        {[25, 50, 100, 200].map(l => <option key={l} value={l}>{l} per page</option>)}
                                    </select>

                                    <div style={{ display: 'flex', gap: 2 }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            style={{ height: 32, width: 80 }}
                                        >
                                            Previous
                                        </button>

                                        {/* Simple page number indicator */}
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy-600)' }}>
                                            Page {page} of {Math.ceil((leadsRes.total || 0) / limit) || 1}
                                        </div>

                                        <button
                                            className="btn btn-ghost btn-sm"
                                            disabled={page * limit >= (leadsRes.total || 0)}
                                            onClick={() => setPage(p => p + 1)}
                                            style={{ height: 32, width: 80 }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </>
                )
            }

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingId ? 'Edit Lead' : 'Add New Lead'}</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Rajesh Kumar" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone *</label>
                                    <input className="form-control" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="+91 98765 43210" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="email@example.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input className="form-control" value={form.city} onChange={e => upd('city', e.target.value)} placeholder="Mumbai" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lead Status</label>
                                    <select className="form-control" value={form.status} onChange={e => upd('status', e.target.value)}>
                                        <option value="Active">Active</option>
                                        <option value="Nurture">Nurture</option>
                                        <option value="Won">Won</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stage</label>
                                    <select className="form-control" value={form.stage} onChange={e => upd('stage', e.target.value)}>
                                        {STAGES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Source</label>
                                    <select className="form-control" value={form.source} onChange={e => upd('source', e.target.value)}>
                                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>

                                {form.status === 'Nurture' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label" style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>Nurture Reason *</label>
                                            <select className="form-control" value={form.nurture_reason} onChange={e => upd('nurture_reason', e.target.value)} style={{ borderColor: 'var(--accent-rose)' }}>
                                                <option value="">Select reason...</option>
                                                {NURTURE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>Reconnect Date *</label>
                                            <input type="date" className="form-control" value={form.reconnect_date} onChange={e => upd('reconnect_date', e.target.value)} style={{ borderColor: 'var(--accent-rose)' }} />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Budget</label>
                                    <input className="form-control" value={form.budget} onChange={e => upd('budget', e.target.value)} placeholder="₹85L" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Property Type</label>
                                    <select className="form-control" value={form.property_type} onChange={e => upd('property_type', e.target.value)}>
                                        {['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Penthouse', 'Commercial'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Interested Project</label>
                                    <select className="form-control" value={form.project_id} onChange={e => upd('project_id', e.target.value)}>
                                        <option value="">Select project</option>
                                        {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign To</label>
                                    <select className="form-control" value={form.assigned_to} onChange={e => upd('assigned_to', e.target.value)}>
                                        <option value="">Select agent</option>
                                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Referred by Partner</label>
                                    <select className="form-control" value={form.channel_partner_id} onChange={e => upd('channel_partner_id', e.target.value)}>
                                        <option value="">No partner (Direct)</option>
                                        {(channelPartners || []).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.company ? `(${p.company})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Lead Score: {form.score}</label>
                                    <input type="range" min={0} max={100} value={form.score} onChange={e => upd('score', parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--navy-500)' }} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-control" rows={3} value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Any notes about this lead..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveLead} disabled={saving}>
                                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Modal / Confirm */}
            {bulkAction && (
                <div className="modal-overlay" onClick={() => setBulkAction(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {bulkAction === 'assign' ? 'Reassign Leads' :
                                    bulkAction === 'stage' ? 'Update Stage' :
                                        bulkAction === 'message' ? 'Send Bulk Message' :
                                            'Delete Leads'}
                            </h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setBulkAction(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 20 }}>
                                You are about to apply this action to <strong>{selectedIds.size}</strong> selected leads.
                            </p>

                            {bulkAction === 'message' && (
                                <div className="form-grid form-grid-2">
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Channel</label>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            {['WhatsApp', 'Email', 'SMS'].map(ch => (
                                                <button
                                                    key={ch}
                                                    className={`btn btn-sm ${bulkMessage.channel === ch ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => setBulkMessage(prev => ({ ...prev, channel: ch }))}
                                                >
                                                    {ch}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {bulkMessage.channel === 'Email' && (
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Subject</label>
                                            <input
                                                className="form-control"
                                                value={bulkMessage.subject}
                                                onChange={e => setBulkMessage(prev => ({ ...prev, subject: e.target.value }))}
                                                placeholder="Email subject..."
                                            />
                                        </div>
                                    )}
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Message Body</label>
                                        <textarea
                                            className="form-control"
                                            rows={5}
                                            value={bulkMessage.body}
                                            onChange={e => setBulkMessage(prev => ({ ...prev, body: e.target.value }))}
                                            placeholder="Write your message here... Use {{name}} to personalize."
                                        />
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                            Available variables: {'{{name}}'}, {'{{first_name}}'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {bulkAction === 'assign' && (
                                <div className="form-group">
                                    <label className="form-label">Assign to Agent</label>
                                    <select className="form-control" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                                        <option value="">Select agent...</option>
                                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {bulkAction === 'stage' && (
                                <div className="form-group">
                                    <label className="form-label">Change Stage To</label>
                                    <select className="form-control" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                                        <option value="">Select stage...</option>
                                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}

                            {bulkAction === 'status' && (
                                <div className="form-group">
                                    <label className="form-label">Change Status To</label>
                                    <select className="form-control" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                                        <option value="">Select status...</option>
                                        <option value="Active">Active</option>
                                        <option value="Nurture">Nurture</option>
                                        <option value="Won">Won</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>
                            )}

                            {bulkAction === 'delete' && (
                                <p style={{ color: 'var(--accent-rose)' }}>
                                    This action cannot be undone. All related follow-ups will also be permanently deleted.
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkAction(null)}>Cancel</button>
                            <button
                                className={`btn ${bulkAction === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={handleBulkAction}
                                disabled={bulkLoading || (!['delete', 'message'].includes(bulkAction) && !bulkValue)}
                            >
                                {bulkLoading ? 'Processing...' : 'Confirm Bulk Action'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div style={{
                    position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--navy-900)', color: 'white',
                    padding: '12px 20px', borderRadius: 100,
                    display: 'flex', alignItems: 'center', gap: 20, zIndex: 100,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    animation: 'slideUp 0.3s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: '0.9rem' }}>
                        <div style={{ background: 'var(--accent-cyan)', color: 'var(--navy-900)', padding: '2px 8px', borderRadius: 20 }}>
                            {selectedIds.size}
                        </div>
                        Selected
                    </div>

                    <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.2)' }} />

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} onClick={() => { setBulkAction('message'); setBulkMessage({ subject: '', body: '', channel: 'WhatsApp' }); }}>
                            <MessageSquare size={14} /> Message
                        </button>
                        <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} onClick={() => { setBulkAction('stage'); setBulkValue(''); }}>
                            <Tag size={14} /> Update Stage
                        </button>
                        <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} onClick={() => { setBulkAction('status'); setBulkValue(''); }}>
                            <Tag size={14} /> Update Status
                        </button>
                        <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} onClick={() => { setBulkAction('assign'); setBulkValue(''); }}>
                            <Users size={14} /> Reassign
                        </button>
                        <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: 'none' }} onClick={() => { setBulkAction('delete'); }}>
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>

                    <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.2)' }} />
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'rgba(255,255,255,0.5)', padding: 0 }} onClick={() => setSelectedIds(new Set())}>
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Preview Sidebar Panel */}
            {previewLeadId && (
                <ContactPreviewSidebar contactId={previewLeadId} onClose={() => setPreviewLeadId(null)} />
            )}
        </div>
    );
}

