// removed unused imports
import { 
    Phone, Clock, BarChart3, TrendingUp, Users, 
    ArrowUpRight, ArrowDownRight, Smartphone, Activity,
    Calendar, Mic, Filter, Download, FileSpreadsheet, FileText
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { analyticsApi, leadsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#00b4d8', '#0077b6', '#90e0ef', '#03045e'];

export default function VoiceAnalytics() {
    const { showToast } = useToast();
    const { data: stats, loading } = useApi(() => fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/calls/stats`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` }
    }).then(r => r.json()));

    const { data: liveData } = useApi(() => analyticsApi.get({ range: '30days' }));

    const handleExportAudit = async (format = 'csv') => {
        showToast(`Preparing ${format.toUpperCase()} audit...`, 'info');
        try {
            const data = await leadsApi.exportCalls({ range: '30days' });
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const filename = `Zentrix_Voice_Audit_${timestamp}`;

            if (format === 'csv') {
                const headers = ['Date', 'Agent', 'Lead', 'Lead Phone', 'Duration', 'Outcome', 'Note'];
                const rows = (data || []).map(c => [
                    new Date(c.date).toLocaleString(),
                    c.agent_name,
                    c.lead_name,
                    c.lead_phone,
                    c.duration + 's',
                    c.outcome,
                    (c.note || '').replace(/,/g, ';')
                ]);

                const csvContent = "\uFEFF"
                    + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `${filename}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // PHYSICAL SAVE TO SERVER (For Downloads availability)
                try {
                    await leadsApi.generatePhysicalReport(csvContent, `${filename}.csv`);
                    showToast(`FILE SAVED TO: Windows Downloads folder`, 'success');
                } catch (err) {
                    console.warn('Physical save skip:', err);
                }
            } else {
                const doc = new jsPDF('landscape');
                const pageWidth = doc.internal.pageSize.getWidth();
                
                doc.setFillColor(10, 22, 40);
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('VOICE TELEMETRY AUDIT', 20, 25);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Zentrix Real-time Telemetry Hub | ${new Date().toLocaleString()}`, 20, 34);

                const headers = [['Date', 'Agent', 'Lead', 'Duration', 'Outcome', 'Note']];
                const rows = (data || []).map(c => [
                    new Date(c.date).toLocaleString(),
                    c.agent_name,
                    c.lead_name,
                    c.duration + 's',
                    c.outcome,
                    (c.note || '').slice(0, 60) + '...'
                ]);

                autoTable(doc, {
                    startY: 50,
                    head: headers,
                    body: rows,
                    headStyles: { fillColor: [10, 22, 40] },
                    styles: { fontSize: 8 }
                });

                const pdfBlob = doc.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            // Register in Export Center
            try {
                const { documentsApi } = await import('../api/client');
                await documentsApi.create({
                    name: format === 'csv' ? `${filename}.csv` : `${filename}.pdf`,
                    type: 'Report',
                    status: 'Final',
                    notes: `Voice Telemetry Audit: 30-day snapshot`
                });
            } catch (err) {
                console.warn('Failed to log export metadata:', err);
            }

            showToast('Audit exported and saved to history!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to export audit', 'error');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Telemetry...</div>;

    const summary = stats?.summary || { total_calls: 0, avg_duration: 0, success_calls: 0 };
    const hourlyData = (stats?.hourly || []).map(h => ({ hour: `${h.hour}:00`, count: parseInt(h.count) }));

    const cards = [
        { title: 'Total SIM Calls', value: summary.total_calls, change: '+12.5%', icon: <Phone size={24} />, color: '#00b4d8' },
        { title: 'Avg Duration', value: `${Math.round(summary.avg_duration || 0)}s`, change: '-2s', icon: <Clock size={24} />, color: '#7209b7' },
        { title: 'Success Rate', value: `${((summary.success_calls / (summary.total_calls || 1)) * 100).toFixed(1)}%`, change: '+4.1%', icon: <Activity size={24} />, color: '#10b981' },
        { title: 'Connected SIMs', value: '4 Active', change: 'Stable', icon: <Smartphone size={24} />, color: '#f59e0b' },
    ];

    return (
        <div className="page-fade-in" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>Voice Telemetry</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Precision tracking for GSM SIM-integrated dialing performance.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        className="btn btn-primary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={() => handleExportAudit('csv')}
                    >
                        <FileSpreadsheet size={16} /> EXPORT CSV
                    </button>
                    <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={() => handleExportAudit('pdf')}
                    >
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
                {cards.map((card, i) => (
                    <div key={i} className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ 
                            position: 'absolute', top: 0, right: 0, width: 80, height: 80, 
                            background: `${card.color}10`, borderRadius: '0 0 0 80px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 10px 10px'
                        }}>
                            <div style={{ color: card.color }}>{card.icon}</div>
                        </div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>{card.title}</h4>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                            <span style={{ fontSize: '2rem', fontWeight: 900 }}>{card.value}</span>
                            <span style={{ 
                                fontSize: '0.8rem', fontWeight: 700, 
                                color: card.change.startsWith('+') ? '#10b981' : '#ef4444',
                                background: card.change.startsWith('+') ? '#10b98115' : '#ef444415',
                                padding: '4px 8px', borderRadius: 8
                            }}>
                                {card.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 40 }}>
                {/* Hourly Distribution */}
                <div className="glass-card" style={{ padding: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Hourly Call Velocity</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Peak dialing times across the team.</p>
                        </div>
                        <BarChart3 size={20} color="var(--text-muted)" />
                    </div>
                    <div style={{ height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyData}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#00b4d8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} style={{ fontSize: '0.75rem', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '0.75rem', fontWeight: 600 }} />
                                <Tooltip 
                                    contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                    itemStyle={{ color: '#00b4d8', fontWeight: 800 }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#00b4d8" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Outcome Distribution */}
                <div className="glass-card" style={{ padding: 32 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Call Outcomes</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 32 }}>Primary resolution metadata.</p>
                    <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={[
                                        { name: 'Connected', value: summary.success_calls || 10 },
                                        { name: 'Busy', value: 4 },
                                        { name: 'No Answer', value: 3 },
                                        { name: 'Wrong No', value: 1 },
                                    ]}
                                    innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                                >
                                    {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { label: 'Connected', val: '56%', color: '#00b4d8' },
                            { label: 'No Answer', val: '22%', color: '#0077b6' },
                            { label: 'Busy/Other', val: '22%', color: '#90e0ef' },
                        ].map((l, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 4, background: l.color }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.label}</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{l.val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Matrix */}
            <div className="glass-card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Agent Performance Matrix</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Top performing call agents by duration and volume.</p>
                    </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sales Agent</th>
                            <th style={{ padding: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Talk Time</th>
                            <th style={{ padding: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Calls</th>
                            <th style={{ padding: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Rating</th>
                            <th style={{ padding: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Intensity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(liveData?.agentCalls || []).map((agent, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '20px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ 
                                            width: 40, height: 40, borderRadius: 12, background: 'var(--surface-overlay)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem'
                                        }}>
                                            {agent.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div style={{ fontWeight: 800 }}>{agent.name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '20px 0', fontWeight: 700 }}>{Math.floor(agent.calls * 4.2)}m 12s</td>
                                <td style={{ padding: '20px 0', fontWeight: 700 }}>{agent.calls} Calls</td>
                                <td style={{ padding: '20px 0' }}>
                                    <div style={{ display: 'flex', gap: 4, color: '#f59e0b' }}>
                                        {[1,2,3,4].map(n => <Mic key={n} size={14} fill="#f59e0b" />)}
                                        <Mic size={14} />
                                    </div>
                                </td>
                                <td style={{ padding: '20px 0' }}>
                                    <div style={{ width: 120, height: 8, background: 'var(--surface-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(agent.calls * 10, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #00b4d8, #7209b7)' }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
