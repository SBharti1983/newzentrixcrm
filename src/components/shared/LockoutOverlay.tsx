import React from 'react';
import { Lock, ShieldAlert, CreditCard, MessageCircle, ArrowRight } from 'lucide-react';

const COLORS = {
    danger: '#EF4444',
    bg: '#0F172A',
    primary: '#6366F1'
};

export default function LockoutOverlay() {
    return (
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 10000, 
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div style={{ 
                maxWidth: '500px', width: '100%', background: '#1E293B', padding: '48px', 
                borderRadius: '32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ 
                    width: 80, height: 80, background: 'rgba(239, 68, 68, 0.1)', 
                    borderRadius: '24px', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(239, 68, 68, 0.2)' 
                }}>
                    <Lock size={40} color={COLORS.danger} />
                </div>

                <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>Workspace Restricted</h1>
                <p style={{ color: '#94A3B8', lineHeight: 1.6, marginBottom: '32px' }}>
                    Access to this node has been suspended. This usually occurs due to an <strong style={{color: 'white'}}>expired subscription</strong> or a routine <strong style={{color: 'white'}}>security intervention</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button style={{ 
                        padding: '16px', borderRadius: '16px', background: COLORS.primary, color: 'white', 
                        border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)'
                    }}>
                        Resolve via Billing Center <ArrowRight size={18} />
                    </button>
                    <button style={{ 
                        padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', 
                        border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                    }}>
                        <MessageCircle size={18} /> Contact Support
                    </button>
                </div>

                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.7rem', fontWeight: 700 }}>
                        <ShieldAlert size={12} /> SECURE TERMINAL
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.7rem', fontWeight: 700 }}>
                        <CreditCard size={12} /> PCI COMPLIANT
                    </div>
                </div>
            </div>
        </div>
    );
}
