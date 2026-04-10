import { useState, useCallback, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { leadsApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import { Phone, Download, Search, Calendar, User, Clock, FileText, ExternalLink, CheckCircle2, TrendingUp, Filter, BarChart3, Play, Pause, X, Mic, AudioLines, ShieldAlert, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CallRecords() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [outcomeFilter, setOutcomeFilter] = useState('All');
    const [agentFilter, setAgentFilter] = useState('All');
    const [qaCall, setQaCall] = useState(null); // High-fidelity QA Modal state
    const [isPlaying, setIsPlaying] = useState(false);

    const { data: calls, loading, error, refetch } = useApi(useCallback(() => leadsApi.exportCalls(), []));

    const filteredCalls = (calls || []).filter(call => {
        const matchesSearch = call.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
            call.lead_phone?.includes(search) ||
            call.agent_name?.toLowerCase().includes(search.toLowerCase());
        const matchesOutcome = outcomeFilter === 'All' || call.outcome === outcomeFilter;
        const matchesAgent = agentFilter === 'All' || call.agent_name === agentFilter;
        return matchesSearch && matchesOutcome && matchesAgent;
    });

    const agents = Array.from(new Set((calls || []).map(c => c.agent_name))).filter(Boolean);
    const outcomes = Array.from(new Set((calls || []).map(c => c.outcome))).filter(Boolean);

    // Prepare chart data (Group calls by date)
    const chartData = (calls || [])
        .reduce((acc, call) => {
            const date = new Date(call.date).toISOString().split('T')[0];
            const existing = acc.find(d => d.date === date);
            if (existing) {
                existing.count += 1;
            } else {
                acc.push({ date, count: 1 });
            }
            return acc;
        }, [])
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-14); // Last 14 days

    const exportToCSV = () => {
        if (!filteredCalls.length) return;

        const headers = ['Date', 'Lead Name', 'Phone', 'Agent', 'Duration', 'Outcome', 'Notes'];
        const rows = filteredCalls.map(c => [
            new Date(c.date).toLocaleString(),
            c.lead_name,
            c.lead_phone,
            c.agent_name,
            c.duration || 'N/A',
            c.outcome || 'Connected',
            (c.note || '').replace(/,/g, ';')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `call_records_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Metrics calculation ──
    const totalCalls = filteredCalls.length || 0;
    const connectedCalls = filteredCalls.filter(c => c.outcome === 'Connected').length;

    // Improved duration parsing (handles HH:MM, MM:SS, or text formats)
    const parseDurationToSeconds = (dur) => {
        if (!dur) return 0;
        if (typeof dur === 'number') return dur;
        const parts = String(dur).split(':');
        if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        // Handle "15 min", "2.5 hrs" etc from mock text
        const num = parseFloat(dur.replace(/[^0-9.]/g, '')) || 0;
        if (dur.toLowerCase().includes('hr')) return Math.round(num * 3600);
        if (dur.toLowerCase().includes('min')) return Math.round(num * 60);
        return Math.round(num);
    };

    const totalSeconds = filteredCalls.reduce((acc, curr) => acc + parseDurationToSeconds(curr.duration), 0);
    const avgDurationSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;

    const fmtDuration = (sec) => {
        if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
        return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    };

    return (
        <div className="animate-fadeIn pb-10 relative">
            {/* Header Section */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">Voice Intelligence</h1>
                    <p className="page-subtitle">Unified log of all client communications and voice engagements</p>
                </div>
                <div className="page-actions">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Filter communications..."
                            className="form-control"
                            style={{ paddingLeft: '32px', width: '280px', fontSize: '0.85rem' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button onClick={exportToCSV} className="btn btn-secondary shadow-sm">
                        <Download size={15} /> Export History
                    </button>
                </div>
            </div>

            {/* Stats Ribbon */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Total Volume', value: totalCalls, icon: <Phone size={20} />, color: 'var(--navy-600)', trend: '+12% vs last week' },
                    { label: 'Outreach Success', value: `${Math.round((connectedCalls / totalCalls) * 100 || 0)}%`, icon: <CheckCircle2 size={20} />, color: 'var(--accent-emerald)', trend: 'High connectivity' },
                    { label: 'Avg Engagement', value: fmtDuration(avgDurationSeconds), icon: <Clock size={20} />, color: 'var(--accent-cyan)', trend: 'Improving quality' },
                    { label: 'Total Airtime', value: fmtDuration(totalSeconds), icon: <BarChart3 size={20} />, color: 'var(--accent-violet)', trend: 'Daily growth' },
                ].map((stat, i) => (
                    <div key={i} className="card stat-card hover-lift" style={{
                        padding: '18px 20px',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div className="stat-label" style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{stat.label}</div>
                                <div className="stat-value" style={{ fontSize: '1.4rem', color: i === 0 ? 'var(--navy-900)' : stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>{stat.trend}</div>
                            </div>
                            <div style={{ padding: 10, borderRadius: 12, background: 'var(--slate-50)', color: stat.color }}>{stat.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Analytics Row */}
            <div className="grid grid-2 mb-8" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="card glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--navy-900)' }}>Interaction Horizon</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Omni-channel voice traffic over time</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: '10px', background: 'var(--navy-900)', color: 'white', padding: '2px 8px', borderRadius: 6, fontWeight: 900 }}>DAILY VOLUME</span>
                        </div>
                    </div>
                    <div style={{ height: 200, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)', fontSize: 11, fontWeight: 700 }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                                />
                                <Area type="monotone" dataKey="count" name="Call Volume" stroke="var(--accent-cyan)" strokeWidth={3} fill="url(#callGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 20 }}>Refinement Matrix</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                                Communication Outcome
                            </label>
                            <select
                                value={outcomeFilter}
                                onChange={(e) => setOutcomeFilter(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-medium)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-900)', outline: 'none' }}
                            >
                                <option value="All">Global Consensus (All)</option>
                                {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                                Assigned Intelligence Unit
                            </label>
                            <select
                                value={agentFilter}
                                onChange={(e) => setAgentFilter(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-medium)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-900)', outline: 'none' }}
                            >
                                <option value="All">Unified Team (All)</option>
                                {agents.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div style={{ marginTop: 10, padding: '14px', borderRadius: 16, background: 'var(--slate-50)', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--navy-600)', marginBottom: 4 }}>
                                <Filter size={14} />
                                <span style={{ fontSize: '11px', fontWeight: 800 }}>ACTIVE FILTERS</span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Displaying {filteredCalls.length} of {calls?.length || 0} interaction objects based on current sync parameters.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Table Section */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                {loading ? <PageLoader /> : error ? <PageError message={error} onRetry={refetch} /> : (
                    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '900px' }}>
                            <thead>
                                <tr style={{ background: 'var(--slate-50)' }}>
                                    {['Call Timestamp', 'Client Details', 'Assigned Agent', 'Duration', 'Call Outcome', 'Intelligence Notes', 'QA & Actions'].map((h, idx) => (
                                        <th key={idx} style={{
                                            padding: '16px 24px', fontSize: '0.68rem', fontWeight: 800,
                                            color: 'var(--text-muted)', textTransform: 'uppercase',
                                            letterSpacing: '0.06em', borderBottom: '1px solid var(--border-light)'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCalls.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center">
                                            <div style={{ opacity: 0.5, marginBottom: 12 }}><Phone size={48} style={{ margin: '0 auto' }} /></div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No communication records found</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Refine your filters to find specific logs</div>
                                        </td>
                                    </tr>
                                ) : filteredCalls.map((call) => (
                                    <tr key={call.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10, background: 'white',
                                                    border: '1px solid var(--border-light)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center', color: 'var(--navy-600)'
                                                }}>
                                                    <Calendar size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-900)' }}>{new Date(call.date).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy-900)' }}>{call.lead_name}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{call.lead_phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar avatar-xs" style={{ background: 'var(--navy-100)', color: 'var(--navy-700)', fontWeight: 800 }}>
                                                    {call.agent_name?.[0]}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{call.agent_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-700)' }}>
                                                <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                                {call.duration || '0:00'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800,
                                                background: call.outcome === 'Connected' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                                                color: call.outcome === 'Connected' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                                                border: `1px solid ${call.outcome === 'Connected' ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`
                                            }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                                {call.outcome || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div style={{
                                                maxWidth: 240, fontSize: '0.8rem', color: 'var(--text-secondary)',
                                                lineHeight: 1.5, background: 'var(--slate-50)', padding: '6px 12px',
                                                borderRadius: 8, border: '1px solid var(--border-light)', fontStyle: 'italic'
                                            }}>
                                                &quot;{call.note || 'No interaction notes logged'}&quot;
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button onClick={() => setQaCall(call)} className="btn hover-lift" style={{ 
                                                    background: 'var(--navy-50)', border: '1px solid var(--border-light)', 
                                                    color: 'var(--navy-600)', padding: '6px 14px', borderRadius: 12, 
                                                    fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 
                                                }}>
                                                    <AudioLines size={14} /> AI QA
                                                </button>
                                                <button onClick={() => navigate(`/leads/${call.lead_id}`)} className="btn btn-icon btn-ghost btn-sm" title="Open Lead Intelligence">
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* QA Overaly/Modal */}
            {qaCall && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="animate-scaleIn glass-panel" style={{
                        maxWidth: 700, width: '100%', background: 'white', borderRadius: 24,
                        boxShadow: '0 32px 64px rgba(10,22,40,0.2)', padding: 0, overflow: 'hidden'
                    }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--navy-900)', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 16 }}>
                                    <AudioLines size={24} color="var(--accent-cyan)" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        AI Call QA Review
                                        {qaCall.outcome !== 'Connected' && <span style={{ fontSize: '0.65rem', background: 'rgba(255,100,100,0.2)', color: '#ff8a8a', padding: '4px 8px', borderRadius: 8, letterSpacing: '0.05em', fontWeight: 900 }}>NO AUDIO (UNCONNECTED)</span>}
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                        {qaCall.lead_name} • Handled by {qaCall.agent_name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setQaCall(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }} className="hover-lift">
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: 32 }}>
                            {qaCall.outcome === 'Connected' ? (
                                <>
                                    {/* Real Call Recording Player */}
                                    <div style={{ background: 'var(--slate-50)', padding: '24px 32px', borderRadius: 24, marginBottom: 24, border: '1px solid var(--border-light)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', animation: isPlaying ? 'pulse 2s infinite' : 'none' }} />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--navy-600)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    Voice Data Stream: ZTRX-{qaCall.id.slice(0,8)}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--navy-600)', background: 'white', padding: '2px 10px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                                                {qaCall.duration || '0:00'}
                                            </span>
                                        </div>
                                        
                                        {qaCall.recording_url ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                                <audio 
                                                    id="qa-player"
                                                    src={qaCall.recording_url} 
                                                    onPlay={() => setIsPlaying(true)}
                                                    onPause={() => setIsPlaying(false)}
                                                    style={{ width: '100%', height: 40, borderRadius: 12 }}
                                                    controls
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: 16, border: '1px dashed var(--border-medium)' }}>
                                                <ShieldAlert size={20} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Recording data not yet synced from Mobile Gateway</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Transcript */}
                                    <div>
                                        <h4 style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 900, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Mic size={16} color="var(--accent-violet)" /> Autonomous Transcription
                                        </h4>
                                        <div style={{ height: 260, overflowY: 'auto', paddingRight: 16 }}>
                                            {qaCall.note && qaCall.note.includes('[Automated AI Transcript') ? (() => {
                                                const lines = qaCall.note.split('\n');
                                                const transcriptLines = lines.slice(2).filter(l => l.trim().length > 0);
                                                const sentimentMatch = lines[0].match(/Sentiment: (.*?)]/);
                                                const sentiment = sentimentMatch ? sentimentMatch[1] : 'Unknown';

                                                return (
                                                    <>
                                                        {transcriptLines.map((line, i) => {
                                                            const isAgent = line.startsWith('Agent:');
                                                            const text = line.replace(/^(Agent|Client):\s*/, '');
                                                            return (
                                                                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20, flexDirection: isAgent ? 'row' : 'row-reverse' }}>
                                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAgent ? 'var(--navy-100)' : 'var(--accent-violet)', color: isAgent ? 'var(--navy-900)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>
                                                                        {isAgent ? 'AGt' : 'CLI'}
                                                                    </div>
                                                                    <div style={{ 
                                                                        background: isAgent ? 'var(--slate-50)' : 'white', 
                                                                        border: isAgent ? 'none' : '1px solid var(--border-light)',
                                                                        padding: '12px 16px', borderRadius: isAgent ? '0 16px 16px 16px' : '16px 0 16px 16px', 
                                                                        fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 
                                                                    }}>
                                                                        {text}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div style={{ borderTop: '1px dashed var(--border-light)', margin: '24px 0', position: 'relative' }}>
                                                            <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 12px', color: sentiment === 'Positive' ? 'var(--accent-emerald)' : '#64748b', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <ShieldAlert size={12} /> SENTIMENT ANALYSIS: {sentiment.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })() : (
                                                <>
                                                    {/* Default Mock Content if note is empty */}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recommended Action: WhatsApp Follow-up */}
                                    {qaCall.note && qaCall.note.includes('--- AI WHATSAPP FOLLOW-UP ---') && (
                                        <div style={{ marginTop: 24, padding: 20, background: '#f0fdf4', borderRadius: 20, border: '1px solid #bbf7d0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 900, fontSize: '0.85rem' }}>
                                                    <MessageCircle size={18} /> SMART FOLLOW-UP READY
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const parts = qaCall.note.split('--- AI WHATSAPP FOLLOW-UP ---');
                                                        const msg = parts[1].split('Recording Link:')[0].trim();
                                                        const phone = qaCall.lead_phone.replace(/\D/g, '');
                                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                    }}
                                                    className="btn hover-lift" 
                                                    style={{ background: '#25D366', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}
                                                >
                                                    <MessageCircle size={16} /> Send via WhatsApp
                                                </button>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', fontStyle: 'italic', lineHeight: 1.5 }}>
                                                "{qaCall.note.split('--- AI WHATSAPP FOLLOW-UP ---')[1].split('Recording Link:')[0].trim()}"
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                                    <Phone size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 8px' }}>Call Unconnected</h3>
                                    <p style={{ fontSize: '0.9rem', margin: 0 }}>This call resulted in a "{qaCall.outcome}" status. There is no continuous audio payload or transcription available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
