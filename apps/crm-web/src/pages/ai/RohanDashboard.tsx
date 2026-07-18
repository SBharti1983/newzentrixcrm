/**
 * RohanDashboard — AI Twin Monitoring Dashboard
 * 
 * Allows Human Rohan (and admins/managers) to:
 * - See AI Rohan's live stats and performance
 * - Compare Human vs AI metrics side-by-side
 * - Review and rate AI conversations
 * - Coach AI Rohan with teaching examples
 * - Monitor reasoning feed in real-time
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Bot, Activity, PhoneCall, MessageSquare, Target,
    AlertTriangle, Clock, Brain, ThumbsUp, ThumbsDown,
    Minus, GraduationCap, TrendingUp, Zap, Shield,
    Users, BarChart3, Send, ChevronDown, ChevronRight,
    RefreshCw
} from 'lucide-react';
import { BASE_URL, getToken } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import './RohanDashboard.css';

const CATEGORIES = [
    'greeting', 'qualifying', 'pricing', 'objection_handling',
    'site_visit_pitch', 'discount_handling', 'closing',
    'follow_up', 'competition_comparison', 'tone', 'other'
];

const CATEGORY_LABELS: Record<string, string> = {
    greeting: '👋 Greeting',
    qualifying: '🎯 Qualifying',
    pricing: '💰 Pricing',
    objection_handling: '🛡️ Objection Handling',
    site_visit_pitch: '🏠 Site Visit Pitch',
    discount_handling: '🏷️ Discount Handling',
    closing: '🤝 Closing',
    follow_up: '📞 Follow-up',
    competition_comparison: '⚔️ Competition',
    tone: '🗣️ Tone & Style',
    other: '📝 Other',
};

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

// ═══════════════════════════════════════════════════════════════════
//  DUMMY DEMO DATA
// ═══════════════════════════════════════════════════════════════════
const NEHA_MOCK = {
    stats: {
        persona: { employee_name: 'Neha Sharma', role: 'AI Accountant', employee_code: 'ZEN-AI-002' },
        online: true,
        accuracy: { percent: 96, total_ratings: 24 },
        today: { calls_inbound: 5, calls_outbound: 2, whatsapp_msgs: 82, leads_qualified: 18, escalations: 1 },
        reasoning: { avg_latency_ms: 280 }
    },
    twinData: {
        period_days: 7,
        ai: {
            stats: { total_interactions: 94, calls: 7, whatsapp: 87, leads_contacted: 22, followups_completed: 18, qualification_rate: 92 }
        },
        human_average: {
            stats: { total_interactions: 78, calls: 15, whatsapp: 63, leads_contacted: 18, followups_completed: 15, qualification_rate: 88 }
        }
    },
    reasoningFeed: [
        { id: 'n1', timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), lead_name: 'Rahul Singh', sentiment: 'Positive', action: 'Invoiced', reasoning: 'Detected booking shortfall of ₹42,000. Generated payment notification for second installment.', message: 'Hi Rahul! Your second instalment invoice #INV-4921 has been generated. Please find the payment details attached: zntx.co/pay-4921' },
        { id: 'n2', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), lead_name: 'Khushiram Singh', sentiment: 'Neutral', action: 'Receipt Issued', reasoning: 'Received confirmation of payment for ₹1,20,000. Reconciling with bank feed.', message: 'Hi Khushiram, we have received your payment of ₹1,20,000. Here is your digital receipt: zntx.co/rec-2849. Thank you!' },
        { id: 'n3', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), lead_name: 'Dileep Yadav', sentiment: 'Neutral', action: 'Objection Handled', reasoning: 'Lead requested waiver of late payment penalty. Checked policy: waiver requires manager approval. Flagging escalation.', message: 'Dileep ji, late payment penalty waiver policy ke rules follow karne honge. Main accounts manager se approve karake aapse contact karti hoon.' }
    ],
    coachingGaps: [
        { category: 'pricing', match_percent: 94, total_reviewed: 12, teaching_examples: 4 },
        { category: 'discount_handling', match_percent: 88, total_reviewed: 8, teaching_examples: 3 },
        { category: 'other', match_percent: 62, total_reviewed: 4, teaching_examples: 1 }
    ]
};

const MONIKA_MOCK = {
    stats: {
        persona: { employee_name: 'Monika Kapoor', role: 'AI Receptionist', employee_code: 'ZEN-AI-003' },
        online: true,
        accuracy: { percent: 98, total_ratings: 36 },
        today: { calls_inbound: 42, calls_outbound: 0, whatsapp_msgs: 14, leads_qualified: 38, escalations: 0 },
        reasoning: { avg_latency_ms: 190 }
    },
    twinData: {
        period_days: 7,
        ai: {
            stats: { total_interactions: 284, calls: 242, whatsapp: 42, leads_contacted: 218, followups_completed: 0, qualification_rate: 98 }
        },
        human_average: {
            stats: { total_interactions: 210, calls: 185, whatsapp: 25, leads_contacted: 154, followups_completed: 0, qualification_rate: 94 }
        }
    },
    reasoningFeed: [
        { id: 'm1', timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(), lead_name: 'Dipak Goyal', sentiment: 'Neutral', action: 'Routed Call', reasoning: 'Caller asked to connect to sales head Surendra. Extension lookup: Ext 104. Initiating warm transfer.', message: 'Bilkul Dipak ji, main aapki call Sales Head Surendra ji se connect kar rahi hoon. Ek minute line pe baniye.' },
        { id: 'm2', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), lead_name: 'Neha Vig', sentiment: 'Positive', action: 'Info Shared', reasoning: 'Inbound caller requested corporate office address and Google Maps directions link.', message: 'Yes, here is our corporate office address: Maya Infratech, Sector 62, Noida. Sending the Google maps link: maps.google.com/zentrix' },
        { id: 'm3', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), lead_name: 'Manya Mishra', sentiment: 'Neutral', action: 'Routed Call', reasoning: 'Caller requesting booking status updates. Directing to accounts department (Neha Sharma).', message: 'Main aapki call Accounts Department mein transfer kar deti hoon, wo aapko booking status detail mein bata denge.' }
    ],
    coachingGaps: [
        { category: 'greeting', match_percent: 99, total_reviewed: 18, teaching_examples: 6 },
        { category: 'qualifying', match_percent: 96, total_reviewed: 14, teaching_examples: 4 },
        { category: 'other', match_percent: 85, total_reviewed: 4, teaching_examples: 2 }
    ]
};

export default function RohanDashboard() {
    const { showToast } = useToast();
    const [selectedEmployee, setSelectedEmployee] = useState<string>('rohan');
    const [stats, setStats] = useState<any>(null);
    const [twinData, setTwinData] = useState<any>(null);
    const [reasoningFeed, setReasoningFeed] = useState<any[]>([]);
    const [coachingGaps, setCoachingGaps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        if (selectedEmployee !== 'rohan') {
            const mock = selectedEmployee === 'neha' ? NEHA_MOCK : MONIKA_MOCK;
            setStats(mock.stats);
            setTwinData(mock.twinData);
            setReasoningFeed(mock.reasoningFeed);
            setCoachingGaps(mock.coachingGaps);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [statsRes, twinRes, feedRes, gapsRes] = await Promise.all([
                apiFetch('/v1/ai/dashboard/live-stats'),
                apiFetch('/v1/ai/dashboard/twin-comparison?days=7'),
                apiFetch('/v1/ai/dashboard/reasoning-feed?limit=20'),
                apiFetch('/v1/ai/dashboard/coaching-gaps'),
            ]);
            setStats(statsRes);
            setTwinData(twinRes);
            setReasoningFeed(feedRes.items || []);
            setCoachingGaps(gapsRes || []);
        } catch (err) {
            console.error('[RohanDashboard] Error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedEmployee]);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 3600000); // Refresh every 1 hour
        return () => clearInterval(interval);
    }, [fetchAll]);

    if (loading) {
        return (
            <div className="rohan-dashboard">
                <div className="rohan-empty" style={{ minHeight: '60vh' }}>
                    <div className="empty-icon"><Bot size={48} /></div>
                    <p>Loading AI Rohan Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rohan-dashboard">
            {/* ── Header ──────────────────────────────────────── */}
            <div className="rohan-header">
                <div className="rohan-header-left">
                    <div className="rohan-avatar">🤖</div>
                    <div className="rohan-header-info">
                        <h1>{stats?.persona?.employee_name || 'Rohan Mishra'} — AI Twin</h1>
                        <p>{stats?.persona?.role || 'Senior Sales Associate'} · {stats?.persona?.employee_code || 'ZEN-AI-001'}</p>
                    </div>
                </div>
                <div className="rohan-header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className={`rohan-status-badge ${stats?.online ? 'online' : 'offline'}`}>
                        <span className="status-dot" />
                        {stats?.online ? 'Online' : 'Offline'}
                    </div>
                </div>
            </div>

            {/* ── Scorecard Grid ──────────────────────────────── */}
            <div className="rohan-scorecard-grid">
                <ScorecardItem
                    label="AI Accuracy"
                    value={stats?.accuracy?.percent != null ? `${stats.accuracy.percent}%` : '—'}
                    accent="accent-indigo"
                    sub={`${stats?.accuracy?.total_ratings || 0} ratings`}
                />
                <ScorecardItem
                    label="Calls Today"
                    value={(stats?.today?.calls_inbound || 0) + (stats?.today?.calls_outbound || 0)}
                    accent="accent-cyan"
                    sub={`${stats?.today?.calls_inbound || 0} in / ${stats?.today?.calls_outbound || 0} out`}
                />
                <ScorecardItem
                    label="WhatsApp"
                    value={stats?.today?.whatsapp_msgs || 0}
                    accent="accent-emerald"
                    sub="messages today"
                />
                <ScorecardItem
                    label="Qualified"
                    value={stats?.today?.leads_qualified || 0}
                    accent="accent-violet"
                    sub="leads qualified"
                />
                <ScorecardItem
                    label="Escalations"
                    value={stats?.today?.escalations || 0}
                    accent={stats?.today?.escalations > 0 ? 'accent-amber' : 'accent-emerald'}
                    sub="pending"
                />
                <ScorecardItem
                    label="Avg Latency"
                    value={stats?.reasoning?.avg_latency_ms ? `${stats.reasoning.avg_latency_ms}ms` : '—'}
                    accent="accent-cyan"
                    sub="response time"
                />
            </div>

            {/* ── Twin Comparison ─────────────────────────────── */}
            <TwinComparison data={twinData} />

            {/* ── Panels Grid ─────────────────────────────────── */}
            <div className="rohan-panels-grid">
                <ReasoningFeedPanel items={reasoningFeed} onRefresh={fetchAll} />
                <ConversationReviewerPanel onFeedbackSent={fetchAll} showToast={showToast} />
                <CoachingPanel gaps={coachingGaps} showToast={showToast} />
                <TeachingPanel showToast={showToast} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// Sub-Components
