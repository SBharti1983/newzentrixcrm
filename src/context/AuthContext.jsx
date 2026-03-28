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

    const login = async (email, password) => {
        setLoading(true);
        setLoginError('');
        try {
            const data = await authApi.login(email, password);
            setToken(data.accessToken);
            sessionStorage.setItem('zentrix_refresh_token', data.refreshToken);
            sessionStorage.setItem('zentrix_user', JSON.stringify(data.user));
            setUser(data.user);
            setLoading(false);
            return true;
        } catch (err) {
            console.error('[AUTH] Login Exception:', err);
            setLoginError(err.error || 'Login failed. Please check your credentials.');
            setLoading(false);
            return false;
        }
    };

    const logout = async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        clearTokens();
        setUser(null);
    };

    const canAccess = (path) => {
        if (!user) return false;
        return ROLE_ACCESS[user.role]?.pages.includes(path) ?? false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loginError, loading, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
}
