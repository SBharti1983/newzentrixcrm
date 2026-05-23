import { useState } from 'react';
import * as dateUtils from '../../utils/dateUtils';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { channelPartnersApi, projectsApi, leadsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import {
    CheckCircle, Clock, Eye, FileText, ChevronRight, Share2, Plus, Star, Edit2, Trash2, Mail, Phone, MapPin, X, Search
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

// ─── Constants ────────────────────────────────────────────────────────
const STATUS_COLORS = {
    Active: 'badge-green',
    Inactive: 'badge-red',
    Pending: 'badge-amber',
};

const LEAD_STATUS_COLORS = {
    Won: 'badge-green',
    Negotiation: 'badge-amber',
    'Site Visit': 'badge-cyan',
    Contacted: 'badge-blue',
    New: 'badge-slate',
    Lost: 'badge-red',
};

const PARTNER_COLORS = [
    'hsl(220, 65%, 55%)',
    'hsl(160, 60%, 45%)',
    'hsl(280, 60%, 55%)',
    'hsl(35, 75%, 50%)',
    'hsl(0, 65%, 55%)',
    'hsl(195, 70%, 45%)',
];

const DEFAULT_FORM = {
    name: '', contactPerson: '', email: '', phone: '', city: '',
    type: 'Firm', status: 'Active', commissionRate: 2.0,
    reraNo: '', assignedProjects: [], notes: '',
};

// ─── Star Rating Component ─────────────────────────────────────────
function StarRating({ rating }) {
    const numericRating = parseFloat(rating || 0);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    size={12}
                    fill={i <= Math.round(numericRating) ? '#f59e0b' : 'none'}
                    style={{ color: i <= Math.round(numericRating) ? '#f59e0b' : 'var(--slate-300)' }}
                />
            ))}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginLeft: 4 }}>
                {numericRating.toFixed(1)}
            </span>
        </div>
    );
}

