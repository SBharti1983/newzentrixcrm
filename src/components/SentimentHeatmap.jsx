import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Sparkles, Users, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const COLORS = {
    Positive: '#10b981', // Emerald
    Neutral: '#94a3b8',  // Slate
    Concerned: '#f59e0b',// Amber
    Negative: '#ef4444'   // Rose
};

export default function SentimentHeatmap({ data }) {
    if (!data || (!data.projects?.length && !data.agents?.length)) {
        return (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Not enough sentiment data to generate heatmap yet.</p>
            </div>
        );
    }

    const { projects, agents } = data;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 24 }}>
            
            {/* Project Sentiment Distribution (Heatmap) */}
            <div className="card" style={{ padding: 24, borderRadius: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <Building2 size={20} color="var(--accent-cyan)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>Project Sentiment Index</h3>
                </div>

                <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projects} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="project_name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip 
                                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="positive" stackId="a" fill={COLORS.Positive} radius={[0, 0, 0, 0]} barSize={20} />
                            <Bar dataKey="neutral" stackId="a" fill={COLORS.Neutral} />
                            <Bar dataKey="concerned" stackId="a" fill={COLORS.Concerned} />
                            <Bar dataKey="negative" stackId="a" fill={COLORS.Negative} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
                    {Object.entries(COLORS).map(([label, color]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                            {label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Agent Sentiment Distribution */}
            <div className="card" style={{ padding: 24, borderRadius: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <Users size={20} color="var(--accent-violet)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>Agent Rapport Health</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {agents.slice(0, 5).map(agent => {
                        const total = parseInt(agent.positive) + parseInt(agent.neutral) + parseInt(agent.concerned) + parseInt(agent.negative);
                        const posRate = Math.round((parseInt(agent.positive) / total) * 100) || 0;
                        const frictionRate = Math.round(((parseInt(agent.concerned) + parseInt(agent.negative)) / total) * 100) || 0;

                        return (
                            <div key={agent.agent_name} style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{agent.agent_name}</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {frictionRate > 20 && <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800 }}>
                                            <AlertTriangle size={12} /> RISK
                                        </div>}
                                        {posRate > 70 && <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800 }}>
                                            <CheckCircle2 size={12} /> TOP PERFORMER
                                        </div>}
                                    </div>
                                </div>
                                
                                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${(agent.positive/total)*100}%`, background: COLORS.Positive }} />
                                    <div style={{ width: `${(agent.neutral/total)*100}%`, background: COLORS.Neutral }} />
                                    <div style={{ width: `${(agent.concerned/total)*100}%`, background: COLORS.Concerned }} />
                                    <div style={{ width: `${(agent.negative/total)*100}%`, background: COLORS.Negative }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    <span>{posRate}% Positive</span>
                                    <span>{total} Interactions</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
