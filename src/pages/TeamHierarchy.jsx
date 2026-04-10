import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { 
    Users, ChevronRight, ChevronDown, User, Shield, 
    Briefcase, UserCheck, Mail, Phone,
    Search, MoreVertical, LayoutDashboard,
    Edit2, Copy, X, Network, Minus, ExternalLink,
    TrendingUp, Award, Zap, Info, ShieldCheck, 
    ArrowUpRight, Clock
} from 'lucide-react';
import { PageLoader, PageError } from '../components/Feedback';

/* ─── Role Visual Config ─── */
const ROLE_CONFIG = {
    admin:         { icon: Shield,    color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', label: 'Administrator',  depth: 0, shadow: 'rgba(59, 130, 246, 0.1)' },
    sales_manager: { icon: Briefcase, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', label: 'Sales Manager',   depth: 1, shadow: 'rgba(99, 102, 241, 0.1)' },
    team_leader:   { icon: UserCheck, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', label: 'Team Leader',    depth: 2, shadow: 'rgba(6, 182, 212, 0.1)' },
    agent:         { icon: User,      color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', label: 'Sales Agent',    depth: 3, shadow: 'rgba(16, 185, 129, 0.1)' },
};

const INDENT_PX = 48; 

/* ─── Action Dropdown ─── */
const ActionMenu = ({ user, onEdit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`p-1.5 rounded-lg transition-all duration-200 ${isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'}`}
                style={{ border: 'none', cursor: 'pointer', background: 'transparent', outline: 'none' }}
            >
                <MoreVertical size={16} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 py-2 rounded-xl bg-white border border-slate-200 shadow-xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Node Management</div>
                    </div>
                    {[
                        { label: 'Performance View', icon: LayoutDashboard, color: 'text-slate-600 hover:text-blue-600', fn: () => navigate(`/?member_id=${user.id}`) },
                        { label: 'Governance Edit', icon: Edit2, color: 'text-slate-600 hover:text-indigo-600', fn: () => onEdit(user) },
                        { label: 'Copy Email/ID', icon: Copy, color: 'text-slate-600 hover:text-emerald-600', fn: () => { navigator.clipboard.writeText(user.email); showToast('Identifier copied', 'success'); } },
                    ].map((a, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); a.fn(); setIsOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-slate-50 transition-all text-left border-none cursor-pointer bg-transparent ${a.color}`}
                        >
                            <a.icon size={14} /> {a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Tree Node ─── */
const TreeNode = ({ user, allUsers, depth = 0, onEdit, isLast = false, parentLines = [] }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const children = useMemo(() => allUsers.filter(u => u.reports_to === user.id), [allUsers, user.id]);
    const hasChildren = children.length > 0;
    const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.agent;
    const Icon = config.icon;

    return (
        <div className="relative">
            {/* Vertical continuation lines */}
            {parentLines.map((showLine, idx) => showLine && (
                <div key={idx} className="absolute top-0 bottom-0 border-l border-slate-300"
                     style={{ left: idx * INDENT_PX + 24, position: 'absolute' }} />
            ))}

            {/* Horizontal connector */}
            {depth > 0 && (
                <>
                    <div className="absolute border-l border-slate-300"
                         style={{ left: (depth - 1) * INDENT_PX + 24, top: 0, height: 32, position: 'absolute' }} />
                    <div className="absolute border-t border-slate-300 rounded-tl-lg"
                         style={{ left: (depth - 1) * INDENT_PX + 24, top: 32, width: INDENT_PX - 20, position: 'absolute' }} />
                </>
            )}

            {/* ─── Node Card ─── */}
            <div 
                className="group relative flex items-center gap-5 py-3 px-5 mb-4 rounded-[28px] border border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300"
                style={{ marginLeft: depth * INDENT_PX, minHeight: '88px', position: 'relative' }}
            >
                <div className="absolute left-[-1px] top-4 bottom-4 w-[4px] rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                     style={{ backgroundColor: config.color }} />

                <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 z-10" style={{ display: 'flex' }}>
                    {hasChildren ? (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                                isExpanded ? 'bg-slate-100 text-slate-900 border-slate-200' : 'bg-slate-50 text-slate-400 border-transparent'
                            } hover:bg-slate-200`}
                            style={{ cursor: 'pointer', border: '1px solid', padding: 0, outline: 'none' }}
                        >
                            <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={3} />
                        </button>
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    )}
                </div>

                <div className="relative flex-shrink-0" style={{ flexShrink: 0 }}>
                    <div 
                        className="w-16 h-16 flex items-center justify-center text-[17px] font-black shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
                        style={{ 
                            background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 50%, ${config.color}aa 100%)`, 
                            display: 'flex',
                            borderRadius: '50%',
                            color: '#ffffff',
                            border: '3px solid rgba(255,255,255,1)',
                            boxShadow: `0 12px 25px -8px ${config.color}60`,
                            textShadow: '0 2px 4px rgba(0,0,0,0.25)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Subtle Mesh Glow Overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(255,255,255,0.25), transparent)', pointerEvents: 'none' }} />
                        <span style={{ position: 'relative', zIndex: 1 }}>
                            {user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white bg-emerald-500 shadow-md" title="Active Node" />
                </div>

                <div className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>{user.name}</span>
                        <div style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', 
                            background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}80` }} />
                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{config.label}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-medium truncate" style={{ display: 'flex' }}>
                        <span className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center' }}><Mail size={10} /> {user.email}</span>
                        {user.phone && <span className="flex items-center gap-1.5 border-l border-slate-100 pl-3" style={{ display: 'flex', alignItems: 'center' }}><Phone size={10} /> {user.phone}</span>}
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 mr-6 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/50 shadow-sm" style={{ display: 'flex' }}>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-600">
                        <Zap size={12} strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Performance IQ</span>
                </div>

                <ActionMenu user={user} onEdit={onEdit} />
            </div>

            {isExpanded && hasChildren && (
                <div style={{ transition: 'all 0.3s' }}>
                    {children.map((child, idx) => (
                        <TreeNode 
                            key={child.id} 
                            user={child} 
                            allUsers={allUsers} 
                            depth={depth + 1} 
                            onEdit={onEdit}
                            isLast={idx === children.length - 1}
                            parentLines={[...parentLines, !isLast]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Stat Card ─── */
const StatCard = ({ label, value, gradient, iconBg, icon: Icon, change }) => (
    <div className="dash-stat-card hover-lift" style={{ flex: 1, minWidth: '180px' }}>
        <div className="dash-stat-accent" style={{ background: gradient }} />
        <div className="dash-stat-top">
            <div>
                <div className="dash-stat-label">{label}</div>
                <div className="dash-stat-value">{value}</div>
            </div>
            <div className="dash-stat-icon" style={{ background: `${iconBg}12`, color: iconBg }}>
                <Icon size={18} strokeWidth={2} />
            </div>
        </div>
        <div className="dash-stat-change">
            <ArrowUpRight size={12} strokeWidth={2.5} />
            {change}
        </div>
    </div>
);

/* ─── Main Page ─── */
export default function TeamHierarchy() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const data = await usersApi.list();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch team members:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => { setSelectedUser(user); setShowEditModal(true); };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData(e.target);
            const updates = Object.fromEntries(formData);
            await usersApi.update(selectedUser.id, updates);
            showToast('Governance settings synchronized', 'success');
            setShowEditModal(false);
            fetchUsers();
        } catch (err) {
            showToast(err.error || 'Sync failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const roots = useMemo(() => {
        const pool = searchTerm 
            ? users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
            : users;
        if (currentUser.role === 'admin') {
            return pool.filter(u => !u.reports_to || !users.find(p => p.id === u.reports_to));
        }
        return pool.filter(u => u.id === currentUser.id);
    }, [users, searchTerm, currentUser]);

    const roleCounts = useMemo(() => ({
        admin: users.filter(u => u.role === 'admin').length,
        sales_manager: users.filter(u => u.role === 'sales_manager').length,
        team_leader: users.filter(u => u.role === 'team_leader').length,
        agent: users.filter(u => u.role === 'agent').length,
    }), [users]);

    if (loading) return <PageLoader />;

    return (
        <div className="animate-fadeIn" style={{ background: '#f8fafc', padding: '24px', minHeight: '100vh', margin: '-24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-light)', paddingBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>
                        Team Hierarchy & Governance
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Manage corporate reporting matrix and organizational node density.
                    </p>
                </div>

                <div style={{ width: 400 }} className="search-bar">
                    <Search size={16} />
                    <input 
                        type="text" 
                        placeholder="Identify node email or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Insight Matrix (FORCED SINGLE ROW) ── */}
            <div className="dash-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <StatCard label="EXECUTIVE ADMINS" value={roleCounts.admin} gradient="linear-gradient(135deg, #3b82f6, #2563eb)" iconBg="#3b82f6" icon={Shield} change="Org Root" />
                <StatCard label="GLOBAL MANAGERS" value={roleCounts.sales_manager} gradient="linear-gradient(135deg, #6366f1, #4f46e5)" iconBg="#6366f1" icon={Briefcase} change={`${roleCounts.sales_manager} units`} />
                <StatCard label="OPERATIONAL LEADS" value={roleCounts.team_leader} gradient="linear-gradient(135deg, #06b6d4, #0891b2)" iconBg="#06b6d4" icon={UserCheck} change={`${roleCounts.team_leader} units`} />
                <StatCard label="FIELD SPECIALISTS" value={roleCounts.agent} gradient="linear-gradient(135deg, #10b981, #059669)" iconBg="#10b981" icon={User} change={`${roleCounts.agent} units`} />
            </div>

            {/* ── Main Tree Layout ── */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Network size={18} style={{ color: '#3b82f6' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--navy-900)' }}>Organizational Matrix</span>
                        </div>
                        
                        {/* ── BEAUTIFUL PILL LEGEND ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', tracking: '0.05em' }}>Legend:</span>
                            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
                                const Icon = cfg.icon;
                                return (
                                    <div key={role} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 8, 
                                        padding: '6px 12px', 
                                        background: cfg.bg, 
                                        borderRadius: '100px', 
                                        border: `1px solid ${cfg.color}15`
                                    }}>
                                        <div style={{ 
                                            width: 18, 
                                            height: 18, 
                                            borderRadius: '6px', 
                                            background: cfg.color, 
                                            color: 'white', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Icon size={10} strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)' }}>{users.length} Active Nodes Syncing</span>
                        <div className="dash-live-dot" style={{ background: '#10b981' }} />
                    </div>
                </div>

                <div style={{ padding: '40px', minHeight: '500px', background: '#f1f5f9' }}>
                    <div style={{ maxWidth: '940px', margin: '0 auto' }}>
                        {roots.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', opacity: 0.2 }}>
                                <Users size={48} style={{ marginBottom: 16 }} />
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>No nodes detected</div>
                            </div>
                        ) : (
                            roots.map((root, idx) => (
                                <TreeNode 
                                    key={root.id} 
                                    user={root} 
                                    allUsers={users} 
                                    onEdit={handleEdit}
                                    isLast={idx === roots.length - 1}
                                    parentLines={[]}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Sync Modal */}
            {showEditModal && selectedUser && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowEditModal(false)} />
                    <div style={{ position: 'relative', width: '100%', maxWidth: '500px', background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Governance Node Sync</h3>
                            <button onClick={() => setShowEditModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--slate-400)' }}><X size={24}/></button>
                        </div>
                        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Entity Name</label>
                                    <input name="name" defaultValue={selectedUser.name} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 700 }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Security Role</label>
                                    <select name="role" defaultValue={selectedUser.role} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 700 }}>
                                        <option value="admin">Administrator</option>
                                        <option value="sales_manager">Sales Manager</option>
                                        <option value="team_leader">Team Leader</option>
                                        <option value="agent">Sales Agent</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Reporting Root</label>
                                <select name="reports_to" defaultValue={selectedUser.reports_to || ''} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 700 }}>
                                    <option value="">Primary Root</option>
                                    {users.filter(u => u.id !== selectedUser.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: 'var(--slate-500)', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                                <button disabled={saving} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>{saving ? 'Syncing...' : 'Commit Node'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
