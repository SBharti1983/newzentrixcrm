import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) { setError('Please enter your email'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSent(true);
        } catch (err) {
            setError(err.message || 'Something went wrong');
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
                        {sent ? 'Check your email' : 'Forgot password?'}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 6 }}>
                        {sent
                            ? "If an account exists with this email, you will receive a reset link."
                            : "Enter your email and we will send you a reset link"
                        }
                    </p>
                </div>

                {sent ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={48} style={{ color: '#10b981', margin: '10px 0 20px' }} />
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                            Didn't receive it? Check your spam folder or{' '}
                            <button onClick={() => { setSent(false); setEmail(''); }}
                                style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                                try again
                            </button>
                        </p>
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
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block', fontSize: '0.78rem', fontWeight: 600,
                                    color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                                }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{
                                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                        color: 'rgba(255,255,255,0.3)',
                                    }} />
                                    <input
                                        type="email" placeholder="you@company.com"
                                        value={email} onChange={e => setEmail(e.target.value)}
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
                                {loading ? 'Sending…' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                )}

                <div style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                    <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ArrowLeft size={14} /> Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
