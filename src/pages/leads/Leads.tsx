import { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { leadsApi, projectsApi, usersApi, notificationsApi, channelPartnersApi } from '../../api/client';
import { Plus, Search, Filter, Phone, Mail, Edit2, Trash2, X, Users, Tag, MessageSquare, Home, Handshake, Layout, Table, RotateCw, Calendar, Upload, ArrowUpDown } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import ContactPreviewSidebar from '../../components/shared/ContactPreviewSidebar';
import { dialerEvents } from '../../constants/events';
import { useMobile } from '../../hooks/useMobile';
import '../../styles/leads-list.css';

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
    'Zapier': 'badge-amber',
    '99 Acres': 'badge-orange',
    'Housing': 'badge-red',
    'Magic Bricks': 'badge-maroon',
    'OLX': 'badge-teal',
    'NoBroker': 'badge-indigo',
    'Squareyards': 'badge-violet',
    'Channel Partner': 'badge-emerald'
};
const SOURCES = [
    'Website', 'Referral', 'Social Media', 'Walk-in', 'PropTech Portal', 
    'Google Ads', 'WhatsApp', 'Facebook Ads', 'Instagram Ads', 'Zapier',
    '99 Acres', 'Housing', 'Magic Bricks', 'OLX', 'NoBroker', 'Squareyards', 
    'Channel Partner', 'SMS', 'Email', 'Bulk SMS', 'Offline Event', 'Direct', 'WTI App'
];
const NURTURE_REASONS = ['Budget issue', 'Timeline delay', 'No response', 'Inventory mismatch', 'Contacted - Follow up later', 'Looking for better options'];

interface MobileLeadCardProps {
    lead: any;
    isSelected: boolean;
    onSelect: (id: any) => void;
    onDelete: (id: any) => void;
    onEdit: (lead: any) => void;
    onCall: (id: any, phone: any, name: any) => void;
    onNavigate: (id: any) => void;
}

