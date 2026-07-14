import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { projectsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { 
    Plus, Search, X, Building2, 
    Layers, Compass, Box, LayoutGrid, List,
    ChevronRight, MapPin, Wallet, ArrowUpRight,
    TrendingUp, Filter, Download, LayoutDashboard,
    Home, Info
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

const COLORS = {
    primary: '#1e293b', // Deep Slate
    accent: '#4f46e5',  // Indigo
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    danger: '#ef4444',  // Rose
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#64748b'
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.enterprise-inventory {
    font-family: 'Outfit', sans-serif;
    color: ${COLORS.text};
    background-color: ${COLORS.bg};
    min-height: 100vh;
}

.stats-ribbon {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: 24px;
    padding: 32px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
    margin-bottom: 40px;
    position: relative;
    overflow: hidden;
}

.stats-ribbon::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%);
    z-index: 0;
}

.stat-item {
    position: relative;
    z-index: 1;
}

.stat-value {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 4px;
    letter-spacing: -1px;
}

.stat-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.action-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
    align-items: center;
    flex-wrap: wrap;
}

.search-container {
    flex: 1;
    min-width: 300px;
    position: relative;
    background: white;
    border-radius: 16px;
    border: 1px solid ${COLORS.border};
    padding: 2px 16px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.search-container:focus-within {
    border-color: ${COLORS.accent};
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.search-input {
    border: none;
    outline: none;
    padding: 12px;
    width: 100%;
    font-size: 0.95rem;
    font-weight: 500;
    color: ${COLORS.text};
}

.filter-select {
    background: white;
    border: 1px solid ${COLORS.border};
    border-radius: 16px;
    padding: 12px 40px 12px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${COLORS.text};
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
    appearance: none;
    min-width: 180px;
}

.filter-select:hover {
    border-color: ${COLORS.accent};
}

.asset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 32px;
}

.asset-card {
    background: white;
    border-radius: 24px;
    border: 1px solid ${COLORS.border};
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: flex;
    flex-direction: column;
}

.asset-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.08);
    border-color: rgba(79, 70, 229, 0.2);
}

