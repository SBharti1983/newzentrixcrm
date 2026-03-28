import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { billingApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { CheckCircle, Zap, Shield, Crown } from 'lucide-react';

export default function Billing() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [gateway, setGateway] = useState('razorpay'); // 'stripe' | 'razorpay'

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
                    name: 'ZentrixCRM',
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
            <div className="page-header" style={{ textAlign: 'center', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Subscription & Billing</h1>
                    <p className="page-subtitle">Choose the right plan to scale your real estate agency.</p>
                </div>
            </div>

            {/* Current Plan Alert */}
            <div style={{ maxWidth: 800, margin: '0 auto 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: 16, background: 'var(--navy-50)', border: '1px solid var(--navy-200)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Plan</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-700)', textTransform: 'uppercase' }}>
                            {user?.plan || 'Free Trial'}
                        </div>
                    </div>
                    {user?.plan === 'trial' && (
                        <div className="badge badge-red">Trial expires soon</div>
                    )}
                </div>

                {/* Gateway Switcher */}
                <div style={{ alignSelf: 'center', background: '#f1f5f9', padding: 4, borderRadius: 10, display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => setGateway('razorpay')}
                        style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600,
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
                            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600,
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
            <div className="grid grid-3" style={{ width: '100%', margin: '0 auto', alignItems: 'stretch' }}>
                {[
                    {
                        name: 'starter', title: 'Starter', price: '₹2,900', desc: 'Perfect for small brokerages just getting started.',
                        icon: <Zap size={24} />, bg: 'var(--accent-cyan)',
                        features: ['Up to 5 Users', '2,000 Leads Storage', '10 Projects', 'Basic Support', 'Email Notifications']
                    },
                    {
                        name: 'pro', title: 'Professional', price: '₹7,900', desc: 'Advanced features for growing real estate teams.',
                        icon: <Shield size={24} />, bg: 'var(--navy-600)', recommended: true,
                        features: ['Up to 15 Users', '10,000 Leads Storage', '50 Projects', 'Priority Support', 'WhatsApp + SMS', 'Advanced Analytics']
                    },
                    {
                        name: 'enterprise', title: 'Enterprise', price: '₹19,900', desc: 'Unlimited scale for top-tier developers and agencies.',
                        icon: <Crown size={24} />, bg: 'var(--accent-violet)',
                        features: ['Unlimited Users', 'Unlimited Leads', 'Unlimited Projects', 'Dedicated Account Manager', 'Custom API Access', 'Custom White-labeling']
                    }
                ].map(plan => (
                    <div key={plan.name} className="card" style={{
                        padding: '24px 28px',
                        position: 'relative',
                        border: plan.recommended ? `2px solid ${plan.bg}` : '1px solid var(--border-light)',
                        transform: plan.recommended ? 'scale(1.03)' : 'scale(1)',
                        zIndex: plan.recommended ? 10 : 1,
                        overflow: plan.recommended ? 'visible' : 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        {plan.recommended && (
                            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plan.bg, color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '6px 16px', borderRadius: 20, letterSpacing: '0.05em', whiteSpace: 'nowrap', width: 'max-content', zIndex: 20 }}>
                                MOST POPULAR
                            </div>
                        )}

                        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${plan.bg}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: plan.bg, marginBottom: 14 }}>
                            {plan.icon}
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{plan.title}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', minHeight: 36, marginTop: 4 }}>{plan.desc}</p>

                        <div style={{ margin: '16px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>{plan.price}</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>/month</span>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {plan.features.map(f => (
                                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    <CheckCircle size={16} color={plan.bg} /> {f}
                                </li>
                            ))}
                        </ul>

                        <button
                            className="btn"
                            style={{
                                width: '100%',
                                background: plan.recommended ? plan.bg : 'white',
                                color: plan.recommended ? 'white' : 'var(--text-primary)',
                                border: plan.recommended ? 'none' : '1px solid var(--border-medium)',
                                marginTop: 'auto'
                            }}
                            onClick={() => handleSubscribe(plan.name)}
                            disabled={loading || user?.plan === plan.name}
                        >
                            {loading ? 'Processing...' : user?.plan === plan.name ? 'Current Plan' : `Upgrade to ${plan.title}`}
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Payments are securely processed via Stripe. All plans are billed in INR.
            </div>
        </div>
    );
}
