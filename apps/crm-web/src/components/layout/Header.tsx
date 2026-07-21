import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, Menu, Phone, Palette, Globe, Users, X, User, Building, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../context/BrandingContext';
import { usePresence } from '../../context/PresenceContext';
import { searchApi } from '../../api/client';
import NotificationDropdown from '../notifications/NotificationDropdown';
import HelpModal from '../modals/HelpModal';
import { useTheme } from '../../context/ThemeContext';
import { usePageInfo } from '../../context/PageContext';

const PAGE_TITLES = {
    '/': { title: 'Dashboard', subtitle: 'Welcome back!' },
    '/leads': { title: 'Lead Management', subtitle: 'Manage your sales leads' },
    '/pipeline': { title: 'Sales Pipeline', subtitle: 'Visualize your lead funnel stages' },
    '/projects': { title: 'Project Inventory', subtitle: 'Manage all property projects' },
    '/inventory': { title: 'Unit Inventory', subtitle: 'Track unit availability and status' },
    '/customers': { title: 'Customer Profiles', subtitle: 'View and manage customer records' },
    '/bookings': { title: 'Booking Management', subtitle: 'Track and confirm property bookings' },
    '/followups': { title: 'Follow-Up Scheduler', subtitle: 'Schedule and track all follow-ups' },
    '/site-visits': { title: 'Site Visit Planner', subtitle: 'Plan and manage property site visits' },
    '/nurture-leads': { title: 'Nurture Leads', subtitle: 'Long-term follow-ups and re-engagement' },
    '/analytics': { title: 'Sales Analytics', subtitle: 'Enterprise performance metrics and growth intelligence' },
    '/leaderboard': { title: 'Sales Leaderboard', subtitle: 'Track and celebrate top performing agents' },
    '/team-hierarchy': { title: 'Team Governance', subtitle: 'Organizational reporting matrix' },
    '/voice-analytics': { title: 'Voice Telemetry', subtitle: 'Precision tracking for GSM SIM-integrated dialing performance.' },
    '/admin': { title: 'Admin Controls', subtitle: 'Manage users, roles, and system settings' },
    '/payment-tracker': { title: 'Payment Tracker', subtitle: 'Track EMI and payment schedules' },
    '/agreements': { title: 'Agreements & Docs', subtitle: 'Manage contracts and documents' },
    '/notifications': { title: 'Notification Center', subtitle: 'SMS, Email & WhatsApp messaging telemetry' },
    '/channel-partners': { title: 'Channel Partners', subtitle: 'Manage broker partnerships' },
    '/calendar': { title: 'Calendar', subtitle: 'Schedule and view events' },
    '/search': { title: 'Search Results', subtitle: 'Global exploration' },
    '/superadmin': { title: 'Network Command Center', subtitle: 'Monitoring Workspaces across Zentrix Global Network' },
    '/lead-scoring': { title: 'Lead Score & Status', subtitle: 'Advanced qualification funnel and predictive scoring' },
    '/command-center': { title: 'Pipeline Command', subtitle: 'CRM Engine Active' },
    '/inbox': { title: 'Omnichannel Inbox', subtitle: 'Manage real-time streams from WhatsApp, Email, and SMS' },
    '/whatsapp-marketing': { title: 'WhatsApp Intelligence', subtitle: 'Autonomous AI engagement and campaign broadcasting' },
    '/marketing': { title: 'Marketing Hub', subtitle: 'Orchestrate high-conversion drip sequences and follow-up loops' },
    '/call-records': { title: 'Voice Intelligence Hub', subtitle: 'Unified log of all client communications and voice engagements' },
    '/academy': { title: 'Zentrix Academy', subtitle: 'AI-powered sales training and certifications' },
    '/reports': { title: 'Custom Reports', subtitle: 'Advanced business intelligence and data exports' },
    '/customer-portal': { title: 'Customer Portal', subtitle: 'Personalized property portfolio and document center' },
    '/automations': { title: 'CRM Automations', subtitle: 'Automate follow-ups and repetitive tasks across your pipeline' },
    '/automation-distribution': { title: 'Automation & Distribution', subtitle: 'Intelligent lead routing, zero-latency assignments, and automated orchestration' },
    '/integrations': { title: 'Connectivity Matrix', subtitle: 'Architect your lead conversion pipeline by bridging ZentrixCRM with global marketing ecosystems' },
    '/commissions': { title: 'Commission & Incentives', subtitle: 'Automated payouts and incentive tracking engine' },
    '/billing': { title: 'Subscription & Billing', subtitle: 'Choose the right plan to scale your real estate agency' },
};

