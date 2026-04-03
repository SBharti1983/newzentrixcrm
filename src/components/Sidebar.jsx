import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Building2, UserCheck, Calendar,
    MapPin, BookOpen, BarChart3, Settings, ChevronLeft,
    ChevronRight, LogOut, Bell, Handshake, CreditCard,
    FileCheck, CalendarDays, ExternalLink, X, MessageSquare, Zap, IndianRupee, Target, History, Phone, Sparkles, Mic, Trophy, RotateCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_ACCESS } from '../constants/access';
import { leadsApi } from '../api/client';

const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/command-center', label: 'Command Center', icon: Sparkles },
            { path: '/calendar', label: 'Calendar', icon: CalendarDays },
        ],
    },
    {
        label: 'Sales',
        items: [
            { path: '/leads', label: 'Leads', icon: Users, badge: '10' },
            { path: '/pipeline', label: 'Deals', icon: BarChart3 },
            { path: '/nurture-leads', label: 'Nurture Leads', icon: RotateCw },
            { path: '/lead-scoring', label: 'Lead Scoring', icon: Target },
        ],
    },
    {
        label: 'Planning',
        items: [
            { path: '/followups', label: 'Follow-Ups', icon: Calendar, badge: '5' },
            { path: '/site-visits', label: 'Site Visits', icon: MapPin },
        ],
    },
    {
        label: 'Properties',
        items: [
            { path: '/projects', label: 'Projects', icon: Building2 },
            { path: '/inventory', label: 'Inventory', icon: BookOpen },
        ],
    },
    {
        label: 'Communications',
        items: [
            { path: '/inbox', label: 'Omnichannel Inbox', icon: MessageSquare, badge: '3' },
            { path: '/whatsapp-marketing', label: 'WhatsApp Intelligence', icon: Sparkles },
            { path: '/marketing', label: 'Marketing Hub', icon: Target },
            { path: '/call-records', label: 'Call Log', icon: History },
            { path: '/notifications', label: 'Notifications', icon: Bell },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { path: '/analytics', label: 'Analytics', icon: BarChart3 },
            { path: '/team-hierarchy', label: 'Team Hierarchy', icon: Users },
            { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
            { path: '/voice-analytics', label: 'Voice Telemetry', icon: Mic },
            { path: '/reports', label: 'Custom Reports', icon: FileCheck },
        ],
    },
    {
        label: 'Customers',
        items: [
            { path: '/customers', label: 'Customers', icon: UserCheck },
            { path: '/bookings', label: 'Bookings', icon: BookOpen, badge: '3' },
            { path: '/payment-tracker', label: 'Payment Tracker', icon: CreditCard },
            { path: '/agreements', label: 'Agreements & Docs', icon: FileCheck },
            { path: '/customer-portal', label: 'Customer Portal', icon: ExternalLink },
        ],
    },
    {
        label: 'Partners',
        items: [
            { path: '/channel-partners', label: 'Channel Partners', icon: Handshake },
        ],
    },
    {
        label: 'Admin',
        items: [
            { path: '/automation-distribution', label: 'Auto-Distribute', icon: Zap },
            { path: '/automations', label: 'Automations', icon: Zap },
            { path: '/integrations', label: 'Integrations', icon: ExternalLink },
            { path: '/commissions', label: 'Commissions', icon: IndianRupee },
            { path: '/admin', label: 'Admin Panel', icon: Settings },
            { path: '/billing', label: 'Billing & Plan', icon: CreditCard },
        ],
    },
    {
        label: 'System',
        items: [
            { path: '/superadmin', label: 'Super Admin', icon: LayoutDashboard },
        ],
    },
];

const ROLE_LABELS = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    sales_manager: 'Manager',
    team_leader: 'Team Leader',
    agent: 'Agent',
    customer: 'Customer',
};

