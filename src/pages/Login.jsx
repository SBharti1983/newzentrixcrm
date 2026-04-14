import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../context/BrandingContext';
import { authApi } from '../api/client';
import { Eye, EyeOff, Lock, Mail, TrendingUp, Users, Building2, ArrowRight, Shield, Zap, BarChart3, CheckCircle2, Phone } from 'lucide-react';

const getSubdomain = () => {
    const host = window.location.hostname;
    // return null if host is an IP address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    
    const parts = host.split('.');
    if (parts.length >= 3) {
        if (parts[0] === 'www' && parts.length > 3) return parts[1];
        if (parts[0] !== 'www') return parts[0];
    }
    if (parts.length === 2 && parts[1] === 'localhost') return parts[0];
    return null;
};

const STATS = [
    { label: 'Active Leads', value: '10', icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Projects', value: '7', icon: Building2, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Pipeline Value', value: '₹9.4Cr', icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
];

const FEATURES = [
    'Lead Management', 'Kanban Pipeline', 'Payment Tracker', 'Document Management',
    'Channel Partners', 'Analytics', 'SMS & WhatsApp', 'Site Visit Scheduler'
];

const TRUST_ITEMS = [
    { icon: Shield, text: '256-bit Encryption' },
    { icon: Zap, text: '99.9% Uptime' },
    { icon: BarChart3, text: 'Real-time Analytics' },
];

/* ── Animated background orbs ──────────────────────────────────── */
function AnimatedOrbs() {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {/* Primary orb */}
            <div style={{
                position: 'absolute', width: 600, height: 600, top: -200, left: -150,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'orbFloat1 12s ease-in-out infinite',
            }} />
            {/* Secondary orb */}
            <div style={{
                position: 'absolute', width: 500, height: 500, bottom: -150, right: -100,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'orbFloat2 15s ease-in-out infinite',
            }} />
            {/* Accent orb */}
            <div style={{
                position: 'absolute', width: 300, height: 300, top: '50%', left: '40%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'orbFloat3 10s ease-in-out infinite',
            }} />
            {/* Grid overlay */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }}>
                <defs>
                    <pattern id="loginGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#loginGrid)" />
            </svg>
            {/* Gradient line */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(6,182,212,0.3), transparent)',
            }} />
        </div>
    );
}

/* ── Inline keyframes ──────────────────────────────────────────── */
const styleSheet = `
@keyframes orbFloat1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -20px) scale(1.05); }
    66% { transform: translate(-20px, 15px) scale(0.95); }
}
@keyframes orbFloat2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-25px, 20px) scale(1.03); }
    66% { transform: translate(15px, -25px) scale(0.97); }
}
@keyframes orbFloat3 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(20px, -30px); }
}
@keyframes loginSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes loginFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes loginScaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
}
@keyframes shimmerLine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}
@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.15); }
    50% { box-shadow: 0 0 40px rgba(99,102,241,0.25); }
}
.login-stat-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.login-stat-card:hover {
    transform: translateY(-4px) !important;
    background: rgba(255,255,255,0.10) !important;
    border-color: rgba(255,255,255,0.20) !important;
}
.login-feature-tag {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.login-feature-tag:hover {
    background: rgba(255,255,255,0.12) !important;
    border-color: rgba(255,255,255,0.25) !important;
    transform: translateY(-1px) !important;
}
.login-input-wrap input:focus {
    border-color: var(--navy-400) !important;
    box-shadow: 0 0 0 3px rgba(59,99,184,0.12), 0 2px 8px rgba(59,99,184,0.08) !important;
    background: white !important;
}
.login-submit-btn:hover:not(:disabled) {
    transform: translateY(-1px) !important;
    box-shadow: 0 8px 28px rgba(30,58,115,0.45) !important;
}
.login-submit-btn:active:not(:disabled) {
    transform: translateY(0) !important;
}
.login-role-btn {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.login-role-btn:hover {
    background: rgba(0,0,0,0.04) !important;
}
.login-link:hover {
    color: var(--navy-700) !important;
    text-decoration: underline !important;
}
`;

