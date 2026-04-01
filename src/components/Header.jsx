import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, HelpCircle, Menu, Phone, Palette, Globe, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePresence } from '../context/PresenceContext';
import NotificationDropdown from './NotificationDropdown';
import HelpModal from './HelpModal';

const PAGE_TITLES = {
    '/': { title: 'Dashboard', subtitle: 'Welcome back!' },
    '/leads': { title: 'Lead Management', subtitle: 'Track and manage your sales leads' },
    '/pipeline': { title: 'Sales Pipeline', subtitle: 'Visualize your lead funnel stages' },
    '/projects': { title: 'Project Inventory', subtitle: 'Manage all property projects' },
    '/inventory': { title: 'Unit Inventory', subtitle: 'Track unit availability and status' },
    '/customers': { title: 'Customer Profiles', subtitle: 'View and manage customer records' },
    '/bookings': { title: 'Booking Management', subtitle: 'Track and confirm property bookings' },
    '/followups': { title: 'Follow-Up Scheduler', subtitle: 'Schedule and track all follow-ups' },
    '/site-visits': { title: 'Site Visit Planner', subtitle: 'Plan and manage property site visits' },
    '/analytics': { title: 'Sales Analytics', subtitle: 'In-depth sales insights and performance' },
    '/leaderboard': { title: 'Sales Leaderboard', subtitle: 'Track and celebrate top performing agents' },
    '/admin': { title: 'Admin Controls', subtitle: 'Manage users, roles, and system settings' },
    '/payment-tracker': { title: 'Payment Tracker', subtitle: 'Track EMI and payment schedules' },
    '/agreements': { title: 'Agreements & Docs', subtitle: 'Manage contracts and documents' },
    '/notifications': { title: 'Notifications', subtitle: 'SMS, Email & WhatsApp messaging' },
    '/channel-partners': { title: 'Channel Partners', subtitle: 'Manage broker partnerships' },
    '/calendar': { title: 'Calendar', subtitle: 'Schedule and view events' },
};

export default function Header({ collapsed, isMobile, onToggle }) {
    const location = useLocation();
    const { user } = useAuth();
    const [searchVal, setSearchVal] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const page = PAGE_TITLES[location.pathname] || { title: 'Zentrix CRM', subtitle: '' };

    const headerClass = [
        'header',
        collapsed && !isMobile ? 'sidebar-collapsed' : '',
        isMobile ? 'mobile-header' : '',
    ].filter(Boolean).join(' ');

    const getInitials = (name) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const { onlineUsers } = usePresence();

    return (
        <header className={headerClass}>
            <div className="header-left">
                <button className="toggle-btn" onClick={onToggle} aria-label="Toggle menu">
                    <Menu size={16} />
                </button>
                <div>
                    <div className="header-title">{page.title}</div>
                    <div className="header-breadcrumb hide-mobile">{page.subtitle}</div>
                </div>
            </div>

            <div className="header-right">
                {/* Real-time Collaboration Avatar Stack */}
                <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', marginRight: 24, gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {onlineUsers.filter(u => u.id !== user?.id).slice(0, 3).map((u, i) => (
                            <div key={u.id} title={`${u.name} is active`} style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'var(--navy-600)', border: '2px solid white',
                                marginLeft: i === 0 ? 0 : -8, position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 800, color: 'white',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                zIndex: 10 - i
                            }}>
                                {u.avatar || getInitials(u.name)}
                                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)', border: '1.5px solid white' }} />
                            </div>
                        ))}
                        {onlineUsers.length > 4 && (
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'var(--slate-100)', border: '2px solid white',
                                marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)',
                                zIndex: 0
                            }}>
                                +{onlineUsers.length - 4}
                            </div>
                        )}
                    </div>
                    {onlineUsers.length > 1 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-emerald)', letterSpacing: '0.02em' }}>TEAM SYNCED</span>}
                </div>

                <div className="search-bar hide-mobile-sm">
                    <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        value={searchVal}
                        onChange={e => setSearchVal(e.target.value)}
                        placeholder="Search leads, projects..."
                    />
                </div>

                <div style={{ 
                    marginRight: 10, padding: '4px 12px', borderRadius: '8px', 
                    background: '#f0fdf4', color: '#10b981', 
                    border: '1px solid #dcfce7', 
                    fontSize: '11px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    LIVE
                </div>

                <div className="hide-mobile" style={{ display: 'flex', gap: 10, marginRight: 15, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {['EN', 'AR', 'ES', 'ZH'].map(lang => (lang === 'EN' ? <span key={lang} style={{ color: 'var(--navy-900)', background: 'var(--slate-100)', padding: '2px 6px', borderRadius: 4 }}>{lang}</span> : null))}
                </div>

                <button 
                    onClick={() => window.simulateInbound?.()} 
                    style={{ 
                        marginRight: 12, padding: '6px 14px', borderRadius: '10px', 
                        background: 'var(--navy-900)', color: 'white', border: 'none', 
                        fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 12px rgba(10,22,40,0.15)'
                    }}
                    className="hover-lift"
                >
                    <Phone size={12} color="#10b981" /> SIMULATE IVR
                </button>

                <button 
                    className={`icon-btn ${showHelp ? 'active' : ''}`}
                    onClick={() => setShowHelp(true)}
                    aria-label="Help Center"
                    style={{ marginRight: 10 }}
                >
                    <HelpCircle size={16} />
                </button>

                <div style={{ position: 'relative' }}>
                    <button 
                        className={`icon-btn ${showNotifications ? 'active' : ''}`} 
                        onClick={() => setShowNotifications(!showNotifications)}
                        aria-label="Notifications"
                    >
                        <Bell size={16} />
                        <span className="notification-dot" />
                    </button>
                    {showNotifications && (
                        <NotificationDropdown onClose={() => setShowNotifications(false)} />
                    )}
                </div>

                <div 
                    title={user?.name || 'User'}
                    style={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--navy-500), var(--accent-cyan))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8rem', color: 'white',
                        cursor: 'pointer', flexShrink: 0,
                        border: '2px solid white',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    {user?.avatar || getInitials(user?.name)}
                </div>
            </div>

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </header>
    );
}

