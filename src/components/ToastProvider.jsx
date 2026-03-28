import { useState, useCallback } from 'react';
import { CheckCircle, X, AlertTriangle, Info, MessageSquare } from 'lucide-react';
import { ToastContext } from '../context/ToastContext';

const ICONS = {
    success: <CheckCircle size={16} />,
    error: <AlertTriangle size={16} />,
    info: <Info size={16} />,
    sending: <MessageSquare size={16} />,
};
const COLORS = {
    success: { bg: '#ecfdf5', border: '#10b981', icon: '#10b981', text: '#065f46' },
    error: { bg: '#fff1f2', border: '#f43f5e', icon: '#f43f5e', text: '#881337' },
    info: { bg: '#eff6ff', border: '#3b63b8', icon: '#3b63b8', text: '#1e3a8a' },
    sending: { bg: '#f0fdf4', border: '#25d366', icon: '#25d366', text: '#14532d' },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
        const id = Date.now() + Math.random();
        setToasts(ts => [...ts, { id, type, title, message }]);
        if (duration > 0) {
            setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), duration);
        }
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(ts => ts.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', title = '') => {
        return addToast({ type, title: title || undefined, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, showToast }}>
            {children}
            {/* Toast Container */}
            <div style={{
                position: 'fixed', bottom: 24, right: 24,
                zIndex: 99999,
                display: 'flex', flexDirection: 'column', gap: 10,
                maxWidth: 380,
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => {
                    const c = COLORS[toast.type] || COLORS.info;
                    return (
                        <div key={toast.id} style={{
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            borderLeft: `4px solid ${c.border}`,
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                            padding: '14px 16px',
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            pointerEvents: 'all',
                            animation: 'slideInRight 0.3s ease',
                        }}>
                            <div style={{ color: c.icon, marginTop: 1, flexShrink: 0 }}>
                                {ICONS[toast.type]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {toast.title && (
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: c.text, marginBottom: 2 }}>
                                        {toast.title}
                                    </div>
                                )}
                                {toast.message && (
                                    <div style={{ fontSize: '0.8rem', color: c.text, opacity: 0.85, lineHeight: 1.4 }}>
                                        {toast.message}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: c.icon, padding: 2, flexShrink: 0,
                                    opacity: 0.7, display: 'flex', alignItems: 'center',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
