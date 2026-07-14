import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, description, action }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 48, textAlign: 'center', gap: 12,
    }}>
        <div style={{ fontSize: '3rem' }}>{icon}</div>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{title}</h3>
        {description && (
            <p style={{ color: 'var(--text-muted, #94a3b8)', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
                {description}
            </p>
        )}
        {action && (
            <button
                onClick={action.onClick}
                style={{
                    marginTop: 8, padding: '8px 20px', borderRadius: 8,
                    background: 'var(--accent-primary, #6366f1)', color: 'white',
                    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                }}
            >
                {action.label}
            </button>
        )}
    </div>
);

export default EmptyState;
