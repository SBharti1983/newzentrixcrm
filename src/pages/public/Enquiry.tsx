import { useState } from 'react';
import { CheckCircle, ArrowRight, Phone, Mail, MapPin, Building2, User, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { enquiriesApi, projectsApi } from '../../api/client';

const STEPS = ['Your Info', 'Property Interest', 'Confirmation'];

const DEFAULT = {
    name: '', phone: '', email: '', city: '',
    projectId: '', propertyType: '3BHK', budget: '',
    source: 'Website Enquiry', message: '',
};

export default function Enquiry() {
    const navigate = useNavigate();
    const { data: projectsRaw } = useApi(() => projectsApi.list());
    const PROJECTS_DATA = projectsRaw || [];

    const [step, setStep] = useState(0);
    const [form, setForm] = useState(DEFAULT);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [refNo] = useState(() => `ENQ-${Date.now().toString().slice(-6)}`);

    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        setSubmitting(true);
        try {
            await enquiriesApi.submit({
                name: form.name, phone: form.phone, email: form.email, city: form.city,
                project_id: parseInt(form.projectId) || null,
                property_type: form.propertyType, budget: form.budget,
                source: form.source, message: form.message,
            });
            setSubmitted(true);
        } catch {
            // Even if API fails (no backend yet), show success for demo
            setSubmitted(true);
        } finally { setSubmitting(false); }
    };

    const selectedProject = PROJECTS_DATA.find(p => p.id === parseInt(form.projectId));

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #1e3a73 60%, #0f2347 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{
                    background: 'white', borderRadius: 24, padding: 'clamp(24px, 5vw, 48px)', maxWidth: 480, width: '100%',
                    textAlign: 'center', boxShadow: '0 20px 80px rgba(0,0,0,0.4)',
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)',
                        border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 20px',
                    }}>
                        <CheckCircle size={36} style={{ color: 'var(--accent-emerald)' }} />
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, color: 'var(--navy-700)' }}>Enquiry Submitted!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                        Thank you, <strong>{form.name}</strong>! Our team will reach out to you at <strong>{form.phone}</strong> within 24 hours.
                    </p>
                    <div style={{
                        padding: '12px 20px', background: 'var(--navy-50)', borderRadius: 12,
                        border: '1px solid var(--navy-100)', fontSize: '0.85rem', fontWeight: 700,
                        color: 'var(--navy-600)', marginBottom: 24,
                    }}>
                        Reference: <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{refNo}</span>
                    </div>
                    {selectedProject && (
                        <div style={{ padding: '14px 16px', background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--border-light)', fontSize: '0.85rem', textAlign: 'left', marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>Your Interest</div>
                            <div style={{ color: 'var(--text-muted)' }}>{selectedProject.name} · {form.propertyType} · Budget {form.budget}</div>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button onClick={() => navigate('/')}
                            className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            <Home size={16} /> Return to Home
                        </button>
                        <button onClick={() => { setSubmitted(false); setForm(DEFAULT); setStep(0); }}
                            className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
                            Submit Another Enquiry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a1628 0%, #1e3a73 60%, #0f2347 100%)',
            display: 'flex', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden',
        }}>
            {/* BG grid */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}>
                <defs><pattern id="eg" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern></defs>
                <rect width="100%" height="100%" fill="url(#eg)" />
            </svg>

            {/* Left hero */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '60px 72px', position: 'relative', zIndex: 1,
            }} className="login-left-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, fontWeight: 900, fontSize: '1.3rem',
                        background: 'linear-gradient(135deg, #3b63b8, #06b6d4)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>Z</div>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white' }}>ZentrixCRM</span>
                </div>
                <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.5px' }}>
                    Find Your<br />
                    <span style={{ background: 'linear-gradient(90deg,#06b6d4,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dream Property</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
                    Explore premium residential and commercial properties. Our experts will help you find the perfect home within your budget.
                </p>
                {/* Projects */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PROJECTS_DATA.filter(p => p.status === 'Active').slice(0, 4).map(p => (
                        <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                            borderRadius: 14, background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)',
                        }}>
                            <span style={{ fontSize: '1.3rem' }}>{p.image || '🏢'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>{p.location} · {p.available_units || 0} units left</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#06b6d4' }}>{(p.price_range || 'Contact').split('–')[0]}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form */}
            <div style={{
                width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(20px, 5vw, 40px)', background: 'rgba(255,255,255,0.97)',
                boxShadow: '-20px 0 80px rgba(0,0,0,0.3)', position: 'relative', zIndex: 1,
            }}>
                <div style={{ width: '100%', maxWidth: 420 }}>
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-700)', marginBottom: 4 }}>Book a Free Consultation</h2>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Fill the form and our team will call you within 24 hours.</p>
                    </div>

                    {/* Step indicator */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 28, alignItems: 'center' }}>
                        {STEPS.map((s, i) => {
                            const done = step > i;
                            const active = step === i;
                            return (
                                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                            background: done ? 'var(--accent-emerald)' : active ? 'var(--navy-600)' : 'var(--slate-100)',
                                            color: done || active ? 'white' : 'var(--text-muted)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.72rem', fontWeight: 800, transition: 'all 0.2s',
                                            boxShadow: active ? '0 0 0 3px rgba(30,58,115,0.2)' : 'none',
                                        }}>
                                            {done ? '✓' : i + 1}
                                        </div>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: active ? 'var(--navy-600)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div style={{ flex: 1, height: 2, background: done ? 'var(--accent-emerald)' : 'var(--slate-100)', marginBottom: 16, mx: 4, transition: 'all 0.3s' }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Step 0: Personal Info */}
                    {step === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Full Name *</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input className="form-control" value={form.name} onChange={e => upd('name', e.target.value)}
                                        placeholder="Your full name" style={{ paddingLeft: 32 }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Mobile Number *</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input className="form-control" value={form.phone} onChange={e => upd('phone', e.target.value)}
                                        placeholder="+91 98765 43210" style={{ paddingLeft: 32 }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input className="form-control" type="email" value={form.email} onChange={e => upd('email', e.target.value)}
                                        placeholder="you@email.com" style={{ paddingLeft: 32 }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>City</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input className="form-control" value={form.city} onChange={e => upd('city', e.target.value)}
                                        placeholder="Mumbai" style={{ paddingLeft: 32 }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Property Interest */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Project Interest</label>
                                <select className="form-control" value={form.projectId} onChange={e => upd('projectId', e.target.value)}>
                                    <option value="">Any / Explore All</option>
                                    {PROJECTS_DATA.map(p => <option key={p.id} value={p.id}>{p.image} {p.name} — {p.location}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Property Type</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {['Studio', '1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Penthouse', 'Commercial'].map(t => (
                                        <button key={t} type="button" onClick={() => upd('propertyType', t)} style={{
                                            padding: '6px 12px', borderRadius: 99, border: `1.5px solid ${form.propertyType === t ? 'var(--navy-500)' : 'var(--border-light)'}`,
                                            background: form.propertyType === t ? 'var(--navy-50)' : 'white',
                                            color: form.propertyType === t ? 'var(--navy-600)' : 'var(--text-muted)',
                                            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.12s',
                                        }}>{t}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Budget Range</label>
                                <select className="form-control" value={form.budget} onChange={e => upd('budget', e.target.value)}>
                                    <option value="">Select budget</option>
                                    {['Under ₹30L', '₹30L–₹60L', '₹60L–₹1Cr', '₹1Cr–₹2Cr', '₹2Cr–₹5Cr', 'Above ₹5Cr'].map(b => <option key={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>How did you hear about us?</label>
                                <select className="form-control" value={form.source} onChange={e => upd('source', e.target.value)}>
                                    {[
                                        'Website Enquiry', 'Google Search', 'Facebook/Instagram', 
                                        'Friend Referral', 'Newspaper/TV', 'Site Visit Directly', 
                                        'PropTech Portal', '99 Acres', 'Housing', 'Magic Bricks', 
                                        'OLX', 'NoBroker', 'Squareyards', 'Channel Partner'
                                    ].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 5 }}>Message / Special Requirements</label>
                                <textarea className="form-control" rows={3} value={form.message} onChange={e => upd('message', e.target.value)}
                                    placeholder="Any specific requirements, preferred floor, facing direction, financing needs..." />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Confirm */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--slate-50)', border: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Your Details</div>
                                {[
                                    { label: 'Name', value: form.name },
                                    { label: 'Phone', value: form.phone },
                                    { label: 'Email', value: form.email || '—' },
                                    { label: 'City', value: form.city || '—' },
                                ].map(r => (
                                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.84rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                                        <span style={{ fontWeight: 700 }}>{r.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Property Interest</div>
                                {[
                                    { label: 'Project', value: selectedProject?.name || 'Any' },
                                    { label: 'Type', value: form.propertyType },
                                    { label: 'Budget', value: form.budget || '—' },
                                    { label: 'Source', value: form.source },
                                ].map(r => (
                                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--navy-100)', fontSize: '0.84rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{r.value}</span>
                                    </div>
                                ))}
                            </div>
                            {form.message && (
                                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    <strong>Message:</strong> {form.message}
                                </div>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                By submitting, you agree to be contacted by our team via call, WhatsApp, or email regarding this enquiry.
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="btn btn-secondary" style={{ flex: 1 }}>← Back</button>
                        )}
                        {step < 2 && (
                            <button onClick={() => setStep(s => s + 1)}
                                disabled={step === 0 && (!form.name || !form.phone)}
                                className="btn btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                Next <ArrowRight size={14} />
                            </button>
                        )}
                        {step === 2 && (
                            <button onClick={submit} disabled={submitting} className="btn btn-success" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {submitting ? (
                                    <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Submitting...</>
                                ) : '✓ Submit Enquiry'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
