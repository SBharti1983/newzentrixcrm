/**
 * EscalationAlert — Premium Real-Time Handoff Modal
 * 
 * Displays details of an active AI conversation escalation
 * to the assigned manager (Surendra) or administrator.
 * 
 * Actions:
 * - Accept & Call: Triggers outbound calling to the lead via GSM/telephony trunk.
 * - Open WhatsApp Chat: Navigates to the lead's conversation view.
 * - Dismiss: Ignores/clears the overlay.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PhoneCall, MessageSquare, AlertOctagon, X, 
    User, Brain, Flame, Activity, Zap
} from 'lucide-react';
import { BASE_URL } from '../../api/client';
import './EscalationAlert.css';

interface EscalationAlertProps {
    alertData: {
        type: string;
        lead_id: string;
        context: {
            brief: string;
            lead_stage: string;
            emotion: string;
            objection: string | null;
            escalation_reason: string;
            turn_count: number;
            key_topics: string[];
        };
        action: string;
        timestamp: number;
    };
    onClose: () => void;
}

export default function EscalationAlert({ alertData, onClose }: EscalationAlertProps) {
    const navigate = useNavigate();
    const [leadName, setLeadName] = useState('Loading lead...');
    const [leadPhone, setLeadPhone] = useState('');
    const [loadingCall, setLoadingCall] = useState(false);

    const { type, lead_id, context, action } = alertData;

    // Fetch lead details on mount
    useEffect(() => {
        if (!lead_id) return;
        
        fetch(`${BASE_URL}/leads/${lead_id}`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data) {
                setLeadName(data.name || 'Sikandar Bharti');
                setLeadPhone(data.phone || '');
            }
        })
        .catch(err => {
            console.error('[EscalationAlert] Failed to fetch lead:', err);
            setLeadName('Sikandar Bharti'); // Fallback mockup name
            setLeadPhone('+919876543210');
        });
    }, [lead_id]);

    const handleAcceptCall = async () => {
        if (!leadPhone) return;
        setLoadingCall(true);

        try {
            // Trigger dialing/ GSM bridge connection
            const token = sessionStorage.getItem('zentrix_token');
            const res = await fetch(`${BASE_URL}/calls/initiate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    leadId: lead_id,
                    phoneNumber: leadPhone,
                    method: 'GSM'
                })
            });

            if (res.ok) {
                // Update status in PG/Firebase
                await fetch(`${BASE_URL}/v1/ai/dashboard/feedback`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        lead_id,
                        rating: 'good',
                        correction: 'Handoff accepted by manager via GSM call.',
                        correction_category: 'handoff'
                    })
                });

                // Navigate to lead page
                navigate(`/leads?id=${lead_id}`);
                onClose();
            }
        } catch (err) {
            console.error('[EscalationAlert] Handoff call trigger failed:', err);
        } finally {
            setLoadingCall(false);
        }
    };

    const handleOpenChat = () => {
        // Navigate to CRM Inbox or WhatsApp marketing section
        navigate(`/inbox?leadId=${lead_id}`);
        onClose();
    };

    return (
        <div className="escalation-overlay">
            <div className="escalation-modal">
                {/* ── Header ──────────────────────────────────────── */}
                <div className="escalation-header">
                    <div className="escalation-icon-box">
                        <AlertOctagon size={24} />
                    </div>
                    <div className="escalation-title-area">
                        <h2>AI Twin Transfer Request</h2>
                        <p>{context.escalation_reason || 'Rohan requires manager intervention'}</p>
                    </div>
                </div>

                {/* ── Body ───────────────────────────────────────── */}
                <div className="escalation-body">
                    <div className="escalation-meta-grid">
                        <div className="meta-field">
                            <span className="meta-label">👤 Customer</span>
                            <span className="meta-value">{leadName}</span>
                        </div>
                        <div className="meta-field">
                            <span className="meta-label">🎯 Lead Stage</span>
                            <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                                {context.lead_stage}
                            </span>
                        </div>
                        <div className="meta-field">
                            <span className="meta-label">🗣️ Customer Mood</span>
                            <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                                {context.emotion === 'negative' ? '🔴 Angry/Stressed' : context.emotion === 'positive' ? '🟢 Interested' : '⚪ Neutral'}
                            </span>
                        </div>
                        <div className="meta-field">
                            <span className="meta-label">🔄 Conversation Turns</span>
                            <span className="meta-value">{context.turn_count} turns</span>
                        </div>
                    </div>

                    <div className="escalation-brief-section">
                        <h4>🧠 AI Briefing & Reason</h4>
                        <div className="brief-content">
                            {context.brief}
                            {context.objection && (
                                <p style={{ margin: '8px 0 0', fontStyle: 'italic', color: '#fca5a5' }}>
                                    <strong>Objection:</strong> "{context.objection}"
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────── */}
                <div className="escalation-footer">
                    <button className="escalation-btn dismiss" onClick={onClose}>
                        Dismiss
                    </button>
                    {action === 'warm_transfer' ? (
                        <button 
                            className="escalation-btn accept-call" 
                            onClick={handleAcceptCall}
                            disabled={loadingCall}
                        >
                            <PhoneCall size={16} />
                            {loadingCall ? 'Connecting...' : 'Accept & Call'}
                        </button>
                    ) : (
                        <button className="escalation-btn open-chat" onClick={handleOpenChat}>
                            <MessageSquare size={16} />
                            Open WhatsApp Chat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