const ROLE_COLORS = {
    superadmin: { color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
    admin: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    sales_manager: { color: '#0070f3', bg: 'rgba(0,112,243,0.1)' },
    team_leader: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
    agent: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    customer: { color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
};

export default function Sidebar({ collapsed, isMobile, mobileOpen, onToggle, onLogout, onNavigate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, canAccess } = useAuth();
    const roleColors = user ? ROLE_COLORS[user.role] : ROLE_COLORS.agent;
    const [realLeadCount, setRealLeadCount] = useState(null);

    const isMainDomain = window.location.hostname === 'zentrixcrm.com' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    useEffect(() => {
        if (canAccess('/leads')) {
            leadsApi.list({ limit: 1 })
                .then(res => setRealLeadCount(res.total))
                .catch(err => console.error('Failed to update sidebar lead count', err));
        }
    }, [canAccess]);

    const filteredSections = NAV_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (item.path === '/superadmin' && !isMainDomain) return false;
            return canAccess(item.path);
        }),
    })).filter(section => section.items.length > 0);

    const handleNav = (path) => {
        navigate(path);
        if (onNavigate) onNavigate(); // close sidebar on mobile
    };

    // On mobile: show/hide via class; on desktop: normal collapsed logic
    const sidebarClass = [
        'sidebar',
        collapsed && !isMobile ? 'collapsed' : '',
        isMobile ? 'mobile-sidebar' : '',
        isMobile && mobileOpen ? 'mobile-open' : '',
    ].filter(Boolean).join(' ');

    return (
        <nav className={sidebarClass}>
            {/* Logo + mobile close button */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">Z</div>
                <span className="sidebar-logo-text">Zentrix CRM</span>
                {isMobile && (
                    <button className="mobile-close-btn" onClick={onToggle} aria-label="Close menu">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Role badge (when expanded) */}
            {!collapsed && user && (
                <div style={{
                    margin: '0 12px 12px', padding: '6px 10px',
                    borderRadius: 'var(--border-radius-sm)',
                    background: roleColors.bg, border: `1px solid ${roleColors.color}30`,
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: roleColors.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: roleColors.color, letterSpacing: '0.04em' }}>
                        {ROLE_LABELS[user.role]}
                    </span>
                </div>
            )}

            {/* Navigation */}
            <div className="sidebar-nav">
                {filteredSections.map(section => (
                    <div key={section.label}>
                        <div className="nav-section-label">{section.label}</div>
                        {section.items.map(({ path, label, icon: Icon, badge }) => {
                            let displayBadge = badge;
                            if (label === 'Leads' && realLeadCount !== null) {
                                displayBadge = realLeadCount;
                            }
                            return (
                                <button
                                    key={path}
                                    className={`nav-item${location.pathname === path ? ' active' : ''}`}
                                    onClick={() => handleNav(path)}
                                    data-tooltip={collapsed ? label : undefined}
                                >
                                    <Icon className="nav-item-icon" size={18} />
                                    <span className="nav-item-text">{label}</span>
                                    {displayBadge ? <span className="nav-badge">{displayBadge > 999 ? '999+' : displayBadge}</span> : null}
                                </button>
                            );
                        })}
                    </div>
                ))}

                {/* Public Enquiry Form link */}
                {!collapsed && (
                    <div style={{ padding: '8px 12px 0' }}>
                        <div className="nav-section-label">Public</div>
                        <button
                            className="nav-item"
                            onClick={() => window.open('/enquiry', '_blank')}
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <ExternalLink className="nav-item-icon" size={18} />
                            <span className="nav-item-text">Enquiry Form ↗</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-user" onClick={() => handleNav('/admin')}>
                    <div className="sidebar-avatar">{user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.name || 'User'}</div>
                        <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || '—'}</div>
                    </div>
                </div>
                {/* Logout */}
                {!collapsed && (
                    <button onClick={onLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '8px 12px', border: 'none', background: 'transparent',
                        cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem',
                        fontWeight: 600, borderRadius: 'var(--border-radius-sm)',
                        transition: 'all 0.15s', marginTop: 4,
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.color = 'var(--accent-rose)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        <LogOut size={15} /> Sign Out
                    </button>
                )}
            </div>

            {/* Collapse toggle — desktop only */}
            {!isMobile && (
                <button onClick={onToggle} style={{
                    position: 'absolute', right: '-14px', top: '78px',
                    width: 28, height: 28, background: 'white',
                    border: '1px solid var(--border-light)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                    color: 'var(--text-secondary)', zIndex: 101,
                    transition: 'all var(--transition-fast)',
                }}>
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            )}
        </nav>
    );
}
