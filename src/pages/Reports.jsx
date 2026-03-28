import { useState } from 'react';
import { 
    Filter, Download, Plus, Search, FileText, 
    BarChart2, PieChart, Activity, Calendar, 
    MoreVertical, FileSpreadsheet, FileJson
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

// Mock report templates
const REPORT_TEMPLATES = [
    { id: 1, title: 'Lead Velocity Report', description: 'Analyze lead progression speed across pipeline stages', icon: Activity, type: 'velocity' },
    { id: 2, title: 'Conversion Attribution', description: 'Determine highest converting marketing channels', icon: PieChart, type: 'conversion' },
    { id: 3, title: 'Executive Sales Summary', description: 'C-level overview of revenue and unit absorption', icon: BarChart2, type: 'sales' },
];

export default function Reports() {
    const [activeTab, setActiveTab] = useState('templates');
    const [searchQuery, setSearchQuery] = useState('');

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

                    <div style={{ display: 'flex', gap: 16 }}>
                        <button className="btn hover-lift" style={{ 
                            background: 'white', border: '1px solid var(--border-light)', color: 'var(--navy-900)', 
                            height: 52, padding: '0 24px', borderRadius: '16px', fontWeight: 800,
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            <Download size={18} /> EXPORT CENTER
                        </button>
                        <button className="btn hover-lift" style={{ 
                            background: 'var(--navy-900)', color: 'white', 
                            height: 52, padding: '0 24px', borderRadius: '16px', fontWeight: 800,
                            display: 'flex', alignItems: 'center', gap: 10,
                            boxShadow: '0 10px 24px rgba(10,22,40,0.2)'
                        }}>
                            <Plus size={18} /> BUILD NEW REPORT
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="grid grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 3fr)', gap: 32, alignItems: 'start' }}>
                
                {/* Left Navigation Sidebar */}
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

                    <div className="glass-card" style={{ padding: 24, borderRadius: 24 }}>
                         <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                            Data Sources
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {['Leads', 'Pipeline', 'Bookings', 'Inventory', 'Agents'].map(ds => (
                                <div key={ds} style={{ 
                                    padding: '6px 12px', background: 'var(--slate-50)', border: '1px solid var(--border-light)',
                                    borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-600)'
                                }}>
                                    {ds}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content Area */}
                <div>
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
                                <button style={{ 
                                    width: 48, height: 48, borderRadius: 16, background: 'white', border: '1px solid var(--border-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-600)', cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                }}>
                                    <Filter size={20} />
                                </button>
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
                                            <button style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>
                                                <MoreVertical size={20} />
                                            </button>
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 8 }}>{template.title}</h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', lineHeight: 1.5, margin: 0 }}>{template.description}</p>
                                        
                                        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <button style={{ 
                                                padding: '8px 16px', background: 'var(--navy-900)', color: 'white', borderRadius: 8, 
                                                border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                            }}>
                                                Generate
                                            </button>
                                            <button style={{ 
                                                padding: '8px 16px', background: 'white', color: 'var(--navy-600)', borderRadius: 8, 
                                                border: '1px solid var(--border-light)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                            }}>
                                                Customize
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Demo Analytics Preview section - Just to show some flair */}
                            <div className="glass-panel" style={{ marginTop: 32, padding: 32, borderRadius: 24 }}>
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
                </div>
            </div>
        </div>
    );
}

