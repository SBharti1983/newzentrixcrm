import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Bell } from 'lucide-react';

const API_BASE = '/api/notifications';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(Notification.permission === 'granted');

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!sessionStorage.getItem('pwa_prompt_dismissed')) {
                setIsVisible(true);
            }
        });

        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsVisible(false);
            console.log('PWA was installed');
        });
    }, []);

    const subscribeToPush = async () => {
        try {
            const res = await fetch(`${API_BASE}/vapid-key`);
            const { publicKey } = await res.json();

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey
            });

            // Convert keys to strings for backend
            const subscriptionData = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
                    auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
                }
            };

            await fetch(`${API_BASE}/push/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: subscriptionData })
            });

            setPushEnabled(true);
        } catch (err) {
            console.error('Failed to subscribe to push:', err);
        }
    };

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
            // Also suggest push!
            if (!pushEnabled) {
                const response = window.confirm("Would you also like to enable Real-time Alerts for new leads?");
                if (response) await subscribeToPush();
            }
        }
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            borderRadius: '24px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="pwa-install-banner">
            <div style={{
                width: 48, height: 48, borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
            }}>
                <Smartphone size={24} color="white" />
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 900, color: 'white' }}>Zentrix Agent Pro</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: 2 }}>
                    {!deferredPrompt ? "Enable Real-time Alerts" : "Install for the best field experience"}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                {deferredPrompt ? (
                    <button 
                        onClick={handleInstall}
                        style={{
                            padding: '10px 18px', borderRadius: '12px', background: '#6366f1',
                            color: 'white', border: 'none', fontWeight: 900, fontSize: '13px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        <Download size={14} /> Install
                    </button>
                ) : !pushEnabled ? (
                    <button 
                        onClick={subscribeToPush}
                        style={{
                            padding: '10px 18px', borderRadius: '12px', background: '#10b981',
                            color: 'white', border: 'none', fontWeight: 900, fontSize: '13px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <Bell size={14} /> Alerts
                    </button>
                ) : null}
                <button 
                    onClick={handleDismiss}
                    style={{
                        width: 36, height: 36, borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        color: 'white', border: 'none', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @media (min-width: 768px) {
                    .pwa-install-banner {
                        max-width: 400px;
                        left: auto;
                    }
                }
            `}</style>
        </div>
    );
}
