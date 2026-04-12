import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { billingApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { CheckCircle, Zap, Shield, Crown, User, Edit3, X } from 'lucide-react';

export default function Billing() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [gateway, setGateway] = useState('razorpay'); // 'stripe' | 'razorpay'

    const [plans, setPlans] = useState([
        {
            name: 'pro_solo', title: 'Solopreneur Premium', price: '₹999', desc: 'Premium features for individual agents and solo practitioners.',
            icon: <User size={24} />, bg: '#a855f7',
            features: ['1 User License', 'Unlimited Leads', 'Auto-Slug Identification', 'Personal Branding', 'WhatsApp + SMS', 'AI Copilot Access']
        },
        {
            name: 'starter', title: 'Starter', price: '₹2,900', desc: 'Perfect for small brokerages just getting started.',
            icon: <Zap size={24} />, bg: '#06b6d4',
            features: ['Up to 5 Users', '2,000 Leads Storage', '10 Projects', 'Basic Support', 'Email Notifications']
        },
        {
            name: 'pro', title: 'Professional', price: '₹7,900', desc: 'Advanced features for growing real estate teams.',
            icon: <Shield size={24} />, bg: '#1e3a8a', recommended: true,
            features: ['Up to 15 Users', '10,000 Leads Storage', '50 Projects', 'Priority Support', 'WhatsApp + SMS', 'Advanced Analytics']
        },
        {
            name: 'enterprise', title: 'Enterprise', price: '₹19,900', desc: 'Unlimited scale for top-tier developers and agencies.',
            icon: <Crown size={24} />, bg: '#8b5cf6',
            features: ['Unlimited Users', 'Unlimited Leads', 'Unlimited Projects', 'Dedicated Account Manager', 'Custom API Access', 'Custom White-labeling']
        }
    ]);
    const [editingPlan, setEditingPlan] = useState(null);

    const handleUpdatePlan = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updated = {
            ...editingPlan,
            title: formData.get('title'),
            price: formData.get('price'),
            desc: formData.get('desc'),
            features: formData.get('features').split(',').map(f => f.trim())
        };
        setPlans(plans.map(p => p.name === editingPlan.name ? updated : p));
        setEditingPlan(null);
        showToast('Plan configuration synchronized.', 'success');
    };

    const handleSubscribe = async (plan) => {
        setLoading(true);
        try {
            if (gateway === 'stripe') {
                const res = await billingApi.subscribe({ plan });
                if (res.url) {
                    window.location.href = res.url;
                    return;
                }
            } else {
                // Razorpay Flow
                const order = await billingApi.razorpayOrder({ plan });

                const options = {
                    key: order.key,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'Zentrix CRM',
                    description: `Upgrade to ${plan} Plan`,
                    order_id: order.id,
                    handler: async function (response) {
                        try {
                            const verify = await billingApi.razorpayVerify({
                                ...response,
                                planKey: plan
                            });
                            if (verify.success) {
                                window.location.href = '/billing/success?session_id=' + response.razorpay_payment_id;
                            }
                        } catch (_err) {
                            showToast('Verification failed', 'error');
                        }
                    },
                    prefill: {
                        name: user.name,
                        email: user.email,
                    },
                    theme: { color: '#1e3a73' }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            }
        } catch (err) {
            showToast(err.error || 'Payment failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header" style={{ textAlign: 'center', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '1.4rem', margin: 0 }}>Subscription & Billing</h1>
                    <p className="page-subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>Choose the right plan to scale your real estate agency.</p>
                </div>
            </div>

            {/* Current Plan Alert */}
            <div style={{ maxWidth: 800, margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '8px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-200)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Plan</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy-700)', textTransform: 'uppercase' }}>
                            {user?.plan || 'Free Trial'}
                        </div>
                    </div>
                    {user?.plan === 'trial' && (
                        <div className="badge badge-red" style={{ fontSize: '10px', padding: '4px 8px' }}>Trial expires soon</div>
                    )}
                </div>

                {/* Gateway Switcher */}
                <div style={{ alignSelf: 'center', background: '#f1f5f9', padding: 3, borderRadius: 8, display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => setGateway('razorpay')}
                        style={{
                            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: gateway === 'razorpay' ? 'white' : 'transparent',
                            boxShadow: gateway === 'razorpay' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            color: gateway === 'razorpay' ? 'var(--navy-700)' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        🇮🇳 Pay via UPI / Cards (Razorpay)
                    </button>
                    <button
                        onClick={() => setGateway('stripe')}
                        style={{
                            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: gateway === 'stripe' ? 'white' : 'transparent',
                            boxShadow: gateway === 'stripe' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            color: gateway === 'stripe' ? 'var(--navy-700)' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        🌍 International Cards (Stripe)
                    </button>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-4" style={{ width: '100%', margin: '0 auto', alignItems: 'stretch' }}>
                {plans.map(plan => (
                    <div key={plan.name} className="card" style={{
                        padding: '16px 20px',
                        position: 'relative',
                        border: plan.recommended ? `2px solid ${plan.bg}` : '1px solid var(--border-light)',
                        zIndex: plan.recommended ? 10 : 1,
                        overflow: 'visible',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        borderRadius: '24px'
                    }}>
                        {user?.role === 'superadmin' && (
                            <button 
                                style={{ position: 'absolute', top: 12, right: 12, background: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                                onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }}
                                title="Edit Plan Configuration"
                            >
                                <Edit3 size={14} />
                            </button>
                        )}
                        {plan.recommended && (
                            <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: plan.bg, color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.05em', whiteSpace: 'nowrap', width: 'max-content', zIndex: 20 }}>
                                MOST POPULAR
                            </div>
                        )}

                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${plan.bg}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: plan.bg, marginBottom: 8 }}>
                            {plan.icon && <plan.icon.type {...plan.icon.props} size={16} />}
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{plan.title}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: '2px 0 0' }}>{plan.desc}</p>

                        <div style={{ margin: '10px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{plan.price}</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>/mo</span>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {plan.features.map(f => (
                                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                    <CheckCircle size={14} color={plan.bg} /> {f}
                                </li>
                            ))}
                        </ul>

                        <button
                            className="btn"
                            style={{
                                width: '100%',
                                height: 36,
                                background: plan.recommended ? plan.bg : 'white',
                                color: plan.recommended ? 'white' : 'var(--text-primary)',
                                border: plan.recommended ? 'none' : '1px solid var(--border-medium)',
                                marginTop: 'auto',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                borderRadius: '10px'
                            }}
                            onClick={() => handleSubscribe(plan.name)}
                            disabled={loading || user?.plan === plan.name}
                        >
                            {loading ? '...' : user?.plan === plan.name ? 'Current' : 'Upgrade'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Admin Edit Modal */}
            {editingPlan && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px', borderRadius: '32px', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Configure {editingPlan.title}</h2>
                            <button onClick={() => setEditingPlan(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUpdatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plan Title</label>
                                <input name="title" defaultValue={editingPlan.title} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border-medium)', fontWeight: 600 }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Price (Formatted)</label>
                                <input name="price" defaultValue={editingPlan.price} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border-medium)', fontWeight: 600 }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Short Description</label>
                                <textarea name="desc" defaultValue={editingPlan.desc} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border-medium)', fontWeight: 600, minHeight: '80px', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Features (Comma separated)</label>
                                <textarea name="features" defaultValue={editingPlan.features.join(', ')} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border-medium)', fontWeight: 600, minHeight: '80px', resize: 'vertical' }} />
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setEditingPlan(null)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#f1f5f9', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--navy-700)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Sync Configuration</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Payments are securely processed via Stripe. All plans are billed in INR.
            </div>
        </div>
    );
}
