import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { authApi, setToken } from '../api/client';
import { useBranding } from '../context/BrandingContext';

const getSubdomain = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3) {
        if (parts[0] === 'www' && parts.length > 3) return parts[1];
        if (parts[0] !== 'www') return parts[0];
    }
    if (parts.length === 2 && parts[1] === 'localhost') return parts[0];
    return null;
};

export default function Register() {
    const navigate = useNavigate();
    const { branding } = useBranding();
    const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name || !form.email || !form.password) {
            setError('Name, email and password are required');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        try {
            const payload = { ...form, subdomain: getSubdomain() };
            const res = await authApi.register(payload);
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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const tenantLogo = branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
    ) : (branding?.logo_icon || 'Z');

    return (
        <div style={{
            minHeight: '100vh', width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0e1d33 100%)',
            fontFamily: "'Inter', sans-serif",
            padding: isMobile ? '20px 16px' : '40px 24px',
            position: 'relative',
            overflowX: 'hidden',
        }}>
            {/* Animated bg */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute', borderRadius: '50%',
                        width: 300 + i * 150, height: 300 + i * 150,
                        background: `radial-gradient(circle, rgba(99,102,241,${0.03 + i * 0.01}), transparent)`,
                        top: `${-10 + i * 20}%`, left: `${-10 + i * 25}%`,
                        filter: 'blur(40px)',
                    }} />
                ))}
            </div>

            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(40px)',
                borderRadius: isMobile ? '24px' : '32px',
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: isMobile ? '450px' : '1100px',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                position: 'relative',
                zIndex: 2,
            }}>
                {/* Left Side: Registration Form */}
                <div style={{
                    flex: '1',
                    padding: isMobile ? '24px 20px' : '32px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: 'rgba(10, 22, 40, 0.4)',
                }}>
                    {/* Logo & Header */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                            background: branding?.primary_color || 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', fontWeight: 800, color: '#fff',
                            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
                        }}>{tenantLogo}</div>
                        <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                            Join {branding?.company_name || 'Zentrix CRM'}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 4, fontWeight: 500 }}>
                            Start your 14-day free trial
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                            fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                             <span style={{ fontSize: '1rem' }}>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company <span style={{ opacity: 0.5, fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                    <input type="text" placeholder="e.g. MM Properties" value={form.company_name} onChange={e => update('company_name', e.target.value)}
                                        style={{ width: '100%', padding: '11px 11px 11px 36px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Name *</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                    <input type="text" placeholder="Sikandar" value={form.name} onChange={e => update('name', e.target.value)}
                                        style={{ width: '100%', padding: '11px 11px 11px 36px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email *</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                <input type="email" placeholder="bharti@zentrixcrm.com" value={form.email} onChange={e => update('email', e.target.value)}
                                    style={{ width: '100%', padding: '11px 11px 11px 36px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password *</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                <input type="password" placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)}
                                    style={{ width: '100%', padding: '11px 11px 11px 36px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px 0', borderRadius: 12,
                            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: '#fff', fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s',
                            boxShadow: '0 8px 30px rgba(79, 70, 229, 0.25)',
                        }}>
                            {loading ? 'Starting...' : 'Start Free Trial'}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                        Have an account?{' '}
                        <Link to="/login" style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                    </div>
                </div>

                {/* Right Side: Interactive Content */}
                <div style={{
                    flex: '1.1',
                    padding: isMobile ? '32px 20px' : '40px 48px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    borderTop: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    position: 'relative',
                }}>
                    <div style={{ maxWidth: '400px' }}>
                        <div style={{ 
                            background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', 
                            padding: '4px 12px', borderRadius: '30px', fontSize: '0.7rem', 
                            fontWeight: 800, width: 'fit-content', marginBottom: 16,
                            textTransform: 'uppercase', letterSpacing: '0.1em',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            <CheckCircle size={12} /> Pro Tier Included
                        </div>
                        
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.03em' }}>
                            Scale your <span style={{ color: '#4f46e5' }}>velocity</span> beyond limits.
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                                { title: 'AI Pipeline', desc: 'Predict closures with AI scoring.', icon: '🎯' },
                                { title: 'Fast Routing', desc: 'Distribute leads in <1 second.', icon: '⚡' },
                                { title: 'Data Core', desc: 'All interactions in one place.', icon: '📦' }
                            ].map((feature, i) => (
                                <div key={i} className="hover-lift" style={{ 
                                    display: 'flex', gap: 12, padding: '12px', borderRadius: '12px', 
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' 
                                }}>
                                    <div style={{ fontSize: '1.2rem', marginTop: 2 }}>{feature.icon}</div>
                                    <div>
                                        <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px' }}>{feature.title}</h4>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Social Proof */}
                        <div style={{ marginTop: 24, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', gap: -6, marginBottom: 8 }}>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${i * 40 + 200}, 60%, 50%)`, border: '2px solid #0f172a', marginLeft: i === 0 ? 0 : -6 }} />
                                ))}
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', border: '2px solid #0f172a', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>+5K</div>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>
                                "ZentrixCRM transformed our lead response time."
                            </p>
                            <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, marginTop: 4 }}>Akash Mehra — CEO, Elite Realty</div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div style={{ 
                        position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, 
                        background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent)', filter: 'blur(60px)' 
                    }} />
                </div>
            </div>
        </div>
    );
}
