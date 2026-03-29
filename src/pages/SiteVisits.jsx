import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { siteVisitsApi, leadsApi, projectsApi, usersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, X, MapPin, Clock, Car, CheckCircle, Map as MapIcon, LayoutGrid, Calendar, Trash2 } from 'lucide-react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';

const centerMumbai = { lat: 19.0760, lng: 72.8777 };

const STATUS_STYLE = {
    Scheduled: { icon: <Calendar size={24} /> },
    Completed: { icon: <CheckCircle size={24} /> },
    Cancelled: { icon: <X size={24} /> },
    Rescheduled: { icon: <Calendar size={24} /> },
};

export default function SiteVisits() {
    const { showToast } = useToast();
    const { data: visitsRaw, loading, error, refetch } = useApi(() => siteVisitsApi.list({ limit: 200 }));
    const { data: leadsRes } = useApi(() => leadsApi.list({ limit: 200 }));
    const { data: projectsRaw } = useApi(() => projectsApi.list());
    const { data: usersRaw } = useApi(() => usersApi.list());

    const visits = visitsRaw?.data || visitsRaw || [];
    const allLeads = leadsRes?.data || [];
    const projects = projectsRaw || [];
    const agents = (usersRaw || []).filter(u => ['agent', 'sales_manager'].includes(u.role));

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ lead_id: '', project_id: '', scheduled_at: '', notes: '', status: 'Scheduled', transport: 'Agent Car', assigned_to: '' });
    const [filterStatus, setFilterStatus] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [saving, setSaving] = useState(false);

    const [selectedMarker, setSelectedMarker] = useState(null);

    const filtered = visits.filter(v => filterStatus === 'All' || v.status === filterStatus);

    // Map script
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: 'DUMMY_KEY_FOR_DEMO_REPLACE_IN_PRODUCTION',
    });

    // Mock coordinates generation
    const markers = useMemo(() => {
        return filtered.map(v => {
            const offsetLat = ((v.id * 17) % 100) / 1000 - 0.05;
            const offsetLng = ((v.id * 23) % 100) / 1000 - 0.05;
            return {
                ...v,
                lat: centerMumbai.lat + offsetLat,
                lng: centerMumbai.lng + offsetLng,
            };
        });
    }, [filtered]);

    const save = async () => {
        if (!form.lead_id || !form.scheduled_at) { showToast('Lead and date required', 'error'); return; }
        setSaving(true);
        try {
            await siteVisitsApi.create({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
            showToast('Site visit planned!', 'success'); setShowModal(false); refetch();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };

    const markComplete = async (id) => {
        try { await siteVisitsApi.update(id, { status: 'Completed' }); refetch(); }
        catch { showToast('Failed to update', 'error'); }
    };

    const deleteVisit = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this visit?')) return;
        try { await siteVisitsApi.update(id, { status: 'Cancelled' }); refetch(); }
        catch { showToast('Delete failed', 'error'); }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const completedThisMonth = visits.filter(v => {
        const d = new Date(v.scheduled_at);
        const now = new Date();
        return v.status === 'Completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <div className="animate-fadeIn site-visit-planner-layout">
            {/* Header Section */}
            <div className="site-visit-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Site Visits</h1>
                    <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0 }}>Schedule and track property showcases for your leads</p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <button 
                            className={viewMode === 'grid' ? 'active' : ''} 
                            onClick={() => setViewMode('grid')}
                            style={{ 
                                borderRadius: 8, padding: '8px 20px', fontSize: '12px', fontWeight: 800, 
                                background: viewMode === 'grid' ? '#0f172a' : 'transparent', 
                                color: viewMode === 'grid' ? 'white' : '#64748b',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                transition: 'all 0.2s'
                            }}
                        >
                            <LayoutGrid size={14} /> Board
                        </button>
                        <button 
                            className={viewMode === 'map' ? 'active' : ''} 
                            onClick={() => setViewMode('map')}
                            style={{ 
                                borderRadius: 8, padding: '8px 20px', fontSize: '12px', fontWeight: 800, 
                                background: viewMode === 'map' ? '#0f172a' : 'transparent', 
                                color: viewMode === 'map' ? 'white' : '#64748b',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                transition: 'all 0.2s'
                            }}
                        >
                            <MapIcon size={14} /> Map
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ height: 34, borderRadius: '10px', padding: '0 16px', background: '#0f172a', color: 'white', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, border: 'none', boxShadow: '0 4px 12px rgba(15,23,42,0.15)' }}>
                        <Plus size={16} strokeWidth={3} /> Plan Visit
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="visit-stats-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#0a1628', borderRadius: 18, padding: '12px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 30px rgba(10,22,40,0.2)' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: 4, color: '#ffffff' }}>Conversion Pipeline</h4>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                            Avg conversion: <span style={{ color: '#10b981', fontWeight: 900 }}>24.5%</span>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: 100, position: 'relative', zIndex: 2 }}>
                        <div style={{ fontSize: '7px', fontWeight: 900, opacity: 0.6, textTransform: 'uppercase', marginBottom: 1, letterSpacing: '0.1em' }}>This Month</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1, margin: '1px 0' }}>{completedThisMonth}</div>
                        <div style={{ fontSize: '9px', fontWeight: 800, opacity: 0.6 }}>Completed</div>
                    </div>
                </div>

                <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 18, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 16px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: 44, height: 44, background: '#e0f2f1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                        <Car size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.08em' }}>Logistics Health</div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>98% On-Time rate</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginTop: 1 }}>Transport synchronized</div>
                    </div>
                </div>
            </div>

            {/* Integrated Filter Bar */}
            <div className="filter-bar-integrated">
                <div className="tabs">
                    {['All', 'Scheduled', 'Completed', 'Cancelled'].map(s => (
                        <button
                            key={s}
                            className={`tab ${filterStatus === s ? 'active' : ''}`}
                            onClick={() => setFilterStatus(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="count-info">
                    {filtered.length} showing out of {visits.length} total
                </div>
            </div>

            {/* Grid vs Map */}
            {viewMode === 'map' ? (
                <div className="glass-card" style={{ height: 600, padding: 0, overflow: 'hidden', borderRadius: 40, border: '1px solid var(--slate-200)' }}>
                    {!isLoaded ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={centerMumbai}
                            zoom={12}
                            options={{ disableDefaultUI: true, zoomControl: true }}
                        >
                            {markers.map(m => (
                                <MarkerF
                                    key={m.id}
                                    position={{ lat: m.lat, lng: m.lng }}
                                    onClick={() => setSelectedMarker(m)}
                                />
                            ))}
                            {selectedMarker && (
                                <InfoWindowF position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }} onCloseClick={() => setSelectedMarker(null)}>
                                    <div style={{ padding: 10 }}>
                                        <strong>{selectedMarker.lead_name || selectedMarker.leadName}</strong>
                                        <div>{selectedMarker.project_name || selectedMarker.projectName}</div>
                                        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>{selectedMarker.status}</div>
                                    </div>
                                </InfoWindowF>
                            )}
                        </GoogleMap>
                    )}
                </div>
            ) : (
                <div className="site-visit-grid-premium">
                    {filtered.map(visit => (
                        <div key={visit.id} className="visit-card-premium">
                            <div className="status-tag">{visit.status}</div>
                            
                            <div className="card-header-main">
                                <div className="icon-container">
                                    {STATUS_STYLE[visit.status]?.icon || <Calendar size={24} />}
                                </div>
                                <div>
                                    <div className="name">{visit.lead_name || visit.leadName}</div>
                                    <div className="transport">
                                        <Car size={14} /> Shared Cab
                                    </div>
                                </div>
                            </div>

                            <div className="info-list">
                                <div className="info-item">
                                    <div className="icon-box"><MapPin size={20} /></div>
                                    {visit.project_name || visit.projectName || 'Zentrix Heights'}
                                </div>
                                <div className="info-item">
                                    <div className="icon-box"><Clock size={20} /></div>
                                    {new Date(visit.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="agent-info">
                                <div className="agent-avatar">
                                    {(visit.agent_name || visit.agentName || 'A').charAt(0)}
                                </div>
                                <div className="agent-name">{visit.agent_name || visit.agentName || 'Neha Gupta'}</div>
                            </div>

                            <div className="action-footer">
                                {visit.status === 'Scheduled' && (
                                    <button className="btn-complete" onClick={() => markComplete(visit.id)}>
                                        <CheckCircle size={20} /> Complete
                                    </button>
                                )}
                                <button className="btn-cancel" onClick={() => deleteVisit(visit.id)}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 20 }}>🏡</div>
                    <h3>No site visits found</h3>
                    <p>Try changing the filters or plan a new visit.</p>
                </div>
            )}

            {/* Modal remains largely same but with premium tweaks if needed */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass-card" style={{ maxWidth: 600, borderRadius: 32 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Plan Site Visit</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Client Name</label>
                                    <select className="form-control" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                                        <option value="">Select lead...</option>
                                        {allLeads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Project</label>
                                    <select className="form-control" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                                        <option value="">Select project...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Scheduled Time</label>
                                    <input type="datetime-local" className="form-control" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assigned Agent</label>
                                    <select className="form-control" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                        <option value="">Select agent...</option>
                                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Plan Visit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
