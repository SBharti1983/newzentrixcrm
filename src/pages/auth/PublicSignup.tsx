import React, { useState } from 'react';
import { Globe, User, Mail, Lock, CheckCircle2, ArrowRight, Loader2, Server } from 'lucide-react';
import axios from 'axios';

const COLORS = {
    primary: '#6366F1',
    success: '#10B981',
    bg: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0'
};

export default function PublicSignup() {
    const [step, setStep] = useState(1); // 1: Info, 2: Success
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [result, setResult] = useState(null);

    const firstName = formData.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');
    const suggestedSlug = firstName || 'yourname';

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiRes = await axios.post('/api/onboarding/signup', formData);
            setResult(apiRes.data);
            setStep(2);
        } catch (err) {
            alert(err.response?.data?.error || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: 'white', padding: '48px', borderRadius: '32px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: 80, height: 80, background: '#D1FAE5', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle2 size={40} color={COLORS.success} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>Workspace Ready!</h1>
                    <p style={{ color: COLORS.textSecondary, lineHeight: 1.6, marginBottom: '32px' }}>
                        Hello <strong style={{ color: COLORS.text }}>{result.user.name}</strong>, we have provisioned your dedicated CRM node. You can now access your private workspace.
                    </p>

                    <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '20px', padding: '20px', marginBottom: '32px', textAlign: 'left' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Your Private Domain</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: COLORS.primary, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Globe size={20} /> {result.workspace.slug}.zentrixcrm.com
                        </div>
                    </div>

                    <a 
                        href={`http://${result.workspace.slug}.localhost:5173`} // For local testing, usually would be real domain
                        style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', 
                            padding: '16px', background: COLORS.primary, color: 'white', textDecoration: 'none', 
                            borderRadius: '16px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' 
                        }}
                    >
                        Enter Workspace <ArrowRight size={20} />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'white', display: 'flex', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            {/* Left Sidebar - Branding */}
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', padding: '64px', color: 'white', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '80px', zIndex: 2 }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <Server size={24} />
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>ZENTRIX<span style={{ color: '#818CF8' }}>CRM</span></span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2 }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-2px' }}>
                        Start Your <br/> Real Estate <br/> <span style={{ color: '#818CF8' }}>Dynasty.</span>
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: '#C7D2FE', maxWidth: '400px', lineHeight: 1.6 }}>
                        Provision your private cloud node in seconds. No credit card. Just your ambition.
                    </p>
                </div>

                <div style={{ zIndex: 2, display: 'flex', gap: '32px' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>8,400+</div>
                        <div style={{ fontSize: '0.85rem', color: '#C7D2FE' }}>Nodes Active</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>99.9%</div>
                        <div style={{ fontSize: '0.85rem', color: '#C7D2FE' }}>Uptime SLA</div>
                    </div>
                </div>
            </div>

            {/* Right Side - Signup Form */}
            <div style={{ width: '600px', padding: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>Launch Workspace</h2>
                    <p style={{ color: COLORS.textSecondary, marginBottom: '40px' }}>Enter your details to generate your private node.</p>

                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} color={COLORS.textSecondary} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Sikandar Bharti"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px', border: `1.5px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color={COLORS.textSecondary} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="email" 
                                    placeholder="hello@world.com"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px', border: `1.5px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Secure Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} color={COLORS.textSecondary} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px', border: `1.5px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem' }}
                                />
                            </div>
                        </div>

                        {/* Node Identity Preview */}
                        {suggestedSlug && (
                            <div style={{ background: COLORS.bg, borderRadius: '20px', padding: '20px', border: `1px dashed ${COLORS.primary}40` }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.primary, marginBottom: '4px' }}>PLANNED IDENTITY</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: COLORS.text }}>
                                    {suggestedSlug}<span style={{ color: COLORS.primary }}>.zentrixcrm.com</span>
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                marginTop: '12px', padding: '16px', background: COLORS.primary, color: 'white', 
                                border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '1.1rem', 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                boxShadow: '0 15px 30px rgba(99, 102, 241, 0.2)',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : 'Deploy Workspace Node'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '32px', color: COLORS.textSecondary, fontSize: '0.85rem' }}>
                        Already have a node? <a href="/login" style={{ color: COLORS.primary, fontWeight: 700, textDecoration: 'none' }}>Authenticate</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
