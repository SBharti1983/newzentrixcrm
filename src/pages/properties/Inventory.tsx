import { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { projectsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { 
    Plus, Search, X, Map as MapIcon, List, Eye, 
    CheckCircle2, Clock, TrendingUp, Building2, 
    Layers, Maximize2, Compass, Car, History,
    ShieldCheck, Sparkles, Box, LayoutGrid, ChevronRight,
    ArrowUpRight, MapPin, DollarSign, Wallet
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import InventoryMap from '../../components/shared/InventoryMap';

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
    glass: 'rgba(255, 255, 255, 0.85)',
    glassDark: 'rgba(15, 23, 42, 0.95)'
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.inventory-vault {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${COLORS.slate900};
    perspective: 1500px;
}

.premium-card {
    background: white;
    border: 1px solid var(--border-light);
    border-radius: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.premium-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.06);
    border-color: ${COLORS.indigo}40;
}

.unit-card-luxury {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.unit-image-placeholder {
    height: 140px;
    background: linear-gradient(135deg, ${COLORS.slate900}, ${COLORS.slate800});
    position: relative;
    overflow: hidden;
}

.unit-image-placeholder::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%);
}

.badge-status {
    position: absolute;
    top: 16px;
    left: 16px;
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    z-index: 2;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
}

.status-Available { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-Sold { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.status-Booked { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.status-OnHold { background: rgba(100, 116, 139, 0.2); color: #64748b; }

.price-tag {
    position: absolute;
    bottom: 16px;
    left: 16px;
    color: white;
    font-weight: 900;
    font-size: 1.1rem;
    z-index: 2;
    letter-spacing: -0.5px;
}

.input-lux {
    padding: 14px 18px;
    border-radius: 16px;
    border: 1.5px solid ${COLORS.slate200};
    font-family: inherit;
    font-weight: 700;
    transition: all 0.2s;
}
.input-lux:focus {
    outline: none;
    border-color: ${COLORS.indigo};
    box-shadow: 0 0 0 4px ${COLORS.indigo}15;
}

@keyframes draw-flow {
    to { stroke-dashoffset: 0; }
}

.path-anim {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: draw-flow 4s forwards linear;
}

.shimmer-ai {
    background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255, 255, 255, 0.05), rgba(255,255,255,0));
    background-size: 200% 100%;
    animation: shimmer-anim 4s infinite linear;
}

@keyframes shimmer-anim {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
`;

export default function Inventory() {
    const { showToast } = useToast();
    const isMobile = useMobile();
    const { data: projectsRaw, loading: loadingProjects, error: projError, refetch: refetchProjects } = useApi(() => projectsApi.list());
    const projects = useMemo(() => projectsRaw || [], [projectsRaw]);

    const [units, setUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [unitsError, setUnitsError] = useState(null);

    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => { document.head.removeChild(styleEl); };
    }, []);

    useEffect(() => {
        if (!projects.length) return;
        setLoadingUnits(true); setUnitsError(null);
        Promise.all(projects.map(p =>
            projectsApi.inventory(p.id)
                .then(r => (r || []).map(u => ({ ...u, projectId: p.id, projectName: p.name })))
                .catch(() => [])
        )).then(arr => { setUnits(arr.flat()); setLoadingUnits(false); })
          .catch(err => { setUnitsError(err?.error || 'Failed to load units'); setLoadingUnits(false); });
    }, [projects]);

    const refetchUnits = () => {
        if (!projects.length) return;
        setLoadingUnits(true);
        Promise.all(projects.map(p =>
            projectsApi.inventory(p.id)
                .then(r => (r || []).map(u => ({ ...u, projectId: p.id, projectName: p.name })))
                .catch(() => [])
        )).then(arr => { setUnits(arr.flat()); setLoadingUnits(false); })
          .catch(() => setLoadingUnits(false));
    };

    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ projectId: 1, unitNo: '', type: '3BHK', floor: '', area: '', price: '', status: 'Available', facing: 'East', parking: 1 });
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [updatingUnit, setUpdatingUnit] = useState(false);

    const filtered = units.filter(u => {
        const ms = (u.unit_no || u.unitNo || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.projectName || '').toLowerCase().includes(search.toLowerCase());
        const mp = filterProject === 'All' || String(u.projectId) === filterProject;
        const ms2 = filterStatus === 'All' || u.status === filterStatus;
        return ms && mp && ms2;
    });

    const save = async () => {
        if (!form.unitNo) { showToast('Unit number required', 'error'); return; }
        setSaving(true);
        try {
            await projectsApi.addUnit(parseInt(form.projectId), {
                unit_no: form.unitNo, property_type: form.type, floor: parseInt(form.floor) || null,
                area_sqft: parseInt(form.area) || null, base_price: form.price, status: form.status,
                facing: form.facing, parking: parseInt(form.parking) || 0,
            });
            showToast('Unit added!', 'success'); setShowModal(false); refetchUnits();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };

    const handleUpdateUnit = async (unitId, updates) => {
        const u = units.find(x => x.id === unitId);
        if (!u) return;
        setUpdatingUnit(true);
        try {
            await projectsApi.updateUnit(u.projectId, unitId, updates);
            showToast('Synchronized!', 'success');
            setSelectedUnit(prev => ({...prev, ...updates}));
            refetchUnits();
        } catch (err) { showToast(err.error || 'Sync failed', 'error'); } finally { setUpdatingUnit(false); }
    };

    const loading = loadingProjects || loadingUnits;
    const error = projError || unitsError;

    const counts = Object.fromEntries(['Available', 'Booked', 'Sold'].map(s => [s, units.filter(u => u.status === s).length]));

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={() => { refetchProjects(); refetchUnits(); }} />;

    return (
        <div className="inventory-vault" style={{ 
            padding: isMobile ? '16px' : '32px 40px', 
            paddingBottom: isMobile ? 100 : 32,
            background: '#f8fafc', 
            minHeight: '100vh' 
        }}>
            
            {/* 💎 Asset Intelligence Ribbon */}
            <div className="premium-card shimmer-ai" style={{ 
                background: `linear-gradient(135deg, ${COLORS.slate950} 0%, ${COLORS.slate900} 100%)`, 
                padding: isMobile ? '24px 20px' : '18px 40px', color: 'white', marginBottom: isMobile ? '24px' : '32px', border: 'none'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 24 : 0 }}>
                    <div style={{ display: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                             <Box size={14} color={COLORS.cyan} strokeWidth={2.5} />
                             <span style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.cyan, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                 Institutional Asset Repository
                             </span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 950, letterSpacing: '-1px', lineHeight: 1.1, color: COLORS.white }}>
                            Asset <span style={{ color: COLORS.cyan }}>Vault</span>
                        </h1>
                        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>
                            {units.length} institutional assets.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: isMobile ? '20px' : '32px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', borderTop: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingTop: isMobile ? 20 : 0 }}>
                        <div style={{ display: 'flex', gap: isMobile ? 16 : 32 }}>
                            {[
                                { label: 'Live', val: counts.Available, color: COLORS.emerald },
                                { label: 'Booked', val: counts.Booked, color: COLORS.amber },
                            ].map((stat, i) => (
                                <div key={i} style={{ textAlign: isMobile ? 'left' : 'center' }}>
                                    <div style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: 950, color: stat.color, letterSpacing: '-0.5px' }}>{stat.val}</div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowModal(true)} style={{ 
                            background: COLORS.white, 
                            color: COLORS.slate950, 
                            border: 'none', 
                            padding: isMobile ? '10px 16px' : '12px 24px', 
                            borderRadius: '12px',
                            fontWeight: 950, 
                            fontSize: '0.8rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }} className="hover-lift">
                            <Plus size={16} strokeWidth={3} /> ADD
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: isMobile ? '24px' : '40px', alignItems: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ 
                    flex: isMobile ? '1 1 100%' : '2 1 400px', 
                    padding: '0 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    background: 'white',
                    border: `1.5px solid ${COLORS.slate200}`,
                    borderRadius: '16px',
                    width: isMobile ? '100%' : 'auto'
                }}>
                    <Search size={16} color={COLORS.slate400} strokeWidth={2.5} />
                    <input 
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search assets..."
                        style={{ 
                            width: '100%', 
                            height: '48px', 
                            border: 'none', 
                            background: 'transparent', 
                            outline: 'none', 
                            fontWeight: 700, 
                            fontSize: '0.9rem',
                            color: COLORS.slate950
                        }}
                    />
                </div>

                <div style={{ 
                    display: 'flex', 
                    background: 'white',
                    border: `1.5px solid ${COLORS.slate200}`,
                    borderRadius: '16px',
                    flex: isMobile ? '1 1 100%' : '1 1 auto',
                    width: isMobile ? '100%' : 'auto',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <select 
                            value={filterProject} onChange={e => setFilterProject(e.target.value)}
                            style={{ 
                                width: '100%',
                                padding: '0 12px', 
                                height: '48px', 
                                border: 'none', 
                                background: 'transparent', 
                                fontWeight: 850, 
                                fontSize: '0.7rem', 
                                color: COLORS.slate950, 
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            <option value="All">Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div style={{ width: '1px', background: COLORS.slate200, margin: '14px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <select 
                            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            style={{ 
                                width: '100%',
                                padding: '0 12px', 
                                height: '48px', 
                                border: 'none', 
                                background: 'transparent', 
                                fontWeight: 850, 
                                fontSize: '0.7rem', 
                                color: COLORS.slate950, 
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            <option value="All">Status</option>
                            {['Available', 'Booked', 'Sold', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {!isMobile && (
                    <div style={{ 
                        display: 'flex', 
                        padding: '4px',
                        background: COLORS.slate50,
                        border: `1.5px solid ${COLORS.slate200}`,
                        borderRadius: '16px'
                    }}>
                        <button onClick={() => setViewMode('grid')} style={{ 
                            width: 44, height: 44, borderRadius: '12px', border: 'none',
                            background: viewMode === 'grid' ? 'white' : 'transparent',
                            color: viewMode === 'grid' ? COLORS.slate950 : COLORS.slate500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}>
                            <LayoutGrid size={20} />
                        </button>
                        <button onClick={() => setViewMode('list')} style={{ 
                            width: 44, height: 44, borderRadius: '12px', border: 'none',
                            background: viewMode === 'list' ? 'white' : 'transparent',
                            color: viewMode === 'list' ? COLORS.slate950 : COLORS.slate500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}>
                            <List size={22} />
                        </button>
                    </div>
                )}
            </div>

            {/* 🏗️ Assets Display */}
            {viewMode === 'list' && !isMobile ? (
                <div className="premium-card" style={{ padding: 0, background: 'white' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ background: COLORS.slate50 }}>
                            <tr style={{ textAlign: 'left', color: COLORS.slate500, fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                <th style={{ padding: '20px 32px' }}>Asset ID</th>
                                <th style={{ padding: '20px 32px' }}>Project Portfolio</th>
                                <th style={{ padding: '20px 32px' }}>Config / Floor</th>
                                <th style={{ padding: '20px 32px' }}>Valuation</th>
                                <th style={{ padding: '20px 32px' }}>Status</th>
                                <th style={{ padding: '20px 32px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(unit => (
                                <tr key={unit.id} className="hover-lift" style={{ borderBottom: `1px solid ${COLORS.slate50}`, transition: '0.2s' }}>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ fontWeight: 950, fontSize: '1.05rem', color: COLORS.slate950, letterSpacing: '-0.3px' }}>{unit.unit_no || unit.unitNo}</div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ fontWeight: 800, color: COLORS.slate700, fontSize: '0.9rem' }}>{unit.projectName}</div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ fontWeight: 850, fontSize: '0.9rem', color: COLORS.slate800 }}>{unit.property_type || unit.type}</div>
                                        <div style={{ fontSize: '0.72rem', color: COLORS.slate400, fontWeight: 700, marginTop: 2 }}>Floor {unit.floor} • {unit.facing}</div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ fontWeight: 900, color: COLORS.slate950, fontSize: '1rem' }}>
                                            {unit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unit.base_price) : unit.price}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div className={`badge-status status-${(unit.status || 'Available').replace(' ', '')}`} style={{ position: 'relative', top: 0, left: 0, padding: '4px 10px', fontSize: '0.6rem' }}>
                                            {unit.status}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                                        <button onClick={() => setSelectedUnit(unit)} className="hover-lift" style={{ 
                                            background: `${COLORS.indigo}10`, color: COLORS.indigo, border: 'none', 
                                            padding: '10px 18px', borderRadius: '12px', cursor: 'pointer',
                                            fontWeight: 900, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6
                                        }}>
                                            Detail <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '20px' : '32px' }}>
                    {filtered.map(unit => (
                        <div key={unit.id} className="premium-card unit-card-luxury" onClick={() => setSelectedUnit(unit)} style={{ cursor: 'pointer' }}>
                            <div className="unit-image-placeholder" style={{ height: isMobile ? 120 : 140 }}>
                                <div className={`badge-status status-${(unit.status || 'Available').replace(' ', '')}`} style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', padding: isMobile ? '4px 10px' : '6px 14px' }}>
                                    {unit.status}
                                </div>
                                <div className="price-tag" style={{ fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
                                    {unit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unit.base_price) : unit.price}
                                </div>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.05)' }}>
                                    <Building2 size={isMobile ? 80 : 120} />
                                </div>
                            </div>
                            <div style={{ padding: isMobile ? '20px' : '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 950, fontSize: isMobile ? '1.2rem' : '1.4rem', color: COLORS.slate950, letterSpacing: '-0.8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.unit_no || unit.unitNo}</div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: COLORS.slate500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.projectName}</div>
                                    </div>
                                    <div style={{ background: `${COLORS.indigo}10`, color: COLORS.indigo, padding: '4px 10px', borderRadius: '10px', fontWeight: 900, fontSize: '0.65rem', flexShrink: 0 }}>
                                        {unit.property_type || unit.type}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ background: COLORS.slate50, padding: '10px', borderRadius: '14px' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>Floor</div>
                                        <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{unit.floor} Tier</div>
                                    </div>
                                    <div style={{ background: COLORS.slate50, padding: '10px', borderRadius: '14px' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>Structure</div>
                                        <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{unit.facing}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 🛸 Selected Asset Side Ledger */}
            {selectedUnit && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', justifyContent: isMobile ? 'flex-end' : 'flex-end', alignItems: isMobile ? 'flex-end' : 'stretch' }} onClick={() => setSelectedUnit(null)}>
                    <div className="premium-card animate-slideUp" style={{ 
                        width: '100%', 
                        maxWidth: isMobile ? '100%' : '480px', 
                        height: isMobile ? '85vh' : '100%', 
                        borderRadius: isMobile ? '32px 32px 0 0' : '40px 0 0 40px', 
                        background: 'white', 
                        position: 'relative', 
                        overflowY: 'auto' 
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: isMobile ? '32px 24px' : '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.indigo, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Institutional Ledger</div>
                                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 950, color: COLORS.slate950 }}>Unit {selectedUnit.unit_no || selectedUnit.unitNo}</h2>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: COLORS.slate500, marginTop: 4 }}>{selectedUnit.projectName}</div>
                                </div>
                                <button onClick={() => setSelectedUnit(null)} style={{ background: COLORS.slate50, border: 'none', width: 44, height: 44, borderRadius: '14px', cursor: 'pointer', flexShrink: 0 }}><X size={24} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <div style={{ background: COLORS.slate50, padding: '24px', borderRadius: '24px', border: `1px solid ${COLORS.slate200}` }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '16px' }}>Status Lifecycle Control</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {['Available', 'Booked', 'Sold', 'On Hold'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleUpdateUnit(selectedUnit.id, { status: s })}
                                                disabled={updatingUnit}
                                                style={{ 
                                                    padding: '12px', borderRadius: '14px', border: 'none',
                                                    background: selectedUnit.status === s ? COLORS.slate950 : 'white',
                                                    color: selectedUnit.status === s ? 'white' : COLORS.slate500,
                                                    fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: '0.2s'
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    {[
                                        { label: 'Project Portfolio', val: selectedUnit.projectName, icon: Building2 },
                                        { label: 'Market Valuation', val: selectedUnit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedUnit.base_price) : selectedUnit.price, icon: Wallet },
                                        { label: 'Architecture', val: selectedUnit.facing, icon: Compass },
                                        { label: 'Floor Tier', val: selectedUnit.floor, icon: Layers }
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <item.icon size={14} color={COLORS.slate400} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>{item.label}</span>
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.slate950 }}>{item.val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ padding: '24px', background: `${COLORS.emerald}05`, borderRadius: '24px', border: `1px dashed ${COLORS.emerald}30`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: COLORS.emerald, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 950, color: COLORS.slate950 }}>Verified Integrity</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.slate500 }}>Asset status is synchronized with real-world availability.</div>
                                    </div>
                                </div>

                                <button style={{ marginTop: '20px', width: '100%', padding: '20px', borderRadius: '22px', border: `2px solid ${COLORS.slate950}`, color: COLORS.slate950, fontWeight: 950, fontSize: '1rem', background: 'transparent', cursor: 'pointer' }}>
                                    View Interaction Audit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛸 Global Asset Registration Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                    <div className="premium-card" style={{ width: '100%', maxWidth: '640px', padding: '48px', background: 'white' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 32px', fontSize: '2.2rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-1.5px' }}>Register New Asset</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Target Portfolio</label>
                                <select className="input-lux" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Unit Identifier</label>
                                <input className="input-lux" value={form.unitNo} onChange={e => setForm({ ...form, unitNo: e.target.value })} placeholder="B-2402" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Configuration</label>
                                <select className="input-lux" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    {['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Penthouse', 'Commercial'].map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Valuation (INR)</label>
                                <input className="input-lux" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="9.5Cr" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Floor Tier</label>
                                <input className="input-lux" type="number" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="24" />
                            </div>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '20px', border: `2px solid ${COLORS.slate200}`, fontWeight: 900, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={save} disabled={saving} style={{ 
                                flex: 2, padding: '18px', borderRadius: '20px', border: 'none', background: COLORS.slate950, 
                                color: 'white', fontWeight: 900, boxShadow: '0 12px 24px rgba(15,23,42,0.2)', cursor: 'pointer' 
                            }}>
                                {saving ? 'Synthesizing...' : 'Register Asset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
