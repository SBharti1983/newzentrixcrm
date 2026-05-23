import { useState, useMemo, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import * as dateUtils from '../../utils/dateUtils';
import { siteVisitsApi, leadsApi, projectsApi, usersApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { 
    Plus, X, MapPin, Clock, Car, CheckCircle, Map as MapIcon, 
    LayoutGrid, Calendar, Trash2, ChevronRight, Search, 
    Navigation2, MoreHorizontal, User, Building2, Timer,
    Sparkles, Target, Zap, Phone, MessageCircle, Edit2
} from 'lucide-react';
import { dialerEvents } from '../../constants/events';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useMobile } from '../../hooks/useMobile';

const centerMumbai = { lat: 19.0760, lng: 72.8777 };

const COLORS = {
    indigo: '#6366f1',
    violet: '#8b5cf6',
    emerald: '#10b981',
    cyan: '#06b6d4',
    rose: '#f43f5e',
    amber: '#f59e0b',
    slate950: '#040d1a',
    slate900: '#0a1628',
    slate800: '#1e293b',
    slate700: '#334155',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate200: '#e2e8f0',
    slate50: '#f8fafc',
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.82)',
    glassDark: 'rgba(15, 23, 42, 0.9)'
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.site-visit-command {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${COLORS.slate900};
}

.premium-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 28px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.4);
    transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.premium-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 25px 50px rgba(0,0,0,0.06);
    background: white;
}

.visit-badge {
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-Scheduled { background: ${COLORS.indigo}10; color: ${COLORS.indigo}; }
.status-Completed { background: ${COLORS.emerald}10; color: ${COLORS.emerald}; }
.status-Cancelled { background: ${COLORS.rose}10; color: ${COLORS.rose}; }
.status-Rescheduled { background: ${COLORS.amber}10; color: ${COLORS.amber}; }

.view-toggle-btn {
    padding: 10px 24px;
    border-radius: 14px;
    font-size: 0.85rem;
    font-weight: 800;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;
}

.glass-modal {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 40px 100px rgba(0,0,0,0.15);
}

.input-field {
    width: 100%;
    padding: 14px 18px;
    border-radius: 16px;
    border: 1.5px solid ${COLORS.slate200};
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    transition: all 0.2s;
    background: white;
}

.input-field:focus {
    outline: none;
    border-color: ${COLORS.indigo};
    box-shadow: 0 0 0 4px ${COLORS.indigo}15;
}

@keyframes float {
    0% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0); }
}