// ══════════════════════════════════════════════════════════════════

function ScorecardItem({ label, value, accent, sub }: { label: string; value: any; accent: string; sub?: string }) {
    return (
        <div className="scorecard-item">
            <div className="sc-label">{label}</div>
            <div className={`sc-value ${accent}`}>{value}</div>
            {sub && <div className="sc-label" style={{ marginTop: 4, fontSize: '0.7rem' }}>{sub}</div>}
        </div>
    );
}

function TwinComparison({ data }: { data: any }) {
    if (!data) return null;

    const ai = data.ai?.stats || {};
    const human = data.human_average?.stats || {};

    const rows = [
        { label: 'Total Interactions', ai: ai.total_interactions, human: human.total_interactions },
        { label: 'Calls Made', ai: ai.calls, human: human.calls },
        { label: 'WhatsApp Messages', ai: ai.whatsapp, human: human.whatsapp },
        { label: 'Leads Contacted', ai: ai.leads_contacted, human: human.leads_contacted },
        { label: 'Follow-ups Done', ai: ai.followups_completed, human: human.followups_completed },
        { label: 'Qualification Rate', ai: `${ai.qualification_rate || 0}%`, human: `${human.qualification_rate || 0}%`, isPercent: true },
    ];

    function getMatch(aiVal: any, humanVal: any, isPercent?: boolean) {
        const a = typeof aiVal === 'string' ? parseInt(aiVal) : (aiVal || 0);
        const h = typeof humanVal === 'string' ? parseInt(humanVal) : (humanVal || 0);
        if (h === 0 && a === 0) return { label: '—', cls: 'good' };
        if (h === 0) return { label: `+${a}`, cls: 'good' };
        const ratio = isPercent ? (a / h) : (a / h);
        if (ratio >= 0.9) return { label: '✅', cls: 'good' };
        if (ratio >= 0.6) return { label: '⚠️', cls: 'warning' };
        return { label: '🔴', cls: 'poor' };
    }

    return (
        <div className="twin-comparison">
            <h3><Users size={18} /> Human vs AI — Last {data.period_days} Days</h3>
            <table className="twin-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>👤 Human Avg ({data.human_average?.agents || 0} agents)</th>
                        <th>🤖 AI Rohan</th>
                        <th>Match</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => {
                        const match = getMatch(r.ai, r.human, r.isPercent);
                        return (
                            <tr key={r.label}>
                                <td>{r.label}</td>
                                <td>{r.human}</td>
                                <td style={{ color: 'var(--accent-indigo)', fontWeight: 800 }}>{r.ai}</td>
                                <td><span className={`match-badge ${match.cls}`}>{match.label}</span></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
                <span style={{
                    padding: '6px 20px', borderRadius: 100, fontWeight: 800, fontSize: '0.85rem',
                    background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)'
                }}>
                    Twin Score: {data.match_score || 0}/100
                </span>
            </div>
        </div>
    );
}

function ReasoningFeedPanel({ items, onRefresh }: { items: any[]; onRefresh: () => void }) {
    return (
        <div className="rohan-panel">
            <h3>
                <span className="panel-icon"><Brain size={18} /></span>
                Reasoning Feed
                <button onClick={onRefresh} className="feedback-btn" style={{ marginLeft: 'auto', padding: '4px 8px' }}>
                    <RefreshCw size={14} />
                </button>
            </h3>
            {items.length === 0 ? (
                <div className="rohan-empty">
                    <div className="empty-icon">🧠</div>
                    <p>No reasoning data yet. AI Rohan will show thinking logs here once conversations start.</p>
                </div>
            ) : (
                <div className="reasoning-feed">
                    {items.map(item => {
                        const output = item.reasoning_output || {};
                        const emotion = output.emotion_label || output.emotion || '';
                        const emotionClass = emotion.includes('positive') || emotion.includes('interest')
                            ? 'emotion-positive'
                            : emotion.includes('negative') || emotion.includes('angry')
                                ? 'emotion-negative'
                                : 'emotion-neutral';

                        return (
                            <div key={item.id} className={`reasoning-item ${emotionClass}`}>
                                <div className="reasoning-header">
                                    <span className="reasoning-lead-name">
                                        {item.lead_name || 'Unknown Lead'}
                                    </span>
                                    <span className="reasoning-time">
                                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="reasoning-tags">
                                    {output.intent && <span className="reasoning-tag intent">{output.intent}</span>}
                                    {emotion && <span className="reasoning-tag emotion">{emotion}</span>}
                                    {output.action && <span className="reasoning-tag">{output.action}</span>}
                                    {output.escalation && <span className="reasoning-tag escalation">⚠️ {output.escalation}</span>}
                                    {item.latency_ms && <span className="reasoning-tag">{item.latency_ms}ms</span>}
                                </div>
                                {item.response_given && (
                                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                        "{item.response_given.substring(0, 120)}{item.response_given.length > 120 ? '...' : ''}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ConversationReviewerPanel({ onFeedbackSent, showToast }: { onFeedbackSent: () => void; showToast: any }) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedRating, setSelectedRating] = useState<Record<string, string>>({});
    const [corrections, setCorrections] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);

    useEffect(() => {
        apiFetch('/v1/ai/dashboard/reasoning-feed?limit=10')
            .then(data => setConversations(data.items || []))
            .catch(() => {});
    }, []);

    const submitFeedback = async (item: any) => {
        const rating = selectedRating[item.id];
        if (!rating) return;
        setSubmitting(item.id);
        try {
            await apiFetch('/v1/ai/dashboard/feedback', {
                method: 'POST',
                body: {
                    reasoning_log_id: item.id,
                    lead_id: item.lead_id,
                    rating,
                    correction: corrections[item.id] || null,
                    correction_category: categories[item.id] || null,
                    ai_response: item.response_given,
                    human_response: corrections[item.id] || null,
                },
            });
            showToast('Feedback saved! AI Rohan will learn from this.', 'success');
            onFeedbackSent();
        } catch {
            showToast('Failed to save feedback', 'error');
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="rohan-panel">
            <h3><span className="panel-icon"><ThumbsUp size={18} /></span> Review & Rate AI Conversations</h3>
            {conversations.length === 0 ? (
                <div className="rohan-empty">
                    <div className="empty-icon">🗣️</div>
                    <p>No conversations to review yet. When AI Rohan starts talking to leads, they'll appear here for your review.</p>
                </div>
            ) : (
                <div className="conversation-list">
                    {conversations.slice(0, 5).map(item => (
                        <div key={item.id} className="convo-card">
                            <div className="convo-header">
                                <span className="convo-lead">{item.lead_name || 'Lead'}</span>
                                <span className="convo-meta">
                                    {item.channel === 'voice' ? '🎙️' : '💬'} {item.channel} · Turn {item.turn_number}
                                </span>
                            </div>
                            <div className="convo-messages">
                                {item.user_input && (
                                    <div className="convo-msg">
                                        <span className="convo-msg-role">👤</span>
                                        <span>"{item.user_input}"</span>
                                    </div>
                                )}
                                {item.response_given && (
                                    <div className="convo-msg">
                                        <span className="convo-msg-role">🤖</span>
                                        <span>"{item.response_given}"</span>
                                    </div>
                                )}
                            </div>
                            <div className="feedback-actions">
                                <button
                                    className={`feedback-btn good ${selectedRating[item.id] === 'good' ? 'active' : ''}`}
                                    onClick={() => setSelectedRating(p => ({ ...p, [item.id]: 'good' }))}
                                >
                                    <ThumbsUp size={14} /> Good
                                </button>
                                <button
                                    className={`feedback-btn bad ${selectedRating[item.id] === 'bad' ? 'active' : ''}`}
                                    onClick={() => setSelectedRating(p => ({ ...p, [item.id]: 'bad' }))}
                                >
                                    <ThumbsDown size={14} /> Bad
                                </button>
                                <button
                                    className={`feedback-btn neutral ${selectedRating[item.id] === 'neutral' ? 'active' : ''}`}
                                    onClick={() => setSelectedRating(p => ({ ...p, [item.id]: 'neutral' }))}
                                >
                                    <Minus size={14} /> OK
                                </button>
                            </div>
                            {selectedRating[item.id] && (
                                <>
                                    <textarea
                                        className="correction-input"
                                        placeholder="How would YOU respond? (optional)"
                                        value={corrections[item.id] || ''}
                                        onChange={e => setCorrections(p => ({ ...p, [item.id]: e.target.value }))}
                                    />
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                                        <select
                                            value={categories[item.id] || ''}
                                            onChange={e => setCategories(p => ({ ...p, [item.id]: e.target.value }))}
                                            className="correction-input"
                                            style={{ minHeight: 'auto', padding: '6px 10px', flex: 1 }}
                                        >
                                            <option value="">Category...</option>
                                            {CATEGORIES.map(c => (
                                                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                                            ))}
                                        </select>
                                        <button
                                            className="correction-submit"
                                            onClick={() => submitFeedback(item)}
                                            disabled={submitting === item.id}
                                        >
                                            {submitting === item.id ? '...' : 'Submit'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CoachingPanel({ gaps, showToast }: { gaps: any[]; showToast: any }) {
    return (
        <div className="rohan-panel">
            <h3><span className="panel-icon"><GraduationCap size={18} /></span> Coaching Gaps</h3>
            {gaps.length === 0 ? (
                <div className="rohan-empty">
                    <div className="empty-icon">🎓</div>
                    <p>No coaching data yet. Start rating AI conversations above — patterns will appear here showing where AI Rohan needs your guidance.</p>
                </div>
            ) : (
                <div className="coaching-list">
                    {gaps.map(gap => {
                        const level = gap.match_percent >= 80 ? 'good' : gap.match_percent >= 50 ? 'warning' : 'poor';
                        return (
                            <div key={gap.category} className={`coaching-item ${level === 'good' ? 'good' : level === 'poor' ? 'poor' : ''}`}>
                                <div className="coaching-category">
                                    {CATEGORY_LABELS[gap.category] || gap.category}
                                </div>
                                <div className="coaching-match">
                                    {gap.match_percent}% match · {gap.total_reviewed} reviewed · {gap.teaching_examples} teaching examples
                                </div>
                                <div className="coaching-bar">
                                    <div
                                        className={`coaching-bar-fill ${level}`}
                                        style={{ width: `${gap.match_percent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function TeachingPanel({ showToast }: { showToast: any }) {
    const [category, setCategory] = useState('');
    const [scenario, setScenario] = useState('');
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const submitTeaching = async () => {
        if (!category || !scenario || !response) {
            showToast('Please fill all fields', 'warning');
            return;
        }
        setSubmitting(true);
        try {
            await apiFetch('/v1/ai/dashboard/teach', {
                method: 'POST',
                body: { category, scenario, human_response: response },
            });
            showToast('Teaching saved! AI Rohan will use this in future conversations.', 'success');
            setCategory('');
            setScenario('');
            setResponse('');
            setExpanded(false);
        } catch {
            showToast('Failed to save teaching', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rohan-panel">
            <h3>
                <span className="panel-icon"><GraduationCap size={18} /></span>
                Teach AI Rohan
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="feedback-btn"
                    style={{ marginLeft: 'auto', padding: '4px 10px' }}
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {expanded ? 'Collapse' : 'New Teaching'}
                </button>
            </h3>

            {!expanded ? (
                <div className="rohan-empty">
                    <div className="empty-icon">💡</div>
                    <p>Click "New Teaching" to teach AI Rohan how you'd handle specific scenarios — your style, your words.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="correction-input"
                        style={{ minHeight: 'auto', padding: '8px 12px' }}
                    >
                        <option value="">Select category...</option>
                        {CATEGORIES.map(c => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                        ))}
                    </select>

                    <textarea
                        className="correction-input"
                        placeholder="When does this happen? (e.g., 'Jab lead bole ki competitor mein sasta mil raha hai')"
                        value={scenario}
                        onChange={e => setScenario(e.target.value)}
                        style={{ minHeight: 70 }}
                    />

                    <textarea
                        className="correction-input"
                        placeholder="What should AI Rohan say? Write it exactly how YOU would say it."
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        style={{ minHeight: 90 }}
                    />

                    <button
                        className="correction-submit"
                        onClick={submitTeaching}
                        disabled={submitting || !category || !scenario || !response}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        <Send size={14} style={{ marginRight: 6 }} />
                        {submitting ? 'Saving...' : 'Save Teaching'}
                    </button>
                </div>
            )}
        </div>
    );
}
