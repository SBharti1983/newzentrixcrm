import { useState, useCallback } from 'react';
import {
    Plus, Search, Mail, MessageSquare, Send, Users,
    BarChart3, Calendar, Clock, ArrowRight, CheckCircle,
    AlertCircle, Filter, Trash2, Edit2, Copy, Play, X, Zap, ChevronDown, ChevronUp, Target
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useApi } from '../../hooks/useApi';
import { marketingApi } from '../../api/client';
import { PageLoader, PageError } from '../../components/feedback/Feedback';

export default function Marketing() {
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedAnalytics, setSelectedAnalytics] = useState(null);
    const [loadingAnlytics, setLoadingAnlytics] = useState(false);

    // Form logic for new Drip
    const [newDrip, setNewDrip] = useState({
        name: '',
        description: '',
        steps: [
            { delay_days: 0, delay_hours: 0, channel: 'Email', subject: 'Welcome!', body: 'Thank you for your interest...' }
        ]
    });

    const { data: drips, loading, error, refetch } = useApi(
        useCallback(() => marketingApi.getDrips(), []),
        []
    );

    const stats = [
        { label: 'Total Reach', value: drips?.reduce((acc, d) => acc + (d.enrolled_count || 0), 0) || '0', change: '+18%', color: 'var(--navy-600)' },
        { label: 'Active Drips', value: drips?.filter(d => d.is_active).length || '0', change: 'Live', color: 'var(--accent-teal)' },
        { label: 'Total Steps', value: drips?.reduce((acc, d) => acc + (d.steps_count || 0), 0) || '0', change: 'Configured', color: 'var(--accent-amber-dark)' },
        { label: 'Campaigns', value: drips?.length || '0', change: 'Total', color: 'var(--accent-cyan-dark)' },
    ];

    const addStep = () => {
        setNewDrip(prev => ({
            ...prev,
            steps: [...prev.steps, { delay_days: 1, delay_hours: 0, channel: 'WhatsApp', subject: '', body: 'Checking in about your property search...' }]
        }));
    };

    const removeStep = (idx) => {
        setNewDrip(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== idx)
        }));
    };

    const handleCreate = async () => {
        if (!newDrip.name || newDrip.steps.length === 0) {
            showToast('Campaign name and at least one step required', 'warning');
            return;
        }
        setIsCreating(true);
        try {
            await marketingApi.createDrip(newDrip);
            showToast('Automation engine deployed!', 'success');
            setShowCreate(false);
            setNewDrip({ name: '', description: '', steps: [{ delay_days: 0, delay_hours: 0, channel: 'Email', subject: 'Welcome!', body: '' }] });
            refetch();
        } catch (_e) {
            showToast('Failed to deploy automation', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const viewAnalytics = async (id) => {
        setLoadingAnlytics(true);
        try {
            const data = await marketingApi.getAnalytics(id);
            setSelectedAnalytics(data);
        } catch (_e) {
            showToast('Failed to load analytics', 'error');
        } finally {
            setLoadingAnlytics(false);
        }
    };

    if (loading && !drips) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 60 }}>
            {/* Enterprise Header */}
            <div style={{ display: 'none', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.5)', animation: 'pulse-dialer 2s infinite' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--slate-500)' }}>Omnichannel Engine Online</span>
                    </div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 950, color: 'var(--navy-900)', letterSpacing: '-0.03em', margin: 0 }}>Marketing Hub</h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--slate-500)', fontWeight: 500, margin: '8px 0 0 0' }}>Orchestrate high-conversion drip sequences and intelligent follow-up loops.</p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <button className="hover-lift" style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '16px', fontWeight: 800, color: 'var(--navy-900)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <Filter size={18} /> Templates
                    </button>
                    <button className="hover-lift" onClick={() => setShowCreate(true)} style={{ background: 'linear-gradient(135deg, var(--accent-violet), #6366f1)', border: 'none', padding: '12px 28px', borderRadius: '16px', fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 25px -5px rgba(139,92,246,0.3)' }}>
                        <Zap size={18} /> New Orchestration
                    </button>
                </div>
            </div>

            {/* Premium Stat Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
                {stats.map((s, i) => (
                    <div key={s.label} className="hover-lift" style={{ background: 'linear-gradient(145deg, #ffffff, #f8fafc)', padding: '28px 32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.03 }}>
                            {i === 0 ? <Users size={120} /> : i === 1 ? <Play size={120} /> : i === 2 ? <ArrowRight size={120} /> : <Target size={120} />}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>{s.label}</div>
                        <div style={{ fontSize: '2.8rem', fontWeight: 950, color: 'var(--navy-900)', lineHeight: 1, letterSpacing: '-0.04em' }}>{s.value}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', background: s.change.includes('+') ? '#dcfce7' : '#f1f5f9', color: s.change.includes('+') ? '#059669' : '#475569', fontWeight: 800 }}>{s.change}</span>
                            <span style={{ color: 'var(--slate-400)' }}>engagement metric</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Split Interface: Sequences Table & Engine Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 32 }}>
                {/* Orchestrations Table */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--navy-900)' }}>Active Orchestrations</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, marginTop: 4 }}>Real-time cross-channel marketing flows</div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 16, top: 14, color: '#94a3b8' }} />
                            <input 
                                placeholder="Search campaigns..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                style={{ width: 280, height: 44, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', paddingLeft: 44, fontSize: '0.85rem', fontWeight: 600, outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'white' }}>
                                <tr>
                                    <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sequence Identifier</th>
                                    <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Throughput</th>
                                    <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topology</th>
                                    <th style={{ padding: '20px 32px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(drips || []).filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                                    <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                        <td style={{ padding: '20px 32px' }}>
                                            <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--navy-900)' }}>{c.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 500, marginTop: 4 }}>{c.description || 'Intelligent continuous drip'}</div>
                                        </td>
                                        <td style={{ padding: '20px 32px' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: c.is_active ? '#dcfce7' : '#f1f5f9', borderRadius: '12px', color: c.is_active ? '#059669' : '#475569', fontSize: '0.75rem', fontWeight: 800 }}>
                                                {c.is_active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse-dialer 2s infinite' }} />}
                                                {c.is_active ? 'OPERATIONAL' : 'PAUSED'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 32px' }}>
                                            <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '0.9rem' }}>{c.enrolled_count} <span style={{ color: 'var(--slate-400)', fontWeight: 600 }}>Entities</span></div>
                                        </td>
                                        <td style={{ padding: '20px 32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>{c.steps_count}</div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)' }}>Nodes</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="hover-lift" onClick={() => viewAnalytics(c.id)} style={{ width: 40, height: 40, borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                    <BarChart3 size={16} />
                                                </button>
                                                <button className="hover-lift" onClick={() => showToast('Campaign cloned to drafts', 'success')} style={{ width: 40, height: 40, borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                    <Copy size={16} />
                                                </button>
                                                <button className="hover-lift" style={{ width: 40, height: 40, borderRadius: '12px', background: '#fef2f2', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {drips?.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '60px 40px', textAlign: 'center' }}>
                                            <div style={{ width: 64, height: 64, borderRadius: '20px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#94a3b8' }}>
                                                <Zap size={28} />
                                            </div>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--navy-900)', margin: '0 0 8px 0' }}>No Orchestrations Running</h3>
                                            <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto 24px' }}>Build your first intelligent follow-up sequence to start automatically nurturing your pipelines.</p>
                                            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ padding: '12px 28px', borderRadius: '14px', fontWeight: 800 }}>Create First Sequence</button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cyberpunk Right Rail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    
                    {/* Action Hub */}
                    <div style={{ background: 'white', padding: 28, borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-900)' }}>Quick Launch Hub</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <button className="hover-lift" onClick={() => showToast('Audience lists are populated directly from the Leads Data pipeline. Go to Leads -> Bulk Import to construct your target list.', 'info')} style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, #f8fafc, #ffffff)', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <Users size={16} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>Inject Target Data</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: 2 }}>Import new lead CSV</div>
                                </div>
                            </button>
                            
                            <button className="hover-lift" onClick={() => {
                                setNewDrip({ 
                                    name: 'Post-Site Visit Automations', 
                                    description: 'Engage leads immediately after they leave the property', 
                                    steps: [
                                        { delay_days: 0, delay_hours: 2, channel: 'WhatsApp', subject: '', body: 'Hi {{name}}, thank you for taking the time to visit the property today! Let me know if you need any additional brochures or pricing sheets.', is_ab_test: false, subject_b: '', body_b: '' },
                                        { delay_days: 2, delay_hours: 0, channel: 'Email', subject: 'Detailed Floor Plans & Offers', body: 'Hi {{name}},\n\nFollowing up on your visit, I have attached the detailed pricing structure and floor plans we discussed.', is_ab_test: false, subject_b: '', body_b: '' }
                                    ] 
                                });
                                setShowCreate(true);
                            }} style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, #f8fafc, #ffffff)', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '12px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <Calendar size={16} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>Site-Visit Protocol</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: 2 }}>Trigger standard engagement</div>
                                </div>
                            </button>

                            <button className="hover-lift" onClick={() => {
                                setNewDrip({ name: '', description: '', steps: [{ delay_days: 0, delay_hours: 0, channel: 'Email', subject: 'Subject A', body: 'Body A', is_ab_test: true, subject_b: 'Subject B', body_b: 'Body B' }] });
                                setShowCreate(true);
                            }} style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, #f8fafc, #ffffff)', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '12px', background: '#fdf4ff', color: '#d946ef', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <Filter size={16} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-900)' }}>A/B Split Test Setup</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: 2 }}>Optimize message variants</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Dark Mode Server Node */}
                    <div style={{ background: 'linear-gradient(180deg, #0f172a, #020617)', padding: 32, borderRadius: '24px', color: 'white', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, position: 'relative' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.3)' }}>
                                <Play size={20} color="#34d399" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Execution Engine</h3>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>NODE: MAIN_DISPATCHER</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            The master telemetry node is actively polling databases to execute pending outbound protocols.
                        </p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ping Rate</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace', color: '#34d399' }}>60.0s</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px rgba(52,211,153,0.8)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>NOMINAL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Drip Modal */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div className="card animate-scaleUp" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', padding: 40, position: 'relative' }}>
                        <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}><X /></button>

                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 8 }}>Orchestrate Drip Sequence</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Define a multi-step automated journey for your leads.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 8 }}>Campaign Name</label>
                                    <input className="input" placeholder="e.g. New Project Launch 2026" value={newDrip.name} onChange={e => setNewDrip({ ...newDrip, name: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 8 }}>Internal Description</label>
                                    <input className="input" placeholder="Enter purpose..." value={newDrip.description} onChange={e => setNewDrip({ ...newDrip, description: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>Sequence Steps</h4>
                                    <button className="btn btn-secondary btn-sm" onClick={addStep}><Plus size={14} /> Add Step</button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {newDrip.steps.map((step, idx) => (
                                        <div key={idx} style={{ padding: 24, background: 'var(--slate-50)', borderRadius: 16, border: '1px solid var(--border-light)', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                <div className="badge-blue">Step {idx + 1}</div>
                                                {idx > 0 && <button onClick={() => removeStep(idx)} style={{ color: 'var(--accent-rose)', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: 16, marginBottom: 16 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', marginBottom: 4 }}>Wait (Days)</label>
                                                    <input type="number" className="input" value={step.delay_days} onChange={e => {
                                                        const steps = [...newDrip.steps];
                                                        steps[idx].delay_days = parseInt(e.target.value) || 0;
                                                        setNewDrip({ ...newDrip, steps });
                                                    }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', marginBottom: 4 }}>Channel</label>
                                                    <select className="select" style={{ width: '100%', height: 42, borderRadius: 8, border: '1px solid var(--border-light)', padding: '0 10px' }} value={step.channel} onChange={e => {
                                                        const steps = [...newDrip.steps];
                                                        steps[idx].channel = e.target.value;
                                                        setNewDrip({ ...newDrip, steps });
                                                    }}>
                                                        <option>Email</option>
                                                        <option>WhatsApp</option>
                                                        <option>SMS</option>
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-violet)' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={step.is_ab_test || false}
                                                            onChange={e => {
                                                                const steps = [...newDrip.steps];
                                                                steps[idx].is_ab_test = e.target.checked;
                                                                if (e.target.checked && !steps[idx].body_b) {
                                                                    steps[idx].body_b = steps[idx].body;
                                                                    steps[idx].subject_b = steps[idx].subject;
                                                                }
                                                                setNewDrip({ ...newDrip, steps });
                                                            }}
                                                        />
                                                        Enable A/B Split Test
                                                    </label>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: step.is_ab_test ? '1fr 1fr' : '1fr', gap: 24 }}>
                                                <div style={{ background: step.is_ab_test ? 'rgba(99, 102, 241, 0.03)' : 'transparent', padding: step.is_ab_test ? '16px' : '0', borderRadius: '12px' }}>
                                                    {step.is_ab_test && <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-violet)', textTransform: 'uppercase', marginBottom: 12 }}>Variant A (Control)</div>}
                                                    {step.channel === 'Email' && (
                                                        <div style={{ marginBottom: 12 }}>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', marginBottom: 4 }}>Subject</label>
                                                            <input className="input" value={step.subject} onChange={e => {
                                                                const steps = [...newDrip.steps];
                                                                steps[idx].subject = e.target.value;
                                                                setNewDrip({ ...newDrip, steps });
                                                            }} />
                                                        </div>
                                                    )}
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', marginBottom: 4 }}>Message Content</label>
                                                    <textarea className="input" style={{ minHeight: 80, paddingTop: 12 }} value={step.body} onChange={e => {
                                                        const steps = [...newDrip.steps];
                                                        steps[idx].body = e.target.value;
                                                        setNewDrip({ ...newDrip, steps });
                                                    }} />
                                                </div>

                                                {step.is_ab_test && (
                                                    <div style={{ background: 'rgba(236, 72, 153, 0.03)', padding: '16px', borderRadius: '12px', borderLeft: '2px dashed var(--accent-rose)' }}>
                                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-rose)', textTransform: 'uppercase', marginBottom: 12 }}>Variant B (Test)</div>
                                                        {step.channel === 'Email' && (
                                                            <div style={{ marginBottom: 12 }}>
                                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', marginBottom: 4 }}>Subject B</label>
                                                                <input className="input" value={step.subject_b} onChange={e => {
                                                                    const steps = [...newDrip.steps];
                                                                    steps[idx].subject_b = e.target.value;
                                                                    setNewDrip({ ...newDrip, steps });
                                                                }} />
                                                            </div>
                                                        )}
                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-500)', marginBottom: 4 }}>Message Content B</label>
                                                        <textarea className="input" style={{ minHeight: 80, paddingTop: 12 }} value={step.body_b} onChange={e => {
                                                            const steps = [...newDrip.steps];
                                                            steps[idx].body_b = e.target.value;
                                                            setNewDrip({ ...newDrip, steps });
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={isCreating} style={{ padding: '12px 32px' }}>
                                    {isCreating ? 'Deploying...' : 'Deploy Sequence'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Analytics Modal */}
            {selectedAnalytics && (
                <div className="modal-overlay" onClick={() => setSelectedAnalytics(null)} style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '90%', borderRadius: 24 }}>
                        <div className="modal-header" style={{ padding: '24px 32px' }}>
                            <div>
                                <h3 className="modal-title" style={{ fontSize: '1.4rem' }}>Campaign Performance Insights</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Real-time audience engagement and A/B test results</p>
                            </div>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedAnalytics(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '32px' }}>
                            {/* Summary Cards */}
                            <div className="grid grid-3 mb-8">
                                <div className="card" style={{ background: 'var(--slate-50)', border: 'none', padding: 20 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Total Sent</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--navy-600)' }}>{selectedAnalytics.overall.total_sent || 0}</div>
                                </div>
                                <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: 'none', padding: 20 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Avg. Open Rate</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--navy-600)' }}>
                                        {selectedAnalytics.overall.total_sent > 0 ? ((selectedAnalytics.overall.total_opened / selectedAnalytics.overall.total_sent) * 100).toFixed(1) : 0}%
                                    </div>
                                </div>
                                <div className="card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: 'none', padding: 20 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Avg. CTR</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--navy-600)' }}>
                                        {selectedAnalytics.overall.total_opened > 0 ? ((selectedAnalytics.overall.total_clicked / selectedAnalytics.overall.total_opened) * 100).toFixed(1) : 0}%
                                    </div>
                                </div>
                            </div>

                            {/* Step Breakdown */}
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 16 }}>Step-by-Step Breakdown</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {selectedAnalytics.steps.map((step, idx) => (
                                    <div key={step.id} className="card" style={{ padding: 20, border: '1px solid var(--border-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--navy-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{idx + 1}</div>
                                                <div style={{ fontWeight: 700 }}>{step.channel} Sequence</div>
                                            </div>
                                            {step.is_ab_test && (
                                                <span className="badge badge-violet" style={{ fontSize: '10px' }}>A/B Test Live</span>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: step.is_ab_test ? '1fr 1fr' : '1fr', gap: 24 }}>
                                            {/* Variant A Stats */}
                                            <div style={{ background: step.is_ab_test ? 'rgba(99, 102, 241, 0.03)' : 'transparent', padding: step.is_ab_test ? '16px' : '0', borderRadius: '12px' }}>
                                                {step.is_ab_test && <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-violet)', textTransform: 'uppercase', marginBottom: 12 }}>Variant A (Control)</div>}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Sent</div>
                                                        <div style={{ fontWeight: 800 }}>{step.sent_count_a || 0}</div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Opens</div>
                                                        <div style={{ fontWeight: 800 }}>{step.opens_count_a || 0}</div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Clicks</div>
                                                        <div style={{ fontWeight: 800 }}>{step.clicks_count_a || 0}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Variant B Stats */}
                                            {step.is_ab_test && (
                                                <div style={{ background: 'rgba(236, 72, 153, 0.03)', padding: '16px', borderRadius: '12px', borderLeft: '2px dashed var(--accent-rose)' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-rose)', textTransform: 'uppercase', marginBottom: 12 }}>Variant B (Test)</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Sent</div>
                                                            <div style={{ fontWeight: 800 }}>{step.sent_count_b || 0}</div>
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Opens</div>
                                                            <div style={{ fontWeight: 800 }}>{step.opens_count_b || 0}</div>
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Clicks</div>
                                                            <div style={{ fontWeight: 800 }}>{step.clicks_count_b || 0}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
