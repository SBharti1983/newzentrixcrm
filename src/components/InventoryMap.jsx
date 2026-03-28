import { useState } from 'react';
import { Home, Filter, RefreshCcw } from 'lucide-react';

const STATUS_COLORS = {
    Available: 'var(--accent-emerald)',
    Sold: 'var(--accent-rose)',
    Booked: 'var(--accent-amber)',
    'On Hold': 'var(--slate-400)'
};

export default function InventoryMap({ units, onUnitClick }) {
    const [selectedProject, setSelectedProject] = useState(
        units.length > 0 ? units[0].projectId : null
    );

    if (units.length === 0) {
        return (
            <div className="card" style={{ padding: 60, textAlign: 'center', background: 'var(--slate-50)', color: 'var(--text-muted)' }}>
                <RefreshCcw size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No units available to map.</h3>
            </div>
        );
    }

    // Identify unique projects
    const projects = Array.from(new Set(units.map(u => u.projectId)))
        .map(id => {
            const u = units.find(x => x.projectId === id);
            return { id, name: u.projectName || `Project ${id}` };
        });

    const activeProjectId = selectedProject || projects[0]?.id;
    const projectUnits = units.filter(u => u.projectId === activeProjectId);

    // Group by floor
    const floorsMap = {};
    projectUnits.forEach(u => {
        const f = u.floor === 0 ? 'G' : u.floor || 'G';
        if (!floorsMap[f]) floorsMap[f] = [];
        floorsMap[f].push(u);
    });

    // Sort floors descending (highest floor at top)
    const floorKeys = Object.keys(floorsMap).sort((a, b) => {
        if (a === 'G') return 1;
        if (b === 'G') return -1;
        return parseInt(b) - parseInt(a);
    });

    return (
        <div className="animate-fadeIn">
            {/* Project Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
                {projects.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedProject(p.id)}
                        style={{
                            padding: '10px 20px', borderRadius: 100, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            background: activeProjectId === p.id ? 'var(--navy-800)' : 'var(--slate-100)',
                            color: activeProjectId === p.id ? 'white' : 'var(--navy-600)',
                        }}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            <div className="card" style={{ padding: 32, background: 'var(--slate-50)', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {/* The Map */}
                <div style={{ flex: '1 1 500px', background: 'white', padding: 32, borderRadius: 24, border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid var(--border-light)' }}>
                        <Home size={24} style={{ color: 'var(--navy-800)' }} />
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Interactive Tower Map</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {floorKeys.map(floor => (
                            <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ width: 60, fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.1rem', textAlign: 'right' }}>
                                    {floor === 'G' ? 'Ground' : `Fl ${floor}`}
                                </div>
                                <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap', padding: '12px', background: 'var(--slate-50)', borderRadius: 16 }}>
                                    {floorsMap[floor]
                                        .sort((a, b) => (a.unit_no || a.unitNo).localeCompare(b.unit_no || b.unitNo))
                                        .map(u => {
                                            const bg = STATUS_COLORS[u.status] || STATUS_COLORS['On Hold'];
                                            return (
                                                <div
                                                    key={u.id}
                                                    onClick={() => onUnitClick && onUnitClick(u)}
                                                    data-tooltip={`${u.status} | ${u.type} | ${u.price}`}
                                                    style={{
                                                        padding: '12px', minWidth: 80, textAlign: 'center', borderRadius: 12, cursor: 'pointer',
                                                        background: 'white', border: `2px solid ${bg}`, transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: bg }} />
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-800)' }}>{u.unit_no || u.unitNo}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{u.type}</div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 40, paddingTop: 20, borderTop: '2px dashed var(--border-medium)' }}>
                        {Object.entries(STATUS_COLORS).map(([label, color]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                <div style={{ width: 14, height: 14, borderRadius: 4, background: color }} />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Panel Placeholder */}
                <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card" style={{ padding: 24, borderTop: '4px solid var(--accent-cyan)' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px' }}>Tower Usage</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Units</span>
                            <span style={{ fontWeight: 800 }}>{projectUnits.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sold</span>
                            <span style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>{projectUnits.filter(u => u.status === 'Sold').length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Available</span>
                            <span style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{projectUnits.filter(u => u.status === 'Available').length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
