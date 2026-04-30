import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Download, X } from 'lucide-react';

export default function PWAInstallManager({ isMobile }) {
    const { user } = useAuth();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            
            // Log for debug
            console.log('[PWA] beforeinstallprompt captured');

            // Only show to agents on mobile
            if (isMobile && (user?.role === 'agent' || user?.role === 'sales_manager')) {
                // Don't show immediately, wait a bit
                setTimeout(() => setShowPrompt(true), 3000);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isMobile, user]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        
        setShowPrompt(false);
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] User response to installation: ${outcome}`);
        
        setDeferredPrompt(null);
    };

    if (!showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 96, // Above mobile bottom nav
            left: 16,
            right: 16,
            zIndex: 9999,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '16px 20px',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'pwaSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
            <style>{`
                @keyframes pwaSlideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: 'rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <img src="/zentrix_fav.png" alt="Z" style={{ width: 28, height: 28 }} />
                </div>
                <div>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>Install Zentrix Pro</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Get app-like performance</div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                    onClick={handleInstall}
                    style={{
                        padding: '10px 18px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 8px 16px rgba(99,102,241,0.3)'
                    }}
                >
                    <Download size={15} strokeWidth={3} /> Install
                </button>
                <button 
                    onClick={() => setShowPrompt(false)}
                    style={{
                        width: 32, height: 32,
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
