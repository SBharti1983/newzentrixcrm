import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

/**
 * Catches rendering errors in child components and shows a recovery UI.
 * Prevents full-page white screens from a single component crash.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Caught:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '50vh', textAlign: 'center',
                    gap: 12, padding: 24,
                }}>
                    <div style={{ fontSize: '3rem' }}>⚠️</div>
                    <h2 style={{ fontWeight: 800, color: '#ef4444' }}>Something went wrong</h2>
                    <p style={{ color: '#94a3b8', maxWidth: 400 }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '8px 20px', borderRadius: 8,
                            background: '#6366f1', color: 'white',
                            border: 'none', cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
