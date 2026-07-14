import React from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    variant = 'default', onConfirm, onCancel,
}) => {
    if (!open) return null;

    const confirmBg = variant === 'danger' ? '#ef4444' : 'var(--accent-primary, #6366f1)';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--surface-primary, white)', borderRadius: 16,
                    padding: 28, maxWidth: 400, width: '90%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>{title}</h3>
                <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
                            background: 'transparent', cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '8px 18px', borderRadius: 8, border: 'none',
                            background: confirmBg, color: 'white', cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