.card-visual {
    height: 180px;
    background: linear-gradient(45deg, #f1f5f9 0%, #e2e8f0 100%);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.card-visual::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%);
    opacity: 0;
    transition: opacity 0.3s;
}

.asset-card:hover .card-visual::after {
    opacity: 1;
}

.status-badge {
    position: absolute;
    top: 20px;
    left: 20px;
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
    z-index: 10;
}

.status-Available { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.status-Sold { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
.status-Booked { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
.status-OnHold { background: rgba(100, 116, 139, 0.15); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.2); }

.card-price {
    position: absolute;
    bottom: 20px;
    right: 20px;
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
    z-index: 10;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.card-content {
    padding: 28px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.unit-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: ${COLORS.text};
    margin-bottom: 4px;
    letter-spacing: -0.5px;
}

.project-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${COLORS.muted};
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 24px;
}

.data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: auto;
}

.data-item {
    background: #f8fafc;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid #f1f5f9;
}

.data-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: ${COLORS.muted};
    text-transform: uppercase;
    margin-bottom: 4px;
}

.data-value {
    font-size: 0.9rem;
    font-weight: 800;
    color: ${COLORS.text};
}

.premium-btn {
    padding: 12px 24px;
    border-radius: 14px;
    font-weight: 700;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-primary {
    background: ${COLORS.accent};
    color: white;
    box-shadow: 0 8px 16px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
    transform: translateY(-2px);
    background: #4338ca;
    box-shadow: 0 12px 20px rgba(79, 70, 229, 0.3);
}

.animate-fadeIn {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.view-toggle {
    display: flex;
    background: white;
    border: 1px solid ${COLORS.border};
    border-radius: 14px;
    padding: 4px;
    gap: 4px;
}

.toggle-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: ${COLORS.muted};
    cursor: pointer;
    transition: all 0.2s;
}

.toggle-btn.active {
    background: #f1f5f9;
    color: ${COLORS.accent};
}
`;

export default function Inventory() {
    const { showToast } = useToast();
    const isMobile = useMobile();
    const { data: projectsRaw, loading: loadingProjects, error: projError, refetch: refetchProjects } = useApi(() => projectsApi.list());
    const projects = useMemo(() => projectsRaw || [], [projectsRaw]);

    const [units, setUnits] = useState<any[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [unitsError, setUnitsError] = useState(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        return () => { document.head.removeChild(styleEl); };
    }, []);

    const refetchUnits = async () => {
        if (!projects.length) return;
        setLoadingUnits(true);
        try {
            const arr = await Promise.all(projects.map(p =>
                projectsApi.inventory(p.id)
                    .then(r => (r || []).map(u => ({ ...u, projectId: p.id, projectName: p.name })))
                    .catch(() => [])
            ));
            setUnits(arr.flat());
        } catch (err: any) {
            setUnitsError(err?.message || 'Failed to load units');
        } finally {
            setLoadingUnits(false);
        }
    };

    useEffect(() => {
        refetchUnits();
    }, [projects]);

    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    const filtered = units.filter(u => {
        const ms = (u.unit_no || u.unitNo || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.projectName || '').toLowerCase().includes(search.toLowerCase());
        const mp = filterProject === 'All' || String(u.projectId) === filterProject;
        const ms2 = filterStatus === 'All' || u.status === filterStatus;
        return ms && mp && ms2;
    });

    const counts = {
        total: units.length,
        available: units.filter(u => u.status === 'Available').length,
        booked: units.filter(u => u.status === 'Booked').length,
        sold: units.filter(u => u.status === 'Sold').length
    };

    if (loadingProjects || loadingUnits) return <PageLoader />;
    if (projError || unitsError) return <PageError message={projError || unitsError} onRetry={() => { refetchProjects(); refetchUnits(); }} />;

    return (
        <div className="enterprise-inventory" style={{ padding: isMobile ? '20px' : '40px' }}>
            {/* 💎 Intelligence Stats Ribbon */}
            <div className="stats-ribbon animate-fadeIn">
                <div style={{ display: 'flex', gap: isMobile ? '32px' : '64px', flexWrap: 'wrap' }}>
                    <div className="stat-item">
                        <div className="stat-value">{counts.total}</div>
                        <div className="stat-label">Inventory Assets</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value" style={{ color: COLORS.success }}>{counts.available}</div>
                        <div className="stat-label">Available Units</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value" style={{ color: COLORS.warning }}>{counts.booked}</div>
                        <div className="stat-label">Reserved</div>
                    </div>
                </div>
                
                {!isMobile && (
                    <div style={{ display: 'flex', gap: 16 }}>
                        <button className="premium-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Download size={18} /> Export
                        </button>
                        <button className="premium-btn btn-primary">
                            <Plus size={20} strokeWidth={2.5} /> Register Asset
                        </button>
                    </div>
                )}
            </div>

            {/* 🛠️ Strategic Action Bar */}
            <div className="action-bar animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                <div className="search-container">
                    <Search size={18} color={COLORS.muted} />
                    <input 
                        className="search-input"
                        placeholder="Search by unit number or project..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: 12, width: isMobile ? '100%' : 'auto' }}>
                    <div style={{ position: 'relative' }}>
                        <select className="filter-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                            <option value="All">All Portfolios</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <Filter size={14} style={{ position: 'absolute', right: 16, top: '50%', marginTop: -7, pointerEvents: 'none', color: COLORS.muted }} />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="All">Life-cycle Status</option>
                            {['Available', 'Booked', 'Sold', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <LayoutDashboard size={14} style={{ position: 'absolute', right: 16, top: '50%', marginTop: -7, pointerEvents: 'none', color: COLORS.muted }} />
                    </div>

                    {!isMobile && (
                        <div className="view-toggle">
                            <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                                <LayoutGrid size={18} />
                            </button>
                            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                                <List size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 🏢 Asset Inventory Display */}
            {viewMode === 'grid' ? (
                <div className="asset-grid">
                    {filtered.map((unit, idx) => (
                        <div 
                            key={unit.id} 
                            className="asset-card animate-fadeIn" 
                            style={{ animationDelay: `${0.1 + (idx * 0.05)}s` }}
                        >
                            <div className="card-visual">
                                <div className={`status-badge status-${(unit.status || 'Available').replace(' ', '')}`}>
                                    {unit.status}
                                </div>
                                <div className="card-price">
                                    {unit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unit.base_price) : 'Contact Sales'}
                                </div>
                                <Building2 size={64} strokeWidth={1} color={COLORS.muted} style={{ opacity: 0.2 }} />
                            </div>

                            <div className="card-content">
                                <div className="unit-title">{unit.unit_no || unit.unitNo}</div>
                                <div className="project-name">
                                    <MapPin size={12} /> {unit.projectName}
                                </div>

                                <div className="data-grid">
                                    <div className="data-item">
                                        <div className="data-label">Configuration</div>
                                        <div className="data-value">{unit.property_type || unit.type || 'N/A'}</div>
                                    </div>
                                    <div className="data-item">
                                        <div className="data-label">Floor Level</div>
                                        <div className="data-value">{unit.floor} Tier</div>
                                    </div>
                                    <div className="data-item">
                                        <div className="data-label">Facing</div>
                                        <div className="data-value">{unit.facing || 'Standard'}</div>
                                    </div>
                                    <div className="data-item">
                                        <div className="data-label">Area (Sq.ft)</div>
                                        <div className="data-value">{unit.area_sqft || unit.area || '---'}</div>
                                    </div>
                                </div>

                                <button style={{
                                    marginTop: 24,
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    color: COLORS.primary,
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    cursor: 'pointer'
                                }}>
                                    Inspect Details <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="asset-list animate-fadeIn" style={{ background: 'white', borderRadius: 24, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
                                <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>Asset ID</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>Portfolio</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>Config</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>Valuation</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(unit => (
                                <tr key={unit.id} style={{ borderBottom: `1px solid ${COLORS.border}`, transition: 'background 0.2s' }}>
                                    <td style={{ padding: '20px 24px', fontWeight: 800, color: COLORS.primary }}>{unit.unit_no || unit.unitNo}</td>
                                    <td style={{ padding: '20px 24px', color: COLORS.text, fontWeight: 600 }}>{unit.projectName}</td>
                                    <td style={{ padding: '20px 24px', color: COLORS.muted, fontWeight: 500 }}>{unit.property_type || unit.type} • Floor {unit.floor}</td>
                                    <td style={{ padding: '20px 24px', fontWeight: 700 }}>{unit.base_price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unit.base_price) : '---'}</td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <span className={`status-badge status-${(unit.status || 'Available').replace(' ', '')}`} style={{ position: 'relative', top: 0, left: 0 }}>
                                            {unit.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                        <button style={{ border: 'none', background: 'transparent', color: COLORS.accent, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
