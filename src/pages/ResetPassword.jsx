import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://zentrixcrm-production-cd2d.up.railway.app/api' : '/api');

export default function ResetPassword() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token');
    const uid = params.get('uid');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    if (!token || !uid) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0e1d33 100%)',
                fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{
                    textAlign: 'center', padding: 40, maxWidth: 400,
                    background: 'rgba(255,255,255,0.04)', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                    <h2 style={{ color: '#fff', fontWeight: 800 }}>Invalid Reset Link</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        This link is missing required parameters.
                    </p>
                    <Link to="/forgot-password" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                        Request a new link
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (password !== confirm) { setError('Passwords do not match'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, uid, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDone(true);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0e1d33 100%)',
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{
                width: '100%', maxWidth: 420, padding: 40,
                background: 'rgba(255,255,255,0.04)', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 800, color: '#fff',
                    }}>Z</div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                        {done ? 'Password Reset!' : 'Set New Password'}
                    </h1>
                </div>

                {done ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={48} style={{ color: '#10b981', margin: '10px 0 20px' }} />
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 20 }}>
                            Your password has been reset successfully.
                        </p>
                        <button onClick={() => navigate('/login')} style={{
                            padding: '12px 32px', borderRadius: 10,
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer',
                        }}>Go to Login</button>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div style={{
                                background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
                                borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                                fontSize: '0.82rem', color: '#f43f5e',
                            }}>{error}</div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: 'block', fontSize: '0.78rem', fontWeight: 600,
                                    color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                                }}>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{
                                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                        color: 'rgba(255,255,255,0.3)',
                                    }} />
                                    <input
                                        type="password" placeholder="Min 8 characters"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff', fontSize: '0.9rem', outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{
                                    display: 'block', fontSize: '0.78rem', fontWeight: 600,
                                    color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                                }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{
                                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                        color: 'rgba(255,255,255,0.3)',
                                    }} />
                                    <input
                                        type="password" placeholder="Re-enter password"
                                        value={confirm} onChange={e => setConfirm(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff', fontSize: '0.9rem', outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '13px 0', borderRadius: 10,
                                    background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {loading ? 'Resetting…' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}

                {!done && (
                    <div style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                        <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ArrowLeft size={14} /> Back to login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
