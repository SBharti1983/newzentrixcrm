import { useState } from 'react';
import { authApi, setToken, clearTokens } from '../api/client';
import { AuthContext } from './AuthContextObject';
import { ROLE_ACCESS } from '../constants/access';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = sessionStorage.getItem('zentrix_user');
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);

    const login = async (email, password, subdomain) => {
        setLoading(true); setLoginError('');
        try {
            const data = await authApi.login(email, password, subdomain);
            setToken(data.accessToken);
            sessionStorage.setItem('zentrix_refresh_token', data.refreshToken);
            sessionStorage.setItem('zentrix_user', JSON.stringify(data.user));
            setUser(data.user);
            setLoading(false);
            return true;
        } catch (err) {
            const msg = err.error || err.message || 'Login failed. Please check your credentials.';
            setLoginError(msg);
            setLoading(false);
            // Re-throw so Login.jsx handleSubmit can also catch and display the error
            throw new Error(msg);
        }
    };

    const logout = async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        clearTokens(); setUser(null);
    };

    const canAccess = (path) => {
        if (!user) return false;
        const features = user.features || {};
        
        // --- FEATURE GATING ---
        if (path === '/whatsapp-marketing' && !features.whatsapp) return false;
        if (path === '/marketing' && !features.marketing) return false;
        if (path === '/voice-analytics' && !features.voice_telemetry) return false;
        if (path === '/reports' && !features.custom_reports) return false;
        if (path === '/automations' && !features.automations) return false;
        if (path === '/lead-scoring' && !features.ai_scoring) return false;

        return ROLE_ACCESS[user.role]?.pages.includes(path) ?? false;
    };

    const refreshUser = async () => {
        try {
            const data = await authApi.me();
            const updatedUser = { ...user, ...data };
            sessionStorage.setItem('zentrix_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            return updatedUser;
        } catch (err) {
            console.error('[AUTH] Failed to refresh user profile:', err);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, canAccess, loginError, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
