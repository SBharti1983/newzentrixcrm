import React from 'react';

const COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', dot: '#22c55e' },
    new:       { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', dot: '#3b82f6' },
    hot:       { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444' },
    warm:      { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' },
    cold:      { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', dot: '#94a3b8' },
    closed:    { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', dot: '#6366f1' },
    pending:   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' },
    default:   { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', dot: '#94a3b8' },
};

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
    const colors = COLORS[status.toLowerCase()] || COLORS.default;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: size === 'sm' ? '2px 10px' : '4px 14px',
            borderRadius: 20, background: colors.bg,
            fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
            fontWeight: 600, color: colors.text, textTransform: 'capitalize',
        }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: colors.dot, flexShrink: 0,
            }} />
            {status}
        </span>
    );
};

export default StatusBadge;