// ─── Mini Stat ─────────────────────────────────────────────────────
function MiniStat({ label, value, color = 'var(--navy-600)' }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: color || 'var(--navy-600)' }}>{value}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function ChannelPartners() {
    const { showToast } = useToast();
    const isMobile = useMobile();
    const { data: partnersRaw, loading, error, refetch } = useApi(() => channelPartnersApi.list());
    const { data: projectsRaw } = useApi(() => projectsApi.list());
    const partners = partnersRaw || [];
    const PROJECTS_DATA = projectsRaw || [];

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType] = useState('All');
    const [filterCity, setFilterCity] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [saving, setSaving] = useState(false);

    const { data: leadsRes } = useApi(() => selectedPartner ? leadsApi.list({ channel_partner_id: selectedPartner.id }) : null, [selectedPartner?.id]);
    const partnerLeads = leadsRes?.data || [];

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    // ─── Derived data ─────────────────────────────────────────────
    const cities = [...new Set(partners.map(p => p.city).filter(Boolean))];
    const totalLeadsReferred = partners.reduce((s, p) => s + (p.total_leads_referred || 0), 0);

    const totalCommissionValue = partners.reduce((s, p) => s + parseFloat(p.total_commission || 0), 0);
    const totalCommissionPaid = `₹${totalCommissionValue.toFixed(1)}L`;
    const activeCount = partners.filter(p => p.status === 'Active').length;

    const filtered = partners.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = (p.name || '').toLowerCase().includes(q) ||
            (p.contact_person || p.contactPerson || '').toLowerCase().includes(q) ||
            (p.city || '').toLowerCase().includes(q) ||
            (p.rera_no || p.reraNo || p.rera_number || '').toLowerCase().includes(q);
        const matchStatus = filterStatus === 'All' || p.status === filterStatus;
        const matchType = filterType === 'All' || p.type === filterType;
        const matchCity = filterCity === 'All' || p.city === filterCity;
        return matchSearch && matchStatus && matchType && matchCity;
    });

    const openAdd = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowModal(true); };
    const openEdit = (p, e) => {
        e?.stopPropagation();
        setForm({
            ...p,
            contactPerson: p.contact_person || p.contactPerson || '',
            reraNo: p.rera_no || p.reraNo || p.rera_number || '',
            commissionRate: p.commission_rate || p.commissionRate || 2.0,
            assignedProjects: p.assigned_projects || p.assignedProjects || [],
        });
        setEditingId(p.id);
        setShowModal(true);
    };
    const savePartner = async () => {
        if (!form.name || !form.contactPerson) { showToast('Name and contact required', 'error'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                contact_person: form.contactPerson,
                rera_no: form.reraNo,
                commission_rate: form.commissionRate,
                assigned_projects: form.assignedProjects,
            };
            if (editingId) {
                await channelPartnersApi.update(editingId, payload);
            } else {
                await channelPartnersApi.create(payload);
            }
            showToast(editingId ? 'Partner updated!' : 'Partner added!', 'success');
            setShowModal(false); refetch();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };
    const deletePartner = async (id, e) => {
        e?.stopPropagation();
        try {
            await channelPartnersApi.update(id, { status: 'Inactive' });
            showToast('Partner deactivated', 'success'); refetch();
            if (selectedPartner?.id === id) setSelectedPartner(null);
        } catch { showToast('Failed', 'error'); }
    };


    const copyReferralLink = (pid) => {
        const link = `${window.location.origin}/referral/${pid}`;
        navigator.clipboard.writeText(link);
        showToast('Referral link copied to clipboard!', 'success');
    };

    return (
        <div className="animate-fadeIn">
            {/* ── Page Header ─────────────────────────────────────────── */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 16,
                marginBottom: 24,
                padding: isMobile ? '0 4px' : 0
            }}>
                <div className="page-header-left" style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
                    <h1 className="page-title" style={{ fontSize: isMobile ? '1.75rem' : '2.2rem', margin: 0 }}>Partners</h1>
                    <p className="page-subtitle" style={{ fontSize: isMobile ? '0.85rem' : '1rem', margin: '4px 0 0' }}>{partners.length} agencies · Manage broker network</p>
                </div>
                <div className="page-actions" style={{ width: isMobile ? '100%' : 'auto' }}>
                    <button className="btn btn-primary" onClick={openAdd} style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'center', height: 44, borderRadius: 12 }}>
                        <Plus size={18} /> Add Partner
                    </button>
                </div>
            </div>

            {/* ── Summary Stats ────────────────────────────────────────── */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', 
                gap: isMobile ? 12 : 24, 
                marginBottom: 24 
            }}>
                {[
                    { label: 'Total', value: partners.length, icon: '🤝', color: 'var(--navy-500)', bg: 'var(--navy-50)' },
                    { label: 'Active', value: activeCount, icon: '✅', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)' },
                    { label: 'Referrals', value: totalLeadsReferred, icon: '📋', color: 'var(--accent-cyan-dark)', bg: 'rgba(6,182,212,0.07)' },
                    { label: 'Earning', value: totalCommissionPaid, icon: '💰', color: 'var(--accent-amber-dark)', bg: 'rgba(245,158,11,0.07)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ background: s.bg, border: `1px solid ${s.color}20`, padding: isMobile ? '16px' : '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start', paddingBottom: isMobile ? 100 : 0 }}>
                <div style={{ display: (isMobile && selectedPartner) ? 'none' : 'block' }}>
                    {/* Filters */}
                    <div className="card mb-4" style={{ padding: isMobile ? '16px' : '14px 18px' }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                            <div className="search-bar" style={{ width: isMobile ? '100%' : 260 }}>
                                <Search size={14} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners..." />
                            </div>
                            <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
                                <select className="form-control" style={{ flex: 1 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Pending">Pending</option>
                                </select>
                                <select className="form-control" style={{ flex: 1 }} value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                                    <option value="All">All Cities</option>
                                    {cities.map((c: any) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Partner Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map((partner, idx) => {

                            const isSelected = selectedPartner?.id === partner.id;
                            return (
                                <div
                                    key={partner.id}
                                    className={`card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedPartner(isSelected ? null : partner)}
                                    style={{
                                        padding: '18px 22px',
                                        cursor: 'pointer',
                                        outline: isSelected ? '2px solid var(--navy-400)' : 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 16 }}>
                                        <div style={{
                                            width: isMobile ? 44 : 50, height: isMobile ? 44 : 50, borderRadius: '12px',
                                            background: `linear-gradient(135deg, ${PARTNER_COLORS[idx % PARTNER_COLORS.length]}, ${PARTNER_COLORS[(idx + 2) % PARTNER_COLORS.length]})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.85rem', fontWeight: 800, color: 'white', flexShrink: 0
                                        }}>
                                            {partner.avatar || partner.name?.substring(0, 2).toUpperCase()}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span style={{ fontWeight: 800, fontSize: isMobile ? '0.9rem' : '0.95rem' }}>{partner.name}</span>
                                                <span className={`badge ${STATUS_COLORS[partner.status] || 'badge-slate'}`} style={{ fontSize: '0.6rem' }}>{partner.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                👤 {partner.contact_person || partner.contactPerson} · 📍 {partner.city}
                                            </div>
                                            {!isMobile && <StarRating rating={partner.rating} />}
                                        </div>

                                        {!isMobile && (
                                            <div style={{ display: 'flex', gap: 24, borderLeft: '1px solid var(--border-light)', paddingLeft: 20 }}>
                                                <MiniStat label="Leads" value={partner.total_leads_referred || 0} />
                                                <MiniStat label="Won" value={partner.total_bookings || 0} color="var(--accent-emerald)" />
                                                <MiniStat label="Comm." value={`${partner.commission_rate || partner.commissionRate}%`} />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <button className="btn-icon" onClick={(e) => openEdit(partner, e)}><Edit2 size={14} /></button>
                                            <button className="btn-icon variant-danger" onClick={(e) => deletePartner(partner.id, e)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Info Panel / Drill Down */}
                <div style={{ 
                    position: isMobile ? 'static' : 'sticky', 
                    top: 24, 
                    display: (isMobile && !selectedPartner) ? 'none' : 'block' 
                }}>
                    {selectedPartner ? (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: 24,
                                background: 'linear-gradient(135deg, var(--navy-800), var(--navy-600))',
                                color: 'white'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800
                                    }}>
                                        {selectedPartner.avatar || selectedPartner.name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <button className="btn-icon" style={{ color: 'white' }} onClick={() => setSelectedPartner(null)}><X size={18} /></button>
                                </div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>{selectedPartner.name}</h2>
                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 16 }}>{selectedPartner.company}</div>
                                <button className="btn btn-xs" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }} onClick={() => copyReferralLink(selectedPartner.id)}>
                                    <Share2 size={12} style={{ marginRight: 6 }} /> Copy Referral Link
                                </button>
                            </div>

                            <div style={{ padding: 20 }}>
                                <div className="tabs mb-4">
                                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                                    <button className={`tab ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>Leads ({partnerLeads.length})</button>
                                </div>

                                {activeTab === 'overview' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem' }}><Mail size={14} /> {selectedPartner.email}</div>
                                        <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem' }}><Phone size={14} /> {selectedPartner.phone}</div>
                                        <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem' }}><MapPin size={14} /> {selectedPartner.city}</div>
                                        <div style={{ marginTop: 8, padding: 12, background: 'var(--slate-50)', borderRadius: 8, fontSize: '0.82rem' }}>
                                            <strong>RERA:</strong> {selectedPartner.rera_no || selectedPartner.reraNo || 'N/A'}<br />
                                            <strong>Commission:</strong> {selectedPartner.commission_rate || selectedPartner.commissionRate}%
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {partnerLeads.map(l => (
                                            <div key={l.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{l.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.stage} · {dateUtils.formatSafeDate(l.created_at)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                            <ChevronRight size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p>Select a partner to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingId ? 'Edit Partner' : 'Add Partner'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2" style={{ gap: 16 }}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Firm Name *</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Person *</label>
                                    <input className="form-control" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">RERA No.</label>
                                    <input className="form-control" value={form.reraNo} onChange={e => setForm({ ...form, reraNo: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Comm. Rate (%)</label>
                                    <input className="form-control" type="number" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={savePartner} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
