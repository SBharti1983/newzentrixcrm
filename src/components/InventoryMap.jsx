import { useState } from 'react';
import { Home, RefreshCcw, MapPin, Building, PercentSquare } from 'lucide-react';

const STATUS_COLORS = {
    Available: '#10b981', // Emerald
    Sold: '#ef4444',      // Rose
    Booked: '#f59e0b',    // Amber
    'On Hold': '#94a3b8'  // Slate
};

export default function InventoryMap({ units, onUnitClick }) {
    const [selectedProject, setSelectedProject] = useState(
        units.length > 0 ? units[0].projectId : null
    );

    if (units.length === 0) {
        return (
            <div className="card" style={{ padding: 60, textAlign: 'center', background: 'var(--slate-50)', color: 'var(--text-muted)', borderRadius: 24 }}>
                <RefreshCcw size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No digital twin available for this project.</h3>
            </div>
        );
    }

    const projects = Array.from(new Set(units.map(u => u.projectId)))
        .map(id => {
            const u = units.find(x => x.projectId === id);
            return { id, name: u.projectName || `Project ${id}` };
        });

    const activeProjectId = selectedProject || projects[0]?.id;
    const projectUnits = units.filter(u => u.projectId === activeProjectId);

    const floorsMap = {};
    projectUnits.forEach(u => {
        const f = u.floor === 0 ? 'G' : u.floor || 'G';
        if (!floorsMap[f]) floorsMap[f] = [];
        floorsMap[f].push(u);
    });

    const floorKeys = Object.keys(floorsMap).sort((a, b) => {
        if (a === 'G') return 1;
        if (b === 'G') return -1;
        return parseInt(b) - parseInt(a);
    });

    const totalUnits = projectUnits.length;
    const soldUnits = projectUnits.filter(u => u.status === 'Sold').length;
    const occupancyRate = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;

    return (
        <div className="animate-fadeIn">
            {/* Project Selection Tabs */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32, overflowX: 'auto', paddingBottom: 12 }}>
                {projects.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedProject(p.id)}
                        style={{
                            padding: '12px 24px', borderRadius: 16, fontWeight: 800, border: 'none', cursor: 'pointer', transition: '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            background: activeProjectId === p.id ? 'var(--navy-900)' : 'white',
                            color: activeProjectId === p.id ? 'white' : 'var(--navy-600)',
                            boxShadow: activeProjectId === p.id ? '0 10px 20px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* 3D Isometric View Container */}
                <div style={{ 
                    flex: '1 1 600px', 
                    background: 'linear-gradient(135deg, white, #f1f5f9)', 
                    padding: '48px', 
                    borderRadius: '40px', 
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.05)',
                    perspective: '1500px',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
                        <Building size={28} className="text-secondary" />
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.04em' }}>Isometric Tower Meta-View</h2>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 16,
                        transform: 'rotateX(15deg) rotateY(-10deg)',
                        transformStyle: 'preserve-3d'
                    }}>
                        {floorKeys.map(floor => (
                            <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: 32, transformStyle: 'preserve-3d' }}>
                                <div style={{ 
                                    width: 80, fontWeight: 900, color: 'var(--slate-400)', 
                                    fontSize: '0.9rem', textAlign: 'right', textTransform: 'uppercase' 
                                }}>
                                    {floor === 'G' ? 'Level 0' : `Level ${floor}`}
                                </div>
                                <div style={{ display: 'flex', gap: 14, flex: 1, flexWrap: 'wrap', transformStyle: 'preserve-3d' }}>
                                    {floorsMap[floor]
                                        .sort((a, b) => (a.unit_no || a.unitNo).localeCompare(b.unit_no || b.unitNo))
                                        .map(u => {
                                            const color = STATUS_COLORS[u.status] || STATUS_COLORS['On Hold'];
                                            return (
                                                <div
                                                    key={u.id}
                                                    onClick={() => onUnitClick && onUnitClick(u)}
                                                    className="unit-3d-block"
                                                    style={{
                                                        width: 70, height: 70, borderRadius: 12, cursor: 'pointer',
                                                        background: 'white', borderBottom: `4px solid ${color}40`,
                                                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                        position: 'relative',
                                                        boxShadow: `0 8px 16px rgba(0,0,0,0.06), 0 2px 4px ${color}20`,
                                                        transform: 'translateZ(0px)',
                                                        transformStyle: 'preserve-3d'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.transform = 'translateZ(25px)';
                                                        e.currentTarget.style.boxShadow = `0 25px 50px rgba(0,0,0,0.12), 0 0 20px ${color}40`;
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.transform = 'translateZ(0px)';
                                                        e.currentTarget.style.boxShadow = `0 8px 16px rgba(0,0,0,0.06), 0 2px 4px ${color}20`;
                                                    }}
                                                >
                                                    {/* The Status Top-Cap */}
                                                    <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: color }} />
                                                    
                                                    <div style={{ fontWeight: 950, fontSize: '1.1rem', color: 'var(--navy-900)' }}>{u.unit_no || u.unitNo}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--slate-400)', fontWeight: 800 }}>{u.type}</div>
                                                    
                                                    {/* Virtual Depth Layer */}
                                                    <div style={{
                                                        position: 'absolute', bottom: -4, left: 0, right: 0, height: 4, 
                                                        background: color, opacity: 0.6, borderRadius: '0 0 12px 12px',
                                                        transform: 'rotateX(-90deg)', origin: 'bottom'
                                                    }} />
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 64, pt: 32, borderTop: '2px dashed var(--border-light)' }}>
                        {Object.entries(STATUS_COLORS).map(([label, color]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', fontWeight: 800, color: 'var(--slate-500)' }}>
                                <div style={{ width: 14, height: 14, borderRadius: 5, background: color, boxShadow: `0 0 10px ${color}40` }} />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Analytics Sidebar */}
                <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 32, borderRadius: 32, border: '1px solid var(--border-light)', background: 'var(--navy-900)', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <PercentSquare size={24} color="var(--accent-cyan)" />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>Project Health</h3>
                        </div>
                        
                        <div style={{ textAlign: 'center', mb: 32 }}>
                            <div style={{ fontSize: '3.5rem', fontWeight: 950, lineHeight: 1 }}>{occupancyRate}%</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Occupancy rate</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ opacity: 0.7, fontWeight: 700 }}>Total Inventory</span>
                                <span style={{ fontWeight: 900 }}>{totalUnits}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#ef4444', fontWeight: 800 }}>Sold Out</span>
                                <span style={{ fontWeight: 900 }}>{soldUnits}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#10b981', fontWeight: 800 }}>In Stock</span>
                                <span style={{ fontWeight: 900 }}>{totalUnits - soldUnits - projectUnits.filter(u => u.status === 'Booked').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 32, borderRadius: 32, background: 'white', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, mb: 16 }}>
                            <MapPin size={20} color="var(--accent-violet)" />
                            <h4 style={{ fontWeight: 900, margin: 0 }}>Tower Insights</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', lineHeight: 1.6, margin: '12px 0 0' }}>
                            Currently showing the <b>Interactive Digital Twin</b> for the selected sector. Units are updated in real-time as soon as the Booking Desk processes an order.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