interface HeaderProps {
    collapsed: boolean;
    isMobile: boolean;
    onToggle: () => void;
}

export default function Header({ collapsed, isMobile, onToggle }: HeaderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { branding } = useBranding();
    const { pageInfo } = usePageInfo();
    const [searchVal, setSearchVal] = useState('');
    const [results, setResults] = useState({ leads: [], projects: [] });
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const { theme: currentTheme, setTheme } = useTheme();
    const dropdownRef = useRef(null);
    const userMenuRef = useRef(null);
    const mobileSearchRef = useRef(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    const { logout } = useAuth();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const isLeadDetail = location.pathname.startsWith('/leads/') && location.pathname !== '/leads';
    const page = PAGE_TITLES[location.pathname] || (isLeadDetail ? { title: 'Lead Profile', subtitle: 'View lead details & interactions' } : { title: branding?.company_name || 'Zentrix CRM', subtitle: '' });

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

    // Auto-focus mobile search input when opened
    useEffect(() => {
        if (showMobileSearch && mobileInputRef.current) {
            setTimeout(() => mobileInputRef.current?.focus(), 50);
        }
        if (!showMobileSearch) {
            setSearchVal('');
            setResults({ leads: [], projects: [] });
            setShowDropdown(false);
        }
    }, [showMobileSearch]);

    const handleResultClick = (type, id) => {
        setShowDropdown(false);
        setShowMobileSearch(false);
        setSearchVal('');
        if (type === 'lead') {
            navigate(`/leads/${id}`);
        } else {
            navigate(`/projects`);
        }
    };

    return (
        <header className={headerClass} style={{ height: 72 }}>
            <div className="header-left">
                <button 
                    onClick={onToggle} 
                    aria-label="Toggle menu"
                    style={isMobile ? {
                        background: 'none', border: 'none', boxShadow: 'none',
                        color: '#64748b', cursor: 'pointer', padding: 0,
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    } : { 
                        width: 40, height: 40, borderRadius: 12, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        cursor: 'pointer'
                    }}
                    className={isMobile ? '' : 'toggle-btn'}
                >
                    <Menu size={isMobile ? 22 : 18} />
                </button>
                <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isLeadDetail && (
                        <button
                            onClick={() => navigate('/leads')}
                            aria-label="Back to leads"
                            style={{
                                border: 'none', background: '#f1f5f9', borderRadius: 8,
                                width: 28, height: 28, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', color: '#0f172a', padding: 0,
                                flexShrink: 0
                            }}
                        >
                            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    )}
                    <div>
                        <div className="header-title" style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1, fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
                            {pageInfo.title || page.title || branding?.company_name || 'Maya Infratech'}
                        </div>
                        <div className="header-breadcrumb" style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 600, color: isMobile ? '#64748b' : '#475569', marginTop: isMobile ? 3 : 2 }}>
                            {pageInfo.subtitle || page.subtitle || `${getGreeting()}, ${user?.name?.split(' ')[0] || 'Rohan'}! 👋`}
                        </div>
                    </div>
                </div>
            </div>

            <div className="header-right">
                {/* Header right side items */}
                {!isMobile ? (
                    <div style={{ position: 'relative', flex: 1, maxWidth: 350, margin: '0 24px' }}>
                        {searching ? <Loader2 size={16} className="animate-spin" style={{ color: '#94a3b8', position: 'absolute', left: 16, top: '50%', marginTop: -8 }} /> : <Search size={16} style={{ color: '#94a3b8', position: 'absolute', left: 16, top: '50%', marginTop: -8 }} />}
                        <input
                            className="search-input"
                            value={searchVal}
                            onChange={e => setSearchVal(e.target.value)}
                            placeholder="Search leads, projects, contacts..."
                            onFocus={(e) => {
                                searchVal.trim().length >= 2 && setShowDropdown(true);
                            }}
                            style={{ 
                                width: '100%',
                                paddingLeft: 42,
                                paddingRight: 16,
                                borderRadius: '12px',
                                height: '40px',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                        
                        {showDropdown && (
                            <div 
                                ref={dropdownRef}
                                className="glass-panel animate-fadeIn" 
                                style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', 
                                    left: 0, 
                                    right: -100, 
                                    minWidth: 320, 
                                    background: 'white', borderRadius: 16, 
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
                ) : (
                    /* Mobile Search: expandable overlay */
                    <>
                        <button 
                            onClick={() => setShowMobileSearch(true)}
                            aria-label="Search"
                            style={{ marginRight: 16, width: 34, height: 34, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                        >
                            <Search size={22} color="#475569" />
                        </button>

                        {showMobileSearch && (
                            <div style={{
                                position: 'fixed', inset: 0, zIndex: 2000,
                                background: 'rgba(15,23,42,0.55)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'stretch',
                            }} onClick={(e) => { if (e.target === e.currentTarget) setShowMobileSearch(false); }}>
                                <div style={{
                                    background: 'white',
                                    borderRadius: '0 0 24px 24px',
                                    padding: '16px 16px 0',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                                    display: 'flex', flexDirection: 'column', gap: 0,
                                }} ref={mobileSearchRef}>
                                    {/* Search bar row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            {searching
                                                ? <Loader2 size={16} className="animate-spin" style={{ color: '#94a3b8', position: 'absolute', left: 14, top: '50%', marginTop: -8 }} />
                                                : <Search size={16} style={{ color: '#94a3b8', position: 'absolute', left: 14, top: '50%', marginTop: -8 }} />}
                                            <input
                                                ref={mobileInputRef}
                                                className="search-input"
                                                value={searchVal}
                                                onChange={e => setSearchVal(e.target.value)}
                                                onFocus={() => searchVal.trim().length >= 2 && setShowDropdown(true)}
                                                placeholder="Search leads, projects, contacts..."
                                                style={{
                                                    width: '100%', paddingLeft: 42, paddingRight: 16,
                                                    borderRadius: '12px', height: '44px',
                                                    fontSize: '0.9rem', outline: 'none',
                                                    border: '1.5px solid #e2e8f0',
                                                    background: '#f8fafc',
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowMobileSearch(false)}
                                            style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '12px', border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Results */}
                                    {showDropdown && (
                                        <div style={{ maxHeight: '55vh', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
                                            {/* Leads */}
                                            {results.leads.length > 0 && (
                                                <div style={{ padding: '12px 0' }}>
                                                    <div style={{ padding: '0 4px 8px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <User size={11} /> Leads
                                                    </div>
                                                    {results.leads.map(lead => (
                                                        <div key={lead.id} onClick={() => handleResultClick('lead', lead.id)}
                                                            style={{ padding: '10px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, transition: 'background 0.15s' }}
                                                            className="hover-bg-slate"
                                                        >
                                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', flexShrink: 0 }}>
                                                                {getInitials(lead.name)}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</div>
                                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{lead.phone || lead.email || 'No contact info'}</div>
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{lead.stage}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Projects */}
                                            {results.projects.length > 0 && (
                                                <div style={{ padding: '12px 0', borderTop: results.leads.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
                                                    <div style={{ padding: '0 4px 8px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Building size={11} /> Projects
                                                    </div>
                                                    {results.projects.map(p => (
                                                        <div key={p.id} onClick={() => handleResultClick('project', p.id)}
                                                            style={{ padding: '10px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, transition: 'background 0.15s' }}
                                                            className="hover-bg-slate"
                                                        >
                                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', flexShrink: 0 }}>
                                                                <Building size={16} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.location || 'No location'}</div>
                                                            </div>
                                                            <ArrowRight size={14} color="#94a3b8" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Empty state */}
                                            {results.leads.length === 0 && results.projects.length === 0 && !searching && (
                                                <div style={{ padding: '28px 0', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>🔍</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>No results found</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Try a different name or phone number</div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer hint */}
                                    {!showDropdown && (
                                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                                            Type at least 2 characters to search
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!isMobile && (
                    <div style={{ 
                        marginRight: 16, padding: '6px 12px', borderRadius: '10px', 
                        background: '#f0fdf4', color: '#10b981', 
                        border: '1px solid #dcfce7', 
                        fontSize: '0.65rem', fontWeight: 900,
                        display: 'flex', alignItems: 'center', gap: 6,
                        letterSpacing: '0.02em'
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                        LIVE
                    </div>
                )}


                <div className="hide-mobile" style={{ display: 'flex', gap: 10, marginRight: 20, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    {['EN', 'AR', 'ES', 'ZH'].map(lang => (lang === 'EN' ? <span key={lang} style={{ color: 'var(--navy-900)', background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>{lang}</span> : null))}
                </div>


                {!isMobile && (
                    <button 
                        className="icon-btn"
                        onClick={() => setShowHelp(true)}
                        aria-label="Help Center"
                        style={{ marginRight: 12, width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <HelpCircle size={18} />
                    </button>
                )}

                <div style={{ position: 'relative', marginRight: isMobile ? 22 : 16 }}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        aria-label="Notifications"
                        style={isMobile ? {
                            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
                            background: 'none', border: 'none', padding: 0
                        } : { width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                        className={isMobile ? '' : 'icon-btn'}
                    >
                        <Bell size={isMobile ? 22 : 18} color={isMobile ? '#475569' : undefined} />
                        <span style={{ 
                            position: 'absolute', top: isMobile ? -2 : 4, right: isMobile ? -2 : 4, 
                            background: '#ef4444', color: 'white', 
                            borderRadius: '50%', fontSize: '0.62rem', 
                            fontWeight: 900, width: 14, height: 14, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid white' 
                        }}>{isMobile ? 3 : 5}</span>
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
                            width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
                            borderRadius: '50%',
                            background: '#1e73e8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: isMobile ? '0.85rem' : '1rem', color: 'white',
                            cursor: 'pointer', flexShrink: 0,
                            transition: 'transform 0.2s',
                            transform: showUserMenu ? 'scale(1.05)' : 'scale(1)',
                            position: 'relative'
                        }}
                    >
                        {getInitials(user?.name) || 'RM'}
                        <div style={{ 
                            position: 'absolute', bottom: 0, right: 0, 
                            width: 10, height: 10, borderRadius: '50%', 
                            background: '#10b981', border: '2px solid white' 
                        }} />
                    </div>

                    {showUserMenu && (
                        <div className="glass-panel animate-scaleIn" style={{
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                            width: 280, background: 'var(--surface-card)', borderRadius: 16,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)', padding: 8,
                            zIndex: 1001, border: '1px solid var(--border-light)'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-50)', marginBottom: 4 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user?.name || 'My Account'}</div>
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
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>User Profile</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Security & Preferences</div>
                                </div>
                            </button>

                            <div style={{ margin: '4px 0' }}>
                                <button 
                                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: 10, width: '100%', 
                                        padding: '10px 12px', border: 'none', background: 'transparent',
                                        borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                        transition: 'background 0.2s'
                                    }}
                                    className="hover-bg-slate"
                                >
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-600)' }}>
                                        <Palette size={16} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Theme</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{currentTheme}</div>
                                    </div>
                                    <ChevronRight size={14} style={{ transform: showThemeMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
                                </button>

                                {showThemeMenu && (
                                    <div style={{ padding: '8px 8px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        {[
                                            { id: 'Light', label: 'Light', bg: '#ffffff', sidebar: '#ffffff', accent: '#1c1c1c', text: '#1e293b', border: '#e2e8f0' },
                                            { id: 'Dark', label: 'Dark', bg: '#040d1a', sidebar: '#0a1628', accent: '#3b63b8', text: '#f1f5f9', border: '#162d58' },
                                            { id: 'Classic Dark', label: 'Classic', bg: '#0a0a0a', sidebar: '#141414', accent: '#a78bfa', text: '#e4e4e7', border: '#27272a' },
                                            { id: 'System', label: 'System', bg: 'linear-gradient(135deg, #fff 50%, #0a1628 50%)', sidebar: '', accent: '#10b981', text: '', border: '#e2e8f0' },
                                        ].map(t => {
                                            const isActive = currentTheme === t.id;
                                            return (
                                                <div 
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id as any)}
                                                    style={{ 
                                                        padding: 6, borderRadius: 10, cursor: 'pointer',
                                                        border: isActive ? '2px solid #10b981' : '2px solid var(--border-light)',
                                                        background: 'var(--surface-card)',
                                                        transition: 'all 0.2s ease',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {/* Mini preview swatch */}
                                                    <div style={{ 
                                                        height: 36, borderRadius: 6, marginBottom: 6, overflow: 'hidden',
                                                        background: t.id === 'System' ? undefined : t.bg,
                                                        border: `1px solid ${t.border}`,
                                                        display: 'flex', position: 'relative'
                                                    }}>
                                                        {t.id === 'System' ? (
                                                            <>
                                                                <div style={{ flex: 1, background: '#ffffff' }} />
                                                                <div style={{ flex: 1, background: '#0a1628' }} />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div style={{ width: '25%', background: t.sidebar, borderRight: `1px solid ${t.border}` }} />
                                                                <div style={{ flex: 1, padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                    <div style={{ height: 3, width: '60%', background: t.accent, borderRadius: 2 }} />
                                                                    <div style={{ height: 2, width: '80%', background: t.border, borderRadius: 2 }} />
                                                                    <div style={{ height: 2, width: '50%', background: t.border, borderRadius: 2 }} />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#10b981' : 'var(--text-muted)' }}>{t.label}</span>
                                                        {isActive && <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                        </div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

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

