import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { authApi, setToken } from '../api/client';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.company_name || !form.name || !form.email || !form.password) {
            setError('All required fields must be filled');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await authApi.register(form);
            setToken(res.accessToken);
            sessionStorage.setItem('zentrix_refresh_token', res.refreshToken);
            sessionStorage.setItem('zentrix_user', JSON.stringify(res.user));
            navigate('/');
            window.location.reload();
        } catch (err) {
            setError(err.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0e1d33 100%)',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Animated bg */}
            <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
            }}>
                {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute', borderRadius: '50%',
                        width: 200 + i * 100, height: 200 + i * 100,
                        background: `radial-gradient(circle, rgba(99,102,241,${0.04 + i * 0.01}), transparent)`,
                        top: `${10 + i * 15}%`, left: `${5 + i * 18}%`,
                        animation: `float ${8 + i * 2}s ease-in-out infinite alternate`,
                    }} />
                ))}
            </div>

            <div style={{
                width: '100%', maxWidth: 480, padding: 40,
                background: 'rgba(255,255,255,0.04)', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)', position: 'relative', zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 800, color: '#fff',
                    }}>Z</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                        Create your account
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 6 }}>
                        Start your 14-day free trial — no credit card required
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
                        borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                        fontSize: '0.82rem', color: '#f43f5e',
                    }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Step 1: Company name */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: 'block', fontSize: '0.78rem', fontWeight: 600,
                            color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.04em',
                        }}>Company Name *</label>
                        <div style={{ position: 'relative' }}>
                            <Building2 size={16} style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'rgba(255,255,255,0.3)',
                            }} />
                            <input
                                type="text" placeholder="Acme Real Estate"
                                value={form.company_name}
                                onChange={e => update('company_name', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                    </div>

                    {/* Full Name */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: 'block', fontSize: '0.78rem', fontWeight: 600,
                            color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                        }}>Your Name *</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'rgba(255,255,255,0.3)',
                            }} />
                            <input
                                type="text" placeholder="John Doe"
                                value={form.name}
                                onChange={e => update('name', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: 'block', fontSize: '0.78rem', fontWeight: 600,
                            color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                        }}>Email Address *</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'rgba(255,255,255,0.3)',
                            }} />
                            <input
                                type="email" placeholder="john@company.com"
                                value={form.email}
                                onChange={e => update('email', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: 'block', fontSize: '0.78rem', fontWeight: 600,
                            color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                        }}>Phone (optional)</label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={16} style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'rgba(255,255,255,0.3)',
                            }} />
                            <input
                                type="tel" placeholder="+91 98765 43210"
                                value={form.phone}
                                onChange={e => update('phone', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{
                            display: 'block', fontSize: '0.78rem', fontWeight: 600,
                            color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                        }}>Password * (min 8 chars)</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'rgba(255,255,255,0.3)',
                            }} />
                            <input
                                type="password" placeholder="••••••••"
                                value={form.password}
                                onChange={e => update('password', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
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
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading ? 'Creating account…' : 'Create Free Account'}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                {/* Features list */}
                <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center' }}>
                    {['Unlimited leads', '3 team members', '5 projects', '14-day trial'].map(f => (
                        <div key={f} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
                        }}>
                            <CheckCircle size={11} style={{ color: '#10b981' }} /> {f}
                        </div>
                    ))}
                </div>

                <div style={{
                    textAlign: 'center', marginTop: 24,
                    color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem',
                }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
