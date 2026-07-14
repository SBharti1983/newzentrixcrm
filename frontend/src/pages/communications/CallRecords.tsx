import { useState, useCallback, useRef, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { leadsApi, usersApi, BASE_URL } from '../../api/client';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { Phone, Download, Search, Calendar, User, Clock, FileText, ExternalLink, CheckCircle2, TrendingUp, Filter, BarChart3, Play, Pause, X, Mic, AudioLines, ShieldAlert, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../../hooks/useToast';
import * as dateUtils from '../../utils/dateUtils';

export default function CallRecords() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [outcomeFilter, setOutcomeFilter] = useState('All');
    const [agentFilter, setAgentFilter] = useState('All'); // Store agent ID or 'All'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [qaCall, setQaCall] = useState(null); 
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 12;

    const { data: users } = useApi(usersApi.list);
    const agentOptions = (users || []).filter(u => ['agent', 'team_leader', 'sales_manager', 'admin'].includes(u.role));

    const { data: calls, loading, error, refetch } = useApi(
        useCallback(() => leadsApi.exportCalls({ 
            agentId: agentFilter, 
            startDate, 
            endDate 
        }), [agentFilter, startDate, endDate])
    );

    const filteredCalls = (calls || []).filter(call => {
        const matchesSearch = call.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
            call.lead_phone?.includes(search) ||
            call.agent_name?.toLowerCase().includes(search.toLowerCase());
        const matchesOutcome = outcomeFilter === 'All' || call.outcome === outcomeFilter;
        // Agent filtering is now done server-side, but keep client search for responsiveness
        return matchesSearch && matchesOutcome;
    });

    const agents = Array.from(new Set((calls || []).map(c => c.agent_name))).filter(Boolean);
    const outcomes = Array.from(new Set((calls || []).map(c => c.outcome))).filter(Boolean);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, outcomeFilter, agentFilter, startDate, endDate]);

    const totalPages = Math.ceil(filteredCalls.length / PAGE_SIZE);
    const slicedCalls = filteredCalls.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // Prepare chart data (Group calls by date)
    const chartData = (calls || [])
        .reduce((acc, call) => {
            const date = dateUtils.parseSafe(call.date)?.toISOString().split('T')[0] || '';
            const existing = acc.find(d => d.date === date);
            if (existing) {
                existing.count += 1;
            } else {
                acc.push({ date, count: 1 });
            }
            return acc;
        }, [])
        .sort((a, b) => (dateUtils.parseSafe(a.date)?.getTime() || 0) - (dateUtils.parseSafe(b.date)?.getTime() || 0))
        .slice(-14); // Last 14 days

    const generatePDFReport = async () => {
        if (!filteredCalls.length) {
            showToast('No records to export', 'info');
            return;
        }
        
        try {
            const doc = new jsPDF();
            const now = dateUtils.getNow();
            const dateStr = now.toLocaleDateString('en-IN');
            
            // --- Premium Header ---
            doc.setFillColor(15, 23, 42); // Navy-900
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('TELEPHONY AUDIT REPORT', 14, 22);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dateStr} | Zentrix CRM Strategic Intelligence`, 14, 32);
            
            // --- KPI Summary ---
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Performance Summary', 14, 50);
            
            const totalCalls = filteredCalls.length;
            const avgDuration = Math.round(filteredCalls.reduce((acc, c) => acc + (parseInt(c.duration) || 0), 0) / totalCalls);
            const successRate = totalCalls > 0 
                ? Math.round((filteredCalls.filter(c => c.outcome === 'Connected' || c.outcome === 'Interested').length / totalCalls) * 100)
                : 0;

            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text(`Total Records: ${totalCalls}`, 14, 58);
            doc.text(`Avg. Duration: ${avgDuration}s`, 60, 58);
            doc.text(`Success Rate: ${successRate}%`, 110, 58);

            // --- Data Table ---
            const tableColumn = ["Date", "Lead", "Phone", "Agent", "Duration", "Outcome", "Sentiment"];
            const tableRows = filteredCalls.map(c => {
                const d = dateUtils.parseSafe(c.date);
                const validDate = (!d || isNaN(d.getTime())) ? 'N/A' : d.toLocaleDateString('en-IN');
                return [
                    validDate,
                    c.lead_name || 'Anonymous',
                    c.lead_phone || 'N/A',
                    c.agent_name || 'System',
                    `${c.duration || 0}s`,
                    c.outcome || 'N/A',
                    c.sentiment || 'Neutral'
                ];
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 65,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                alternateRowStyles: { fillColor: [249, 250, 251] }
            });

            // --- Footer ---
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Page ${i} of ${pageCount} | Confidential - Zentrix Enterprise Log`, 14, doc.internal.pageSize.height - 10);
            }

            const filename = `Zentrix_Audit_Log_${now.toISOString().split('T')[0]}.pdf`;
            
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Register in Export Center
            try {
                const { documentsApi } = await import('../../api/client');
                await documentsApi.create({
                    name: filename,
                    type: 'Report',
                    status: 'Final',
                    notes: `Telephony Official Audit: ${filteredCalls.length} records exported`
                });
            } catch (err) {
                console.warn('Failed to log export metadata:', err);
            }

            showToast('PDF Report generated and saved to history', 'success');
        } catch (err) {
            console.error('PDF Gen Error:', err);
            showToast('Failed to generate PDF. Check console for details.', 'error');
        }
    };

    const exportToCSV = async () => {
        if (!filteredCalls.length) {
            showToast('No records to export', 'info');
            return;
        }
        
        try {
            const headers = ['Date', 'Lead Name', 'Phone', 'Agent', 'Duration', 'Outcome', 'Sentiment', 'Notes'];
            const rows = filteredCalls.map(c => {
                const d = dateUtils.parseSafe(c.date);
                const dateStr = (!d || isNaN(d.getTime())) ? 'N/A' : d.toLocaleString('en-IN');
                return [
                    dateStr,
                    c.lead_name || '',
                    c.lead_phone || '',
                    c.agent_name || '',
                    c.duration || '0',
                    c.outcome || '',
                    c.sentiment || '',
                    (c.note || '').slice(0, 500).replace(/\n/g, ' ')
                ];
            });

            // Proper CSV escaping
            const csvContent = [headers, ...rows].map(row => 
                row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
            ).join("\n");
            // Add UTF-8 BOM for Excel compatibility
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const filename = `telephony_audit_${dateUtils.getNow().toISOString().split('T')[0]}.csv`;
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 200);
            
            // REDUNDANT PHYSICAL SAVE (For easy discovery)
            try {
                const { leadsApi } = await import('../../api/client');
                await leadsApi.generatePhysicalReport(csvContent, filename);
                showToast(`FILE SAVED TO: ZentrixCRM/server/exports/${filename}`, 'success');
            } catch (err) {
                console.warn('Physical save skip:', err);
            }
            
            showToast('Excel-ready CSV exported and saved to history', 'success');
            
            // Register in Export Center
            try {
                const { documentsApi } = await import('../../api/client');
                await documentsApi.create({
                    name: filename,
                    type: 'Report',
                    status: 'Final',
                    notes: `Telephony CSV Export: ${filteredCalls.length} records`
                });
            } catch (err) {
                console.warn('Failed to log export metadata:', err);
            }
        } catch (err) {
            showToast('Export failed', 'error');
        }
    };

    const downloadTranscript = async (interactionId, leadName) => {
        try {
            const token = sessionStorage.getItem('zentrix_token');
            const response = await fetch(`${BASE_URL}/telephony/transcript/${interactionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch transcript');
            const text = await response.text();
            
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const safeName = (leadName || 'Lead').replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `Transcript_${safeName}_${interactionId.slice(0,8)}.txt`;
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 200);
            
            showToast('Transcript downloaded', 'success');
        } catch (err) {
            showToast('Download failed', 'error');
        }
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
        <div className="ent-page-container animate-fadeIn pb-10">
            {/* Header Section */}
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div style={{ display: 'none', height: 0, overflow: 'hidden' }}>
                    <h1 className="ent-section-title" style={{ fontSize: '1.75rem' }}>Voice Intelligence Hub</h1>
                    <p className="ent-section-subtitle">Unified log of all client communications and voice engagements</p>
                </div>
                <div className="page-actions" style={{ gap: 16 }}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Filter communications..."
                            className="form-control"
                            style={{ paddingLeft: '32px', width: '320px', fontSize: '0.85rem', borderRadius: 14 }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={generatePDFReport} className="btn hover-lift" style={{ 
                            padding: '0 20px', height: 44, borderRadius: '12px', background: 'var(--navy-900)', color: 'white',
                            display: 'flex', alignItems: 'center', gap: 10, border: 'none', fontWeight: 800
                        }}>
                            <FileText size={18} /> EXPORT PDF (OFFICIAL)
                        </button>
                        <button onClick={exportToCSV} className="btn hover-lift" style={{ 
                            padding: '0 16px', height: 44, borderRadius: '12px', background: 'white', 
                            border: '1px solid var(--border-medium)', color: 'var(--navy-700)',
                            display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800
                        }}>
                            <Download size={18} /> CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Ribbon */}
            <div className="grid grid-4 mb-10" style={{ gap: 24 }}>
                {[
                    { label: 'Total Volume', value: totalCalls, icon: <Phone size={20} />, color: 'var(--navy-600)', trend: '+12% growth' },
                    { label: 'Outreach Success', value: `${Math.round((connectedCalls / totalCalls) * 100 || 0)}%`, icon: <CheckCircle2 size={20} />, color: '#059669', trend: 'High connectivity' },
                    { label: 'Avg Engagement', value: fmtDuration(avgDurationSeconds), icon: <Clock size={20} />, color: '#0891b2', trend: 'Improving quality' },
                    { label: 'Total Airtime', value: fmtDuration(totalSeconds), icon: <BarChart3 size={20} />, color: '#7c3aed', trend: 'Daily growth' },
                ].map((stat, i) => (
                    <div key={i} className="ent-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em', color: 'var(--slate-500)', marginBottom: 8 }}>{stat.label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--navy-900)' }}>{stat.value}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                                    <div style={{ width: 12, height: 2, background: stat.color, borderRadius: 1 }} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--slate-400)' }}>{stat.trend}</span>
                                </div>
                            </div>
                            <div style={{ width: 48, height: 48, borderRadius: 16, background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Analytics Row */}
            <div className="grid grid-2 mb-10" style={{ gridTemplateColumns: '2fr 1fr', gap: 32 }}>
                <div className="ent-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-900)' }}>Interaction Horizon</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Omni-channel voice traffic over time</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: '10px', background: 'var(--navy-900)', color: 'white', padding: '4px 12px', borderRadius: 8, fontWeight: 900 }}>REAL-TIME DATA</span>
                        </div>
                    </div>
                    <div style={{ height: 260, width: '100%' }}>
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
                                    tickFormatter={(val) => dateUtils.parseSafe(val)?.toLocaleDateString([], { month: 'short', day: 'numeric' }) || val}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)', fontSize: 11, fontWeight: 700 }}
                                    labelFormatter={(val) => dateUtils.parseSafe(val)?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) || val}
                                />
                                <Area type="monotone" dataKey="count" name="Call Volume" stroke="var(--accent-cyan)" strokeWidth={3} fill="url(#callGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="ent-card" style={{ padding: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 24 }}>Refinement Matrix</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>
                                Communication Outcome
                            </label>
                            <select
                                value={outcomeFilter}
                                onChange={(e) => setOutcomeFilter(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1px solid var(--border-medium)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)', outline: 'none', background: 'var(--slate-50)' }}
                            >
                                <option value="All">Global Consensus (All)</option>
                                {outcomes.map((o: any) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>
                                Agent Identity Selection
                            </label>
                            <select
                                value={agentFilter}
                                onChange={(e) => setAgentFilter(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1px solid var(--border-medium)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)', outline: 'none', background: 'var(--slate-50)' }}
                            >
                                <option value="All">Unified Team (All Agents)</option>
                                {agentOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>
                                    Horizon Start
                                </label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    style={{ fontSize: '0.8rem', borderRadius: 14, padding: '10px 14px', background: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>
                                    Horizon End
                                </label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)} 
                                    style={{ fontSize: '0.8rem', borderRadius: 14, padding: '10px 14px', background: 'white' }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '18px', borderRadius: 20, background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--navy-600)', marginBottom: 6 }}>
                                <Filter size={16} />
                                <span style={{ fontSize: '12px', fontWeight: 900 }}>AUDIT COMPLIANCE</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--navy-800)', fontWeight: 600, opacity: 0.8 }}>
                                Found {filteredCalls.length} logs matching your parameters.
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
                                {slicedCalls.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div style={{ opacity: 0.5, marginBottom: 12 }}><Phone size={48} style={{ margin: '0 auto' }} /></div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No communication records found</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Refine your filters to find specific logs</div>
                                        </td>
                                    </tr>
                                ) : slicedCalls.map((call) => (
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
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-900)' }}>{dateUtils.parseSafe(call.date)?.toLocaleDateString() || ''}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{dateUtils.parseSafe(call.date)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}</div>
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
                                                {(() => {
                                                    if (!call.duration) return '0:00';
                                                    const s = parseInt(call.duration, 10);
                                                    const m = Math.floor(s / 60);
                                                    const rs = s % 60;
                                                    return `${m}:${rs.toString().padStart(2, '0')}`;
                                                })()}
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
                                                <button onClick={() => downloadTranscript(call.id, call.lead_name)} className="btn btn-icon btn-ghost btn-sm" title="Download Text Transcript" style={{ color: 'var(--accent-indigo)' }}>
                                                    <FileText size={15} />
                                                </button>
                                                <button onClick={() => navigate(`/leads/${call.lead_id}`)} className="btn btn-icon btn-ghost btn-sm" title="Open Lead Intelligence">
                                                    <ExternalLink size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Enterprise Pagination Bar */}
                {!loading && !error && filteredCalls.length > 0 && (
                    <div style={{ 
                        padding: '16px 24px', 
                        borderTop: '1px solid var(--border-light)', 
                        background: '#fafafa',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Displaying {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredCalls.length)} of <span style={{ color: 'var(--navy-900)', fontWeight: 900 }}>{filteredCalls.length}</span> entries
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn hover-lift"
                                style={{ 
                                    padding: '8px 16px', borderRadius: 10, background: 'white', 
                                    border: '1px solid var(--border-medium)', color: 'var(--navy-900)',
                                    fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1
                                }}
                            >
                                Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        style={{
                                            width: 32, height: 32, borderRadius: 8, border: 'none',
                                            background: currentPage === i + 1 ? 'var(--navy-900)' : 'transparent',
                                            color: currentPage === i + 1 ? 'white' : 'var(--text-secondary)',
                                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn hover-lift"
                                style={{ 
                                    padding: '8px 16px', borderRadius: 10, background: 'white', 
                                    border: '1px solid var(--border-medium)', color: 'var(--navy-900)',
                                    fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1
                                }}
                            >
                                Next
                            </button>
                        </div>
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
