/** Spinner component — reusable across pages */
export function PageLoader({ message = "Loading..." }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
            <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid var(--slate-100)',
                borderTopColor: 'var(--navy-500)',
                animation: 'spin 0.7s linear infinite',
            }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{message}</div>
        </div>
    );
}

/** Error banner */
export function PageError({ message, onRetry }: any) {
    return (
        <div style={{
            padding: 32, textAlign: 'center', borderRadius: 16,
            background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)',
        }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-rose)', marginBottom: 8 }}>Failed to load data</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{message}</div>
            {onRetry && <button className="btn btn-primary btn-sm" onClick={onRetry}>Retry</button>}
        </div>
    );
}
