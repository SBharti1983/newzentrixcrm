import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import { Eye, EyeOff, Lock, Mail, TrendingUp, Users, Building2, ArrowRight } from 'lucide-react';

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

const STATS = [
    { label: 'Active Leads', value: '10', icon: Users, color: '#3b63b8' },
    { label: 'Projects', value: '7', icon: Building2, color: '#10b981' },
    { label: 'Pipeline Value', value: '₹9.4Cr', icon: TrendingUp, color: '#f59e0b' },
];

export default function Login() {
    const { login, loginError, loading } = useAuth();
    const [email, setEmail] = useState('rohan.mishra@zentrixcrm.com');
    const [password, setPassword] = useState('Cyber@2026!');
    const [showPwd, setShowPwd] = useState(false);
    const [selectedRole, setSelectedRole] = useState('Admin');
    
    const [subdomain] = useState(getSubdomain());
    const [tenantName, setTenantName] = useState('Zentrix CRM');
    const [tenantLogo, setTenantLogo] = useState('Z');
    const [tenantColor, setTenantColor] = useState('linear-gradient(135deg, #3b63b8, #06b6d4)');
    const [bgGradient, setBgGradient] = useState('linear-gradient(135deg, #0a1628 0%, #1e3a73 50%, #0f2347 100%)');

    useEffect(() => {
        if (subdomain) {
            authApi.getTenant(subdomain).then(data => {
                setTenantName(data.name);
                setTenantLogo(data.logo_url ? <img src={data.logo_url} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14}}/> : data.name[0]);
                if (data.primary_color) {
                    setTenantColor(data.primary_color);
                    setBgGradient(`linear-gradient(135deg, #0a1628 0%, ${data.primary_color}80 50%, #0f2347 100%)`);
                }
            }).catch(e => {
                console.log("No specific branding for subdomain", subdomain);
            });
        }
    }, [subdomain]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password, subdomain);
    };

    return (
        <div style={{
            minHeight: '100vh', width: '100%', flex: 1, display: 'flex',
            background: bgGradient,
            fontFamily: "'Inter', sans-serif",
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.5s ease',
        }}>
            {/* Background decorations */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[
                    { w: 400, h: 400, top: -100, left: -80, color: 'rgba(59,99,184,0.15)' },
                    { w: 300, h: 300, bottom: -60, right: -60, color: 'rgba(16,185,129,0.1)' },
                    { w: 200, h: 200, top: '40%', right: '30%', color: 'rgba(139,92,246,0.08)' },
                ].map((c, i) => (
                    <div key={i} style={{
                        position: 'absolute', width: c.w, height: c.h,
                        top: c.top, left: c.left, bottom: c.bottom, right: c.right,
                        borderRadius: '50%', background: c.color, filter: 'blur(60px)',
                    }} />
                ))}
                {/* Grid lines */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
                    <defs>
                        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            {/* Left Panel — Branding */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '40px 60px', position: 'relative', zIndex: 1,
            }} className="login-left-panel">
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 60 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: tenantColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 900, color: 'white',
                        boxShadow: '0 8px 32px rgba(59,99,184,0.4)',
                        letterSpacing: '-1px',
                    }}>{tenantLogo}</div>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{tenantName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                            {subdomain ? 'Verified Workspace' : 'Real Estate Intelligence Platform'}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 16, letterSpacing: '-1px' }}>
                        Manage Every<br />
                        <span style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Lead. Deal. Payment.
                        </span>
                    </h1>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 400 }}>
                        A complete CRM built for real estate professionals — from first enquiry to property registration and beyond.
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
                    {STATS.map(({ label, value, icon: Icon, color }) => (
                        <div key={label} style={{
                            flex: 1, padding: '16px', borderRadius: 16,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(8px)',
                        }}>
                            <Icon size={18} style={{ color, marginBottom: 8 }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 2 }}>{value}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Feature tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['Lead Management', 'Kanban Pipeline', 'Payment Tracker', 'Document Management',
                        'Channel Partners', 'Analytics', 'SMS & WhatsApp', 'Site Visit Scheduler'].map(f => (
                            <span key={f} style={{
                                padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}>✓ {f}</span>
                        ))}
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div style={{
                width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(20px, 5vw, 40px)', background: 'rgba(255,255,255,0.97)',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                position: 'relative', zIndex: 1,
                boxShadow: '-20px 0 80px rgba(0,0,0,0.3)',
            }}>
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--navy-700)', marginBottom: 6 }}>Sign in</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>Welcome back. Enter your credentials to continue.</p>

                        <div style={{ display: 'flex', gap: 6, padding: 4, background: '#f1f5f9', borderRadius: 12, marginBottom: 20 }}>
                            {[
                                { name: 'Admin', color: '#8b5cf6' }, 
                                { name: 'Manager', color: '#3b82f6' }, 
                                { name: 'Agent', color: '#10b981' }
                            ].map(role => {
                                const isActive = selectedRole === role.name;
                                return (
                                    <button 
                                        key={role.name} 
                                        type="button" 
                                        onClick={() => {
                                            setSelectedRole(role.name);
                                            // Demo-friendly credential auto-fill
                                            if (role.name === 'Admin') { setEmail('rohan.mishra@zentrixcrm.com'); setPassword('Cyber@2026!'); }
                                            if (role.name === 'Manager') { setEmail('manager@zentrix.com'); setPassword('Manager@123'); }
                                            if (role.name === 'Agent') { setEmail('agent@zentrix.com'); setPassword('Agent@123'); }
                                        }}
                                        style={{
                                            flex: 1, padding: '8px 4px', fontSize: '0.74rem', fontWeight: 800,
                                            borderRadius: 9, border: 'none', 
                                            background: isActive ? role.color : 'transparent',
                                            color: isActive ? 'white' : 'var(--text-muted)',
                                            boxShadow: isActive ? `0 4px 12px ${role.color}40` : 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.02em'
                                        }}
                                    >
                                        {role.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                                Email address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="email" required
                                    className="form-control"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@zentrix.com"
                                    style={{ paddingLeft: 36, fontSize: '0.875rem' }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type={showPwd ? 'text' : 'password'} required
                                    className="form-control"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    style={{ paddingLeft: 36, paddingRight: 40, fontSize: '0.875rem' }}
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {loginError && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
                                fontSize: '0.82rem', color: 'var(--accent-rose)', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                ⚠️ {loginError}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit" disabled={loading || !email || !password}
                            className="btn btn-primary"
                            style={{
                                width: '100%', padding: '13px', fontSize: '0.9rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                borderRadius: 12, opacity: loading ? 0.8 : 1,
                                background: 'linear-gradient(135deg, var(--navy-600), var(--navy-500))',
                                boxShadow: '0 4px 16px rgba(30,58,115,0.35)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white', borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                    Signing in...
                                </>
                            ) : (
                                <>Sign in <ArrowRight size={15} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontSize: '0.82rem' }}>
                        <a href="/forgot-password" style={{ color: 'var(--navy-500)', fontWeight: 600, textDecoration: 'none' }}>
                            Reset Password
                        </a>
                        <a href="/register" style={{ color: 'var(--navy-500)', fontWeight: 600, textDecoration: 'none' }}>
                            Create account
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
