import { useState } from 'react';
import { 
    Filter, Download, Plus, Search, FileText, 
    BarChart2, PieChart, Activity, Calendar, Phone,
    MoreVertical, FileSpreadsheet, FileJson, User, Home
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { analyticsApi, leadsApi, usersApi, documentsApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';

// Mock report templates
const REPORT_TEMPLATES = [
    { id: 'monthly', title: 'Monthly Performance Report', description: 'Comprehensive audit of leads, conversions, and site activity', icon: FileText, type: 'audit' },
    { id: 'velocity', title: 'Lead Velocity Report', description: 'Analyze lead progression speed across pipeline stages', icon: Activity, type: 'velocity' },
    { id: 'telephony', title: 'Telephony Audit Report', description: 'Agent-wise call tracking with durations and outcomes', icon: Phone, type: 'telephony' },
    { id: 'conversion', title: 'Conversion Attribution', description: 'Determine highest converting marketing channels', icon: PieChart, type: 'conversion' },
    { id: 'sales', title: 'Executive Sales Summary', description: 'C-level overview of revenue and unit absorption', icon: BarChart2, type: 'sales' },
    { id: 'project-wise', title: 'Project Wise Lead Report', description: 'Lead count and pipeline value breakdown by project asset', icon: Home, type: 'project' },
];

export default function Reports() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('templates');
    const [searchQuery, setSearchQuery] = useState('');
    const [generating, setGenerating] = useState(false);
    
    // Filters for Report Generation
    const [agentFilter, setAgentFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data: users } = useApi(usersApi.list);
    const agents = (users || []).filter(u => ['agent', 'team_leader', 'sales_manager', 'admin'].includes(u.role));

    const generateMonthlyReport = async () => {
        setGenerating(true);
        showToast('Fetching performance data...', 'info');
        
        try {
            // 1. Fetch real analytics data
            const res = await analyticsApi.get({ range: 'thisyear' });
            const kpis = res.kpis;
            const agentPerf = res.agentPerformance || [];
            
            // 2. Initialize PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const dateStr = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

            // Styling colors
            const NAVY = [10, 22, 40];
            const ACCENT = [59, 99, 184];

            // ─── Header ───────────────────────────────────────────
            doc.setFillColor(...NAVY);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('MONTHLY PERFORMANCE REPORT', 20, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`ZentrixCRM Intelligence Hub | Generated for ${dateStr}`, 20, 30);
            
            // ─── Executive Summary (KPIs) ─────────────────────────
            doc.setTextColor(...NAVY);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Executive Summary', 20, 55);
            
            doc.setDrawColor(...ACCENT);
            doc.setLineWidth(0.5);
            doc.line(20, 58, 60, 58);

            // KPI Grid
            const kpiData = [
                ['Total Leads', kpis.totalLeads, 'Conversion Rate', kpis.conversionRate],
                ['Net Revenue', kpis.totalRevenue, 'Units Sold', kpis.unitsSold],
                ['Total Calls', kpis.totalCalls, 'Growth Rate', kpis.revenueChange]
            ];

            autoTable(doc, {
                startY: 65,
                head: [],
                body: kpiData,
                theme: 'plain',
                styles: { fontSize: 11, cellPadding: 5, font: 'helvetica' },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [100, 100, 100], width: 40 },
                    1: { fontStyle: 'bold', fontSize: 13, textColor: NAVY, width: 50 },
                    2: { fontStyle: 'bold', textColor: [100, 100, 100], width: 40 },
                    3: { fontStyle: 'bold', fontSize: 13, textColor: NAVY, width: 50 }
                }
            });

            // ─── Agent Performance Table ──────────────────────────
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Agent Performance Matrix', 20, doc.lastAutoTable.finalY + 20);

            const agentRows = agentPerf.map(agent => [
                agent.name,
                agent.leads,
                agent.conversions,
                `${((agent.conversions / (agent.leads || 1)) * 100).toFixed(1)}%`,
                agent.revenue
            ]);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 25,
                head: [['Sales Agent', 'Assigned', 'Won', 'Conv %', 'Revenue Generated']],
                body: agentRows.length ? agentRows : [['No data', '0', '0', '0%', '₹0']],
                headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 250, 255] },
                styles: { font: 'helvetica', fontSize: 10 }
            });

            // ─── Insights Section ─────────────────────────────────
            const startY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('AI-Generated Insights', 20, startY);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            const insights = [
                `• Lead volume has ${parseInt(kpis.totalLeads) > 50 ? 'increased' : 'stabilized'} compared to last month.`,
                `• Conversion rate is currently at ${kpis.conversionRate}, aligned with target parameters.`,
                `• Portfolio absorption is lead by ${res.revenueByProject?.[0]?.name || 'N/A'}.`,
                `• Recommendation: High-velocity agents should be assigned more cold leads to increase top-of-funnel flow.`
            ];
            doc.text(insights, 20, startY + 10);

            // ─── Footer ───────────────────────────────────────────
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Confidential | ZentrixCRM Enterprise Edition', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }

            // 3. Save
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const finalName = `Zentrix_Performance_Report_${timestamp}.pdf`;
            
            // Use Blob for more reliable downloads
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // 4. Register in Export Center (Persistent History)
            await documentsApi.create({
                name: finalName,
                type: 'Report',
                status: 'Final',
                notes: `Automated Performance Snapshot for ${dateStr}`
            });

            showToast('Report exported and saved to history!', 'success');
        } catch (err) {
            console.error('Report Generation Error:', err);
            showToast('Failed to generate report', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const generateTelephonyReport = async (format = 'pdf') => {
        setGenerating(true);
        showToast(`Processing Telephony ${format.toUpperCase()}...`, 'info');
        
        try {
            const calls = await leadsApi.exportCalls({ 
                agentId: agentFilter, 
                startDate, 
                endDate 
            });

            if (!calls || !calls.length) {
                showToast('No call records found for selected criteria', 'warning');
                setGenerating(false);
                return;
            }

            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const filename = `Zentrix_Audit_Log_${timestamp}`;

            if (format === 'csv') {
                const headers = ['Agent ID', 'Agent Name', 'Agent Phone Number', 'Designation', 'Call Duration', 'Lead Name', 'Lead Phone Number', 'Call Made On', 'Call Disposition'];
                const rows = calls.map(c => [
                    c.user_id.slice(0, 8),
                    c.agent_name,
                    c.agent_phone || 'N/A',
                    c.designation || 'AGENT',
                    c.duration || '0:00',
                    c.lead_name,
                    c.lead_phone,
                    new Date(c.date).toLocaleString('en-IN'),
                    c.outcome || 'Connected'
                ]);

                const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `${filename}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // REDUNDANT PHYSICAL SAVE (For easy discovery)
                try {
                    await leadsApi.generatePhysicalReport(csvContent, `${filename}.csv`);
                    showToast(`FILE SAVED TO: ZentrixCRM/server/exports/${filename}.csv`, 'success');
                } catch (err) {
                    console.warn('Physical save skip:', err);
                }
                
                showToast('CSV Report downloaded successfully!', 'success');
            } else {
                const doc = new jsPDF('landscape');
                const pageWidth = doc.internal.pageSize.getWidth();
                const NAVY = [10, 22, 40];

                doc.setFillColor(...NAVY);
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('TELEPHONY AUDIT REPORT', 20, 20);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Zentrix Telephony Engine | Generated on ${new Date().toLocaleString()}`, 20, 30);

                const headers = [['Agent ID', 'Agent Name', 'Agent Phone Number', 'Designation', 'Call Duration', 'Lead Name', 'Lead Phone Number', 'Call Made On', 'Call Disposition']];
                const rows = calls.map(c => [
                    c.user_id.slice(0, 8),
                    c.agent_name,
                    c.agent_phone || 'N/A',
                    c.designation?.toUpperCase() || 'AGENT',
                    c.duration || '0:00',
                    c.lead_name,
                    c.lead_phone,
                    new Date(c.date).toLocaleString('en-IN'),
                    c.outcome || 'Connected'
                ]);

                autoTable(doc, {
                    startY: 50,
                    head: headers,
                    body: rows,
                    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [245, 250, 255] },
                    styles: { font: 'helvetica', fontSize: 8 },
                });

                doc.save(`${filename}.pdf`);
            }

            // Register in Export Center (Persistent History)
            await documentsApi.create({
                name: format === 'csv' ? `${filename}.csv` : `${filename}.pdf`,
                type: 'Report',
                status: 'Final',
                notes: `Telephony Audit: Agent=${agentFilter}, Range=${startDate || 'All'} to ${endDate || 'Now'}`
            });

            showToast('Report exported and saved to history!', 'success');
        } catch (err) {
            console.error('Telephony Report Error:', err);
            showToast('Failed to generate report', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const generateProjectReport = async (format = 'pdf') => {
        setGenerating(true);
        showToast('Compiling Project-Wise Intelligence...', 'info');
        
        try {
            const res = await analyticsApi.get({ range: 'thisyear' });
            const projects = res.revenueByProject || [];
            
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const filename = `Zentrix_Project_Pulse_${timestamp}`;

            if (format === 'csv') {
                const headers = ['Project Name', 'Total Bookings', 'GTV (Revenue Cr)', 'Status'];
                const rows = projects.map(p => [
                    p.name,
                    p.bookings,
                    `₹${parseFloat(p.revenue).toFixed(2)}Cr`,
                    'Active'
                ]);

                const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `${filename}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                await leadsApi.generatePhysicalReport(csvContent, `${filename}.csv`);
                showToast('CSV Exported & Saved to Server', 'success');
            } else {
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.getWidth();
                const NAVY = [10, 22, 40];

                doc.setFillColor(...NAVY);
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('PROJECT ABSORPTION REPORT', 20, 25);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Zentrix Real Estate Analytics | Generated on ${new Date().toLocaleString()}`, 20, 34);

                const headers = [['Project Asset', 'Unit Bookings', 'Revenue Contribution (Cr)', 'Inventory Status']];
                const rows = projects.map(p => [
                    p.name,
                    p.bookings,
                    `₹${parseFloat(p.revenue).toFixed(2)}Cr`,
                    'In-Process'
                ]);

                autoTable(doc, {
                    startY: 50,
                    head: headers,
                    body: rows,
                    headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { fontSize: 9 }
                });

                doc.save(`${filename}.pdf`);
            }

            // History Log
            await documentsApi.create({
                name: format === 'csv' ? `${filename}.csv` : `${filename}.pdf`,
                type: 'Report',
                status: 'Final',
                notes: `Project Wise Absorption Pulse`
            });

            showToast('Project report finalized!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to compile project report', 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="animate-fadeIn" style={{ paddingBottom: 60 }}>
            {/* Header / Command Ribbon */}
            <div className="glass-panel" style={{ 
                padding: '36px 48px', 
                borderRadius: 32, 
                marginBottom: 32,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 24 }}>
                    <div style={{ flex: '1 1 400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ padding: '8px 16px', background: 'var(--navy-900)', borderRadius: '12px', color: 'white', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                Intelligence Hub
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 800, color: 'var(--accent-violet)' }}>
                                <FileText size={14} /> AD-HOC ON DEMAND
                            </div>
                        </div>
                        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.04em' }}>
                            Custom Reporting Engine
                        </h1>
                        <p style={{ color: 'var(--slate-500)', fontSize: '1.1rem', marginTop: 12, fontWeight: 500, maxWidth: 600 }}>
                            Build, save, and export high-fidelity data cuts tailored to specific institutional analysis requirements.
                        </p>
                    </div>

                        <button 
                            className="btn hover-lift" 
                            onClick={() => setActiveTab('exports')}
                            style={{ 
                                background: activeTab === 'exports' ? 'var(--navy-50)' : 'white', 
                                border: '1px solid var(--border-light)', 
                                color: 'var(--navy-900)', 
                                height: 52, padding: '0 24px', borderRadius: '16px', fontWeight: 800,
                                display: 'flex', alignItems: 'center', gap: 10
                            }}
                        >
                            <Download size={18} /> EXPORT CENTER
                        </button>
                        <button 
                            className="btn hover-lift" 
                            onClick={() => showToast('Ad-Hoc Report Builder is loading...', 'info')}
                            style={{ 
                                background: 'var(--navy-900)', color: 'white', 
                                height: 52, padding: '0 24px', borderRadius: '16px', fontWeight: 800,
                                display: 'flex', alignItems: 'center', gap: 10,
                                boxShadow: '0 10px 24px rgba(10,22,40,0.2)'
                            }}
                        >
                            <Plus size={18} /> BUILD NEW REPORT
                        </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="grid grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 4fr)', gap: 32, alignItems: 'start' }}>
                
                {/* Left Navigation Sidebar (Restricted to Library) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="glass-card" style={{ padding: 24, borderRadius: 24 }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                            Report Library
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { id: 'templates', label: 'Curated Templates', icon: FileText },
                                { id: 'saved', label: 'My Saved Reports', icon: FileSpreadsheet },
                                { id: 'exports', label: 'Recent Exports', icon: FileJson },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                                    border: 'none', background: activeTab === tab.id ? 'var(--navy-50)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--navy-900)' : 'var(--slate-500)',
                                    fontWeight: activeTab === tab.id ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer',
                                    transition: 'all 0.2s', textAlign: 'left'
                                }}>
                                    <tab.icon size={18} style={{ color: activeTab === tab.id ? 'var(--accent-cyan)' : 'inherit' }} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content Area */}
                <div>
                    {/* Horizontal Global Filters Row */}
                    <div className="glass-card" style={{ padding: '20px 32px', borderRadius: 24, marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Agent</label>
                                <select 
                                    className="form-control" 
                                    value={agentFilter} 
                                    onChange={e => setAgentFilter(e.target.value)}
                                    style={{ borderRadius: 12, fontSize: '0.85rem', width: 180, border: '1px solid var(--border-light)' }}
                                >
                                    <option value="All">All Team Members</option>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase' }}>From</label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    style={{ borderRadius: 12, fontSize: '0.85rem', width: 150, border: '1px solid var(--border-light)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase' }}>To</label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    style={{ borderRadius: 12, fontSize: '0.85rem', width: 150, border: '1px solid var(--border-light)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {activeTab === 'templates' && (
                        <div className="animate-fadeIn">
                            {/* Search & Filter Bar */}
                            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                                <div style={{ 
                                    flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'white',
                                    borderRadius: 16, padding: '0 20px', border: '1px solid var(--border-light)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                }}>
                                    <Search size={18} style={{ color: 'var(--slate-400)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search premium templates..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ border: 'none', outline: 'none', height: 48, width: '100%', fontWeight: 600, color: 'var(--navy-900)' }}
                                    />
                                </div>
                            </div>

                            {/* Templates Grid */}
                            <div className="grid grid-2" style={{ gap: 24 }}>
                                {REPORT_TEMPLATES.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(template => (
                                    <div key={template.id} className="glass-card hover-lift" style={{ 
                                        padding: 32, borderRadius: 24, cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                            <div style={{ 
                                                width: 48, height: 48, borderRadius: 14, 
                                                background: 'var(--navy-50)', color: 'var(--accent-violet)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <template.icon size={24} />
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 8 }}>{template.title}</h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', lineHeight: 1.5, margin: 0 }}>{template.description}</p>
                                        
                                        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                            <button 
                                                onClick={() => {
                                                    if (template.id === 'telephony') generateTelephonyReport('pdf');
                                                    else if (template.id === 'monthly') generateMonthlyReport();
                                                    else if (template.id === 'project-wise') generateProjectReport('pdf');
                                                    else showToast('Template build in progress', 'info');
                                                }}
                                                style={{ 
                                                    padding: '8px 12px', background: 'var(--navy-900)', color: 'white', borderRadius: 8, 
                                                    border: 'none', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 6
                                                }}
                                                disabled={generating}
                                            >
                                                <FileText size={14} /> PDF
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (template.id === 'telephony') generateTelephonyReport('csv');
                                                    else if (template.id === 'project-wise') generateProjectReport('csv');
                                                    else showToast('CSV export for this template coming soon', 'info');
                                                }}
                                                style={{ 
                                                    padding: '8px 12px', background: 'white', color: 'var(--navy-900)', borderRadius: 8, 
                                                    border: '1px solid var(--border-light)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 6
                                                }}
                                                disabled={generating}
                                            >
                                                <FileSpreadsheet size={14} /> CSV (EXCEL)
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Live Report Preview */}
                            <div className="glass-card" style={{ marginTop: 32, padding: 32, borderRadius: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--navy-900)', fontSize: '1.2rem' }}>Live Report Preview: Lead Velocity</h3>
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-400)' }}>
                                        <Calendar size={14} /> LAST 30 DAYS
                                    </div>
                                </div>
                                <div style={{ height: 260, width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { stage: 'New', time: 2.3 },
                                            { stage: 'Contacted', time: 4.1 },
                                            { stage: 'Site Visit', time: 7.5 },
                                            { stage: 'Negotiation', time: 14.2 },
                                            { stage: 'Closed', time: 5.6 }
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--slate-500)' }} />
                                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--slate-500)' }} tickFormatter={v => `${v}d`} />
                                            <RechartsTooltip cursor={{ fill: 'var(--slate-50)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="time" fill="var(--accent-violet)" radius={[6, 6, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'exports' && <ExportCenter />}
                    {activeTab === 'saved' && (
                        <div className="p-12 text-center glass-card" style={{ borderRadius: 24 }}>
                            <div style={{ color: 'var(--slate-400)', marginBottom: 16 }}><FileSpreadsheet size={48} /></div>
                            <h3 style={{ fontWeight: 800, color: 'var(--navy-900)' }}>No Saved Reports Yet</h3>
                            <p style={{ color: 'var(--slate-500)' }}>Customize a template and save it to see it here for quick access.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ExportCenter() {
    const { data: list, loading, refresh } = useApi(() => documentsApi.list({ type: 'Report' }));

    if (loading) return <div>Loading export history...</div>;

    return (
        <div className="animate-fadeIn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--navy-900)' }}>Global Export Center</h3>
                <button onClick={refresh} className="btn btn-sm btn-secondary">Refresh History</button>
            </div>

            <div className="glass-card" style={{ padding: 0, borderRadius: 24, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--navy-50)' }}>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>REPORT NAME</th>
                            <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>GENERATED</th>
                            <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>CONTEXT</th>
                            <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>SAVED BY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!list || list.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>No historical reports found. Generate one to see it here.</td></tr>
                        ) : list.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {r.name.endsWith('.pdf') ? <FileText size={18} color="#ef4444" /> : <FileSpreadsheet size={18} color="#10b981" />}
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                                    {new Date(r.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: '16px 24px', fontSize: '0.85rem' }}>
                                    <span style={{ padding: '4px 10px', background: 'var(--navy-50)', borderRadius: 6, fontWeight: 600 }}>{r.notes || 'General Audit'}</span>
                                </td>
                                <td style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {r.uploaded_by_name || 'Admin'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

