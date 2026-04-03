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
    admin:         { icon: Shield,    color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', label: 'Administrator',  depth: 0 },
    sales_manager: { icon: Briefcase, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', label: 'Sales Manager',   depth: 1 },
    team_leader:   { icon: UserCheck, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', label: 'Team Leader',    depth: 2 },
    agent:         { icon: User,      color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', label: 'Sales Agent',    depth: 3 },
};

const INDENT_PX = 56; 

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
                <div className="absolute right-0 mt-2 w-56 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Node Management</div>
                    </div>
                    {[
                        { label: 'Performance View', icon: LayoutDashboard, color: 'text-slate-600 hover:text-blue-600', fn: () => navigate(`/?member_id=${user.id}`) },
                        { label: 'Governance Edit', icon: Edit2, color: 'text-slate-600 hover:text-indigo-600', fn: () => onEdit(user) },
                        { label: 'Copy Email/ID', icon: Copy, color: 'text-slate-600 hover:text-emerald-600', fn: () => { navigator.clipboard.writeText(user.email); showToast('Identifier copied', 'success'); } },
                    ].map((a, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); a.fn(); setIsOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] hover:bg-slate-50 transition-all text-left border-none cursor-pointer bg-transparent font-bold ${a.color}`}
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
            {/* Vertical continuation lines - Rounded & Subtle */}
            {parentLines.map((showLine, idx) => showLine && (
                <div key={idx} className="absolute top-0 bottom-0 border-l border-slate-200/50"
                     style={{ left: idx * INDENT_PX + 28, position: 'absolute' }} />
            ))}

            {/* Horizontal rounded connector */}
            {depth > 0 && (
                <>
                    <div className="absolute border-l border-slate-200/50"
                         style={{ 
                            left: (depth - 1) * INDENT_PX + 28, 
                            top: 0, 
                            height: 38, 
                            position: 'absolute' 
                         }} />
                    <div className="absolute border-t border-l border-slate-200/50"
                         style={{ 
                            left: (depth - 1) * INDENT_PX + 28, 
                            top: 38, 
                            width: INDENT_PX - 22, 
                            height: 12,
                            borderTopLeftRadius: '14px',
                            position: 'absolute' 
                         }} />
                </>
            )}

            {/* ─── Node Card ─── */}
            <div 
                className="group relative flex items-center gap-4 py-4 px-6 mb-4 rounded-[20px] border border-slate-100 bg-white hover:border-blue-100 hover:shadow-lg transition-all duration-300"
                style={{ 
                    marginLeft: depth * INDENT_PX, 
                    display: 'flex', 
                    alignItems: 'center', 
                    position: 'relative'
                }}
            >
                {/* Expand Toggle */}
                <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 z-10" style={{ display: 'flex' }}>
                    {hasChildren ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-300 border ${
                                isExpanded 
                                    ? 'bg-slate-50 text-slate-900 border-slate-200' 
                                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                            }`}
                            style={{ cursor: 'pointer', padding: 0, outline: 'none' }}
                        >
                            <ChevronRight size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={3} />
                        </button>
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200/60" />
                    )}
                </div>

                {/* User Avatar - Professional Circular Design */}
                <div className="relative flex-shrink-0" style={{ flexShrink: 0 }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-black text-white shadow-md"
                         style={{ 
                            background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, 
                            display: 'flex' 
                         }}>
                        {user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    {/* Status Orb */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2.5 overflow-hidden" style={{ display: 'flex', alignItems: 'center' }}>
                        <h4 className="text-[15px] font-black text-slate-800 truncate tracking-tight m-0">
                            {user.name}
                        </h4>
                        <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.03em] flex items-center gap-1 border"
                              style={{ 
                                backgroundColor: config.bg, 
                                borderColor: config.color + '25', 
                                color: config.color, 
                                display: 'flex' 
                              }}>
                            <Icon size={10} strokeWidth={3.5} /> {config.label}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1" style={{ display: 'flex' }}>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold truncate m-0" style={{ display: 'flex', alignItems: 'center' }}>
                            <Mail size={10} className="text-slate-300" /> {user.email}
                        </div>
                    </div>
                </div>

                {/* IQ Badge - Desktop Only */}
                <div className="hidden lg:flex items-center gap-2.5 mr-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100" style={{ display: 'flex' }}>
                    <Zap size={12} className="text-orange-500" fill="currentColor" />
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Performance Strategic IQ</div>
                </div>

                <ActionMenu user={user} onEdit={onEdit} />
            </div>

            {isExpanded && hasChildren && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
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
    <div className="dash-stat-card hover-lift shadow-sm hover:shadow-md transition-all duration-300" style={{ flex: 1, minWidth: '220px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: gradient }} />
        <div className="dash-stat-top p-6" style={{ padding: '24px' }}>
            <div style={{ flex: 1 }}>
                <div className="dash-stat-label text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{label}</div>
                <div className="dash-stat-value text-3xl font-black text-slate-800">{value}</div>
            </div>
            <div className="dash-stat-icon w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: `${iconBg}10`, color: iconBg }}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
        <div className="px-6 pb-5 flex items-center gap-1.5 text-[11px] font-black text-slate-400" style={{ padding: '0 24px 20px' }}>
            <div className="w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center">
                <ArrowUpRight size={10} strokeWidth={3} />
            </div>
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
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
            return pool.filter(u => !u.reports_to || !users.find(p => p.id === u.reports_to));
        }
        return pool.filter(u => u.id === currentUser.id);
    }, [users, searchTerm, currentUser]);

    const roleCounts = useMemo(() => ({
        admin: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
        sales_manager: users.filter(u => u.role === 'sales_manager').length,
        team_leader: users.filter(u => u.role === 'team_leader').length,
        agent: users.filter(u => u.role === 'agent').length,
    }), [users]);

    if (loading) return <PageLoader />;

    return (
        <div className="animate-fadeIn p-8" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/50">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight m-0 mb-1">
                        Corporate Hierarchy
                    </h1>
                    <p className="text-[13px] text-slate-400 font-bold m-0 tracking-wide uppercase">
                        Enterprise Node Network & Governance Matrix
                    </p>
                </div>

                <div className="relative group" style={{ width: '100%', maxWidth: 400 }}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by node name or identifier..."
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-300 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Insight Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Executive Root" value={roleCounts.admin} gradient="var(--accent-violet)" iconBg="#6366f1" icon={Shield} change="Master Control" />
                <StatCard label="Global Managers" value={roleCounts.sales_manager} gradient="var(--accent-blue)" iconBg="#3b82f6" icon={Briefcase} change={`${roleCounts.sales_manager} node units`} />
                <StatCard label="Ops Leadership" value={roleCounts.team_leader} gradient="var(--accent-cyan)" iconBg="#06b6d4" icon={UserCheck} change={`${roleCounts.team_leader} node units`} />
                <StatCard label="Field Operations" value={roleCounts.agent} gradient="var(--accent-emerald)" iconBg="#10b981" icon={User} change={`${roleCounts.agent} node units`} />
            </div>

            {/* ── Main Tree Layout ── */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex flex-wrap items-center justify-between gap-6 bg-slate-50/30">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
                                <Network size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-[14px] font-black text-slate-800 tracking-tight">Active Matrix Repository</span>
                        </div>
                        
                        {/* ── Premium Legend ── */}
                        <div className="hidden xl:flex items-center gap-4">
                            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                                <div key={role} className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm">
                                    <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: cfg.color }}>
                                        <cfg.icon size={11} strokeWidth={3} />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-600 tracking-tight">{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{users.length} Active Node Instances</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>

                <div className="p-12 min-h-[600px] relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #fff 0%, #fafafa 100%)' }}>
                    {/* Abstract grid pattern background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    
                    <div className="max-w-[1000px] mx-auto relative">
                        {roots.length === 0 ? (
                            <div className="text-center py-24">
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-200">
                                    <Users size={32} />
                                </div>
                                <div className="text-lg font-black text-slate-300 uppercase tracking-widest">No Node Data Detected</div>
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
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowEditModal(false)} />
                    <div className="relative w-full max-w-[540px] bg-white rounded-[32px] p-10 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
                        
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight m-0 mb-1">Node Governance</h3>
                                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Configure Reporting Matrix Entry</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-900 transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer">
                                <X size={24}/>
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Legal Entity Name</label>
                                    <input name="name" defaultValue={selectedUser.name} className="w-full bg-slate-50 border-none rounded-xl p-4 text-[13px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Structure Role</label>
                                    <select name="role" defaultValue={selectedUser.role} className="w-full bg-slate-50 border-none rounded-xl p-4 text-[13px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none cursor-pointer">
                                        <option value="admin">Administrator</option>
                                        <option value="sales_manager">Sales Manager</option>
                                        <option value="team_leader">Team Leader</option>
                                        <option value="agent">Sales Agent</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reporting Anchor (Immediate Parent)</label>
                                <select name="reports_to" defaultValue={selectedUser.reports_to || ''} className="w-full bg-slate-50 border-none rounded-xl p-4 text-[13px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none cursor-pointer">
                                    <option value="">Primary Organization Root</option>
                                    {users.filter(u => u.id !== selectedUser.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            
                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-4 rounded-xl border-none bg-slate-50 text-slate-500 font-black text-[13px] uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">Discard</button>
                                <button disabled={saving} className="flex-1 py-4 rounded-xl border-none bg-blue-600 text-white font-black text-[13px] uppercase tracking-wider cursor-pointer shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]">{saving ? 'Syncing...' : 'Commit Node'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
