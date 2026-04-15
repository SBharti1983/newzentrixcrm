import { useState, useMemo, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { siteVisitsApi, leadsApi, projectsApi, usersApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { 
    Plus, X, MapPin, Clock, Car, CheckCircle, Map as MapIcon, 
    LayoutGrid, Calendar, Trash2, ChevronRight, Search, 
    Navigation2, MoreHorizontal, User, Building2, Timer,
    Sparkles, Target, Zap, Phone
} from 'lucide-react';
import { dialerEvents } from '../constants/events';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useMobile } from '../hooks/useMobile';

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
    
    const safeDate = (dateStr) => {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'TBD';
            return d.toLocaleString('en-IN', { 
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true 
            });
        } catch (e) {
            return 'TBD';
        }
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

    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => document.head.removeChild(styleEl);
    }, []);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const completedThisMonth = visits.filter(v => {
        const d = new Date(v.scheduled_at);
        const now = new Date();
        return v.status === 'Completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <div className="site-visit-command" style={{ padding: isMobile ? '20px' : '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* 🏎️ Logistics Control Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '32px' : '48px', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 24 : 0 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <Navigation2 size={20} color={COLORS.indigo} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.indigo, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            Showcase Logistics Command
                        </span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, color: COLORS.slate950, letterSpacing: '-1px' }}>
                        Site Visit <span style={{ color: COLORS.indigo }}>Radar</span>
                    </h1>
                    <p style={{ margin: '6px 0 0', color: COLORS.slate500, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600 }}>
                        Orchestrating premium property tours and real-time attendance tracking.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '10px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                    <div className="premium-card" style={{ display: 'flex', padding: '6px', borderRadius: '18px', background: 'white', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                        <button className="view-toggle-btn" onClick={() => setViewMode('grid')} style={{ 
                            background: viewMode === 'grid' ? COLORS.slate950 : 'transparent', 
                            color: viewMode === 'grid' ? 'white' : COLORS.slate500,
                            flex: isMobile ? 1 : 'none',
                            padding: isMobile ? '8px 16px' : '10px 24px'
                        }}>
                            <LayoutGrid size={18} /> Board
                        </button>
                        <button className="view-toggle-btn" onClick={() => setViewMode('map')} style={{ 
                            background: viewMode === 'map' ? COLORS.slate950 : 'transparent', 
                            color: viewMode === 'map' ? 'white' : COLORS.slate500,
                            flex: isMobile ? 1 : 'none',
                            padding: isMobile ? '8px 16px' : '10px 24px'
                        }}>
                            <MapIcon size={18} /> Map
                        </button>
                    </div>
                    <button onClick={() => setShowModal(true)} style={{ 
                        background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.violet})`, 
                        color: 'white', border: 'none', padding: '14px 28px', borderRadius: '18px',
                        fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '0 12px 24px rgba(99, 102, 241, 0.3)', cursor: 'pointer', transition: 'all 0.3s ease',
                        width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                    }}>
                        <Plus size={20} strokeWidth={3} /> Plan Visit
                    </button>
                </div>
            </div>

            {/* 📈 Real-time Analytics Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '16px' : '32px', marginBottom: '48px' }}>
                <div className="premium-card" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.slate950} 0%, ${COLORS.slate800} 100%)`, 
                    padding: isMobile ? '16px 20px' : '20px 32px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 20 : 0
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.indigo, marginBottom: '4px' }}>
                            <Zap size={16} fill={COLORS.indigo} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conversion Peak</span>
                        </div>
                        <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 950, margin: 0 }}>Site Showcase Momentum</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px', fontSize: '0.85rem', fontWeight: 600 }}>Avg conversion velocity: <span style={{ color: COLORS.emerald }}>24.5%</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 950, color: COLORS.white }}>{completedThisMonth}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Completed</div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 950, color: COLORS.indigo }}>{visits.filter(v => v.status === 'Scheduled').length}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Scheduled</div>
                        </div>
                    </div>
                </div>

                <div className="premium-card" style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        width: 48, height: 48, borderRadius: '16px', background: `${COLORS.emerald}10`, color: COLORS.emerald,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Car size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase', marginBottom: '4px' }}>Logistics Health</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950 }}>98.2% On-Time</div>
                    </div>
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                    <div className="glass-modal" style={{ width: '100%', maxWidth: '640px', borderRadius: '40px', padding: '40px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 950, letterSpacing: '-1px' }}>New Visit Mission</h1>
                                <p style={{ margin: '4px 0 0', color: COLORS.slate500, fontWeight: 600 }}>Schedule agent-led property showcase.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: COLORS.slate100, border: 'none', width: 44, height: 44, borderRadius: '14px', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '24px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Client</label>
                                <select className="input-field" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                                    <option value="">Select lead...</option>
                                    {allLeads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination Property</label>
                                <select className="input-field" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                                    <option value="">Select project...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mission Timestamp</label>
                                <input type="datetime-local" className="input-field" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Agent</label>
                                <select className="input-field" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                    <option value="">Select agent...</option>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logistics Notes</label>
                                <textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special VIP requirements or travel details..." />
                            </div>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '18px', border: `2px solid ${COLORS.slate200}`, fontWeight: 900, background: 'transparent', cursor: 'pointer' }}>Cancel Mission</button>
                            <button onClick={save} disabled={saving} style={{ 
                                flex: 2, padding: '16px', borderRadius: '18px', border: 'none', background: COLORS.slate950, 
                                color: 'white', fontWeight: 900, boxShadow: '0 12px 24px rgba(15,23,42,0.2)', cursor: 'pointer' 
                            }}>
                                {saving ? 'Initializing...' : 'Launch Site Visit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
