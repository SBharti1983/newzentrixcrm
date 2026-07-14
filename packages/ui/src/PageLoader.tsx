import React from 'react';

interface PageLoaderProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Full-page loading spinner with optional message.
 * Used as Suspense fallback for lazy-loaded routes.
 */
const PageLoader: React.FC<PageLoaderProps> = ({ 
    message = 'Loading...', 
    size = 'md' 
}) => {
    const sizes = { sm: 24, md: 40, lg: 56 };
    const dim = sizes[size];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            gap: 16,
        }}>
            <div style={{
                width: dim,
                height: dim,
                border: '3px solid rgba(99, 102, 241, 0.15)',
                borderTopColor: 'var(--accent-primary, #6366f1)',
                borderRadius: '50%',
                animation: 'zentrix-spin 0.7s linear infinite',
            }} />
            <span style={{
                color: 'var(--text-muted, #94a3b8)',
                fontSize: size === 'sm' ? '0.8rem' : '0.9rem',
                fontWeight: 500,
            }}>
                {message}
            </span>
            <style>{`
                @keyframes zentrix-spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PageLoader;
