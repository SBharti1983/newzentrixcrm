/**
 * NehaDashboard — Neha Orchestration Platform
 *
 * Real-time monitoring dashboard for Neha (AI Digital Accountant).
 * Shows live activity as Neha processes calls, creates filing tasks,
 * reasons through caller intents, and hands off to human managers.
 *
 * Features:
 *  - Live Activity Panel (Socket.IO real-time event stream)
 *  - KPI Cards (filings, turns, handoffs, latency)
 *  - Filings Kanban (grouped by status)
 *  - Reasoning Stream (recent cognitive loop decisions)
 *  - Handoff Feed (escalations to Surendra)
 *  - Live Calls (active conversation sessions)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    Bot, Activity, FileText, Brain, AlertTriangle, Clock,
    Zap, RefreshCw, PhoneCall, ArrowRight, CheckCircle2,
    CircleDot, Radio, TrendingUp, Users
} from 'lucide-react';
import { BASE_URL, getToken } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import './NehaDashboard.css';

// ── API helper ─────────────────────────────────────────────────────
async function apiFetch(path: string, options: any = {}) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

// ── Types ──────────────────────────────────────────────────────────
interface LiveEvent {
    type: string;
    tenant_id: string | number;
    persona_id?: string;
    caller_name?: string;
    caller_phone?: string;
    channel?: string;
    turn_number?: number;
    timestamp: number;
    [key: string]: any;
}

interface FilingTask {
    id: string;
    filing_type: string;
    gst_return_type?: string;
    period?: string;
    status: string;
    required_documents: string[];
    collected_documents: string[];
    notes?: string;
    created_at: string;
}

interface ReasoningItem {
    id: string;
    turn_number: number;
    channel: string;
    user_input: string;
    action?: string;
    intent?: string;
    emotion?: string;
    next_goal?: string;
    response_given?: string;
    latency_ms?: number;
    reasoning_ms?: number;
    created_at: string;
}

interface HandoffItem {
    id: string;
    escalation_type: string;
    trigger_reason: string;
    status: string;
    lead_id?: string;
    created_at: string;
}

interface LiveCall {
    id: string;
    lead_id?: string;
    channel: string;
    turn_count?: string;
    language?: string;
    current_goal?: string;
    next_action?: string;
    reasoning_turns?: string;
    created_at: string;
}

interface Stats {
    window_days: number;
    filings: { total_filings: string; filed: string; in_progress: string; draft: string; cancelled: string };
    turns: { total_turns: string; avg_latency_ms: string; avg_reasoning_ms: string; max_latency_ms: string };
    handoffs: { total_handoffs: string; resolved: string; pending: string };
    action_distribution: { action: string; count: string }[];
}

// ── Event type metadata ────────────────────────────────────────────
const EVENT_META: Record<string, { label: string; color: string; icon: any }> = {
    'neha:turn_started': { label: 'Turn Started', color: '#3b82f6', icon: Radio },
    'neha:track_a_response': { label: 'Track A Response', color: '#10b981', icon: Zap },
    'neha:reasoning_complete': { label: 'Reasoning Complete', color: '#8b5cf6', icon: Brain },
    'neha:filing_created': { label: 'Filing Created', color: '#f59e0b', icon: FileText },
    'neha:filing_progress': { label: 'Filing Progress', color: '#8b5cf6', icon: RefreshCw },
    'neha:handoff': { label: 'Handoff', color: '#ef4444', icon: AlertTriangle },
    'neha:call_started': { label: 'Call Started', color: '#06b6d4', icon: PhoneCall },
    'neha:call_ended': { label: 'Call Ended', color: '#6b7280', icon: PhoneCall },
};

const FILING_STATUS_ORDER = [
    'draft', 'documents_requested', 'documents_received',
    'prepared', 'pending_authorization', 'filed', 'confirmation_sent', 'rejected', 'cancelled'
];

const STATUS_COLORS: Record<string, string> = {
    draft: '#6b7280',
    documents_requested: '#f59e0b',
    documents_received: '#3b82f6',
    prepared: '#8b5cf6',
    pending_authorization: '#ec4899',
    filed: '#10b981',
    confirmation_sent: '#059669',
    rejected: '#ef4444',
    cancelled: '#9ca3af',
};

const PLAYBOARD_STEPS = [
    { label: 'Portal Access', desc: 'Opening GST Portal and authenticating credentials...', statusKey: 'draft' },
    { label: 'Select Period', desc: 'Selecting Return Dashboard for GSTR-1...', statusKey: 'documents_requested' },
    { label: 'Parse Register', desc: 'Parsing Outward Supplies Register spreadsheet...', statusKey: 'documents_received' },
    { label: 'Upload Data', desc: 'Uploading invoice line-items to GST Portal tables...', statusKey: 'prepared' },
    { label: 'Verify Totals', desc: 'Reconciling totals and validating calculations...', statusKey: 'pending_authorization' },
    { label: 'Sign & Submit', desc: 'Submitting return and generating ARN receipt...', statusKey: 'filed' },
    { label: 'Confirm Client', desc: 'Filing confirmed! Sending confirmation message to customer.', statusKey: 'confirmation_sent' }
];

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════
export default function NehaDashboard() {
    const { showToast } = useToast();
    const [stats, setStats] = useState<Stats | null>(null);
    const [filings, setFilings] = useState<FilingTask[]>([]);
    const [reasoningFeed, setReasoningFeed] = useState<ReasoningItem[]>([]);
    const [handoffs, setHandoffs] = useState<HandoffItem[]>([]);
    const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
    const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const [triggeringDemo, setTriggeringDemo] = useState(false);

    const handleTriggerDemo = async () => {
        if (triggeringDemo) return;
        setTriggeringDemo(true);
        try {
            const res = await apiFetch('/neha/dashboard/trigger-demo', { method: 'POST' });
            if (res.ok) {
                showToast('Demo return filing successfully triggered!', 'success');
                fetchAll();
            }
        } catch (err) {
            console.error('[NehaDashboard] Failed to trigger demo:', err);
            showToast('Failed to trigger demo return filing', 'error');
        } finally {
            setTriggeringDemo(false);
        }
    };

    // ── Fetch all dashboard data ──
    const fetchAll = useCallback(async () => {
        try {
            const [statsRes, filingsRes, reasoningRes, handoffRes, callsRes] = await Promise.all([
                apiFetch('/neha/dashboard/stats?days=7'),
                apiFetch('/neha/dashboard/filings?limit=50'),
                apiFetch('/neha/dashboard/reasoning-feed?limit=30'),
                apiFetch('/neha/dashboard/handoffs?limit=20'),
                apiFetch('/neha/dashboard/live-calls?limit=10'),
            ]);
            setStats(statsRes);
            setFilings(filingsRes.filings || []);
            setReasoningFeed(reasoningRes.items || []);
            setHandoffs(handoffRes.items || []);
            setLiveCalls(callsRes.items || []);
        } catch (err) {
            console.error('[NehaDashboard] Fetch error:', err);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    // ── Initial fetch + polling ──
    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15_000); // refresh every 15s
        return () => clearInterval(interval);
    }, [fetchAll]);

    // ── Fetch event buffer once on mount ──
    useEffect(() => {
        const fetchBuffer = async () => {
            try {
                const bufferRes = await apiFetch('/neha/events/buffer');
                const initialEvents = (bufferRes.events || []).map((e: any) => ({
                    ...e.payload,
                    timestamp: e.received_at
                }));
                setLiveEvents(initialEvents);
            } catch (err) {
                console.error('[NehaDashboard] Failed to fetch event buffer:', err);
            }
        };
        fetchBuffer();
    }, []);

    // ── Socket.IO real-time connection ──
    useEffect(() => {
        const token = getToken();
        if (!token) return;

        const isProd = import.meta.env.PROD;
        let baseUrl = window.location.origin;
        if (isProd) {
            if (import.meta.env.VITE_API_URL) {
                baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
            } else {
                baseUrl = 'https://zentrixcrmindia-production.up.railway.app';
            }
        }

        const socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            console.log('[NehaDashboard] Socket connected');
        });

        socket.on('disconnect', () => {
            setConnected(false);
            console.log('[NehaDashboard] Socket disconnected');
        });

        socket.on('neha:event', (event: LiveEvent) => {
            setLiveEvents(prev => [event, ...prev].slice(0, 100));
            if (event.type === 'neha:filing_progress' || event.type === 'neha:filing_created') {
                fetchAll();
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // ── Group filings by status for kanban ──
    const filingsKanban: Record<string, FilingTask[]> = {};
    for (const f of filings) {
        let status = (f.status || '').toLowerCase();
        if (status === 'initiated') status = 'draft';
        if (!filingsKanban[status]) filingsKanban[status] = [];
        filingsKanban[status].push(f);
    }

    // Active task: first task that is in progress but not yet confirmation_sent
    const activeTask = filings.find(f =>
        ['draft', 'documents_requested', 'documents_received', 'prepared', 'pending_authorization', 'filed'].includes((f.status || '').toLowerCase()) ||
        f.status === 'Initiated'
    );
    // Queue: all other tasks that are 'draft' or 'initiated'
    const queueTasks = filings.filter(f =>
        ((f.status || '').toLowerCase() === 'draft' || (f.status || '').toLowerCase() === 'initiated') && 
        (!activeTask || f.id !== activeTask.id)
    );

    const renderGstPortalScreen = (task: FilingTask) => {
        const status = (task.status || '').toLowerCase();
        
        switch (status) {
            case 'draft':
            case 'initiated':
                return (
                    <div className="gst-portal-screen screen-login">
                        <div className="gst-portal-header-bar">
                            <span className="gst-logo-text">GOODS AND SERVICES TAX</span>
                            <span className="gov-text">Government of India</span>
                        </div>
                        <div className="gst-login-form">
                            <h4>Login with Credentials</h4>
                            <div className="gst-form-group">
                                <label>Username</label>
                                <input type="text" value="mayainfra_admin" readOnly />
                            </div>
                            <div className="gst-form-group">
                                <label>Password</label>
                                <input type="password" value="••••••••••••" readOnly />
                            </div>
                            <div className="gst-form-group captcha-group">
                                <span className="captcha-box">9 R K 2 L</span>
                                <input type="text" value="9RK2L" readOnly />
                            </div>
                            <button className="gst-btn gst-btn-blue">Login</button>
                        </div>
                        <div className="gst-cursor-simulation cursor-login" />
                    </div>
                );
            case 'documents_requested':
                return (
                    <div className="gst-portal-screen screen-dashboard">
                        <div className="gst-portal-header-bar">
                            <span className="gst-logo-text">GOODS AND SERVICES TAX</span>
                            <span className="welcome-text">Welcome, MAYA INFRA PRIVATE LTD</span>
                        </div>
                        <div className="gst-portal-content-body">
                            <h4>File Returns Dashboard</h4>
                            <div className="dashboard-inputs">
                                <div className="gst-form-group">
                                    <label>Financial Year</label>
                                    <select disabled><option>2025-26</option></select>
                                </div>
                                <div className="gst-form-group">
                                    <label>Filing Period</label>
                                    <select disabled><option>{task.period || 'July 2025'}</option></select>
                                </div>
                                <button className="gst-btn gst-btn-blue">Search</button>
                            </div>
                            <div className="returns-grid">
                                <div className="return-card active">
                                    <h5>Details of outward supplies (GSTR-1)</h5>
                                    <p>Due Date: 11th of next month</p>
                                    <button className="gst-btn gst-btn-orange">Prepare Online</button>
                                </div>
                            </div>
                        </div>
                        <div className="gst-cursor-simulation cursor-dashboard" />
                    </div>
                );
            case 'documents_received':
            case 'prepared':
                return (
                    <div className="gst-portal-screen screen-upload">
                        <div className="gst-portal-header-bar">
                            <span className="gst-logo-text">GSTR-1 Return Filing</span>
                            <span className="welcome-text">Period: {task.period || 'July 2025'}</span>
                        </div>
                        <div className="gst-portal-content-body">
                            <h4>Upload B2B and B2C Invoices</h4>
                            <div className="upload-box-simulated">
                                <span className="upload-icon">📤</span>
                                <p>Outward_Supplies_Register.xlsx</p>
                                <span className="upload-status-text">Uploading and parsing invoice entries (24 records found)...</span>
                                <div className="upload-bar-container">
                                    <div className="upload-bar-fill" />
                                </div>
                            </div>
                            <div className="uploaded-tables-mock">
                                <div className="table-header">Table 4A - B2B Supplies</div>
                                <div className="table-row">1. 27AAACR5055K1Z5 | Ramesh Kumar | ₹1,24,000</div>
                                <div className="table-row">2. 27AABCM8291M1Z3 | Surendra Singh | ₹85,500</div>
                            </div>
                        </div>
                    </div>
                );
            case 'pending_authorization':
                return (
                    <div className="gst-portal-screen screen-verify">
                        <div className="gst-portal-header-bar">
                            <span className="gst-logo-text">GSTR-1 Return summary</span>
                            <span className="welcome-text">Period: {task.period || 'July 2025'}</span>
                        </div>
                        <div className="gst-portal-content-body">
                            <h4>Reconciliation & Summary Validation</h4>
                            <div className="summary-cards">
                                <div className="sum-card">
                                    <h6>Total Taxable Value</h6>
                                    <p>₹2,09,500.00</p>
                                </div>
                                <div className="sum-card">
                                    <h6>IGST Liability</h6>
                                    <p>₹18,900.00</p>
                                </div>
                                <div className="sum-card text-purple">
                                    <h6>CGST + SGST</h6>
                                    <p>₹18,855.00</p>
                                </div>
                            </div>
                            <div className="summary-actions">
                                <button className="gst-btn gst-btn-blue">Verify & Proceed</button>
                            </div>
                        </div>
                        <div className="gst-cursor-simulation cursor-verify" />
                    </div>
                );
            case 'filed':
                return (
                    <div className="gst-portal-screen screen-file">
                        <div className="gst-portal-header-bar">
                            <span className="gst-logo-text">Verify Return Submission</span>
                            <span className="welcome-text">Period: {task.period || 'July 2025'}</span>
                        </div>
                        <div className="gst-portal-content-body">
                            <h4>Filing Verification (OTP)</h4>
                            <div className="otp-modal-simulated">
                                <h6>Enter OTP sent to registered mobile number (••••• 9210)</h6>
                                <input type="text" value="4 9 1 0 2 8" readOnly />
                                <button className="gst-btn gst-btn-green">Verify & File</button>
                            </div>
                        </div>
                        <div className="gst-cursor-simulation cursor-file" />
                    </div>
                );
            case 'confirmation_sent':
                return (
                    <div className="gst-portal-screen screen-success">
                        <div className="gst-portal-header-bar">
                            <span className="gst-logo-text">Filing Status Success</span>
                            <span className="welcome-text">Period: {task.period || 'July 2025'}</span>
                        </div>
                        <div className="gst-portal-content-body success-body">
                            <span className="success-stamp">FILED</span>
                            <h3>Return Submitted Successfully!</h3>
                            <p className="arn-text">Acknowledgment Reference Number (ARN): GST-ARN-8827182901</p>
                            <p className="notif-text">Filing confirmation notification sent to Ramesh Kumar via WhatsApp.</p>
                            <div className="whatsapp-mockup">
                                <div className="wa-header">WhatsApp Notifier</div>
                                <div className="wa-message">
                                    Namaste Ramesh Kumar ji! Your GSTR-1 return for period {task.period || 'July 2025'} has been successfully filed by Neha. ARN: GST-ARN-8827182901. Thank you.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="gst-portal-screen screen-idle">
                        <Bot size={40} />
                        <p>No active steps</p>
                    </div>
                );
        }
    };

    return (
        <div className="neha-dashboard">
            {/* ── Header ── */}
            <div className="neha-header">
                <div className="neha-header-left">
                    <div className="neha-avatar">
                        <Bot size={32} />
                    </div>
                    <div>
                        <h1>Neha Orchestration Platform</h1>
                        <p>AI Digital Accountant — Real-time Activity Monitor</p>
                    </div>
                </div>
                <div className="neha-header-right">
                    <div className={`neha-live-badge ${connected ? 'live' : 'offline'}`}>
                        <span className="neha-live-dot" />
                        {connected ? 'LIVE' : 'OFFLINE'}
                    </div>
                    <button 
                        className="neha-trigger-btn" 
                        onClick={handleTriggerDemo} 
                        disabled={triggeringDemo}
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                            opacity: triggeringDemo ? 0.7 : 1,
                            transition: 'all 0.2s',
                            marginRight: '8px'
                        }}
                    >
                        <Zap size={16} className={triggeringDemo ? 'spinning' : ''} />
                        {triggeringDemo ? 'Triggering...' : 'Trigger Test Filing'}
                    </button>
                    <button className="neha-refresh-btn" onClick={fetchAll} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="neha-kpi-grid">
                <KPICard
                    icon={FileText}
                    label="Total Filings"
                    value={stats?.filings?.total_filings || '0'}
                    sub={`${stats?.filings?.filed || '0'} filed · ${stats?.filings?.in_progress || '0'} in progress`}
                    color="#f59e0b"
                />
                <KPICard
                    icon={Brain}
                    label="Reasoning Turns"
                    value={stats?.turns?.total_turns || '0'}
                    sub={`avg ${Math.round(Number(stats?.turns?.avg_latency_ms) || 0)}ms latency`}
                    color="#8b5cf6"
                />
                <KPICard
                    icon={AlertTriangle}
                    label="Handoffs"
                    value={stats?.handoffs?.total_handoffs || '0'}
                    sub={`${stats?.handoffs?.pending || '0'} pending · ${stats?.handoffs?.resolved || '0'} resolved`}
                    color="#ef4444"
                />
                <KPICard
                    icon={Clock}
                    label="Avg Reasoning"
                    value={`${Math.round(Number(stats?.turns?.avg_reasoning_ms) || 0)}ms`}
                    sub={`max ${Math.round(Number(stats?.turns?.max_latency_ms) || 0)}ms`}
                    color="#10b981"
                />
            </div>

            {/* ── Main Grid: Live Activity + Reasoning Stream ── */}
            <div className="neha-main-grid">
                {/* Live Activity Panel */}
                <div className="neha-panel neha-live-panel">
                    <div className="neha-panel-header">
                        <Activity size={18} />
                        <h2>Live Activity</h2>
                        <span className="neha-event-count">{liveEvents.length} events</span>
                    </div>
                    <div className="neha-live-stream">
                        {liveEvents.length === 0 ? (
                            <div className="neha-empty">
                                <Radio size={40} />
                                <p>Waiting for Neha activity…</p>
                                <span>Run a replay or place a call to see live events</span>
                            </div>
                        ) : (
                            liveEvents.map((evt, i) => {
                                const meta = EVENT_META[evt.type] || { label: evt.type, color: '#6b7280', icon: CircleDot };
                                const Icon = meta.icon;
                                return (
                                    <div key={i} className="neha-live-event" style={{ borderLeftColor: meta.color }}>
                                        <div className="neha-event-icon" style={{ color: meta.color }}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="neha-event-body">
                                            <div className="neha-event-top">
                                                <span className="neha-event-type">{meta.label}</span>
                                                <span className="neha-event-time">
                                                    {new Date(evt.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="neha-event-detail">
                                                {evt.caller_name && <span>👤 {evt.caller_name} </span>}
                                                {evt.channel && <span>📡 {evt.channel} </span>}
                                                {evt.turn_number !== undefined && <span>🔄 Turn {evt.turn_number} </span>}
                                                {evt.action && <span>⚡ {evt.action} </span>}
                                                {evt.filing_type && <span>📄 {evt.filing_type} </span>}
                                                {evt.handoff_target && <span>🤝 → {evt.handoff_target} </span>}
                                                {evt.latency_ms !== undefined && <span>⏱ {evt.latency_ms}ms</span>}
                                            </div>
                                            {evt.response_text && (
                                                <div className="neha-event-response">
                                                    "{evt.response_text.slice(0, 120)}{evt.response_text.length > 120 ? '…' : ''}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Reasoning Stream */}
                <div className="neha-panel neha-reasoning-panel">
                    <div className="neha-panel-header">
                        <Brain size={18} />
                        <h2>Reasoning Stream</h2>
                    </div>
                    <div className="neha-reasoning-list">
                        {reasoningFeed.length === 0 ? (
                            <div className="neha-empty">
                                <Brain size={40} />
                                <p>No reasoning logs yet</p>
                            </div>
                        ) : (
                            reasoningFeed.map((item) => (
                                <div key={item.id} className="neha-reasoning-item">
                                    <div className="neha-reasoning-top">
                                        <span className="neha-turn-badge">Turn {item.turn_number}</span>
                                        {item.action && <span className="neha-action-tag">{item.action}</span>}
                                        {item.intent && <span className="neha-intent-tag">{item.intent}</span>}
                                        {item.emotion && <span className="neha-emotion-tag">{item.emotion}</span>}
                                        <span className="neha-reasoning-time">
                                            {new Date(item.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="neha-reasoning-input">
                                        📞 "{(item.user_input || '').slice(0, 100)}{(item.user_input || '').length > 100 ? '…' : ''}"
                                    </div>
                                    {item.response_given && (
                                        <div className="neha-reasoning-response">
                                            🤖 "{(item.response_given || '').slice(0, 100)}{(item.response_given || '').length > 100 ? '…' : ''}"
                                        </div>
                                    )}
                                    <div className="neha-reasoning-meta">
                                        {item.latency_ms && <span>⏱ {item.latency_ms}ms</span>}
                                        {item.reasoning_ms && <span>🧠 {item.reasoning_ms}ms</span>}
                                        {item.next_goal && <span>🎯 {item.next_goal}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Filings Kanban ── */}
            <div className="neha-panel neha-kanban-panel">
                <div className="neha-panel-header">
                    <FileText size={18} />
                    <h2>Filings Kanban</h2>
                    <span className="neha-event-count">{filings.length} total</span>
                </div>
                <div className="neha-kanban-board">
                    {FILING_STATUS_ORDER.map(status => {
                        const items = filingsKanban[status] || [];
                        if (items.length === 0 && !['draft', 'documents_requested', 'filed'].includes(status)) return null;
                        return (
                            <div key={status} className="neha-kanban-column">
                                <div className="neha-kanban-col-header" style={{ borderTopColor: STATUS_COLORS[status] }}>
                                    <span>{status.replace(/_/g, ' ')}</span>
                                    <span className="neha-kanban-count">{items.length}</span>
                                </div>
                                <div className="neha-kanban-cards">
                                    {items.map(f => (
                                        <div key={f.id} className="neha-filing-card">
                                            <div className="neha-filing-type">
                                                <span className="neha-filing-badge" style={{ background: STATUS_COLORS[f.status] }}>
                                                    {f.filing_type.toUpperCase()}
                                                </span>
                                                {f.gst_return_type && <span className="neha-gst-type">{f.gst_return_type}</span>}
                                            </div>
                                            {f.period && <div className="neha-filing-period">📅 {f.period}</div>}
                                            <div className="neha-filing-docs">
                                                📋 {f.collected_documents?.length || 0}/{f.required_documents?.length || 0} docs
                                            </div>
                                            <div className="neha-filing-time">
                                                {new Date(f.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Bottom Grid: Handoffs + Live Calls ── */}
            <div className="neha-bottom-grid">
                {/* Handoff Feed */}
                <div className="neha-panel neha-handoff-panel">
                    <div className="neha-panel-header">
                        <AlertTriangle size={18} />
                        <h2>Handoff Feed</h2>
                    </div>
                    <div className="neha-handoff-list">
                        {handoffs.length === 0 ? (
                            <div className="neha-empty">
                                <AlertTriangle size={40} />
                                <p>No handoffs yet</p>
                            </div>
                        ) : (
                            handoffs.map(h => (
                                <div key={h.id} className="neha-handoff-item">
                                    <div className="neha-handoff-top">
                                        <span className="neha-handoff-type">{h.escalation_type}</span>
                                        <span className={`neha-handoff-status ${h.status}`}>{h.status}</span>
                                    </div>
                                    <div className="neha-handoff-reason">{h.trigger_reason}</div>
                                    <div className="neha-handoff-time">
                                        {new Date(h.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Live Calls */}
                <div className="neha-panel neha-calls-panel">
                    <div className="neha-panel-header">
                        <PhoneCall size={18} />
                        <h2>Live Calls</h2>
                    </div>
                    <div className="neha-calls-list">
                        {liveCalls.length === 0 ? (
                            <div className="neha-empty">
                                <PhoneCall size={40} />
                                <p>No active calls</p>
                            </div>
                        ) : (
                            liveCalls.map(c => (
                                <div key={c.id} className="neha-call-item">
                                    <div className="neha-call-top">
                                        <span className="neha-call-channel">{c.channel}</span>
                                        <span className="neha-call-turns">{c.reasoning_turns || 0} turns</span>
                                    </div>
                                    {c.language && <div className="neha-call-lang">🌐 {c.language}</div>}
                                    {c.current_goal && <div className="neha-call-goal">🎯 {c.current_goal}</div>}
                                    {c.next_action && <div className="neha-call-action">⚡ {c.next_action}</div>}
                                    <div className="neha-call-time">
                                        {new Date(c.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Action Distribution ── */}
            {stats?.action_distribution && stats.action_distribution.length > 0 && (
                <div className="neha-panel neha-action-dist">
                    <div className="neha-panel-header">
                        <TrendingUp size={18} />
                        <h2>Action Distribution (7 days)</h2>
                    </div>
                    <div className="neha-dist-bars">
                        {stats.action_distribution.map(a => {
                            const max = Math.max(...stats.action_distribution.map(x => Number(x.count)));
                            const pct = max > 0 ? (Number(a.count) / max) * 100 : 0;
                            return (
                                <div key={a.action} className="neha-dist-row">
                                    <span className="neha-dist-label">{a.action || 'none'}</span>
                                    <div className="neha-dist-bar-track">
                                        <div className="neha-dist-bar-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="neha-dist-count">{a.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Visual Filing Playboard & Queue Manager ── */}
            <div className="neha-panel neha-playboard-panel">
                <div className="neha-panel-header">
                    <Activity size={18} />
                    <h2>Visual Playboard & Filing Queue</h2>
                </div>
                <div className="neha-playboard-content">
                    {/* Left: Simulated Browser Playboard */}
                    <div className="neha-browser-mockup">
                        <div className="neha-browser-header">
                            <div className="neha-browser-dots">
                                <span className="dot red" />
                                <span className="dot yellow" />
                                <span className="dot green" />
                            </div>
                            <div className="neha-browser-address-bar">
                                <span className="lock-icon">🔒</span>
                                <span className="address-url">
                                    {activeTask 
                                        ? 'https://services.gst.gov.in/services/login' 
                                        : 'https://www.gst.gov.in'}
                                </span>
                            </div>
                        </div>
                        <div className="neha-browser-body">
                            {activeTask ? (
                                <div className="neha-browser-split">
                                    {/* Left: Interactive GST Portal Screen View */}
                                    <div className="neha-gst-screen-container">
                                        {renderGstPortalScreen(activeTask)}
                                    </div>

                                    {/* Right: Step-by-step checklist overlay */}
                                    <div className="neha-playboard-steps-container">
                                        <div className="neha-active-task-meta">
                                            <span className="task-badge">ACTIVE FILING</span>
                                            <h3>GST {activeTask.gst_return_type || 'Filing'}</h3>
                                            <p>Period: {activeTask.period || 'this month'} | ID: {activeTask.id.slice(0, 8)}...</p>
                                        </div>
                                        <div className="neha-playboard-steps">
                                            {PLAYBOARD_STEPS.map((step, idx) => {
                                                const stepStatus = (activeTask.status || '').toLowerCase();
                                                const stepIndex = PLAYBOARD_STEPS.findIndex(s => s.statusKey === stepStatus);
                                                const isActive = idx === (stepIndex === -1 ? 0 : stepIndex);
                                                const isDone = idx < (stepIndex === -1 ? 0 : stepIndex);
                                                
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={`neha-playboard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                                                    >
                                                        <div className="step-indicator">
                                                            {isDone ? (
                                                                <CheckCircle2 size={14} className="step-icon-done" />
                                                            ) : isActive ? (
                                                                <span className="step-icon-active-pulse" />
                                                            ) : (
                                                                <span className="step-icon-pending" />
                                                            )}
                                                        </div>
                                                        <div className="step-text">
                                                            <span className="step-label">{step.label}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Progress percentage */}
                                        {(() => {
                                            const currentIdx = PLAYBOARD_STEPS.findIndex(s => s.statusKey === (activeTask.status || '').toLowerCase());
                                            const pct = Math.round((((currentIdx === -1 ? 0 : currentIdx) + 1) / PLAYBOARD_STEPS.length) * 100);
                                            return (
                                                <div className="neha-playboard-progress-section">
                                                    <div className="progress-bar-container">
                                                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="progress-pct">{pct}% Complete</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="neha-browser-idle">
                                    <Bot size={48} className="idle-bot-icon" />
                                    <h3>System Idle</h3>
                                    <p>Awaiting next filing task in the queue...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Filing Queue list */}
                    <div className="neha-queue-container">
                        <h3>Filing Queue ({queueTasks.length} waiting)</h3>
                        <div className="neha-queue-list">
                            {queueTasks.length === 0 ? (
                                <div className="neha-queue-empty">
                                    <CheckCircle2 size={32} />
                                    <p>All tasks completed! Neha is caught up.</p>
                                </div>
                            ) : (
                                queueTasks.map((t, idx) => (
                                    <div key={t.id} className="neha-queue-item">
                                        <div className="queue-badge">#{idx + 1}</div>
                                        <div className="queue-item-details">
                                            <h4>GST {t.gst_return_type || 'Filing'}</h4>
                                            <p>Period: {t.period || 'current month'}</p>
                                        </div>
                                        <span className="queue-status-waiting">Waiting</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  KPI Card Sub-component
// ═══════════════════════════════════════════════════════════════════
function KPICard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: any; sub?: string; color: string;
}) {
    return (
        <div className="neha-kpi-card" style={{ borderTopColor: color }}>
            <div className="neha-kpi-icon" style={{ color }}>
                <Icon size={24} />
            </div>
            <div className="neha-kpi-body">
                <div className="neha-kpi-value">{value}</div>
                <div className="neha-kpi-label">{label}</div>
                {sub && <div className="neha-kpi-sub">{sub}</div>}
            </div>
        </div>
    );
}