export default function Login() {
    const { login } = useAuth();
    const { branding } = useBranding();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const formRef = useRef();
    const [mounted, setMounted] = useState(false);

    const PRIMARY_COLOR = branding?.primary_color || '#6366f1';
    const [subdomain] = useState(getSubdomain());
    
    // Derived branding states
    const tenantName = branding?.company_name || 'Zentrix CRM';
    const tenantLogo = branding?.logo_url ? (
        <img src={branding.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 14 }} />
    ) : (branding?.logo_icon || 'Z');
    
    const tenantColor = branding?.primary_color || '#6366f1';
    const bgGradient = `linear-gradient(145deg, #050d17 0%, ${tenantColor}18 45%, ${tenantColor}0a 75%, #050912 100%)`;

    const styleRef = useRef(null);

    useEffect(() => {
        // Inject keyframe styles
        if (!styleRef.current) {
            const el = document.createElement('style');
            el.textContent = styleSheet;
            document.head.appendChild(el);
            styleRef.current = el;
        }
        setMounted(true);
        return () => {
            if (styleRef.current) {
                document.head.removeChild(styleRef.current);
                styleRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        // Branding is now handled by the global BrandingContext provider
    }, [subdomain]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLoginError('');
        try {
            const success = await login(email, password, subdomain);
            // login navigates on success via context user state change
        } catch (err) {
            // err.message contains the backend error (e.g. 'Invalid email or password')
            setLoginError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const anim = (delay) => mounted ? {
        animation: `loginSlideUp 0.6s ${delay}s cubic-bezier(0.16, 1, 0.3, 1) both`,
    } : { opacity: 0 };

    return (
        <div style={{
            minHeight: '100vh', width: '100%', flex: 1, display: 'flex',
            background: bgGradient,
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.8s ease',
        }}>
            <AnimatedOrbs />

            {/* ═══ LEFT PANEL — Branding & Social Proof ═══ */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '48px 56px', position: 'relative', zIndex: 1,
                maxWidth: 720,
            }} className="login-left-panel">

                {/* Logo */}
                <div style={{ ...anim(0.1), display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: tenantColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', fontWeight: 900, color: 'white',
                        boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
                        letterSpacing: '-1px',
                        animation: 'pulseGlow 4s ease-in-out infinite',
                    }}>{tenantLogo}</div>
                    <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                            {tenantName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {subdomain ? '● Verified Workspace' : '● Real Estate Intelligence Platform'}
                        </div>
                    </div>
                </div>

                {/* Headline */}
                <div style={{ ...anim(0.2), marginBottom: 36 }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 3.2vw, 3rem)', fontWeight: 900,
                        color: 'white', lineHeight: 1.08, marginBottom: 16,
                        letterSpacing: '-1.5px',
                    }}>
                        Manage Every<br />
                        <span style={{
                            background: 'linear-gradient(90deg, #818cf8, #06b6d4, #a78bfa)',
                            backgroundSize: '200% auto',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            animation: 'shimmerLine 6s linear infinite',
                        }}>
                            Lead. Deal. Payment.
                        </span>
                    </h1>
                    <p style={{
                        fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.7, maxWidth: 440, fontWeight: 400,
                    }}>
                        A complete CRM built for real estate professionals — from first enquiry to property registration and beyond.
                    </p>
                </div>

                {/* Stats */}
                <div style={{ ...anim(0.35), display: 'flex', gap: 16, marginBottom: 8 }}>
                    {STATS.map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="login-stat-card" style={{
                            flex: 1, padding: '6px 20px', borderRadius: 16,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(12px)',
                            cursor: 'default',
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 4,
                            }}>
                                <Icon size={16} style={{ color }} />
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 0, letterSpacing: '-0.5px' }}>{value}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Feature tags */}
                <div style={{ ...anim(0.45), display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                    {FEATURES.map(f => (
                        <span key={f} className="login-feature-tag" style={{
                            padding: '5px 14px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', gap: 5, cursor: 'default',
                        }}>
                            <CheckCircle2 size={11} style={{ color: '#10b981' }} />
                            {f}
                        </span>
                    ))}
                </div>

                {/* Trust bar */}
                <div style={{ ...anim(0.55), display: 'flex', gap: 24 }}>
                    {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Icon size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ RIGHT PANEL — Login Form ═══ */}
            <div style={{
                width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(24px, 5vw, 48px)',
                background: 'rgba(255,255,255,0.98)',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                position: 'relative', zIndex: 1,
                boxShadow: '-24px 0 80px rgba(0,0,0,0.25)',
                ...(mounted ? { animation: 'loginScaleIn 0.5s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both' } : {}),
            }}>
                {/* Accent stripe at top */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, #6366f1, #06b6d4, #8b5cf6)',
                }} />

                <div style={{ width: '100%', maxWidth: 420 }}>
                    {/* Sign in header */}
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{
                            fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-700)',
                            marginBottom: 6, letterSpacing: '-0.5px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>Welcome back</h2>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Sign in to your workspace to continue.
                        </p>
                    </div>


                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block', fontSize: '0.8rem', fontWeight: 700,
                                color: 'var(--text-primary)', marginBottom: 7,
                                letterSpacing: '0.01em',
                            }}>
                                Email address
                            </label>
                            <div className="login-input-wrap" style={{ position: 'relative' }}>
                                <Mail size={15} style={{
                                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)', pointerEvents: 'none',
                                }} />
                                <input
                                    type="email" required id="login-email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    style={{
                                        width: '100%', padding: '12px 14px 12px 38px',
                                        fontSize: '0.875rem', fontWeight: 500,
                                        border: '1.5px solid var(--border-light)',
                                        borderRadius: 11, outline: 'none',
                                        background: 'var(--slate-50)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s ease',
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block', fontSize: '0.8rem', fontWeight: 700,
                                color: 'var(--text-primary)', marginBottom: 7,
                                letterSpacing: '0.01em',
                            }}>
                                Password
                            </label>
                            <div className="login-input-wrap" style={{ position: 'relative' }}>
                                <Lock size={15} style={{
                                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)', pointerEvents: 'none',
                                }} />
                                <input
                                    type={showPwd ? 'text' : 'password'} required id="login-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    style={{
                                        width: '100%', padding: '12px 44px 12px 38px',
                                        fontSize: '0.875rem', fontWeight: 500,
                                        border: '1.5px solid var(--border-light)',
                                        borderRadius: 11, outline: 'none',
                                        background: 'var(--slate-50)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s ease',
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        border: 'none', background: 'none', cursor: 'pointer',
                                        color: 'var(--text-muted)', padding: 4,
                                        borderRadius: 6, display: 'flex', alignItems: 'center',
                                        transition: 'color 0.15s',
                                    }}>
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {loginError && (
                            <div style={{
                                padding: '11px 14px', borderRadius: 11, marginBottom: 18,
                                background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)',
                                fontSize: '0.82rem', color: '#e11d48', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 8,
                                animation: 'loginSlideUp 0.3s ease both',
                            }}>
                                <span style={{ fontSize: '1rem' }}>⚠</span> {loginError}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit" disabled={loading || !email || !password}
                            className="login-submit-btn"
                            id="login-submit"
                            style={{
                                width: '100%', padding: '13px', fontSize: '0.9rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                borderRadius: 12, border: 'none', cursor: 'pointer',
                                color: 'white', letterSpacing: '-0.01em',
                                opacity: loading ? 0.85 : 1,
                                background: 'linear-gradient(135deg, #162d58, #1e3a73)',
                                boxShadow: '0 6px 20px rgba(30,58,115,0.35)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)',
                                        borderTopColor: 'white', borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                    Authenticating...
                                </>
                            ) : (
                                <>Sign in <ArrowRight size={15} /></>
                            )}
                        </button>
                    </form>

                    {/* Links */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', marginTop: 22,
                        fontSize: '0.82rem',
                    }}>
                        <a href="/forgot-password" className="login-link" style={{
                            color: 'var(--navy-500)', fontWeight: 600, textDecoration: 'none',
                            transition: 'color 0.15s',
                        }}>
                            Reset Password
                        </a>
                        <a href="/register" className="login-link" style={{
                            color: 'var(--navy-500)', fontWeight: 600, textDecoration: 'none',
                            transition: 'color 0.15s',
                        }}>
                            Create account →
                        </a>
                    </div>

                    {/* Support & Helpline */}
                    <div style={{
                        marginTop: 32, padding: '16px', borderRadius: '14px',
                        background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 800, color: '#1e3a73', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Facing difficulties?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <Phone size={12} color="#1e3a73" />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>+91-80766-31994</span>
                            </div>
                            <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.1)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <Mail size={12} color="#1e3a73" />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>billing@zentrixcrm.com</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer text */}
                    <div style={{
                        marginTop: 24, paddingTop: 16,
                        borderTop: '1px solid var(--border-light)',
                        textAlign: 'center',
                    }}>
                        <p style={{
                            fontSize: '0.72rem', color: 'var(--text-muted)',
                            fontWeight: 500, lineHeight: 1.6,
                        }}>
                            Protected by enterprise-grade security.<br />
                            © {new Date().getFullYear()} {tenantName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
