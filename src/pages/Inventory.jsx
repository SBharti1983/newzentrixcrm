import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { projectsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { 
    Plus, Search, X, Map as MapIcon, List, Eye, 
    CheckCircle2, Clock, TrendingUp, Building2, 
    Layers, Maximize2, Compass, Car, History
} from 'lucide-react';
import InventoryMap from '../components/InventoryMap';

const STATUS_BADGE = {
    Available: 'badge-green',
    Sold: 'badge-red',
    Booked: 'badge-amber',
    'On Hold': 'badge-slate',
};

const DEFAULT_FORM = {
    projectId: 1, unitNo: '', type: '3BHK', floor: '', area: '',
    price: '', status: 'Available', facing: 'East', parking: 1,
};

export default function Inventory() {
    const { showToast } = useToast();
    const { data: projectsRaw, loading: loadingProjects, error: projError, refetch: refetchProjects } = useApi(() => projectsApi.list());
    const projects = useMemo(() => projectsRaw || [], [projectsRaw]);

    const [units, setUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [unitsError, setUnitsError] = useState(null);

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
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('list');
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
            showToast('Unit added!', 'success'); setShowModal(false); setForm(DEFAULT_FORM); refetchUnits();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };

    const handleUpdateUnit = async (unitId, updates) => {
        const u = units.find(x => x.id === unitId);
        if (!u) return;
        setUpdatingUnit(true);
        try {
            await projectsApi.updateUnit(u.projectId, unitId, updates);
            showToast('Inventory synchronized!', 'success');
            setSelectedUnit(null);
            refetchUnits();
        } catch (err) {
            showToast(err.error || 'Sync failed', 'error');
        } finally {
            setUpdatingUnit(false);
        }
    };

    const loading = loadingProjects || loadingUnits;
    const error = projError || unitsError;
    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={() => { refetchProjects(); refetchUnits(); }} />;
    
    const counts = Object.fromEntries(
        ['Available', 'Booked', 'Sold'].map(s => [s, units.filter(u => u.status === s).length])
    );

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 40 }}>
            {/* Asset Intelligence Ribbon */}
            <div style={{ 
                background: 'linear-gradient(135deg, var(--navy-900), #0f172a)', 
                padding: '44px 40px', 
                borderRadius: '32px', 
                marginBottom: 32,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 48px rgba(10,22,40,0.18)'
            }}>
                <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.05 }}>
                    <Layers size={260} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 24 }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-cyan)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp size={16} /> Institutional Asset Tracking
                        </div>
                        <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 900, letterSpacing: '-1.5px' }}>Unit Inventory</h1>
                        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px' }}>Managing {units.length} premium units across {projects.length} strategic projects.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Available Units', value: counts.Available, sub: `${((counts.Available / (units.length || 1)) * 100).toFixed(0)}% Portfolio`, color: 'var(--accent-emerald)' },
                            { label: 'Reservations', value: counts.Booked, sub: 'Strategic Hold', color: 'var(--accent-amber)' },
                            { label: 'Realized Assets', value: counts.Sold, sub: 'Total Absorption', color: 'white' },
                        ].map(m => (
                          <div key={m.label} style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>{m.label}</div>
                              <div style={{ fontSize: '28px', fontWeight: 900, color: m.color }}>{m.value}</div>
                              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 2 }}>{m.sub}</div>
                          </div>
                        ))}
                        <button className="btn hover-lift" onClick={() => setShowModal(true)} style={{ 
                            background: 'white', color: 'var(--navy-900)', fontWeight: 900, height: 52, padding: '0 28px', borderRadius: '18px', border: 'none',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)', fontSize: '13px', flexShrink: 0
                        }}>
                             <Plus size={18} /> ADD INVENTORY
                        </button>
                    </div>
                </div>
            </div>

            {/* Smart Asset Filters */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ width: 300, background: 'white', border: '1px solid #f1f5f9', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', paddingLeft: 20 }}>
                    <Search size={18} style={{ color: 'var(--slate-400)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Locate specific unit..." style={{ fontWeight: 600, height: 48 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, background: 'white', padding: '6px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: '0 16px', height: 40, border: 'none', background: 'transparent', fontWeight: 800, fontSize: '12px', color: 'var(--navy-600)', outline: 'none' }}>
                        <option value="All">ALL PROJECTS</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                    </select>
                    <div style={{ width: 1, background: '#f1f5f9', margin: '8px 4px' }} />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0 16px', height: 40, border: 'none', background: 'transparent', fontWeight: 800, fontSize: '12px', color: 'var(--navy-600)', outline: 'none' }}>
                        <option value="All">ALL STATUS</option>
                        {['Available', 'Booked', 'Sold', 'On Hold'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, background: 'white', padding: '6px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <button onClick={() => setViewMode('list')} style={{ 
                        width: 44, height: 40, borderRadius: '12px', border: 'none', 
                        background: viewMode === 'list' ? 'var(--navy-50)' : 'transparent',
                        color: viewMode === 'list' ? 'var(--navy-600)' : 'var(--slate-400)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}>
                        <List size={20} />
                    </button>
                    <button onClick={() => setViewMode('map')} style={{ 
                        width: 44, height: 40, borderRadius: '12px', border: 'none', 
                        background: viewMode === 'map' ? 'var(--navy-50)' : 'transparent',
                        color: viewMode === 'map' ? 'var(--navy-600)' : 'var(--slate-400)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}>
                        <MapIcon size={20} />
                    </button>
                </div>
            </div>

            {loading ? <PageLoader /> : error ? <PageError message={error} onRetry={refetch} /> : (
                viewMode === 'map' ? (
                    <div style={{ background: 'white', padding: '16px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px rgba(0,0,0,0.03)' }}>
                        <InventoryMap units={filtered} onUnitClick={(u) => setSelectedUnit(u)} />
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, borderRadius: '32px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 20px 48px rgba(10,22,40,0.03)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    <th style={{ padding: '24px 32px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Asset Identity</th>
                                    <th style={{ padding: '24px 32px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Context</th>
                                    <th style={{ padding: '24px 32px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Configuration</th>
                                    <th style={{ padding: '24px 32px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Market Value</th>
                                    <th style={{ padding: '24px 32px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Asset Status</th>
                                    <th style={{ padding: '24px 32px', textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(unit => {
                                    const projectName = unit.projectName || projects.find(p => p.id === unit.projectId)?.name;
                                    return (
                                        <tr key={unit.id} className="hover-row glass-interactive" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'all 0.2s' }}>
                                            <td style={{ padding: '20px 32px' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '15px' }}>{unit.unit_no || unit.unitNo}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 2 }}>{unit.floor === 0 ? 'GROUND' : `${unit.floor}F`} • Wing {unit.wing || 'Alpha'}</div>
                                            </td>
                                            <td style={{ padding: '20px 32px' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '14px' }}>{projectName}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 2 }}>{unit.type || unit.property_type} • {unit.facing} Facing</div>
                                            </td>
                                            <td style={{ padding: '20px 32px' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '14px' }}>{(unit.area || unit.area_sqft || 0).toLocaleString()} SqFt</div>
                                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 2 }}>Internal Carpet</div>
                                            </td>
                                            <td style={{ padding: '20px 32px' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '15px' }}>
                                                    {unit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unit.base_price) : unit.price}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--accent-emerald-dark)', fontWeight: 800, marginTop: 2 }}>+2.4% Est Yield</div>
                                            </td>
                                            <td style={{ padding: '20px 32px' }}>
                                                <span className={`badge ${STATUS_BADGE[unit.status] || 'badge-slate'}`} style={{ fontWeight: 900, fontSize: '10px', padding: '6px 16px', borderRadius: '10px', minWidth: 100 }}>
                                                    {(unit.status || 'AVAILABLE').toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                                                <button className="icon-btn hover-lift" onClick={() => setSelectedUnit(unit)} style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', background: 'white' }}>
                                                    <Eye size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Unit</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Project *</label>
                                    <select className="form-control" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">Select project...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit No. *</label>
                                    <input className="form-control" value={form.unitNo} onChange={e => setForm({ ...form, unitNo: e.target.value })} placeholder="A-1201" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Penthouse', 'Commercial'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Floor</label>
                                    <input className="form-control" type="number" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="12" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Area (sqft)</label>
                                    <input className="form-control" type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="1450" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Price</label>
                                    <input className="form-control" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="₹95L" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {['Available', 'Booked', 'Sold', 'On Hold'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Facing</label>
                                    <select className="form-control" value={form.facing} onChange={e => setForm({ ...form, facing: e.target.value })}>
                                        {['East', 'West', 'North', 'South', 'Sea View', 'Garden View'].map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Parking Spots</label>
                                    <select className="form-control" value={form.parking} onChange={e => setForm({ ...form, parking: e.target.value })}>
                                        {[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Add Unit'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Unit Side Drawer */}
            {selectedUnit && (
                <div className="modal-overlay" onClick={() => setSelectedUnit(null)} style={{ justifyContent: 'flex-end', background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal animate-slideInRight" onClick={e => e.stopPropagation()} style={{ width: 440, height: '100%', borderRadius: 0, margin: 0, paddingBottom: 80, overflowY: 'auto', background: 'white', boxShadow: '-8px 0 40px rgba(0,0,0,0.1)' }}>
                        <div className="modal-header" style={{ padding: '24px 28px', background: 'var(--slate-50)', borderBottom: '1px solid var(--border-light)' }}>
                            <div>
                                <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--navy-900)' }}>Unit Detail</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--navy-600)' }}>{selectedUnit.projectName}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{selectedUnit.unit_no || selectedUnit.unitNo}</span>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedUnit(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ padding: 16, background: 'var(--slate-50)', borderRadius: 16, border: '1px solid var(--border-light)' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 12 }}>Status Update</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {['Available', 'Booked', 'Sold', 'On Hold'].map(s => (
                                            <button
                                                key={s}
                                                className={`btn btn-sm ${selectedUnit.status === s ? 'btn-primary' : 'btn-white'}`}
                                                style={{ height: 40, border: selectedUnit.status === s ? 'none' : '1px solid var(--border-medium)' }}
                                                onClick={() => handleUpdateUnit(selectedUnit.id, { status: s })}
                                                disabled={updatingUnit}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-2 gap-6">
                                    <div>
                                        <label className="form-label" style={{ fontWeight: 800 }}>Property Type</label>
                                        <div style={{ padding: 12, background: 'white', border: '1px solid var(--border-medium)', borderRadius: 12, fontWeight: 800, color: 'var(--navy-800)' }}>{selectedUnit.type || selectedUnit.property_type}</div>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontWeight: 800 }}>Base Price</label>
                                        <div style={{ padding: 12, background: 'white', border: '1px solid var(--border-medium)', borderRadius: 12, fontWeight: 800, color: 'var(--navy-800)' }}>
                                            {selectedUnit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedUnit.base_price) : selectedUnit.price}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-3 gap-4">
                                    <div style={{ textAlign: 'center', padding: '16px', borderRadius: 16, background: 'var(--slate-50)' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Floor</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)' }}>{selectedUnit.floor}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '16px', borderRadius: 16, background: 'var(--slate-50)' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Area</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)' }}>{selectedUnit.area || selectedUnit.area_sqft}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '16px', borderRadius: 16, background: 'var(--slate-50)' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Facing</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)' }}>{selectedUnit.facing}</div>
                                    </div>
                                </div>

                                <div style={{ paddingTop: 24, borderTop: '1px solid var(--border-light)' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 16 }}>Inventory History</h4>
                                    <div style={{ borderLeft: '2px solid var(--slate-100)', paddingLeft: 20, marginLeft: 8 }}>
                                        <div style={{ position: 'relative', marginBottom: 24 }}>
                                            <div style={{ position: 'absolute', left: -26, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-emerald)', border: '2px solid white' }} />
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Inventory Created</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Initial upload via bulk import</div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: -26, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-cyan)', border: '2px solid white' }} />
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Last Synced</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status verified with property management</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ border: 'none', padding: '24px 32px' }}>
                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setSelectedUnit(null)}>Close View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
