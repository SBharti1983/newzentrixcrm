import { Plus, Search, Building2, MapPin, Home, X, Info, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

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
    const isMobile = useMobile();
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
        <div className="animate-fadeIn" style={{ padding: isMobile ? '16px' : '0 20px 40px', paddingBottom: isMobile ? 100 : 40 }}>
            {/* Project Intelligence Ribbon */}
            <div style={{ 
                background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', 
                padding: isMobile ? '24px 20px' : '20px 32px', 
                borderRadius: '28px', 
                marginBottom: isMobile ? 24 : 16,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(10,22,40,0.15)'
            }}>
                <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.03 }}>
                    <Building2 size={isMobile ? 80 : 120} />
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'flex-end', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 24 : 0,
                    position: 'relative', 
                    zIndex: 1 
                }}>
                    <div>
                        <div style={{ fontSize: isMobile ? '7px' : '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-cyan)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={12} /> Portfolio Absorption Pulse
                        </div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 900, letterSpacing: '-0.3px' }}>Inventory</h1>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Monitoring {projects.length} strategic assets.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: isMobile ? 16 : 20, alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 20 }}>
                            {[
                                { label: 'Absorption', value: `${Math.round((projects.reduce((s,p) => s + ((p.total_units || 0) - (p.available_units || 0)), 0) / projects.reduce((s,p) => s + (p.total_units || 1), 0)) * 100)}%`, color: 'var(--accent-emerald)' },
                                { label: 'Velocity', value: '+24%', color: 'var(--accent-cyan)' },
                            ].map(m => (
                            <div key={m.label} style={{ textAlign: isMobile ? 'left' : 'right' }}>
                                <div style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 1 }}>{m.label}</div>
                                <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900, color: m.color }}>{m.value}</div>
                            </div>
                            ))}
                        </div>
                        <button className="btn hover-lift" onClick={() => setShowModal(true)} style={{ 
                            background: 'white', color: 'var(--navy-900)', fontWeight: 900, height: 40, padding: '0 16px', borderRadius: '14px', border: 'none',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6
                        }}>
                             <Plus size={16} /> ADD
                        </button>
                    </div>
                </div>
            </div>

            {/* Smart Filters */}
            <div style={{ display: 'flex', gap: 16, marginBottom: isMobile ? 24 : 32, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <div className="search-bar" style={{ width: isMobile ? '100%' : 320, background: 'white', border: '1px solid #f1f5f9', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', paddingLeft: 20 }}>
                    <Search size={18} style={{ color: 'var(--slate-400)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Locate asset..." style={{ fontWeight: 600, height: 48 }} />
                </div>
                <div style={{ display: 'flex', gap: 6, background: 'white', padding: '6px', borderRadius: '16px', border: '1px solid #f1f5f9', width: isMobile ? '100%' : 'auto', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    {['All', 'Active', 'Pre-launch', 'Completed'].map(s => (
                        <button 
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            style={{ 
                                padding: isMobile ? '8px 12px' : '10px 20px', borderRadius: '12px', border: 'none', 
                                background: filterStatus === s ? 'var(--navy-50)' : 'transparent',
                                color: filterStatus === s ? 'var(--navy-600)' : 'var(--slate-400)',
                                fontWeight: 800, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s',
                                flex: isMobile ? 1 : 'none'
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <PageLoader /> : error ? <PageError message={error} onRetry={refetch} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: isMobile ? 20 : 32 }}>
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

                                <div style={{ padding: isMobile ? '28px' : '36px' }}>
                                    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                                        <div style={{ width: isMobile ? 54 : 72, height: isMobile ? 54 : 72, borderRadius: '20px', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '24px' : '28px' }}>🏢</div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.2px' }}>{project.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--slate-500)', fontSize: '13px', marginTop: 4, fontWeight: 600 }}>
                                                <MapPin size={14} /> {project.location}
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
                                            <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Entry Ticket</div>
                                            <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900, color: 'var(--navy-900)' }}>{project.price_range?.split('–')[0] || '—'}</div>
                                        </div>
                                        <button className="hover-lift" style={{ height: 44, padding: isMobile ? '0 16px' : '0 24px', borderRadius: '14px', border: '1px solid #f1f5f9', background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: isMobile ? '12px' : '14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            Analyze <ArrowRight size={14} />
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
                    <div className="modal animate-fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 840, width: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '44px', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: isMobile ? '32px 24px' : '54px', position: 'relative' }}>
                            <button onClick={() => setViewProject(null)} style={{ position: 'absolute', top: isMobile ? 24 : 32, right: isMobile ? 24 : 32, width: 44, height: 44, borderRadius: '16px', border: '1px solid #f1f5f9', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                                <X size={24} />
                            </button>
                            
                            <div style={{ display: 'flex', gap: isMobile ? 24 : 40, marginBottom: isMobile ? 32 : 48, flexDirection: isMobile ? 'column' : 'row' }}>
                                <div style={{ width: isMobile ? 80 : 110, height: isMobile ? 80 : 110, borderRadius: '28px', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '32px' : '44px' }}>🏢</div>
                                <div>
                                    <div style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.08)', color: '#4338ca', borderRadius: '12px', fontSize: '11px', fontWeight: 900, display: 'inline-block', marginBottom: 12 }}>{viewProject.status.toUpperCase()}</div>
                                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.4rem', fontWeight: 950, color: 'var(--navy-900)', letterSpacing: '-1px', lineHeight: 1.1 }}>{viewProject.name}</h2>
                                    <p style={{ margin: '8px 0 0', color: 'var(--slate-500)', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 600 }}>{viewProject.location}</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 24, marginBottom: isMobile ? 32 : 48 }}>
                                {[
                                    { label: 'Total units', value: viewProject.total_units, sub: 'Inventory Size' },
                                    { label: 'Available', value: viewProject.available_units, sub: 'Active Supply', color: 'var(--accent-emerald)' },
                                    { label: 'Entry Ticket', value: viewProject.price_range?.split('–')[0], sub: 'Market Value' },
                                    { label: 'Maturity', value: viewProject.possession_date ? new Date(viewProject.possession_date).getFullYear() : '2026', sub: 'Completion' }
                                ].map(s => (
                                    <div key={s.label} style={{ background: '#f8fafc', padding: isMobile ? '16px' : '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                                        <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900, color: s.color || 'var(--navy-900)' }}>{s.value}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 2 }}>{s.sub}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: isMobile ? 32 : 48, marginBottom: 40 }}>
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

                            {/* Visual Inventory Matrix */}
                            {viewProject.total_units > 0 && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                       <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Visual Inventory Matrix</h4>
                                       <div style={{ display: 'flex', gap: 16 }}>
                                           <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-emerald)' }}></div> Available</div>
                                           <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444' }}></div> Sold out</div>
                                       </div>
                                    </div>
                                    
                                    <div style={{ padding: isMobile ? 12 : 30, background: '#f8fafc', borderRadius: 28, border: '1px solid #f1f5f9', maxHeight: 380, overflowY: 'auto', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.02)' }}>
                                         <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 6 }}>
                                            {Array.from({ length: Math.ceil(viewProject.total_units / (isMobile ? 3 : 4)) }).map((_, floorIdx) => {
                                                 const unitsOnFloor = Math.min((isMobile ? 3 : 4), viewProject.total_units - (floorIdx * (isMobile ? 3 : 4)));
                                                 return (
                                                     <div key={floorIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                         <div style={{ width: 32, fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textAlign: 'right', flexShrink: 0 }}>F{floorIdx + 1}</div>
                                                         <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 3 : 4}, 1fr)`, gap: 8, flex: 1 }}>
                                                             {Array.from({ length: unitsOnFloor }).map((_, unitIdx) => {
                                                                 const unitNum = (floorIdx + 1) * 100 + (unitIdx + 1);
                                                                 // Deterministic availability based on modulo to ensure UI consistency before actual DB unit mapping
                                                                 const isAvailable = (Math.abs(Math.sin(unitNum)) * viewProject.total_units) < viewProject.available_units;
                                                                 return (
                                                                      <div 
                                                                          key={unitNum} 
                                                                          onClick={() => isAvailable ? showToast(`Unit ${unitNum} selected for express booking!`, 'success') : showToast('Unit already sold', 'error')}
                                                                          style={{ 
                                                                              padding: '16px', background: isAvailable ? 'var(--accent-emerald)' : '#ef4444', 
                                                                              borderRadius: '14px', color: 'white', fontWeight: 900, fontSize: '14px', textAlign: 'center',
                                                                              cursor: isAvailable ? 'pointer' : 'not-allowed', opacity: isAvailable ? 1 : 0.4,
                                                                              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                                      }}
                                                                      className={isAvailable ? 'hover-lift' : ''}
                                                                      >
                                                                           {unitNum}
                                                                      </div>
                                                                 );
                                                             })}
                                                         </div>
                                                     </div>
                                                 );
                                            })}
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Project Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(16px)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '36px' }}>
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
