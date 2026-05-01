import { useState } from 'react';
import { QrCode, UserPlus, CheckCircle, ChevronRight, X } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { enquiriesApi } from '../../api/client';

export default function Kiosk() {
    const [step, setStep] = useState('home'); // home, manual, scanner, success
    const [form, setForm] = useState({ name: '', phone: '', email: '', property_type: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Simulate auto-assigning an agent
    const agentName = 'Arjun Patel';

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await enquiriesApi.submit({ ...form, source: 'Walk-in / Kiosk' });
            setStep('success');
        } catch (_err) {
            setError(_err.error || 'Failed to submit registration');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (result) => {
        if (result && result.length > 0) {
            try {
                const data = JSON.parse(result[0].rawValue);
                setForm({
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    property_type: data.property_type || '',
                });
                // automatically submit after short delay or direct
                setStep('manual');
                // Let user confirm the scanned details on the manual form
            } catch (_err) {
                // If it's just raw text, maybe it's a ref number
                alert('Invalid QR Code format. Please scan a valid registration QR.');
            }
        }
    };

    if (step === 'success') {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-50)' }}>
                <div className="card animate-fadeIn" style={{ maxWidth: 600, width: '100%', padding: '60px 40px', textAlign: 'center', borderRadius: 24 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle size={40} style={{ color: 'var(--accent-emerald)' }} />
                    </div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 12 }}>Welcome, {form.name.split(' ')[0]}!</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 32 }}>
                        Your registration is complete. <strong style={{ color: 'var(--navy-800)' }}>{agentName}</strong> will be with you shortly to show you around.
                    </p>
                    <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 100 }} onClick={() => { setForm({ name: '', phone: '', email: '', property_type: '' }); setStep('home'); }}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'manual') {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slate-50)' }}>
                <div className="card animate-fadeIn" style={{ maxWidth: 600, width: '100%', padding: '40px', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setStep('home')} style={{ background: 'var(--slate-100)' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Guest Registration</h2>
                    </div>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {error && <div style={{ color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.1)', padding: 12, borderRadius: 8, fontWeight: 600 }}>{error}</div>}
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700 }}>Full Name *</label>
                            <input required className="form-control" style={{ padding: '14px 16px', fontSize: '1.1rem' }} placeholder="Enter your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700 }}>Mobile Number *</label>
                            <input required className="form-control" style={{ padding: '14px 16px', fontSize: '1.1rem' }} placeholder="Enter phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700 }}>Email Address</label>
                            <input type="email" className="form-control" style={{ padding: '14px 16px', fontSize: '1.1rem' }} placeholder="Enter email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700 }}>Interested In</label>
                            <select className="form-control" style={{ padding: '14px 16px', fontSize: '1.1rem' }} value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}>
                                <option value="">Select property type...</option>
                                <option value="1bhk">1 BHK Apartment</option>
                                <option value="2bhk">2 BHK Apartment</option>
                                <option value="3bhk">3 BHK Premium</option>
                                <option value="villa">Luxury Villa</option>
                            </select>
                        </div>
                        <button type="submit" disabled={loading} className="btn" style={{ background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))', color: 'white', padding: '18px', fontSize: '1.1rem', fontWeight: 700, borderRadius: 12, marginTop: 10 }}>
                            {loading ? 'Processing...' : 'Complete Registration'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 'scanner') {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-900)' }}>
                <div style={{ position: 'relative', width: 400, background: 'white', borderRadius: 24, overflow: 'hidden', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontWeight: 800 }}>Scan QR Code</h3>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setStep('home')}><X size={20} /></button>
                    </div>
                    <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000' }}>
                        <Scanner onScan={handleScan} />
                    </div>
                    <p style={{ textAlign: 'center', margin: '20px 0 0', color: 'var(--text-muted)' }}>Hold your QR code squarely inside the frame.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', background: 'var(--navy-900)' }}>
            {/* Left side branding */}
            <div style={{ flex: 1, padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'white', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '60%', background: 'var(--accent-cyan)', filter: 'blur(100px)', opacity: 0.2, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: 'var(--accent-violet)', filter: 'blur(100px)', opacity: 0.2, borderRadius: '50%' }} />

                <div style={{ zIndex: 1, maxWidth: 480 }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
                        <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))', borderRadius: 12 }} />
                        Zentrix<span style={{ color: 'var(--accent-cyan)' }}>Projects</span>
                    </div>
                    <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.03em' }}>
                        Welcome to the <br />Sales Gallery.
                    </h1>
                    <p style={{ fontSize: '1.3rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                        Please register to get connected with our property experts and begin your viewing experience.
                    </p>
                </div>
            </div>

            {/* Right side actions */}
            <div style={{ width: '45%', background: 'white', borderTopLeftRadius: 40, borderBottomLeftRadius: 40, padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>

                <div
                    onClick={() => setStep('scanner')}
                    style={{ background: 'var(--slate-50)', border: '2px solid var(--border-medium)', borderRadius: 24, padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <div style={{ padding: 20, background: 'white', borderRadius: 20, border: '1px solid var(--border-light)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                        <QrCode size={120} style={{ color: 'var(--navy-800)' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 8px' }}>Scan to Register</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Tap to open the scanner.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '16px 0' }}>
                    <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>OR</span>
                    <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                </div>

                <div
                    onClick={() => setStep('manual')}
                    style={{ background: 'white', border: '2px solid var(--border-medium)', borderRadius: 24, padding: 30, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--navy-50)', color: 'var(--navy-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserPlus size={32} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 4px' }}>Register Manually</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>Tap here to enter your details.</p>
                    </div>
                    <ChevronRight size={24} style={{ color: 'var(--text-muted)' }} />
                </div>

            </div>
        </div>
    );
}