// Mobile Card Component
const MobileLeadCard = memo(({ lead, isSelected, onSelect, onDelete, onEdit, onCall, onNavigate }: MobileLeadCardProps) => {
    const leadScore = typeof lead.score === 'number' ? lead.score : 0;
    return (
        <div 
            onClick={() => onNavigate(lead.id)}
            style={{
                background: isSelected ? 'var(--navy-50)' : 'white',
                borderRadius: 16,
                border: isSelected ? '2px solid var(--navy-400)' : '1px solid var(--border-light)',
                padding: '14px',
                marginBottom: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
        >
            {/* Top row: Avatar + Name + Stage badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div onClick={e => { e.stopPropagation(); onSelect(lead.id); }} style={{ flexShrink: 0 }}>
                    <div className="avatar avatar-sm" style={{ 
                        background: isSelected ? 'var(--navy-500)' : `hsl(${(String(lead.name || '#')).charCodeAt(0) * 47 + 180}, 60%, 55%)`, 
                        width: 36, height: 36, fontSize: '12px', 
                        border: isSelected ? '2px solid var(--navy-300)' : 'none'
                    }}>
                        {isSelected ? '✓' : String(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('')}
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name || '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{lead.property_type || '—'} · {lead.project_name?.split(' ')[0] || 'Any'}</div>
                </div>
                <span className={`badge ${STAGE_COLORS[lead.stage] || 'badge-slate'}`} style={{ fontSize: '0.65rem', padding: '2px 8px', flexShrink: 0 }}>{lead.stage || '—'}</span>
            </div>

            {/* Contact row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={11} style={{ color: 'var(--text-muted)' }} />
                    <span>{lead.phone || '—'}</span>
                </div>
                {lead.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                        <Mail size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.email}</span>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                    <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600 }}>{lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                </div>
            </div>

            {/* Bottom row: Status + Score + Source + Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                    <span style={{ 
                        fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, 
                        background: lead.status === 'Won' ? '#dcfce7' : lead.status === 'Lost' ? '#ffe4e6' : lead.status === 'Nurture' ? '#f3e8ff' : '#f1f5f9', 
                        color: lead.status === 'Won' ? '#166534' : lead.status === 'Lost' ? '#9f1239' : lead.status === 'Nurture' ? '#6b21a8' : '#475569' 
                    }}>{lead.status || 'Active'}</span>
                    <span className={`badge ${SOURCE_COLORS[lead.source] || 'badge-slate'}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>{lead.source || '—'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <div className="progress-bar" style={{ width: 30, height: 3 }}>
                            <div className="progress-fill" style={{ width: `${leadScore}%`, background: leadScore > 80 ? '#10b981' : leadScore > 60 ? '#f59e0b' : '#f43f5e' }} />
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--navy-700)' }}>{leadScore}</span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                    <button className="btn btn-ghost" onClick={() => onCall(lead.id, lead.phone, lead.name)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Phone size={13} style={{ color: '#00a38d' }} /></button>
                    <button className="btn btn-ghost" onClick={() => onEdit(lead)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Edit2 size={13} /></button>
                    <button className="btn btn-ghost" onClick={() => onDelete(lead.id)} style={{ color: 'var(--accent-rose)', width: 30, height: 30, padding: 0, borderRadius: 8 }}><Trash2 size={13} /></button>
                </div>
            </div>
        </div>
    );
});

interface LeadRowProps {
    lead: any;
    isSelected: boolean;
    filterNurtureDue: boolean;
    rowIndex: number;
    onSelect: (id: any) => void;
    onPreview: (id: any) => void;
    onDelete: (id: any) => void;
    onEdit: (lead: any) => void;
    onCall: (id: any, phone: any, name: any) => void;
    onNavigate: (id: any) => void;
}

// Optimized Memoized Row Component
const LeadRow = memo(({ lead, isSelected, filterNurtureDue, rowIndex, onSelect, onPreview, onDelete, onEdit, onCall, onNavigate }: LeadRowProps) => {
    const [hovered, setHovered] = useState(false);
    const leadScore = typeof lead.score === 'number' ? lead.score : 0;
    const scoreClass = leadScore > 80 ? 'll-score-high' : leadScore > 50 ? 'll-score-mid' : 'll-score-low';
    const staggerClass = `ll-stagger-${Math.min(rowIndex + 1, 20)}`;
    const statusKey = (lead.status || 'Active').toLowerCase();
    const stageDotColor = STAGE_DOT_COLORS[lead.stage] || '#94a3b8';
    const stageBgColor = STAGE_BG[lead.stage] || '#f8fafc';

    const scoreAccent = leadScore > 80 ? 'll-score-accent-high' : leadScore > 50 ? 'll-score-accent-mid' : 'll-score-accent-low';

    return (
        <tr 
            className={`ll-row-animate ll-premium-row ${staggerClass} ${scoreAccent}`}
            onClick={() => onNavigate(lead.id)} 
            onMouseEnter={() => setHovered(true)} 
            onMouseLeave={() => setHovered(false)} 
            style={{ cursor: 'pointer', background: isSelected ? 'var(--navy-50)' : undefined }}
        >
            <td onClick={e => e.stopPropagation()} style={{ paddingRight: 0 }}>
                <input type="checkbox" className="ll-checkbox" checked={isSelected} onChange={() => onSelect(lead.id)} />
            </td>
            <td style={{ padding: '8px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="ll-avatar-ring">
                        <div className="avatar avatar-sm" style={{ background: `hsl(${(String(lead.name || '#')).charCodeAt(0) * 47 + 180}, 60%, 55%)`, flexShrink: 0, width: 28, height: 28, fontSize: '10px' }}>
                            {String(lead.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('')}
                        </div>
                    </div>
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 14, opacity: hovered ? 1 : 0, visibility: hovered ? 'visible' : 'hidden', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center' }}>
                            <button onClick={(e) => { e.stopPropagation(); onPreview(lead.id); }} style={{ background: '#ffffff', border: '1px solid #cbd6e2', borderRadius: 3, padding: '0px 4px', fontSize: '9px', color: '#516f90', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: '1.2' }}>Preview</button>
                        </div>
                        <div data-tooltip={lead.name || ''} style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--navy-900)', lineHeight: 1.1 }}>{lead.name || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.property_type || '—'} · {lead.project_name?.split(' ')[0] || 'Any'}</div>
                    </div>
                </div>
            </td>
            <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.75rem', minWidth: 0, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        {lead.email ? (
                            <span style={{ color: 'var(--text-secondary)', overflowWrap: 'anywhere', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.email}</span>
                        ) : (
                            <span className="ll-email-missing">⚠ No email</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{lead.phone || '—'}</span>
                    </div>
                </div>
            </td>
            <td style={{ textAlign: 'center', padding: '8px' }}>
                <span className={`ll-status-pill ll-status-${statusKey}`}>{lead.status || 'Active'}</span>
            </td>
            <td style={{ textAlign: 'center', padding: '8px' }}>
                <span className="ll-stage-pill" style={{ '--ll-stage-dot': stageDotColor, '--ll-stage-bg': stageBgColor, '--ll-stage-border': `${stageDotColor}25`, '--ll-stage-color': stageDotColor } as any}>{lead.stage || '—'}</span>
            </td>
            <td style={{ textAlign: 'center', padding: '8px' }}><span className={`badge ${SOURCE_COLORS[lead.source] || 'badge-slate'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{lead.source || '—'}</span></td>
            <td style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className={`ll-score-ring ${scoreClass}`}>
                        <svg width="38" height="38" viewBox="0 0 38 38" className="ll-score-svg">
                            <circle cx="19" cy="19" r="16" fill="transparent" stroke="var(--slate-200)" strokeWidth="3" />
                            <circle cx="19" cy="19" r="16" fill="transparent" stroke="currentColor" strokeWidth="3"
                                strokeDasharray={2 * Math.PI * 16}
                                strokeDashoffset={2 * Math.PI * 16 * (1 - leadScore / 100)}
                                strokeLinecap="round"
                                transform="rotate(-90 19 19)"
                            />
                        </svg>
                        <span className="ll-score-text">{leadScore}</span>
                        <span className="ll-score-tooltip">{leadScore > 80 ? '🔥 Hot Lead' : leadScore > 50 ? '⚡ Warm Lead' : '❄️ Cold Lead'}</span>
                    </div>
                </div>
            </td>
            {filterNurtureDue && (
                <>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-rose)', background: 'var(--rose-50)', borderRadius: 6, padding: '2px 4px' }}>
                            {lead.reconnect_date ? new Date(lead.reconnect_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
                        </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--slate-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lead.nurture_reason}>
                            {lead.nurture_reason || '—'}
                        </div>
                    </td>
                </>
            )}
            <td style={{ textAlign: 'center', padding: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{lead.created_by_name || 'System'}</span>
            </td>
            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '8px' }}>
                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </td>
            <td style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <div className="avatar avatar-sm" style={{ background: `hsl(${(lead.agent_avatar || 'XX').charCodeAt(0) * 60 + 200}, 55%, 50%)`, width: 24, height: 24, fontSize: '10px' }}>{lead.agent_avatar || '?'}</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{lead.agent_name?.split(' ')[0] || '—'}</span>
                </div>
            </td>
            <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '8px' }}>
                {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
            </td>
            <td onClick={e => e.stopPropagation()} className="ll-actions-sticky" style={{ textAlign: 'center', padding: '4px 6px' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', minWidth: '90px' }}>
                    <button className="ll-action-btn ll-action-call" onClick={() => onCall(lead.id, lead.phone, lead.name)} aria-label="Call lead"><Phone size={14} style={{ color: '#00a38d' }} /></button>
                    <button className="ll-action-btn ll-action-edit" onClick={() => onEdit(lead)} aria-label="Edit lead"><Edit2 size={14} /></button>
                    <button className="ll-action-btn ll-action-delete" onClick={() => onDelete(lead.id)} aria-label="Delete lead"><Trash2 size={14} style={{ color: 'var(--accent-rose)' }} /></button>
                </div>
            </td>
        </tr>
    );
});

const DEFAULT_FORM = {
    name: '', email: '', phone: '', city: '', source: 'Website',
    stage: 'New Lead', status: 'Active', budget: '', property_type: '2BHK', project_id: '',
    assigned_to: '', channel_partner_id: '', notes: '', score: 50,
    nurture_reason: '', reconnect_date: '',
};

export default function Leads() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const isMobile = useMobile();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStage, setFilterStage] = useState('All');
    const [filterSource, setFilterSource] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterAgent, setFilterAgent] = useState('All');
    const [filterNurtureDue, setFilterNurtureDue] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [previewLeadId, setPreviewLeadId] = useState(null);
    const fileInputRef = useRef(null);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState(null); // 'assign', 'stage', 'delete', 'message'
    const [bulkValue, setBulkValue] = useState('');
    const [bulkMessage, setBulkMessage] = useState({ subject: '', body: '', channel: 'WhatsApp' });
    const [bulkLoading, setBulkLoading] = useState(false);

    // API params — rebuild on filter change
    const [leadsRes, setLeadsRes] = useState(null);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [users, setUsers] = useState(null);
    const [projects, setProjects] = useState([]);
    const [channelPartners, setChannelPartners] = useState([]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 when search text changes
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLeads = useCallback(async (overridePage?: number, overrideSearch?: string) => {
        setLeadsLoading(true);
        try {
            const activePage = overridePage !== undefined ? overridePage : page;
            const activeSearch = overrideSearch !== undefined ? overrideSearch : debouncedSearch;
            
            const p: any = { limit, page: activePage };
            if (filterStage !== 'All') p.stage = filterStage;
            if (filterSource !== 'All') p.source = filterSource;
            if (filterStatus !== 'All') p.status = filterStatus;
            if (filterAgent !== 'All') p.agent = filterAgent;
            if (filterNurtureDue) p.nurture_due = 'true';
            if (startDate) p.startDate = startDate;
            if (endDate) p.endDate = endDate;
            if (activeSearch && activeSearch.trim()) p.q = activeSearch.trim();

            const res = await leadsApi.list(p);
            setLeadsRes(res || { data: [], total: 0 });
            setLastFetchTime(new Date());
        } catch (err) {
            console.error('Fetch leads error:', err);
            showToast('Failed to load leads', 'error');
        } finally {
            setLeadsLoading(false);
        }
    }, [limit, page, filterStage, filterSource, filterStatus, filterAgent, debouncedSearch, filterNurtureDue, startDate, endDate, showToast]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        usersApi.list().then(setUsers).catch(console.error);
        projectsApi.list({ status: 'Active' }).then(setProjects).catch(console.error);
        channelPartnersApi.list().then(setChannelPartners).catch(console.error);
    }, []);

    const rawLeads = leadsRes?.data || [];
    const agents = Array.isArray(users) ? users.filter(u => ['agent', 'sales_manager', 'team_leader', 'admin'].includes(u.role)) : [];

    // Client-side sort for current page
    const leads = useMemo(() => {
        if (!sortField) return rawLeads;
        const sorted = [...rawLeads].sort((a, b) => {
            let va = a[sortField], vb = b[sortField];
            if (sortField === 'score') { va = Number(va) || 0; vb = Number(vb) || 0; return sortDir === 'asc' ? va - vb : vb - va; }
            if (sortField === 'created_at' || sortField === 'last_contact_at') { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0; return sortDir === 'asc' ? va - vb : vb - va; }
            va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase();
            return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        });
        return sorted;
    }, [rawLeads, sortField, sortDir]);

    const handleSort = useCallback((field: string) => {
        if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
        else { setSortField(field); setSortDir('asc'); }
    }, [sortField]);

    const freshnessTxt = useMemo(() => {
        if (!lastFetchTime) return '';
        const secs = Math.floor((Date.now() - lastFetchTime.getTime()) / 1000);
        if (secs < 10) return 'Just now';
        if (secs < 60) return `${secs}s ago`;
        return `${Math.floor(secs / 60)}m ago`;
    }, [lastFetchTime]);

    // Re-render freshness text every 10s
    const [, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 10000); return () => clearInterval(t); }, []);

    const openAdd = () => { 
        setForm({
            ...DEFAULT_FORM,
            assigned_to: ['agent', 'sales_manager', 'team_leader'].includes(user?.role) ? user.id : ''
        }); 
        setEditingId(null); 
        setShowModal(true); 
    };
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
                await fetchLeads();
            } else {
                const created = await leadsApi.create(sanitized);
                showToast('Lead added successfully', 'success');
                // Optimistic UI update: prepend the new lead to the list immediately
                if (created) {
                    setLeadsRes(prev => ({
                        ...prev,
                        data: [created, ...(prev?.data || [])],
                        total: (prev?.total || 0) + 1
                    }));
                }
                setSearch('');
                setDebouncedSearch('');
                setFilterStage('All');
                setFilterStatus('All');
                setFilterSource('All');
                setFilterAgent('All');
                setFilterNurtureDue(false);
                setPage(1);
                // Re-fetch in background to ensure all calculated fields (assigned_to name, etc) are loaded
                fetchLeads(1, '').catch(() => {}); 
            }
            setShowModal(false);
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
            fetchLeads();
        } catch (err) {
            showToast(err.error || 'Failed to delete lead', 'error');
        }
    };

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === leads.length) return new Set();
            return new Set(leads.map(l => l.id));
        });
    }, [leads]);

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
            fetchLeads();
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
            const data = await leadsApi.import(formData);
            showToast(`Imported ${data.imported} leads (${data.duplicates} duplicates skipped)`, 'success');
            fetchLeads();
        } catch (err) {
            showToast(err.message || 'Failed to import leads', 'error');
        } finally {
            setBulkLoading(false);
            e.target.value = null;
        }
    };

    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '8px' : '0', paddingBottom: isMobile ? 100 : 0 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: isMobile ? 8 : 16 }}>
                <div className="page-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="ll-count-hero">
                            {leadsRes?.total || 0}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            total leads
                        </span>
                        {lastFetchTime && (
                            <span className="ll-freshness">
                                <span className="ll-freshness-dot" />
                                {freshnessTxt}
                            </span>
                        )}
                    </div>
                </div>
                

                <div className="page-actions" style={{ marginRight: isMobile ? 0 : 20, width: isMobile ? '100%' : 'auto', display: 'flex', gap: 6 }}>
                    <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn btn-secondary btn-sm" onClick={() => fetchLeads()} title="Refresh Data" style={{ flex: isMobile ? 1 : 'none' }}>
                        <RotateCw size={14} className={leadsLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={bulkLoading} style={{ flex: isMobile ? 1 : 'none' }}>
                        <Upload size={14} /> Import
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ flex: isMobile ? 1 : 'none' }}>
                        <Plus size={15} /> Add Lead
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`card mb-2 ll-filter-bar ${(filterStage !== 'All' || filterStatus !== 'All' || filterSource !== 'All' || filterAgent !== 'All' || filterNurtureDue || startDate || endDate || search) ? 'll-filter-active' : ''}`} style={{ padding: isMobile ? '12px' : '8px 12px', borderRadius: 12 }}>
                <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    alignItems: 'center', 
                    flexWrap: isMobile ? 'wrap' : 'nowrap', 
                    width: '100%' 
                }}>
                    <div className="search-bar" style={{ 
                        width: isMobile ? '100%' : 220, 
                        flex: isMobile ? '1 1 100%' : 'none', 
                        background: 'var(--slate-50)', 
                        border: '1px solid var(--slate-200)',
                        marginBottom: isMobile ? 4 : 0
                    }}>
                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." style={{ background: 'transparent' }} />
                    </div>
                    
                    <select className="form-control form-control-sm" style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', width: isMobile ? 'auto' : 120 }} value={filterStage} onChange={e => { setPage(1); setFilterStage(e.target.value); }}>
                        <option value="All">All Stages</option>
                        {STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="form-control form-control-sm" style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', width: isMobile ? 'auto' : 115 }} value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value); }}>
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Nurture">Nurture</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                    </select>
                    <select className="form-control form-control-sm" style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', width: isMobile ? 'auto' : 130 }} value={filterSource} onChange={e => { setPage(1); setFilterSource(e.target.value); }}>
                        <option value="All">All Sources</option>
                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>

                    {user?.role !== 'agent' && (
                        <select className="form-control form-control-sm" style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', width: isMobile ? 'auto' : 130 }} value={filterAgent} onChange={e => { setPage(1); setFilterAgent(e.target.value); }}>
                            <option value="All">All Agents</option>
                            <option value="Unassigned">Unassigned</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}

                    <button 
                        className={`btn btn-sm ${filterNurtureDue ? 'btn-primary' : 'btn-ghost'}`} 
                        style={{ color: filterNurtureDue ? 'white' : 'var(--accent-rose)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => { setPage(1); setFilterNurtureDue(!filterNurtureDue); }}
                    >
                        🎯 Nurture Due
                        {leadsRes?.counts?.dueToday > 0 && (
                            <span style={{ background: filterNurtureDue ? 'rgba(255,255,255,0.2)' : 'var(--accent-rose)', color: 'white', padding: '0 6px', borderRadius: 6, fontSize: '0.65rem' }}>
                                {leadsRes.counts.dueToday}
                            </span>
                        )}
                        {leadsRes?.counts?.overdue > 0 && !filterNurtureDue && (
                            <span style={{ background: '#ef4444', color: 'white', padding: '0 6px', borderRadius: 6, fontSize: '0.65rem' }} title="Overdue">
                                {leadsRes.counts.overdue}
                            </span>
                        )}
                    </button>
                    
                    {(filterStage !== 'All' || filterStatus !== 'All' || filterSource !== 'All' || filterAgent !== 'All' || filterNurtureDue || startDate || endDate || search) && (
                        <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--accent-rose)', whiteSpace: 'nowrap', flexShrink: 0 }}
                            onClick={() => {
                                setFilterStage('All');
                                setFilterStatus('All');
                                setFilterSource('All');
                                setFilterAgent('All');
                                setFilterNurtureDue(false);
                                setStartDate('');
                                setEndDate('');
                                setSearch('');
                            }}
                        >
                            <X size={14} /> Clear Active Filters
                        </button>
                    )}

                    {!isMobile && (
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                        borderRadius: 10, 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        height: 32
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px' }}>
                            <Calendar size={13} color="#3b82f6" />
                            <input 
                                type="date" 
                                style={{ 
                                    border: 'none', background: 'transparent', fontSize: '0.72rem', 
                                    padding: 0, color: startDate ? '#1e293b' : '#94a3b8', width: 75,
                                    fontWeight: startDate ? 700 : 500, cursor: 'pointer', outline: 'none'
                                }} 
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div style={{ 
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)', 
                            color: 'white', fontSize: '0.6rem', fontWeight: 800, 
                            padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center',
                            letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                            to
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px' }}>
                            <input 
                                type="date" 
                                style={{ 
                                    border: 'none', background: 'transparent', fontSize: '0.72rem', 
                                    padding: 0, color: endDate ? '#1e293b' : '#94a3b8', width: 75,
                                    fontWeight: endDate ? 700 : 500, cursor: 'pointer', outline: 'none'
                                }} 
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                </div>
                    )}
            </div>
        </div>
            <div className="leads-table-card" style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {leadsLoading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(255,255,255,0.75)',
                        display: 'flex', flexDirection: 'column', backdropFilter: 'blur(3px)', overflow: 'hidden', borderRadius: 12
                    }}>
                        {/* Premium Shimmer Skeleton */}
                        <div style={{ padding: '12px 16px', background: 'linear-gradient(180deg, #f8fafc, #f1f5f9)', borderBottom: '2px solid rgba(99,102,241,0.1)' }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                                {[40, 130, 140, 70, 90, 80, 45].map((w, i) => (
                                    <div key={i} className="ll-skeleton-cell" style={{ width: w, animationDelay: `${i * 0.08}s` }} />
                                ))}
                            </div>
                        </div>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="ll-skeleton-row" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div style={{ width: 18, height: 18, borderRadius: 4, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.5s infinite ${i * 0.05}s` }} />
                                <div className="ll-skeleton-avatar" style={{ animationDelay: `${i * 0.05}s` }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <div className="ll-skeleton-cell" style={{ width: '60%', height: 12, animationDelay: `${i * 0.05}s` }} />
                                    <div className="ll-skeleton-cell" style={{ width: '35%', height: 8, animationDelay: `${i * 0.05 + 0.1}s` }} />
                                </div>
                                <div className="ll-skeleton-cell" style={{ width: 90, animationDelay: `${i * 0.05 + 0.1}s` }} />
                                <div className="ll-skeleton-badge" style={{ width: 65, animationDelay: `${i * 0.05 + 0.15}s` }} />
                                <div className="ll-skeleton-badge" style={{ width: 72, animationDelay: `${i * 0.05 + 0.2}s` }} />
                                <div className="ll-skeleton-ring" style={{ animationDelay: `${i * 0.05 + 0.25}s` }} />
                                <div className="ll-skeleton-cell" style={{ width: 60, animationDelay: `${i * 0.05 + 0.3}s` }} />
                                <div className="ll-skeleton-cell" style={{ width: 55, animationDelay: `${i * 0.05 + 0.35}s` }} />
                            </div>
                        ))}
                    </div>
                )}

                <div className="table-wrapper ll-scroll" style={{ overflowX: isMobile ? 'hidden' : 'auto', overflowY: 'scroll', maxHeight: isMobile ? 'calc(100vh - 220px)' : 'calc(100vh - 260px)', background: isMobile ? 'transparent' : 'white', padding: isMobile ? '0 4px' : 0 }}>
                    {leads.length === 0 && !leadsLoading ? (
                        <div className="ll-empty-state">
                            <div className="ll-empty-icon">🔍</div>
                            <div className="ll-empty-title">No leads found</div>
                            <div className="ll-empty-text">Try adjusting your filters, search query, or date range — or add a new lead to get started.</div>
                            <button className="ll-empty-cta" onClick={openAdd}><Plus size={16} /> Add New Lead</button>
                        </div>
                    ) : isMobile ? (
                        /* ═══ MOBILE CARD VIEW ═══ */
                        <div style={{ padding: '8px 0' }}>
                            {leads.map(lead => (
                                <MobileLeadCard
                                    key={lead.id}
                                    lead={lead}
                                    isSelected={selectedIds.has(lead.id)}
                                    onSelect={toggleSelect}
                                    onDelete={deleteLead}
                                    onEdit={openEdit}
                                    onCall={(id, num, name) => dialerEvents.call(id, num, name)}
                                    onNavigate={(id) => navigate(`/leads/${id}`)}
                                />
                            ))}
                        </div>
                    ) : (
                        /* ═══ DESKTOP TABLE VIEW ═══ */
                        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '1000px', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead className="ll-thead-premium">
                                <tr>
                                    <th style={{ width: 40, paddingRight: 0 }}>
                                        <input
                                            type="checkbox"
                                            className="ll-checkbox"
                                            checked={leads.length > 0 && selectedIds.size === leads.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    {(() => {
                                        const SORT_MAP: Record<string, string> = { 'Lead': 'name', 'Score': 'score', 'Status': 'status', 'Stage': 'stage', 'Source': 'source', 'Create Date': 'created_at', 'Last Contacted': 'last_contact_at' };
                                        return ['Lead', 'Contact', 'Status', 'Stage', 'Source', 'Score', ...(filterNurtureDue ? ['Re-connect', 'Reason'] : []), 'Created By', 'Create Date', 'Assigned To', 'Last Contacted', 'Actions'].map((h, i) => {
                                            const widths: Record<string, string> = { 'Lead': '130px', 'Contact': '140px', 'Status': '80px', 'Stage': '120px', 'Source': '80px', 'Score': '55px', 'Re-connect': '90px', 'Reason': '120px', 'Created By': '80px', 'Create Date': '80px', 'Assigned To': '90px', 'Last Contacted': '110px', 'Actions': '100px' };
                                            const isSticky = h === 'Actions';
                                            const sortKey = SORT_MAP[h];
                                            const isSorted = sortField === sortKey;
                                            return (
                                                <th key={h}
                                                    className={sortKey ? `ll-sortable-th ${isSorted ? `ll-sort-active ll-sort-active-${sortDir}` : ''}` : ''}
                                                    onClick={sortKey ? () => handleSort(sortKey) : undefined}
                                                    style={{
                                                        width: widths[h] || 'auto', minWidth: widths[h] || 'auto', textAlign: 'center',
                                                        position: isSticky ? 'sticky' : 'static', right: isSticky ? 0 : 'auto',
                                                        zIndex: isSticky ? 30 : 1, boxShadow: isSticky ? '-4px 0 12px rgba(0,0,0,0.04)' : 'none'
                                                    }}>
                                                    {h}
                                                    {sortKey && (
                                                        <span className="ll-sort-icon">
                                                            <span className="ll-sort-arrow ll-sort-arrow-up" />
                                                            <span className="ll-sort-arrow ll-sort-arrow-down" />
                                                        </span>
                                                    )}
                                                </th>
                                            );
                                        });
                                    })()}
                                </tr>
                            </thead>
                            <tbody className="ll-page-transition" key={`page-${page}`}>
                                {leads.map((lead, i) => (
                                    <LeadRow 
                                        key={lead.id} 
                                        lead={lead} 
                                        isSelected={selectedIds.has(lead.id)}
                                        filterNurtureDue={filterNurtureDue}
                                        rowIndex={i}
                                        onSelect={toggleSelect}
                                        onPreview={setPreviewLeadId}
                                        onDelete={deleteLead}
                                        onEdit={openEdit}
                                        onCall={(id, num, name) => dialerEvents.call(id, num, name)}
                                        onNavigate={(id) => navigate(`/leads/${id}`)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Section - Now ALWAYS stable and positioned correctly */}
                <div className="ll-pagination" style={{
                    display: 'flex', justifyContent: isMobile ? 'center' : 'space-between', alignItems: 'center',
                    padding: isMobile ? '10px 12px' : '12px 20px',
                    borderRadius: '0 0 12px 12px', flexWrap: 'wrap', gap: isMobile ? 8 : 12,
                    zIndex: 100, position: 'relative',
                    flexDirection: isMobile ? 'column' : 'row'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, justifyContent: isMobile ? 'center' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                            {isMobile ? `${leadsRes?.total || 0} leads` : `Showing ${((page - 1) * limit) + 1} to ${Math.min(page * limit, leadsRes?.total || 0)} of ${leadsRes?.total || 0} leads`}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            <span>Rows:</span>
                            <select 
                                className="form-control form-control-sm" 
                                style={{ width: 65, height: 28, fontSize: '0.75rem', padding: '0 8px', cursor: 'pointer' }}
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, marginRight: isMobile ? 0 : '100px', justifyContent: isMobile ? 'center' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
                        <button
                            className="ll-page-btn"
                            onClick={() => { setPage(p => Math.max(1, p - 1)); showToast(`Loading page ${page - 1}...`, 'info'); }}
                            disabled={page === 1 || leadsLoading}
                        >
                            ← Prev
                        </button>
                        {(() => {
                            const totalPages = Math.max(1, Math.ceil((leadsRes?.total || 0) / limit));
                            const pages: (number | string)[] = [];
                            for (let p = 1; p <= Math.min(totalPages, 5); p++) pages.push(p);
                            if (totalPages > 5 && page > 4) { pages.splice(0, pages.length); pages.push(1, '...'); for (let p = Math.max(2, page - 1); p <= Math.min(totalPages, page + 1); p++) pages.push(p); if (page + 1 < totalPages) pages.push('...', totalPages); }
                            else if (totalPages > 5) { pages.push('...', totalPages); }
                            return pages.map((p, idx) =>
                                typeof p === 'string' ? (
                                    <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>{p}</span>
                                ) : (
                                    <button
                                        key={p}
                                        className={`ll-page-btn ${p === page ? 'll-page-btn-active' : ''}`}
                                        onClick={() => { setPage(p); showToast(`Loading page ${p}...`, 'info'); }}
                                        disabled={leadsLoading}
                                        style={{ minWidth: 34 }}
                                    >
                                        {p}
                                    </button>
                                )
                            );
                        })()}
                        <button
                            className="ll-page-btn"
                            onClick={() => { setPage(p => p + 1); showToast(`Loading page ${page + 1}...`, 'info'); }}
                            disabled={(leads.length < limit && !leadsLoading) || (page * limit) >= (leadsRes?.total || 0) || leadsLoading}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>



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
                    position: 'fixed', bottom: isMobile ? 90 : 30, left: isMobile ? 16 : 280, right: isMobile ? 16 : 'auto',
                    background: 'var(--navy-900)', color: 'white',
                    padding: '12px 20px', borderRadius: 100,
                    display: 'flex', alignItems: 'center', gap: 20, zIndex: 100,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    animation: 'barSlideUp 0.3s ease-out'
                }}>
                    <style>{`
                        @keyframes barSlideUp {
                            from { transform: translateY(20px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}</style>
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

