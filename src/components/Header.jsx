import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, Menu, Phone, Palette, Globe, Users, X, User, Building, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../context/BrandingContext';
import { usePresence } from '../context/PresenceContext';
import { searchApi } from '../api/client';
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
    '/search': { title: 'Search Results', subtitle: 'Global exploration' },
    '/superadmin': { title: 'Network Command Center', subtitle: 'Monitoring Workspaces across Zentrix Global Network' },
};

export default function Header({ collapsed, isMobile, onToggle }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { branding } = useBranding();
    const [searchVal, setSearchVal] = useState('');
    const [results, setResults] = useState({ leads: [], projects: [] });
    const [searching, setSearching] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const dropdownRef = useRef(null);
    const userMenuRef = useRef(null);

    const { logout } = useAuth();

    const page = PAGE_TITLES[location.pathname] || { title: branding?.company_name || 'Zentrix CRM', subtitle: '' };

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

    // Global Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            const query = searchVal.trim();
            if (query.length >= 2) {
                setSearching(true);
                setShowDropdown(true);
                try {
                    const data = await searchApi.global(query);
                    setResults(data);
                } catch (err) {
                    console.error('Search failed', err);
                } finally {
                    setSearching(false);
                }
            } else {
                setResults({ leads: [], projects: [] });
                setShowDropdown(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchVal]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (type, id) => {
        setShowDropdown(false);
        setSearchVal('');
        if (type === 'lead') {
            navigate(`/leads/${id}`);
        } else {
            navigate(`/projects`); // Project detail page might not be fully active yet, but we point to projects
        }
    };

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
                {!isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: 24, gap: 12 }}>
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
                )}

                <div className="search-bar hide-mobile-sm" style={{ position: 'relative' }}>
                    {searching ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--navy-400)' }} /> : <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                    <input
                        value={searchVal}
                        onChange={e => setSearchVal(e.target.value)}
                        placeholder="Search leads, projects..."
                        onFocus={() => searchVal.trim().length >= 2 && setShowDropdown(true)}
                    />
                    
                    {showDropdown && (
                        <div 
                            ref={dropdownRef}
                            className="glass-panel animate-fadeIn" 
                            style={{ 
                                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: -100, 
                                minWidth: 320, background: 'white', borderRadius: 16, 
                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden', 
                                padding: 0, zIndex: 1000, border: '1px solid var(--border-light)' 
                            }}
                        >
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                {/* Leads Section */}
                                {results.leads.length > 0 && (
                                    <div style={{ padding: '12px 0' }}>
                                        <div style={{ padding: '0 16px 8px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <User size={12} /> Leads
                                        </div>
                                        {results.leads.map(lead => (
                                            <div 
                                                key={lead.id} 
                                                onClick={() => handleResultClick('lead', lead.id)}
                                                style={{ 
                                                    padding: '10px 16px', cursor: 'pointer', transition: 'background 0.2s',
                                                    display: 'flex', alignItems: 'center', gap: 12
                                                }}
                                                className="hover-bg-slate"
                                            >
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--navy-600)' }}>
                                                    {getInitials(lead.name)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)' }}>{lead.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lead.phone || lead.email || 'No contact info'}</div>
                                                </div>
                                                <div className="badge" style={{ fontSize: '0.65rem', background: 'var(--slate-100)', color: 'var(--text-secondary)' }}>{lead.stage}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Projects Section */}
                                {results.projects.length > 0 && (
                                    <div style={{ padding: '12px 0', borderTop: results.leads.length > 0 ? '1px solid var(--border-light)' : 'none' }}>
                                        <div style={{ padding: '0 16px 8px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building size={12} /> Projects
                                        </div>
                                        {results.projects.map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => handleResultClick('project', p.id)}
                                                style={{ 
                                                    padding: '10px 16px', cursor: 'pointer', transition: 'background 0.2s',
                                                    display: 'flex', alignItems: 'center', gap: 12
                                                }}
                                                className="hover-bg-slate"
                                            >
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-cyan-light, #ecfeff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                                                    <Building size={16} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.location || 'No location'}</div>
                                                </div>
                                                <ArrowRight size={14} color="var(--text-muted)" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {results.leads.length === 0 && results.projects.length === 0 && !searching && (
                                    <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔍</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)' }}>No results found</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try searching with a different name or phone</div>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ padding: '12px 16px', background: 'var(--slate-50)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    Search for <span style={{ fontWeight: 800, color: 'var(--navy-600)' }}>"{searchVal}"</span>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>10+ Results</div>
                            </div>
                        </div>
                    )}
                </div>

                {!isMobile && (
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
                )}

                <div className="hide-mobile" style={{ display: 'flex', gap: 10, marginRight: 15, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {['EN', 'AR', 'ES', 'ZH'].map(lang => (lang === 'EN' ? <span key={lang} style={{ color: 'var(--navy-900)', background: 'var(--slate-100)', padding: '2px 6px', borderRadius: 4 }}>{lang}</span> : null))}
                </div>

                { !isMobile && (
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
                )}

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

                <div style={{ position: 'relative' }} ref={userMenuRef}>
                    <div 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        title={user?.name || 'User Profile'}
                        style={{
                            width: 36, height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--navy-500), var(--accent-cyan))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem', color: 'white',
                            cursor: 'pointer', flexShrink: 0,
                            border: '2px solid white',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'transform 0.2s',
                            transform: showUserMenu ? 'scale(1.05)' : 'scale(1)'
                        }}
                    >
                        {user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/')) ? (
                            <img src={user.avatar} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'
                        )}
                        
                        <div style={{ 
                            position: 'absolute', bottom: -1, right: -1, 
                            width: 10, height: 10, borderRadius: '50%', 
                            background: '#10b981', border: '1.5px solid white' 
                        }} />
                    </div>

                    {showUserMenu && (
                        <div className="glass-panel animate-scaleIn" style={{
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                            width: 240, background: 'white', borderRadius: 16,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)', padding: 8,
                            zIndex: 1001, border: '1px solid var(--border-light)'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-50)', marginBottom: 4 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-900)' }}>{user?.name || 'My Account'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                                <div style={{ 
                                    display: 'inline-block', marginTop: 8, padding: '2px 8px', 
                                    borderRadius: 6, background: 'var(--navy-50)', color: 'var(--navy-600)',
                                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase'
                                }}>
                                    ID: {user?.id?.slice(0, 8)}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', 
                                    padding: '10px 12px', border: 'none', background: 'transparent',
                                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.2s'
                                }}
                                className="hover-bg-slate"
                            >
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-600)' }}>
                                    <User size={16} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-900)' }}>User Profile</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Security & Preferences</div>
                                </div>
                            </button>

                            <button 
                                onClick={logout}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', 
                                    padding: '10px 12px', border: 'none', background: 'transparent',
                                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.2s', marginTop: 4, color: 'var(--accent-rose)'
                                }}
                                className="hover-bg-rose-light"
                            >
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowRight size={16} />
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sign Out</div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </header>
    );
}

