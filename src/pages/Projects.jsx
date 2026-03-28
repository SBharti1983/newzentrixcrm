import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { PageLoader, PageError } from '../components/Feedback';
import { projectsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, Search, Building2, MapPin, Home, X, Info, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

const STATUS_BADGE = {
    Active: 'badge-green',
    'Pre-launch': 'badge-violet',
    Completed: 'badge-blue',
    'On Hold': 'badge-amber',
};

const TYPE_ICON = { Residential: '🏢', Villa: '🏡', Luxury: '💎', Commercial: '🏬' };

const DEFAULT_FORM = {
    name: '', location: '', type: 'Residential', units: '', available: '',
    priceRange: '', status: 'Active', completion: '', description: '',
    amenities: '',
};

export default function Projects() {
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [viewProject, setViewProject] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const params = {};
    if (filterStatus !== 'All') params.status = filterStatus;
    const { data: rawProjects, loading, error, refetch } = useApi(
        () => projectsApi.list(params), [filterStatus]
    );

    const projects = (rawProjects || []).filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
    );

    const saveProject = async () => {
        if (!form.name || !form.location) return;
        setSaving(true);
        try {
            await projectsApi.create({
                name: form.name, location: form.location, status: form.status,
                total_units: parseInt(form.units) || 0, available_units: parseInt(form.available) || 0,
                price_range: form.priceRange, rera_number: form.rera,
                possession_date: form.completion || null,
                amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean),
            });
            showToast('Project added!', 'success');
            setShowModal(false); setForm(DEFAULT_FORM); refetch();
        } catch (err) { showToast(err.error || 'Failed to add project', 'error'); }
        finally { setSaving(false); }
    };

    const occupancyPct = (p) => {
        const total = p.total_units || 0;
        const avail = p.available_units || 0;
        return total ? Math.round(((total - avail) / total) * 100) : 0;
    };

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 40 }}>
            {/* Project Intelligence Ribbon */}
            <div style={{ 
                background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', 
                padding: '44px 40px', 
                borderRadius: '32px', 
                marginBottom: 32,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(10,22,40,0.15)'
            }}>
                <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}>
                    <Building2 size={240} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-cyan)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp size={16} /> Portfolio Absorption Pulse
                        </div>
                        <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 900, letterSpacing: '-1.5px' }}>Project Inventory</h1>
                        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px' }}>Monitoring {projects.length} strategic assets with {projects.reduce((s, p) => s + (p.available_units || 0), 0)} units live.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end' }}>
                        {[
                            { label: 'Overall Absorption', value: `${Math.round((projects.reduce((s,p) => s + ((p.total_units || 0) - (p.available_units || 0)), 0) / projects.reduce((s,p) => s + (p.total_units || 1), 0)) * 100)}%`, color: 'var(--accent-emerald)' },
                            { label: 'Visit Velocity', value: '+24%', color: 'var(--accent-cyan)' },
                        ].map(m => (
                          <div key={m.label} style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                              <div style={{ fontSize: '28px', fontWeight: 900, color: m.color }}>{m.value}</div>
                          </div>
                        ))}
                        <button className="btn hover-lift" onClick={() => setShowModal(true)} style={{ 
                            background: 'white', color: 'var(--navy-900)', fontWeight: 900, height: 52, padding: '0 28px', borderRadius: '18px', border: 'none',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)', fontSize: '13px'
                        }}>
                             <Plus size={18} /> ADD PROJECT
                        </button>
                    </div>
                </div>
            </div>

            {/* Smart Filters */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'center' }}>
                <div className="search-bar" style={{ width: 320, background: 'white', border: '1px solid #f1f5f9', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', paddingLeft: 20 }}>
                    <Search size={18} style={{ color: 'var(--slate-400)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Locate specific asset..." style={{ fontWeight: 600, height: 48 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, background: 'white', padding: '6px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    {['All', 'Active', 'Pre-launch', 'Completed'].map(s => (
                        <button 
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            style={{ 
                                padding: '10px 20px', borderRadius: '12px', border: 'none', 
                                background: filterStatus === s ? 'var(--navy-50)' : 'transparent',
                                color: filterStatus === s ? 'var(--navy-600)' : 'var(--slate-400)',
                                fontWeight: 800, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <PageLoader /> : error ? <PageError message={error} onRetry={refetch} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 32 }}>
                    {projects.map(project => {
                        const occ = occupancyPct(project);
                        const isHot = occ > 70;
                        return (
                            <div key={project.id} className="hover-lift" style={{ 
                                background: 'white', borderRadius: '32px', overflow: 'hidden', border: '1px solid #f1f5f9',
                                boxShadow: '0 12px 24px rgba(10,22,40,0.02)', position: 'relative',
                                cursor: 'pointer'
                            }} onClick={() => setViewProject(project)}>
                                
                                {isHot && (
                                    <div style={{ position: 'absolute', top: 24, right: 24, padding: '6px 14px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald-dark)', borderRadius: '14px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={12} /> HIGH ABSORPTION
                                    </div>
                                )}

                                <div style={{ padding: '36px' }}>
                                    <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
                                        <div style={{ width: 72, height: 72, borderRadius: '22px', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏢</div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.2px' }}>{project.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate-500)', fontSize: '14px', marginTop: 6, fontWeight: 600 }}>
                                                <MapPin size={16} /> {project.location}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inventory Pulse */}
                                    <div style={{ background: '#fcfdfe', padding: '28px', borderRadius: '28px', border: '1px solid #f1f5f9', marginBottom: 28 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Portfolio Velocity</span>
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)' }}>{occ}% ACQUIRED</span>
                                        </div>
                                        <div style={{ height: 10, background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${occ}%`, background: occ > 80 ? 'var(--accent-emerald)' : 'var(--accent-cyan)', borderRadius: '5px' }} />
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
                                            {[
                                                { label: 'Total units', value: project.total_units },
                                                { label: 'Available', value: project.available_units, active: true },
                                                { label: 'Class', value: project.type?.substring(0,4) || 'Resi' }
                                            ].map(s => (
                                                <div key={s.label}>
                                                    <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                                                    <div style={{ fontSize: '18px', fontWeight: 800, color: s.active ? 'var(--accent-emerald-dark)' : 'var(--navy-900)' }}>{s.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 6 }}>Market Entry</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--navy-900)' }}>{project.price_range?.split('–')[0] || '—'}</div>
                                        </div>
                                        <button className="hover-lift" style={{ height: 48, padding: '0 24px', borderRadius: '16px', border: '1px solid #f1f5f9', background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                            Project Performance <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Project Insight Modal (Modernized) */}
            {viewProject && (
                <div className="modal-overlay" onClick={() => setViewProject(null)} style={{ background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(16px)' }}>
                    <div className="modal animate-fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 840, width: '95%', background: 'white', borderRadius: '44px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '54px', position: 'relative' }}>
                            <button onClick={() => setViewProject(null)} style={{ position: 'absolute', top: 32, right: 32, width: 44, height: 44, borderRadius: '16px', border: '1px solid #f1f5f9', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                            
                            <div style={{ display: 'flex', gap: 40, marginBottom: 48 }}>
                                <div style={{ width: 110, height: 110, borderRadius: '34px', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px' }}>🏢</div>
                                <div>
                                    <div style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.08)', color: '#4338ca', borderRadius: '14px', fontSize: '12px', fontWeight: 900, display: 'inline-block', marginBottom: 16 }}>{viewProject.status.toUpperCase()}</div>
                                    <h2 style={{ margin: 0, fontSize: '38px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-1px' }}>{viewProject.name}</h2>
                                    <p style={{ margin: '10px 0 0', color: 'var(--slate-500)', fontSize: '17px', fontWeight: 600 }}>{viewProject.location} • RERA REG: {viewProject.rera_number || 'REG-Z-2458'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
                                {[
                                    { label: 'Total units', value: viewProject.total_units, sub: 'Inventory Size' },
                                    { label: 'Available', value: viewProject.available_units, sub: 'Active Supply', color: 'var(--accent-emerald)' },
                                    { label: 'Entry Ticket', value: viewProject.price_range?.split('–')[0], sub: 'Market Value' },
                                    { label: 'Maturity', value: viewProject.possession_date ? new Date(viewProject.possession_date).getFullYear() : '2026', sub: 'Completion' }
                                ].map(s => (
                                    <div key={s.label} style={{ background: '#f8fafc', padding: '28px', borderRadius: '28px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
                                        <div style={{ fontSize: '24px', fontWeight: 900, color: s.color || 'var(--navy-900)' }}>{s.value}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 4 }}>{s.sub}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 48 }}>
                                <div>
                                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset Strategic Brief</h4>
                                    <p style={{ margin: 0, color: 'var(--slate-600)', lineHeight: 1.9, fontSize: '16px', fontWeight: 500 }}>{viewProject.description || "This institutional-grade residential asset features high-fidelity architectural specifications and a curated suite of premium amenities. Strategically located to maximize capital appreciation and rental yield for executive stakeholders."}</p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Premium Amenities</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                        {(viewProject.amenities || ['Luxury Spa', 'Sky Lounge', 'Olympic Pool', 'Private Concierge', 'Smart Security']).map(a => (
                                            <div key={a} style={{ padding: '10px 18px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '14px', fontSize: '14px', fontWeight: 700, color: 'var(--navy-800)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>{a}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Project Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(16px)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, background: 'white', borderRadius: '36px', overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '28px 40px', background: 'var(--slate-50)', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 className="modal-title" style={{ fontWeight: 900, color: 'var(--navy-900)' }}>Register New Asset</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '40px' }}>
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 800 }}>Project Name</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Zentrix Signature" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 800 }}>Asset Location</label>
                                    <input className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Worli, South Mumbai" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 800 }}>Total Units</label>
                                    <input className="form-control" type="number" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} placeholder="150" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 800 }}>Live Supply</label>
                                    <input className="form-control" type="number" value={form.available} onChange={e => setForm({ ...form, available: e.target.value })} placeholder="60" />
                                </div>
                            </div>
                            <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
                                <button className="btn btn-secondary" style={{ flex: 1, height: 52, borderRadius: '16px', fontWeight: 800 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 2, height: 52, borderRadius: '16px', background: 'var(--navy-900)', fontWeight: 900, fontSize: '15px' }} onClick={saveProject} disabled={saving}>
                                    {saving ? 'Synchronizing...' : 'Complete Registration'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
