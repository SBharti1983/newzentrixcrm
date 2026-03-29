import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Critical Runtime Error Catch:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh', width: '100vw', 
                    background: 'var(--navy-900)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-main)', color: 'white'
                }}>
                    <div style={{ maxWidth: 480, textAlign: 'center', padding: 40 }}>
                        <div style={{ 
                            width: 80, height: 80, 
                            background: 'rgba(244, 63, 94, 0.1)', 
                            borderRadius: '24px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            margin: '0 auto 32px' 
                        }}>
                            <AlertTriangle size={40} color="var(--accent-rose)" />
                        </div>
                        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: 16 }}>System Interruption</h1>
                        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 40 }}>
                            An unexpected runtime error occurred while processing this layout. The Executive Command Center has isolated the fault to maintain platform integrity.
                        </p>
                        
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                            <button 
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '14px 28px', borderRadius: '14px', 
                                    background: 'white', color: 'var(--navy-900)', 
                                    fontWeight: 800, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 10
                                }}
                            >
                                <RefreshCw size={18} /> REFRESH HUB
                            </button>
                            <button 
                                onClick={() => window.location.href = '/'}
                                style={{
                                    padding: '14px 28px', borderRadius: '14px', 
                                    background: 'rgba(255,255,255,0.1)', color: 'white', 
                                    fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)', 
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 10
                                }}
                            >
                                <Home size={18} /> DASHBOARD
                            </button>
                        </div>

                        {(import.meta.env.DEV || import.meta.env.MODE === 'development') && (
                            <div style={{ 
                                marginTop: 40, padding: 20, 
                                background: 'rgba(0,0,0,0.3)', borderRadius: '16px', 
                                textAlign: 'left', fontSize: '12px', fontFamily: 'monospace',
                                color: 'var(--accent-rose)', overflow: 'auto', maxHeight: 200,
                                border: '1px solid rgba(244, 63, 94, 0.2)'
                            }}>
                                <div style={{ fontWeight: 900, marginBottom: 8 }}>DEBUG_INFO:</div>
                                {this.state.error?.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
