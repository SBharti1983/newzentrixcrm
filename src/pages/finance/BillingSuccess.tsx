import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function BillingSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (!sessionId) {
            navigate('/billing');
            return;
        }

        // In a real app, you might verify the session status here
        // For now, we'll just show the success state
        const timer = setTimeout(() => setStatus('success'), 1500);
        return () => clearTimeout(timer);
    }, [sessionId, navigate]);

    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 20 }}>
                <Loader2 size={48} className="animate-spin" color="var(--navy-600)" />
                <h2 style={{ fontWeight: 700 }}>Processing your payment...</h2>
                <p>Please wait while we finalize your subscription.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
                width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                color: 'var(--accent-emerald)'
            }}>
                <CheckCircle size={40} />
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12, color: 'var(--navy-700)' }}>
                Subscription Active!
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
                Thank you for choosing ZentrixCRM. Your account has been upgraded and your new limits are now active.
                You can now start managing more leads and projects.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <Link to="/" className="btn btn-primary" style={{ padding: '12px 32px' }}>
                    Go to Dashboard
                </Link>
                <Link to="/leads" className="btn btn-secondary" style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    View Leads <ArrowRight size={18} />
                </Link>
            </div>

            <div style={{ marginTop: 40, paddingTop: 40, borderTop: '1px solid var(--border-light)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                A confirmation email has been sent to your registered address.
                Need help? <a href="mailto:support@zentrixcrm.com" style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Contact Support</a>
            </div>
        </div>
    );
}
