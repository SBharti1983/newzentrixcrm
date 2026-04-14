import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, Users, Phone, User, 
    Plus, Sparkles, MessageSquare, Calendar
} from 'lucide-react';

export default function MobileActionHub() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showQuickMenu, setShowQuickMenu] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { icon: Users, label: 'Leads', path: '/leads' },
        { icon: null, label: 'Action', path: null }, // Spacer for FAB
        { icon: Phone, label: 'Dialer', path: '/dialer' },
        { icon: User, label: 'Profile', path: '/settings' }
    ];

    const quickActions = [
        { icon: Plus, label: 'New Lead', color: '#3b82f6', action: () => navigate('/leads/new') },
        { icon: Sparkles, label: 'AI Check', color: '#8b5cf6', action: () => navigate('/ai-insights') },
        { icon: MessageSquare, label: 'WhatsApp', color: '#10b981', action: () => navigate('/whatsapp') },
        { icon: Calendar, label: 'Event', color: '#f59e0b', action: () => navigate('/calendar') }
    ];

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9998,
            padding: '0 0 calc(env(safe-area-inset-bottom) + 12px) 0',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: '76px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.05)'
        }} className="mobile-only-hub">
            
            {/* Nav Items */}
            {navItems.map((item, i) => {
                if (!item.icon) return <div key={i} style={{ width: 60 }} />;
                const isActive = location.pathname === item.path;
                return (
                    <button 
                        key={i}
                        onClick={() => navigate(item.path)}
                        style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: isActive ? '#3b82f6' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isActive ? 'scale(1.1)' : 'scale(1)'
                        }}
                    >
                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 600 }}>{item.label}</span>
                    </button>
                );
            })}

            {/* Central FAB */}
            <div style={{
                position: 'absolute',
                top: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999
            }}>
                <button 
                    onClick={() => setShowQuickMenu(!showQuickMenu)}
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 12px 24px rgba(10, 22, 40, 0.25)',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: showQuickMenu ? 'rotate(45deg) scale(0.95)' : 'rotate(0)'
                    }}
                >
                    <Plus size={32} strokeWidth={2.5} />
                </button>

                {/* Quick Menu Backdrop */}
                {showQuickMenu && (
                    <div 
                        onClick={() => setShowQuickMenu(false)}
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            top: -1000,
                            background: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(8px)',
                            zIndex: -1
                        }}
                    />
                )}

                {/* Quick Menu Items */}
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    pointerEvents: showQuickMenu ? 'auto' : 'none',
                    opacity: showQuickMenu ? 1 : 0,
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => { action.action(); setShowQuickMenu(false); }}
                            style={{
                                width: '140px',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                background: 'white',
                                border: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                animation: showQuickMenu ? `popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s forwards` : 'none',
                                opacity: 0,
                                transform: 'translateY(20px)'
                            }}
                        >
                            <div style={{ color: action.color }}><action.icon size={18} /></div>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes popIn {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @media (min-width: 1024px) {
                    .mobile-only-hub {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
