import { useState, useCallback } from 'react';
import {
    Plus, Search, Mail, MessageSquare, Send, Users,
    BarChart3, Calendar, Clock, ArrowRight, CheckCircle,
    AlertCircle, Filter, Trash2, Edit2, Copy, Play, X, Zap, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useApi } from '../hooks/useApi';
import { marketingApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';

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
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Marketing Hub</h1>
                    <p className="page-subtitle">Manage omnichannel campaigns and mass communication.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Create Drip Sequence
                    </button>
                </div>
            </div>

            <div className="grid grid-4 mb-8">
                {stats.map(s => (
                    <div key={s.label} className="card" style={{ padding: 24, border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{s.label}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: '0.75rem', color: s.change.includes('+') ? 'var(--accent-emerald-dark)' : 'var(--text-muted)', marginTop: 8, fontWeight: 700 }}>
                            {s.change} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>current month</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 24 }}>
                <div style={{ minWidth: 0 }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Campaign Orchestration</h3>
                            <div className="search-bar" style={{ width: 240 }}>
                                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                                <input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="table-wrapper">
                            <table style={{ margin: 0 }}>
                                <thead style={{ background: 'var(--slate-50)' }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px' }}>Campaign Name</th>
                                        <th>Config</th>
                                        <th>Status</th>
                                        <th>Enrollment</th>
                                        <th>Steps</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(drips || []).filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                                        <tr key={c.id}>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.description || 'No description'}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
                                                    <Zap size={14} color="var(--accent-amber-dark)" />
                                                    Multi-Channel
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${c.is_active ? 'badge-green' : 'badge-slate'}`}>
                                                    {c.is_active ? 'Active' : 'Paused'}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{c.enrolled_count} Leads</td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent-emerald-dark)' }}>{c.steps_count} Steps</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        onClick={() => viewAnalytics(c.id)}
                                                        disabled={loadingAnlytics}
                                                    >
                                                        <BarChart3 size={14} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => showToast('Campaign cloned', 'success')}><Copy size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm btn-icon"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {drips?.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No campaigns active. Create your first sequence to start automating.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '0.95rem', fontWeight: 800 }}>Marketing Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Import Target List', icon: Users, color: 'var(--navy-600)' },
                                { label: 'Automated Site Visit Follow-up', icon: Calendar, color: 'var(--accent-teal)' },
                                { label: 'A/B Test Setup', icon: Filter, color: 'var(--accent-cyan-dark)' },
                            ].map(a => (
                                <button key={a.label} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--slate-50)', border: '1px solid var(--border-light)' }}>
                                    <a.icon size={16} color={a.color} style={{ marginRight: 12 }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24, background: 'var(--navy-900)', color: 'white', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Play size={20} color="var(--accent-teal)" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Active Automation Pulse</h3>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 16 }}>
                            The Drip sequence engine is polling every 60 seconds to process pending outreaches.
                        </p>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Engine Status</span>
                                <span style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>Operational</span>
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
