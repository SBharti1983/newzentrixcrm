import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { automationApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import {
    Zap, Users, Bell, Settings, Plus,
    CheckCircle2, AlertCircle, Play, Pause,
    MoreHorizontal, ArrowRight, History,
    MousePointer2, Layers, Cpu, Clock
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
        <div className="animate-fadeIn" style={{ padding: '0 0 40px 0' }}>
            <header style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.03em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <Zap size={28} fill="currentColor" />
                            </div>
                            Automation & Distribution
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: 600 }}>
                            Intelligent lead routing, automated reminders, and workflow orchestration for high-performance sales teams.
                        </p>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 14, boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)' }}>
                        <Plus size={20} /> Create Workflow
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
                <main>
                    {/* Active Workflows */}
                    <section style={{ marginBottom: 40 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Layers size={20} color="var(--accent-violet)" /> Active Workflows
                            </h2>
                            <div className="badge-slate">Manage {workflows?.length || 0} Rules</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                            {workflows?.map(workflow => (
                                <div key={workflow.id} className="card" style={{
                                    padding: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 24,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: workflow.status === 'Active' ? 1 : 0.7,
                                    border: workflow.status === 'Active' ? '1px solid var(--navy-100)' : '1px solid transparent',
                                    background: workflow.status === 'Active' ? 'white' : 'var(--slate-50)'
                                }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 18,
                                        background: workflow.status === 'Active' ? 'var(--navy-50)' : 'var(--slate-100)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: workflow.status === 'Active' ? 'var(--accent-violet)' : 'var(--slate-400)',
                                        flexShrink: 0
                                    }}>
                                        {workflow.type === 'distribution' ? <Users size={28} /> : <Bell size={28} />}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>{workflow.name}</h3>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                                                padding: '2px 8px', borderRadius: 10,
                                                background: workflow.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'var(--slate-200)',
                                                color: workflow.status === 'Active' ? 'var(--accent-emerald)' : 'var(--slate-500)'
                                            }}>
                                                {workflow.status}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>{workflow.description}</p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Dwell Time</div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>{workflow.config.delay || 'Instant'} {workflow.config.unit || ''}</div>
                                        </div>
                                        <button
                                            onClick={() => toggleRule(workflow.id, workflow.status)}
                                            disabled={updatingId === workflow.id}
                                            style={{
                                                width: 44, height: 44, borderRadius: 14,
                                                background: workflow.status === 'Active' ? 'white' : 'var(--navy-900)',
                                                border: '1px solid var(--border-light)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', color: workflow.status === 'Active' ? 'var(--accent-rose)' : 'white',
                                                transition: 'all 0.2s ease',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}
                                        >
                                            {workflow.status === 'Active' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                        </button>
                                        <button className="icon-btn" style={{ background: 'white', border: '1px solid var(--border-light)' }}>
                                            <Settings size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
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

                <aside>
                    <div className="card" style={{ padding: 24, background: 'var(--navy-50)', border: 'none', position: 'sticky', top: 20 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <History size={18} color="var(--navy-600)" /> Execution Log
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {logs?.map(log => (
                                <div key={log.id} style={{ display: 'flex', gap: 12 }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-emerald)',
                                        marginTop: 6, flexShrink: 0, boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)'
                                    }} />
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy-900)' }}>{log.event}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>
                                            {log.lead} → {log.agent}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={10} /> {new Date(log.time).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="btn btn-ghost" style={{ width: '100%', border: '1px dashed var(--border-medium)', marginTop: 16 }}>View All Logs</button>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20, marginTop: 24, border: '1px dashed var(--accent-violet)', background: 'rgba(139, 92, 246, 0.02)' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12 }}>Distribution Tips</h4>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <li style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                                <ArrowRight size={14} color="var(--accent-violet)" style={{ flexShrink: 0 }} />
                                Use <b>Round Robin</b> for general enquiries to ensure fair load.
                            </li>
                            <li style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                                <ArrowRight size={14} color="var(--accent-violet)" style={{ flexShrink: 0 }} />
                                Enable <b>Reminders</b> to reduce lead response time (LRT).
                            </li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