.hover-lift:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0,0,0,0.08);
}
`;

export default function SiteVisits() {
    const { showToast } = useToast();
    const isMobile = useMobile();
    const { data: rawVisits, loading, error, refetch } = useApi(() => siteVisitsApi.list({ limit: 200 }));
    const { data: rawLeads } = useApi(() => leadsApi.list({ limit: 200 }));
    const { data: rawProjects } = useApi(() => projectsApi.list());
    const { data: rawUsers } = useApi(() => usersApi.list());

    const visits = useMemo(() => {
        const data = rawVisits?.data || rawVisits?.visits || rawVisits || [];
        if (!Array.isArray(data)) return [];
        return data.map(v => ({
            ...v,
            scheduled_at: v.scheduled_at || v.scheduledAt,
            lead_id: (typeof v.lead_id === 'object' ? v.lead_id?.id : v.lead_id) || v.leadId,
            lead_name: v.lead_name || v.leadName || v.lead?.name,
            lead_phone: v.lead_phone || v.leadPhone || v.lead?.phone,
            project_id: (typeof v.project_id === 'object' ? v.project_id?.id : v.project_id) || v.projectId,
            project_name: v.project_name || v.projectName || v.project?.name,
            agent_name: v.agent_name || v.agentName || v.agent?.name
        }));
    }, [rawVisits]);

    const allLeads = useMemo(() => {
        const data = rawLeads?.data || rawLeads?.leads || rawLeads || [];
        return Array.isArray(data) ? data : [];
    }, [rawLeads]);

    const projects = useMemo(() => {
        const data = rawProjects?.data || rawProjects?.projects || rawProjects || [];
        return Array.isArray(data) ? data : [];
    }, [rawProjects]);

    const agents = useMemo(() => {
        const users = rawUsers?.data || rawUsers?.users || rawUsers || [];
        if (!Array.isArray(users)) return [];
        return users.filter(u => ['agent', 'sales_manager', 'admin'].includes(u.role));
    }, [rawUsers]);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ id: '', lead_id: '', project_id: '', scheduled_at: '', notes: '', status: 'Scheduled', transport: 'Agent Car', assigned_to: '' });
    const [filterStatus, setFilterStatus] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [saving, setSaving] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);

    const filtered = useMemo(() => {
        return visits.filter(v => filterStatus === 'All' || v.status === filterStatus);
    }, [visits, filterStatus]);
    
    const safeDate = (dateStr) => {
        const d = dateUtils.parseSafe(dateStr);
        if (!d) return 'TBD';
        return d.toLocaleString('en-IN', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true 
        });
    };

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: 'DUMMY_KEY_FOR_DEMO_REPLACE_IN_PRODUCTION',
    });

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
            const data = { 
                ...form, 
                scheduled_at: dateUtils.parseSafe(form.scheduled_at)?.toISOString() || dateUtils.getNow().toISOString() 
            };
            if (form.id) {
                await siteVisitsApi.update(form.id, data);
                showToast('Mission updated!', 'success');
            } else {
                await siteVisitsApi.create(data);
                showToast('Site visit planned!', 'success');
            }
            setShowModal(false); 
            refetch();
        } catch (err: any) { 
            showToast(err?.error || err?.message || 'Failed', 'error'); 
        } finally { 
            setSaving(false); 
        }
    };

    const editVisit = (v) => {
        // Aggressive ID extraction
        const getID = (val) => {
            if (!val) return '';
            if (typeof val === 'object') return String(val.id || val._id || '').trim();
            return String(val).trim();
        };

        const lid = getID(v.lead_id || v.leadId);
        const pid = getID(v.project_id || v.projectId);
        
        let dateVal = '';
        if (v.scheduled_at) {
            const d = new Date(v.scheduled_at);
            if (!isNaN(d.getTime())) {
                const tzOffset = d.getTimezoneOffset() * 60000;
                dateVal = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
            }
        }

        setForm({
            id: v.id,
            lead_id: lid,
            project_id: pid,
            scheduled_at: dateVal,
            notes: v.notes || '',
            status: v.status || 'Scheduled',
            transport: v.transport || 'Agent Car',
            assigned_to: v.assigned_to || ''
        });
        setShowModal(true);
    };

    const markComplete = async (id) => {
        try { await siteVisitsApi.update(id, { status: 'Completed' }); refetch(); }
        catch (err: any) { showToast('Failed to update', 'error'); }
    };

    const deleteVisit = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this visit?')) return;
        try { await siteVisitsApi.update(id, { status: 'Cancelled' }); refetch(); }
        catch (err: any) { showToast('Delete failed', 'error'); }
    };

    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => { document.head.removeChild(styleEl); };
    }, []);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const completedThisMonth = visits.filter(v => {
        const d = dateUtils.parseSafe(v.scheduled_at);
        const now = dateUtils.getNow();
        return v.status === 'Completed' && d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <div className="site-visit-command" style={{ 
            padding: isMobile ? '16px' : '10px 40px', 
            paddingBottom: isMobile ? 100 : 32,
            background: '#f8fafc', 
            minHeight: '100vh' 
        }}>
            
            {/* 🏎️ Logistics Control Header & Analytics */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: isMobile ? 16 : 12, 
                flexDirection: isMobile ? 'column' : 'row', 
                gap: isMobile ? 16 : 0,
                background: isMobile ? 'transparent' : 'white',
                padding: isMobile ? 0 : '8px 20px',
                borderRadius: '20px',
                border: isMobile ? 'none' : `1px solid ${COLORS.slate200}`,
                boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.02)'
            }}>
                {/* 📈 Mini Analytics (Compact) */}
                <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? 8 : 24, 
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {[
                        { label: 'Completed', value: completedThisMonth, icon: <CheckCircle size={14} />, color: COLORS.emerald },
                        { label: 'Scheduled', value: visits.filter(v => v.status === 'Scheduled').length, icon: <Timer size={14} />, color: COLORS.indigo },
                        { label: 'On Time', value: '98%', icon: <Zap size={14} />, color: COLORS.amber },
                        { label: 'Fleet', value: '12 Active', icon: <Car size={14} />, color: COLORS.violet }
                    ].map((s, i) => (
                        <div key={i} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8,
                            padding: '4px 8px'
                        }}>
                            <div style={{ 
                                width: 28, height: 28, borderRadius: '8px', 
                                background: `${s.color}15`, color: s.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {s.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 950, color: COLORS.slate950 }}>{s.value}</div>
                                <div style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', color: COLORS.slate400, letterSpacing: '0.02em' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 🛠️ Controls */}
                <div style={{ display: 'flex', gap: 12, width: isMobile ? '100%' : 'auto', alignItems: 'center' }}>
                    <div style={{ display: 'flex', padding: 3, borderRadius: 12, background: COLORS.slate50, border: `1px solid ${COLORS.slate200}`, flex: isMobile ? 1 : 'none' }}>
                        <button className="view-toggle-btn" onClick={() => setViewMode('grid')} style={{ 
                            background: viewMode === 'grid' ? COLORS.slate950 : 'transparent', 
                            color: viewMode === 'grid' ? 'white' : COLORS.slate500,
                            flex: 1, padding: '6px 16px', fontSize: '0.7rem', borderRadius: '10px'
                        }}>Board</button>
                        <button className="view-toggle-btn" onClick={() => setViewMode('map')} style={{ 
                            background: viewMode === 'map' ? COLORS.slate950 : 'transparent', 
                            color: viewMode === 'map' ? 'white' : COLORS.slate500,
                            flex: 1, padding: '6px 16px', fontSize: '0.7rem', borderRadius: '10px'
                        }}>Map</button>
                    </div>
                    {isMobile && (
                        <button onClick={() => { setForm({ id: '', lead_id: '', project_id: '', scheduled_at: '', notes: '', status: 'Scheduled', transport: 'Agent Car', assigned_to: '' }); setShowModal(true); }} style={{ 
                            background: COLORS.indigo, color: 'white', border: 'none', width: 40, height: 40, borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)'
                        }}><Plus size={20} /></button>
                    )}
                    {!isMobile && (
                        <button onClick={() => { setForm({ id: '', lead_id: '', project_id: '', scheduled_at: '', notes: '', status: 'Scheduled', transport: 'Agent Car', assigned_to: '' }); setShowModal(true); }} style={{ 
                            background: COLORS.indigo, color: 'white', border: 'none', padding: '0 20px', height: 40, borderRadius: 12,
                            fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: `0 4px 12px ${COLORS.indigo}30`
                        }}>
                            <Plus size={16} strokeWidth={3} /> Plan Visit
                        </button>
                    )}
                </div>
            </div>

            {/* 🔍 Global Operations Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '32px', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['All', 'Scheduled', 'Completed', 'Cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            style={{ 
                                padding: isMobile ? '8px 16px' : '10px 24px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 850,
                                background: filterStatus === s ? COLORS.indigo : `${COLORS.indigo}05`,
                                color: filterStatus === s ? 'white' : COLORS.indigo,
                                border: 'none', cursor: 'pointer', transition: 'all 0.3s ease'
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '0.85rem', color: COLORS.slate400, fontWeight: 700 }}>
                    Tracking missions: <span style={{ color: COLORS.slate950 }}>{filtered.length}</span>
                </div>
            </div>

            {/* 🗺️ Radar Interface (Grid vs Map) */}
            {viewMode === 'map' ? (
                <div className="premium-card" style={{ height: isMobile ? '400px' : '600px', padding: 0, overflow: 'hidden' }}>
                    {!isLoaded ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>Initializing Radar...</div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={centerMumbai}
                            zoom={12}
                            options={{ 
                                disableDefaultUI: true, zoomControl: true,
                                styles: [
                                    { featureType: 'all', elementType: 'all', stylers: [{ saturation: -100 }, { gamma: 0.5 }] }
                                ]
                            }}
                        >
                            {markers.map(m => (
                                <MarkerF
                                    key={m.id}
                                    position={{ lat: m.lat, lng: m.lng }}
                                    onClick={() => setSelectedMarker(m)}
                                    icon={{
                                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                                        fillColor: m.status === 'Completed' ? COLORS.emerald : COLORS.indigo,
                                        fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 2
                                    }}
                                />
                            ))}
                            {selectedMarker && (
                                <InfoWindowF position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }} onCloseClick={() => setSelectedMarker(null)}>
                                    <div style={{ padding: 12, minWidth: 200 }}>
                                        <div style={{ fontWeight: 950, fontSize: '1rem', color: COLORS.slate950, marginBottom: '4px' }}>{selectedMarker.lead_name}</div>
                                        <div style={{ fontSize: '0.85rem', color: COLORS.slate500, fontWeight: 700 }}>{selectedMarker.project_name}</div>
                                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className={`visit-badge status-${selectedMarker.status}`}>{selectedMarker.status}</span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button 
                                                    onClick={() => dialerEvents.call(selectedMarker.lead_id, selectedMarker.lead_phone, selectedMarker.lead_name)}
                                                    style={{ background: COLORS.emerald, color: 'white', border: 'none', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <Phone size={14} />
                                                </button>
                                                <button style={{ background: COLORS.indigo, color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 900 }}>View Timeline</button>
                                            </div>
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}
                        </GoogleMap>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
                    {filtered.map(visit => (
                        <div key={visit.id} className="premium-card" style={{ 
                            padding: '20px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            position: 'relative',
                            overflow: 'hidden',
                            background: 'white',
                            border: `1px solid ${COLORS.slate200}`,
                        }}>
                            {/* Accent Top Bar */}
                            <div style={{ 
                                position: 'absolute', top: 0, left: 0, right: 0, height: '3px', 
                                background: `linear-gradient(90deg, ${COLORS.indigo}, ${COLORS.violet})`,
                                opacity: visit.status === 'Scheduled' ? 1 : 0.3
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className={`visit-badge status-${visit.status}`} style={{
                                    padding: '4px 10px', fontSize: '0.65rem',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    border: `1px solid ${visit.status === 'Scheduled' ? COLORS.indigo : COLORS.emerald}20`
                                }}>
                                    {visit.status === 'Completed' ? <CheckCircle size={11} strokeWidth={3} /> : <Clock size={11} strokeWidth={3} />}
                                    {visit.status}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const phone = visit.lead_phone?.replace(/\D/g, '');
                                            if (phone) window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}`, '_blank');
                                        }}
                                        style={{ 
                                            background: '#25D366', 
                                            color: 'white', border: 'none', width: 32, height: 32, borderRadius: '10px', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 10px rgba(37, 211, 102, 0.2)', transition: 'transform 0.2s'
                                        }}
                                        className="hover-lift"
                                    >
                                        <MessageCircle size={14} fill="white" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); dialerEvents.call(visit.lead_id, visit.lead_phone, visit.lead_name); }}
                                        style={{ 
                                            background: `linear-gradient(135deg, ${COLORS.emerald}, #059669)`, 
                                            color: 'white', border: 'none', width: 32, height: 32, borderRadius: '10px', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)', transition: 'transform 0.2s'
                                        }}
                                        className="hover-lift"
                                    >
                                        <Phone size={14} fill="white" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); editVisit(visit); }}
                                        style={{ 
                                            background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.violet})`, 
                                            color: 'white', border: 'none', width: 32, height: 32, borderRadius: '10px', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)', transition: 'transform 0.2s'
                                        }}
                                        className="hover-lift"
                                    >
                                        <Edit2 size={14} fill="white" />
                                    </button>
                                    <button 
                                        onClick={() => deleteVisit(visit.id)} 
                                        style={{ background: `${COLORS.rose}10`, border: 'none', color: COLORS.rose, width: 32, height: 32, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ 
                                    width: 54, height: 54, borderRadius: '18px', 
                                    background: `linear-gradient(135deg, ${COLORS.indigo}15, ${COLORS.indigo}05)`, 
                                    color: COLORS.indigo,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 950,
                                    boxShadow: `inset 0 0 0 1px ${COLORS.indigo}10`,
                                    border: `1px solid ${COLORS.indigo}10`
                                }}>
                                    {visit.lead_name?.charAt(0) || 'L'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-0.5px', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {visit.lead_name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.slate500, fontWeight: 750, fontSize: '0.75rem' }}>
                                        <Car size={12} color={COLORS.indigo} /> <span style={{ opacity: 0.8 }}>Agent Car • VIP Access</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ 
                                display: 'grid', gridTemplateColumns: '1fr', gap: '1px', 
                                background: COLORS.slate200, borderRadius: '16px', overflow: 'hidden',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: COLORS.slate800, fontSize: '0.85rem', fontWeight: 800, background: 'white', padding: '12px 16px' }}>
                                    <MapPin size={14} color={COLORS.indigo} />
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>Destination</span>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{visit.project_name || 'Premium Portfolio'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: COLORS.slate800, fontSize: '0.85rem', fontWeight: 800, background: 'white', padding: '12px 16px' }}>
                                    <Timer size={14} color={COLORS.violet} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>Showcase Time</span>
                                        {safeDate(visit.scheduled_at)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img 
                                        src={`https://ui-avatars.com/api/?name=${visit.agent_name || 'A'}&background=040D1A&color=fff&bold=true`} 
                                        style={{ width: 30, height: 30, borderRadius: '10px', border: `2px solid white`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} 
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>Lead Agent</span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 850, color: COLORS.slate700 }}>{visit.agent_name || 'Unassigned'}</span>
                                    </div>
                                </div>
                                {visit.status === 'Scheduled' && (
                                    <button 
                                        onClick={() => markComplete(visit.id)} 
                                        style={{ 
                                            background: COLORS.slate950, color: 'white', border: 'none', 
                                            padding: '8px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '0.75rem', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', 
                                            boxShadow: '0 4px 12px rgba(4, 13, 26, 0.15)'
                                        }}
                                        className="hover-lift"
                                    >
                                        <CheckCircle size={14} /> Done
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '120px 0', color: COLORS.slate400 }}>
                    <div className="float-anim" style={{ fontSize: '5rem', marginBottom: '24px' }}>🛸</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.slate900 }}>No Missions Detected</h3>
                    <p style={{ fontWeight: 600 }}>Try adjusting your filters or launch a new site visit mission.</p>
                </div>
            )}

            {/* 🛸 Premium Mission Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                    <div className="glass-modal" style={{ 
                        width: '100%', 
                        maxWidth: isMobile ? '100%' : '460px', 
                        height: isMobile ? '85vh' : 'auto',
                        borderRadius: isMobile ? '24px 24px 0 0' : '24px', 
                        padding: '16px 20px', 
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: COLORS.slate950 }}>{form.id ? 'Edit Mission' : 'Plan Mission'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: COLORS.slate50, border: 'none', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
                             <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, fontWeight: 800, color: COLORS.slate500, textTransform: 'uppercase' }}>Client</label>
                                    <select 
                                        key={`lead-${form.id || 'new'}`}
                                        className="input-field" 
                                        style={{ padding: '8px 10px', fontSize: '0.8rem', height: 38 }} 
                                        value={form.lead_id} 
                                        onChange={e => setForm({ ...form, lead_id: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        {allLeads.map(l => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, fontWeight: 800, color: COLORS.slate500, textTransform: 'uppercase' }}>Property</label>
                                    <select 
                                        key={`project-${form.id || 'new'}`}
                                        className="input-field" 
                                        style={{ padding: '8px 10px', fontSize: '0.8rem', height: 38 }} 
                                        value={form.project_id} 
                                        onChange={e => setForm({ ...form, project_id: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                    </select>
                                </div>
                             </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, fontWeight: 800, color: COLORS.slate500, textTransform: 'uppercase' }}>Showcase Time</label>
                                <input type="datetime-local" className="input-field" style={{ padding: '8px 10px', fontSize: '0.8rem', height: 38 }} value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, fontWeight: 800, color: COLORS.slate500, textTransform: 'uppercase' }}>Mission Notes</label>
                                <textarea className="input-field" rows={2} style={{ padding: '8px 10px', fontSize: '0.8rem', lineHeight: 1.4 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any specific requirements..." />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1, height: 38, borderRadius: 10, fontSize: '0.8rem', fontWeight: 800 }}>Cancel</button>
                            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ flex: 2, height: 38, borderRadius: 10, background: COLORS.slate950, fontSize: '0.8rem', fontWeight: 900 }}>
                                {saving ? 'Saving...' : form.id ? 'Update Mission' : 'Confirm Mission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
