import { useState } from 'react';
import { 
    Phone, Clock, BarChart3, TrendingUp, Users, 
    ArrowUpRight, ArrowDownRight, Activity,
    Calendar, Mic, Filter, Download, FileSpreadsheet, FileText,
    Smile, AlertTriangle, MessageSquare, Volume2, Shield
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { useToast } from '../../hooks/useToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as dateUtils from '../../utils/dateUtils';

const EMOTION_COLORS = ['#10b981', '#fbbf24', '#f87171'];
const PIE_COLORS = ['#6366f1', '#38bdf8'];

// Mock dataset for AI Telephony Analytics
const EMOTION_TREND_DATA = [
    { time: "09:00", Joy: 65, Neutral: 25, Frustrated: 10 },
    { time: "11:00", Joy: 72, Neutral: 20, Frustrated: 8 },
    { time: "13:00", Joy: 58, Neutral: 30, Frustrated: 12 },
    { time: "15:00", Joy: 68, Neutral: 22, Frustrated: 10 },
    { time: "17:00", Joy: 75, Neutral: 18, Frustrated: 7 },
    { time: "19:00", Joy: 80, Neutral: 15, Frustrated: 5 },
];

const DELAY_AND_INTERRUPTIONS = [
    { day: "Mon", delay: 510, interruptions: 1.1 },
    { day: "Tue", delay: 540, interruptions: 1.4 },
    { day: "Wed", delay: 520, interruptions: 1.2 },
    { day: "Thu", delay: 580, interruptions: 1.6 },
    { day: "Fri", delay: 530, interruptions: 1.3 },
    { day: "Sat", delay: 490, interruptions: 0.9 },
    { day: "Sun", delay: 480, interruptions: 0.8 },
];

const SPEAKING_RATIO_DATA = [
    { name: "AI Speaking Time", value: 58 },
    { name: "Customer Speaking Time", value: 42 },
];

const HEATMAP_HOURS = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Generates a mock grid indicating Positive (Joy), Neutral, or Warning (Frustrated)
const HEATMAP_DATA: Record<string, Record<string, { val: string; sentiment: 'pos' | 'neu' | 'neg' }>> = {
    "Mon": { "09:00": { val: "72%", sentiment: "pos" }, "11:00": { val: "68%", sentiment: "pos" }, "13:00": { val: "55%", sentiment: "neu" }, "15:00": { val: "62%", sentiment: "pos" }, "17:00": { val: "48%", sentiment: "neu" }, "19:00": { val: "38%", sentiment: "neg" } },
    "Tue": { "09:00": { val: "75%", sentiment: "pos" }, "11:00": { val: "70%", sentiment: "pos" }, "13:00": { val: "58%", sentiment: "neu" }, "15:00": { val: "64%", sentiment: "pos" }, "17:00": { val: "52%", sentiment: "neu" }, "19:00": { val: "40%", sentiment: "neg" } },
    "Wed": { "09:00": { val: "78%", sentiment: "pos" }, "11:00": { val: "74%", sentiment: "pos" }, "13:00": { val: "60%", sentiment: "neu" }, "15:00": { val: "68%", sentiment: "pos" }, "17:00": { val: "55%", sentiment: "neu" }, "19:00": { val: "42%", sentiment: "neu" } },
    "Thu": { "09:00": { val: "70%", sentiment: "pos" }, "11:00": { val: "66%", sentiment: "pos" }, "13:00": { val: "50%", sentiment: "neu" }, "15:00": { val: "58%", sentiment: "neu" }, "17:00": { val: "45%", sentiment: "neg" }, "19:00": { val: "35%", sentiment: "neg" } },
    "Fri": { "09:00": { val: "82%", sentiment: "pos" }, "11:00": { val: "78%", sentiment: "pos" }, "13:00": { val: "65%", sentiment: "pos" }, "15:00": { val: "72%", sentiment: "pos" }, "17:00": { val: "60%", sentiment: "neu" }, "19:00": { val: "48%", sentiment: "neu" } },
    "Sat": { "09:00": { val: "85%", sentiment: "pos" }, "11:00": { val: "82%", sentiment: "pos" }, "13:00": { val: "70%", sentiment: "pos" }, "15:00": { val: "75%", sentiment: "pos" }, "17:00": { val: "64%", sentiment: "pos" }, "19:00": { val: "55%", sentiment: "neu" } },
    "Sun": { "09:00": { val: "88%", sentiment: "pos" }, "11:00": { val: "85%", sentiment: "pos" }, "13:00": { val: "75%", sentiment: "pos" }, "15:00": { val: "78%", sentiment: "pos" }, "17:00": { val: "68%", sentiment: "pos" }, "19:00": { val: "60%", sentiment: "neu" } },
};

export default function VoiceAnalytics() {
    const { addToast } = useToast();
    const [selectedRange, setSelectedRange] = useState<string>('30days');

    const handleExportAudit = async (format = 'csv') => {
        addToast({ type: 'info', title: 'Preparing Export', message: `Compiling AI Telephony telemetry for export...` });
        
        const now = dateUtils.getNow();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const filename = `Zentrix_AI_Telephony_Audit_${timestamp}`;

        if (format === 'csv') {
            const headers = ['Metric/Day', 'Avg Latency (ms)', 'Interruptions (per min)', 'Joy % (Avg)', 'Neutral % (Avg)', 'Frustrated % (Avg)'];
            const rows = DELAY_AND_INTERRUPTIONS.map((d, i) => [
                d.day,
                d.delay + 'ms',
                d.interruptions + '/call',
                EMOTION_TREND_DATA[i % EMOTION_TREND_DATA.length].Joy + '%',
                EMOTION_TREND_DATA[i % EMOTION_TREND_DATA.length].Neutral + '%',
                EMOTION_TREND_DATA[i % EMOTION_TREND_DATA.length].Frustrated + '%'
            ]);

            const csvContent = "\ufeff" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            addToast({ type: 'success', title: 'CSV Saved', message: `Outbound report downloaded successfully.` });
        } else {
            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            doc.setFillColor(10, 22, 40);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('AI TELEPHONY VOICE TELEMETRY AUDIT', 20, 25);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Zentrix Cognitive Telephony Engine | Generated: ${dateUtils.getNow().toLocaleString()}`, 20, 34);

            const headers = [['Weekday', 'Avg Response Latency', 'Interruptions Frequency', 'Joy Sentiment', 'Frustrated Sentiment']];
            const rows = DELAY_AND_INTERRUPTIONS.map((d, i) => [
                d.day,
                d.delay + ' ms',
                d.interruptions + ' per call',
                EMOTION_TREND_DATA[i % EMOTION_TREND_DATA.length].Joy + '%',
                EMOTION_TREND_DATA[i % EMOTION_TREND_DATA.length].Frustrated + '%'
            ]);

            autoTable(doc, {
                startY: 50,
                head: headers,
                body: rows,
                headStyles: { fillColor: [10, 22, 40] },
                styles: { fontSize: 9 }
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
            addToast({ type: 'success', title: 'PDF Saved', message: `PDF report downloaded successfully.` });
        }
    };

    const cards = [
        { title: 'Speaking Ratio (AI)', value: '58%', desc: '42% Customer', icon: <Volume2 size={22} />, color: '#6366f1' },
        { title: 'Silence %', value: '14.2%', desc: 'Optimal flow', icon: <Clock size={22} />, color: '#0ea5e9' },
        { title: 'Response Delay', value: '526 ms', desc: 'Avg latency', icon: <Activity size={22} />, color: '#10b981' },
        { title: 'Interruptions', value: '1.2 / call', desc: 'Active barging', icon: <AlertTriangle size={22} />, color: '#f59e0b' },
    ];

    return (
        <div className="page-fade-in" style={{ padding: '24px 32px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.02em' }}>AI Telephony Analytics</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: 600 }}>Real-time voice parsing, sentiment tracking, and conversational telemetry.</p>
                </div>
                <div style={{ display: 'flex', gap: "10px", alignItems: "center" }}>
                    <div className="aicc-period-selector" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px' }}>
                        {(["today", "7d", "30d"] as const).map(p => (
                            <button 
                                key={p} 
                                className={`aicc-period-btn ${selectedRange === p ? "active" : ""}`} 
                                onClick={() => setSelectedRange(p)}
                                style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800 }}
                            >
                                {p === "today" ? "Today" : p === "7d" ? "7 Days" : "30 Days"}
                            </button>
                        ))}
                    </div>
                    <button 
                        className="btn hover-lift" 
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', padding: '8px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}
                        onClick={() => handleExportAudit('csv')}
                    >
                        <FileSpreadsheet size={14} /> Export CSV
                    </button>
                    <button 
                        className="btn hover-lift" 
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', padding: '8px 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', color: 'var(--text-secondary)' }}
                        onClick={() => handleExportAudit('pdf')}
                    >
                        <FileText size={14} /> PDF Report
                    </button>
                </div>
            </div>

            {/* Metrics cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: "20px", marginBottom: "28px" }}>
                {cards.map((card, i) => (
                    <div key={i} className="aicc-card" style={{ padding: "20px", position: 'relative', overflow: 'hidden', background: 'white' }}>
                        <div style={{ 
                            position: 'absolute', top: 0, right: 0, width: "64px", height: "64px", 
                            background: `${card.color}08`, borderRadius: '0 0 0 64px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 8px 8px'
                        }}>
                            <div style={{ color: card.color }}>{card.icon}</div>
                        </div>
                        <h4 style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>{card.title}</h4>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: "10px", marginTop: "12px" }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--navy-900)' }}>{card.value}</span>
                            <span style={{ 
                                fontSize: '0.62rem', fontWeight: 800, 
                                color: card.color,
                                background: `${card.color}15`,
                                padding: '3px 8px', borderRadius: 20
                            }}>
                                {card.desc}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* First Row Charts: Emotion Trend + Speaking Ratio */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: "20px", marginBottom: "28px" }}>
                
                {/* 1. Emotion Trend */}
                <div className="aicc-card" style={{ padding: "24px", background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px" }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Customer Emotion Trend</h3>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Real-time voice emotion profiling of caller sentiments.</p>
                        </div>
                        <Smile size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div style={{ height: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={EMOTION_TREND_DATA}>
                                <defs>
                                    <linearGradient id="colorJoy" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorFrustrated" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} style={{ fontSize: '0.68rem', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '0.68rem', fontWeight: 700 }} unit="%" />
                                <Tooltip 
                                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.72rem' }}
                                />
                                <Area type="monotone" dataKey="Joy" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorJoy)" name="Joy (Positive) %" />
                                <Area type="monotone" dataKey="Frustrated" stroke="#f87171" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFrustrated)" name="Anxious/Frustrated %" />
                                <Area type="monotone" dataKey="Neutral" stroke="#fbbf24" strokeWidth={2} fill="none" name="Neutral %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Speaking Ratio */}
                <div className="aicc-card" style={{ padding: "24px", background: 'white' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Speaking Ratio</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 24px 0' }}>Balance of call talk time.</p>
                    <div style={{ height: "200px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={SPEAKING_RATIO_DATA}
                                    innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value"
                                >
                                    {SPEAKING_RATIO_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: '0.7rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: "10px", marginTop: "10px" }}>
                        {SPEAKING_RATIO_DATA.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PIE_COLORS[idx] }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--text-primary)' }}>{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Second Row Charts: Response Delay & Interruptions + Sentiment Heatmap */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: "20px" }}>
                
                {/* 3. Response Delay & Interruptions */}
                <div className="aicc-card" style={{ padding: "24px", background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px" }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Response Delay & Interruptions</h3>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>AI latency benchmarked against active interruptions.</p>
                        </div>
                        <Activity size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div style={{ height: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={DELAY_AND_INTERRUPTIONS}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: '0.68rem', fontWeight: 700 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} style={{ fontSize: '0.68rem', fontWeight: 700 }} label={{ value: 'Delay (ms)', angle: -90, position: 'insideLeft', style: { fontSize: '0.62rem', fontWeight: 700, fill: '#4f46e5' } }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} style={{ fontSize: '0.68rem', fontWeight: 700 }} label={{ value: 'Interruptions / min', angle: 90, position: 'insideRight', style: { fontSize: '0.62rem', fontWeight: 700, fill: '#f59e0b' } }} />
                                <Tooltip contentStyle={{ fontSize: '0.7rem' }} />
                                <Bar yAxisId="left" dataKey="delay" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Delay (ms)" barSize={20} />
                                <Line yAxisId="right" type="monotone" dataKey="interruptions" stroke="#f59e0b" strokeWidth={3} name="Interruptions" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Sentiment Heatmap */}
                <div className="aicc-card" style={{ padding: "24px", background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "20px" }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Call Sentiment Heatmap</h3>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Caller joy index mapped by day and hour of contact.</p>
                        </div>
                        <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>

                    {/* Grid Heatmap */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {/* Headers */}
                        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(6, 1fr)", gap: "6px", alignItems: "center", textAlign: "center" }}>
                            <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-secondary)", textAlign: "left" }}>Day</span>
                            {HEATMAP_HOURS.map(h => (
                                <span key={h} style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-secondary)" }}>{h}</span>
                            ))}
                        </div>

                        {/* Rows */}
                        {HEATMAP_DAYS.map(d => (
                            <div key={d} style={{ display: "grid", gridTemplateColumns: "60px repeat(6, 1fr)", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--navy-900)" }}>{d}</span>
                                {HEATMAP_HOURS.map(h => {
                                    const cell = HEATMAP_DATA[d]?.[h] || { val: "—", sentiment: "neu" };
                                    const bg = cell.sentiment === "pos" ? "#dcfce7" 
                                             : cell.sentiment === "neg" ? "#fee2e2" 
                                             : "#fef3c7";
                                    const col = cell.sentiment === "pos" ? "#166534" 
                                              : cell.sentiment === "neg" ? "#991b1b" 
                                              : "#854d0e";
                                    const border = cell.sentiment === "pos" ? "rgba(34,197,94,0.2)"
                                                 : cell.sentiment === "neg" ? "rgba(239,68,68,0.2)"
                                                 : "rgba(234,179,8,0.2)";
                                    return (
                                        <div key={h} style={{
                                            background: bg, color: col, border: `1px solid ${border}`,
                                            padding: "6px 2px", borderRadius: "6px", fontSize: "0.68rem",
                                            fontWeight: 800, textAlign: "center"
                                        }}>
                                            {cell.val}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px", fontSize: "0.62rem", fontWeight: 700 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dcfce7" }} /> Positive</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fef3c7" }} /> Neutral</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fee2e2" }} /> Negative</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
