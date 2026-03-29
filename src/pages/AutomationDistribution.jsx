import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { automationApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import {
    Zap, Users, Bell, Settings, Plus,
    CheckCircle2, AlertCircle, Play, Pause,
    MoreHorizontal, ArrowRight, History,
    MousePointer2, Layers, Cpu, Clock, Sparkles
} from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Automation() {
    const { showToast } = useToast();
    const [updatingId, setUpdatingId] = useState(null);

    const { data: workflows, loading, error, refetch } = useApi(
        useCallback(() => automationApi.getRules(), []),
        []
    );

    const { data: logs } = useApi(
        useCallback(() => automationApi.getLogs(), []),
        []
    );

    const toggleRule = async (id, currentStatus) => {
        setUpdatingId(id);
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        try {
            await automationApi.updateRule(id, { status: newStatus });
            showToast(`Rule ${newStatus === 'Active' ? 'activated' : 'deactivated'}`, 'success');
            refetch();
        } catch (_err) {
            showToast('Failed to update rule', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading && !workflows) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn" style={{ padding: '0 0 40px 0', maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{ marginBottom: 40, background: 'white', padding: '32px 40px', borderRadius: '24px', boxShadow: '0 4px 24px rgba(10, 22, 40, 0.04)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.03em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(168, 85, 247, 0.25)' }}>
                            <Zap size={28} fill="currentColor" />
                        </div>
                        Automation & Distribution
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 650, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                        Intelligent lead routing, zero-latency assignments, and automated orchestration for high-performance scale.
                    </p>
                </div>
                <button className="btn btn-primary" style={{ padding: '14px 28px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 800, background: 'var(--navy-900)', border: 'none', boxShadow: '0 8px 20px rgba(10, 22, 40, 0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Plus size={20} /> Create Workflow
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
                <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* Active Workflows */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Layers size={22} color="var(--accent-violet)" /> Active Workflows
                            </h2>
                            <div style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
                                Manage {workflows?.length || 0} Rules
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {workflows?.map(workflow => {
                                const isActive = workflow.status === 'Active';
                                return (
                                    <div key={workflow.id} className="hover-lift" style={{
                                        padding: '24px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 24,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: isActive ? 'white' : 'var(--slate-50)',
                                        border: isActive ? '1px solid var(--border-light)' : '1px solid transparent',
                                        boxShadow: isActive ? '0 12px 32px rgba(10, 22, 40, 0.04)' : 'none',
                                        cursor: 'default'
                                    }}>
                                        <div style={{
                                            width: 64, height: 64, borderRadius: '20px',
                                            background: isActive ? 'var(--navy-50)' : 'var(--slate-100)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isActive ? 'var(--accent-violet)' : 'var(--slate-400)',
                                            flexShrink: 0,
                                            boxShadow: isActive ? 'inset 0 0 0 1px rgba(139, 92, 246, 0.1)' : 'none'
                                        }}>
                                            {workflow.type === 'distribution' ? <Users size={32} /> : <Bell size={32} />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: isActive ? 'var(--navy-950)' : 'var(--slate-500)', margin: 0 }}>{workflow.name}</h3>
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                                                    padding: '4px 10px', borderRadius: '12px', letterSpacing: '0.05em',
                                                    background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--slate-200)',
                                                    color: isActive ? 'var(--accent-emerald-dark)' : 'var(--slate-500)',
                                                    border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'transparent'}`
                                                }}>
                                                    {workflow.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.9rem', color: isActive ? 'var(--text-secondary)' : 'var(--slate-400)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{workflow.description}</p>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em', marginBottom: 4 }}>Time</div>
                                                <div style={{ padding: '4px 10px', background: 'var(--slate-50)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-900)', border: '1px solid var(--border-light)' }}>
                                                    {workflow.config.delay || 'Instant'} {workflow.config.unit || ''}
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                {/* Premium Toggle Switch */}
                                                <div 
                                                    style={{ width: 52, height: 28, borderRadius: 14, background: isActive ? 'var(--accent-emerald)' : 'var(--slate-300)', position: 'relative', cursor: updatingId === workflow.id ? 'wait' : 'pointer', transition: 'background 0.3s', boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                                                    onClick={() => !updatingId && toggleRule(workflow.id, workflow.status)}
                                                >
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: isActive ? 52 - 26 : 2, transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.26, 1.55)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
                                                </div>
                                                <button className="icon-btn hover-lift" style={{ background: 'white', border: '1px solid var(--border-light)', width: 44, height: 44, borderRadius: 12 }}>
                                                    <Settings size={20} color="var(--slate-500)" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Quick Stats / Integration */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <Cpu size={24} color="#38bdf8" />
                                <h3 style={{ margin: 0, fontWeight: 800 }}>Zapier AI Integration</h3>
                            </div>
                            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 24 }}>
                                Power your automation with Zapier AI to predict lead quality before assignment. Use natural language to define distribution logic.
                            </p>
                            <button className="btn" style={{ background: 'white', color: 'var(--navy-950)', width: '100%', fontWeight: 700 }}>Configure Zapier Tools</button>
                        </div>

                        <div className="card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <Clock size={24} color="var(--accent-amber)" />
                                <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--navy-900)' }}>Auto-Assignment Efficiency</h3>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--navy-900)' }}>84%</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Leads assigned in under 5 minutes</div>
                                <div style={{ marginTop: 16, height: 6, width: '100%', background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: '84%', height: '100%', background: 'var(--accent-amber)' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 24, background: 'white', border: '1px solid var(--border-light)', position: 'sticky', top: 20, boxShadow: '0 8px 30px rgba(10,22,40,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--navy-950)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <History size={20} color="var(--navy-600)" /> Execution Log
                            </h3>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 0 4px rgba(16,185,129,0.2)' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {logs?.map((log, index) => (
                                <div key={log.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                                    {index < logs.length - 1 && <div style={{ position: 'absolute', left: 5, top: 16, bottom: -20, width: 2, background: 'var(--slate-100)' }} />}
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%', background: 'white', border: '3px solid var(--accent-cyan)',
                                        marginTop: 4, flexShrink: 0, zIndex: 1
                                    }} />
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 2 }}>{log.event}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                                            {log.lead} → <span style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{log.agent}</span>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, textTransform: 'uppercase' }}>
                                            <Clock size={10} /> {new Date(log.time).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="btn btn-ghost hover-lift" style={{ width: '100%', border: '1px dashed var(--border-medium)', marginTop: 8, borderRadius: 12, fontWeight: 800 }}>View All Activity</button>
                        </div>
                    </div>

                    <div className="card hover-lift" style={{ padding: 24, border: '1px solid rgba(139, 92, 246, 0.2)', background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.01))' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--navy-950)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={16} color="var(--accent-violet)" /> Pro Tips
                        </h4>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 12, lineHeight: 1.5, fontWeight: 500 }}>
                                <div style={{ background: 'white', padding: 4, borderRadius: 8, border: '1px solid var(--border-light)', height: 'fit-content' }}>
                                    <ArrowRight size={14} color="var(--accent-violet)" />
                                </div>
                                <span>Use <b>Round Robin</b> for general enquiries to ensure fair load across your sales floor.</span>
                            </li>
                            <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 12, lineHeight: 1.5, fontWeight: 500 }}>
                                <div style={{ background: 'white', padding: 4, borderRadius: 8, border: '1px solid var(--border-light)', height: 'fit-content' }}>
                                    <ArrowRight size={14} color="var(--accent-violet)" />
                                </div>
                                <span>Enable <b>Reminders</b> to dramatically reduce Lead Response Time (LRT).</span>
                            </li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
