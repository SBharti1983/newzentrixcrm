import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Kanban, Menu } from 'lucide-react';

/**
 * MobileBottomNav — Fixed bottom tab bar for mobile viewports.
 * Shows 5 quick-access tabs + a "More" menu that opens the full sidebar.
 * Only rendered when isMobile === true.
 */
export default function MobileBottomNav({ onOpenSidebar }) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { path: '/', label: 'Home', icon: LayoutDashboard },
        { path: '/leads', label: 'Leads', icon: Users },
        { path: '/followups', label: 'Tasks', icon: Calendar },
        { path: '/pipeline', label: 'Deals', icon: Kanban },
        { path: '__more__', label: 'More', icon: Menu },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        if (path === '__more__') return false;
        return location.pathname.startsWith(path);
    };

    const handleTap = (path) => {
        if (path === '__more__') {
            onOpenSidebar();
        } else {
            navigate(path);
        }
    };

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'stretch',
            zIndex: 200,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
        }}>
            {tabs.map(tab => {
                const active = isActive(tab.path);
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.path}
                        onClick={() => handleTap(tab.path)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            position: 'relative',
                            padding: 0,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {/* Active indicator dot */}
                        {active && (
                            <div style={{
                                position: 'absolute',
                                top: 4,
                                width: 20,
                                height: 3,
                                borderRadius: 100,
                                background: 'var(--navy-900)',
                            }} />
                        )}
                        <Icon
                            size={22}
                            strokeWidth={active ? 2.5 : 1.8}
                            color={active ? 'var(--navy-900)' : 'var(--slate-400)'}
                        />
                        <span style={{
                            fontSize: '0.62rem',
                            fontWeight: active ? 900 : 600,
                            color: active ? 'var(--navy-900)' : 'var(--slate-400)',
                            letterSpacing: '0.02em',
                        }}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
