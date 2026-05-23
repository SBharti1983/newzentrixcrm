import { useState, useEffect } from 'react';
import { Plus, Search, Building2, MapPin, Home, X, Info, TrendingUp, Sparkles, ArrowRight, ExternalLink, Activity, Target, Zap, Clock, ShieldCheck, Globe, Eye, MoreHorizontal, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMobile } from '../../hooks/useMobile';
import { useApi } from '../../hooks/useApi';
import { projectsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import * as dateUtils from '../../utils/dateUtils';

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
    amenities: '', rera: ''
};

export default function Projects() {
    const isMobile = useMobile();
    const navigate = useNavigate();
    const { addToast } = useToast();
    
    // Missing States
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [viewProject, setViewProject] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const params: Record<string, any> = {};
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
            addToast({ title: 'Project added!', type: 'success' });
            setShowModal(false); setForm(DEFAULT_FORM); refetch();
        } catch (err) { addToast({ title: err.error || 'Failed to add project', type: 'error' }); }
        finally { setSaving(false); }
    };

    const occupancyPct = (p) => {
        const total = p.total_units || 0;
        const avail = p.available_units || 0;
        return total ? Math.round(((total - avail) / total) * 100) : 0;
    };

    return (
        <div className="animate-fadeIn" style={{ padding: isMobile ? '16px' : '0 20px 40px', paddingBottom: isMobile ? 100 : 40 }}>
            {/* Executive Portfolio Command Center */}
            <div style={{ 
                display: 'none',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', 
                padding: isMobile ? '16px' : '12px 28px', 
                borderRadius: '20px', 
                marginBottom: isMobile ? 12 : 16,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Abstract Premium Grid Background */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5 }} />
                
                {/* Glowing Orb */}
                <div style={{ position: 'absolute', top: '-20%', right: '5%', width: 200, height: 200, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)', filter: 'blur(30px)', borderRadius: '50%' }} />
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 16 : 24,
                    position: 'relative', 
                    zIndex: 1 
                }}>
                    <div style={{ flex: isMobile ? '1 1 100%' : '1 1 60%', display: 'none' }}>
                        <div style={{ 
                            padding: '3px 8px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '100px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 5,
                            marginBottom: 8
                        }}>
                            <ShieldCheck size={10} color="#a78bfa" />
                            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2e8f0' }}>Verified Portfolio</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: 900, letterSpacing: '-0.5px', color: 'white', lineHeight: 1 }}>
                            Strategic Assets
                        </h1>
                        <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontWeight: 500, fontSize: isMobile ? '0.75rem' : '0.85rem', maxWidth: 450, lineHeight: 1.3, opacity: 0.8 }}>
                            Managing {projects.length} real estate projects with real-time inventory and AI-driven intelligence.
                        </p>
                    </div>
                    
                    {!isMobile && (
                        <div style={{ flex: '0 0 5%', display: 'flex', justifyContent: 'center', opacity: 0.3 }}>
                            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>
                                {[40, 70, 45, 90].map((h, i) => (
                                    <div key={i} style={{ width: 4, height: `${h}%`, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: isMobile ? 12 : 20, alignItems: 'center', flex: isMobile ? '1 1 100%' : '0 0 32%', justifyContent: isMobile ? 'flex-start' : 'flex-end', background: isMobile ? 'transparent' : 'rgba(15, 23, 42, 0.4)', padding: isMobile ? 0 : '10px 20px', borderRadius: '16px', border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
                        <div style={{ display: 'flex', gap: 20 }}>
                            {[
                                { label: 'Absorption', value: `${Math.round((projects.reduce((s,p) => s + ((p.total_units || 0) - (p.available_units || 0)), 0) / Math.max(1, projects.reduce((s,p) => s + (p.total_units || 0), 0))) * 100)}%`, color: '#34d399' },
                                { label: 'Velocity', value: '1.4x', color: '#a78bfa' },
                            ].map(m => (
                            <div key={m.label} style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.05em' }}>{m.label}</div>
                                <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900, color: m.color, letterSpacing: '-0.3px', lineHeight: 1 }}>{m.value}</div>
                            </div>
                            ))}
                        </div>
                        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />
                        <button className="hover-glow" onClick={() => setShowModal(true)} style={{ 
                            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', color: '#0f172a', fontWeight: 800, height: 32, width: 32, borderRadius: '10px', border: 'none',
                            boxShadow: '0 6px 15px rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s'
                        }}>
                             <Plus size={16} strokeWidth={3} />
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
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(440px, 1fr))', gap: isMobile ? 24 : 40 }}>
                    {projects.map(project => {
                        const occ = occupancyPct(project);
                        const isHot = occ > 70;
                        return (
                            <div key={project.id} className="project-card-premium" style={{ 
                                background: 'white', borderRadius: '36px', overflow: 'hidden', border: '1px solid #f1f5f9',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.03)', position: 'relative',
                                cursor: 'default', transition: 'all 0.3s'
                            }}>
                                {/* Dynamic Status Header */}
                                <div style={{ 
                                    padding: '28px 36px', 
                                    background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ 
                                            padding: '6px 12px', background: project.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                                            color: project.status === 'Active' ? '#059669' : '#4f46e5', borderRadius: '10px', fontSize: '10px', fontWeight: 950, letterSpacing: '0.05em' 
                                        }}>
                                            {project.status.toUpperCase()}
                                        </div>
                                        {isHot && (
                                            <div style={{ padding: '6px 12px', background: 'rgba(244, 63, 94, 0.1)', color: '#e11d48', borderRadius: '10px', fontSize: '10px', fontWeight: 950, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Zap size={12} fill="#e11d48" /> HIGH DEMAND
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}`); }}
                                            title="View Public Microsite"
                                            style={{ width: 36, height: 36, borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <Globe size={16} color="#64748b" />
                                        </button>
                                        <button style={{ width: 36, height: 36, borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <MoreHorizontal size={16} color="#64748b" />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: '36px' }}>
                                    <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
                                        <div style={{ 
                                            width: 80, height: 80, borderRadius: '24px', 
                                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
                                            border: '1px solid #e2e8f0', boxShadow: '0 8px 16px rgba(0,0,0,0.02)'
                                        }}>
                                            {TYPE_ICON[project.type] || '🏢'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{project.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '14px', marginTop: 8, fontWeight: 600 }}>
                                                <MapPin size={15} color="#94a3b8" /> {project.location}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Intelligence Matrix */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Inventory Absorption</span>
                                                <span style={{ fontSize: '11px', fontWeight: 950, color: occ > 80 ? '#059669' : '#0f172a' }}>{occ}%</span>
                                            </div>
                                            <div style={{ height: 8, background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${occ}%`, background: occ > 80 ? '#10b981' : '#3b82f6', borderRadius: '4px' }} />
                                            </div>
                                            <div style={{ marginTop: 12, fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{project.available_units} Units Left</span>
                                                <span style={{ color: '#059669' }}>Healthy</span>
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>Market Intelligence</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <TrendingUp size={18} color="#3b82f6" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{project.price_range?.split('–')[0] || '—'}</div>
                                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}>+2.4% MoM</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button 
                                            onClick={() => setViewProject(project)}
                                            style={{ 
                                                flex: 2, height: 52, borderRadius: '18px', background: '#0f172a', color: 'white', border: 'none', 
                                                fontWeight: 900, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
                                                boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)'
                                            }}
                                        >
                                            <Activity size={18} /> ASSET BRIEF
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/inventory?projectId=${project.id}`)}
                                            style={{ 
                                                flex: 1, height: 52, borderRadius: '18px', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', 
                                                fontWeight: 900, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                            }}
                                        >
                                            <Layers size={18} />
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
                                    { label: 'Maturity', value: dateUtils.parseSafe(viewProject.possession_date)?.getFullYear() || '2026', sub: 'Completion' }
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
                                                                          onClick={() => isAvailable ? addToast({ title: `Unit ${unitNum} selected for express booking!`, type: 'success' }) : addToast({ title: 'Unit already sold', type: 'error' })}
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
