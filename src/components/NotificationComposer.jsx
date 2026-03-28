import { useState } from 'react';
import { TEMPLATES, CHANNELS, TEMPLATE_VARS } from '../data/notificationTemplates';
import { leadsApi, customersApi, notificationsApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { X, Send, ChevronDown, Smartphone, Mail, MessageSquare, Zap, Copy, Eye } from 'lucide-react';
import { useToast } from '../hooks/useToast';

// ─── Resolve template variables ─────────────────────────────────────────────
function resolveVars(text, vars) {
    if (!text) return '';
    return Object.entries(vars).reduce(
        (t, [k, v]) => t.replaceAll(k, v || k),
        text
    );
}

// ─── Channel Tab Button ─────────────────────────────────────────────────────
function ChannelBtn({ channel, active, onClick, disabled }) {
    const ch = CHANNELS[channel];
    return (
        <button
            onClick={() => !disabled && onClick(channel)}
            style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', border: 'none',
                borderRadius: 99, cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: '0.8rem',
                background: active ? ch.bg : 'var(--slate-100)',
                color: active ? ch.color : 'var(--text-muted)',
                boxShadow: active ? `0 0 0 2px ${ch.color}` : 'none',
                transition: 'all 0.2s',
                opacity: disabled ? 0.4 : 1,
            }}
        >
            <span style={{ fontSize: '1rem' }}>{ch.icon}</span> {ch.label}
        </button>
    );
}

// ─── Preview Panel ──────────────────────────────────────────────────────────
function PreviewPane({ channel, resolvedBody, resolvedSubject }) {
    if (channel === 'whatsapp') {
        return (
            <div style={{
                background: '#e5ddd5',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23c8b9a0\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M0 0h40v40H0z\'/%3E%3C/g%3E%3C/svg%3E")',
                borderRadius: 12, padding: 16, minHeight: 200,
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                        maxWidth: '85%', background: '#dcf8c6',
                        borderRadius: '12px 0 12px 12px',
                        padding: '10px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        fontSize: '0.85rem', lineHeight: 1.5,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                        {resolvedBody || <span style={{ color: '#aaa' }}>No content</span>}
                        <div style={{ fontSize: '0.68rem', color: '#999', textAlign: 'right', marginTop: 6 }}>
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (channel === 'sms') {
        return (
            <div style={{ background: '#f0f0f5', borderRadius: 12, padding: 16 }}>
                <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '12px 12px 0 12px', padding: '10px 14px', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {resolvedBody || <span style={{ color: '#aaa' }}>No content</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 6, textAlign: 'right' }}>
                    {resolvedBody ? `${resolvedBody.length}/160 chars` : '—'}
                </div>
            </div>
        );
    }
    // Email
    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-light)', padding: '12px 16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Subject:</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{resolvedSubject || '(No subject)'}</div>
            </div>
            <div style={{ padding: '16px', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', maxHeight: 240, overflow: 'auto', wordBreak: 'break-word' }}>
                {resolvedBody || <span style={{ color: '#aaa' }}>No content</span>}
            </div>
        </div>
    );
}

// ─── Main Composer ───────────────────────────────────────────────────────────
export default function NotificationComposer({
    onClose,
    onSent,
    prefillLead = null,   // { name, phone, email, project, budget, assignedTo }
    prefillChannel = null,
    triggerType = null,   // 'followup' | 'site_visit' | 'booking' | null
}) {
    const { addToast } = useToast();

    // Determine initial recipient
    const initialRecipient = prefillLead
        ? { type: 'lead', id: prefillLead.id, name: prefillLead.name, phone: prefillLead.phone, email: prefillLead.email }
        : null;

    const [activeChannel, setActiveChannel] = useState(prefillChannel || 'whatsapp');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [sending, setSending] = useState(false);
    const [recipient, setRecipient] = useState(initialRecipient);
    const [recipientSearch, setRecipientSearch] = useState(prefillLead?.name || '');
    const [showRecipientDrop, setShowRecipientDrop] = useState(false);
    const [multiChannels, setMultiChannels] = useState({ sms: false, email: false, whatsapp: false, [activeChannel]: true });

    const { data: leadsRaw } = useApi(() => leadsApi.list({ limit: 500 }));
    const { data: customersRaw } = useApi(() => customersApi.list());
    const leadsData = (leadsRaw?.data || leadsRaw || []);
    const customersData = customersRaw || [];
    // derive current agent from session storage
    const agent = (() => { try { return JSON.parse(sessionStorage.getItem('zentrix_user') || '{}'); } catch { return {}; } })();

    // Build recipient list from leads + customers
    const recipientOptions = [
        ...leadsData.map(l => ({ type: 'lead', id: l.id, name: l.name, phone: l.phone, email: l.email, project: l.project, budget: l.budget, assignedTo: l.assigned_to || l.assignedTo })),
        ...customersData.map(c => ({ type: 'customer', id: c.id, name: c.name, phone: c.phone, email: c.email, project: c.purchases?.[0] || '', budget: '', assignedTo: '' })),
    ].filter(r =>
        recipientSearch.length < 2 || r.name.toLowerCase().includes(recipientSearch.toLowerCase())
    );

    // Template variable map
    const varMap = {
        '{{name}}': recipient?.name || '',
        '{{agent}}': agent?.name || '',
        '{{project}}': prefillLead?.project || recipient?.project || '',
        '{{date}}': '',
        '{{time}}': '',
        '{{budget}}': prefillLead?.budget || recipient?.budget || '',
        '{{unit}}': '',
        '{{phone}}': recipient?.phone || '',
        '{{company}}': 'Zentrix Realty Pvt. Ltd.',
    };

    const resolvedBody = resolveVars(body, varMap);
    const resolvedSubject = resolveVars(subject, varMap);

    function applyTemplate(tpl) {
        setSelectedTemplate(tpl);
        if (activeChannel === 'sms' && tpl.sms) {
            setBody(tpl.sms);
        } else {
            setBody(tpl.body || '');
        }
        setSubject(tpl.subject || '');
    }

    function insertVar(varKey) {
        setBody(b => b + varKey);
    }

    async function handleSend() {
        if (!recipient) { addToast({ type: 'error', title: 'No recipient', message: 'Please select a recipient first.' }); return; }
        if (!body.trim()) { addToast({ type: 'error', title: 'Empty message', message: 'Message body cannot be empty.' }); return; }

        setSending(true);
        const channels = Object.entries(multiChannels).filter(([, v]) => v).map(([k]) => k);

        // Map channel keys to API format
        const channelMap = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' };

        try {
            const result = await notificationsApi.send({
                channels: channels.map(c => channelMap[c] || c),
                recipient_name: recipient.name,
                recipient_phone: recipient.phone,
                recipient_email: recipient.email,
                lead_id: recipient.type === 'lead' ? recipient.id : null,
                subject: resolvedSubject,
                body: resolvedBody,
                template: selectedTemplate?.name || 'Custom',
            });

            // Show success toasts per channel
            channels.forEach(ch => {
                addToast({
                    type: 'success',
                    title: `${CHANNELS[ch].icon} ${CHANNELS[ch].label} Sent!`,
                    message: `Message delivered to ${recipient.name}`,
                    duration: 5000,
                });
            });

            if (result.send_errors?.length) {
                result.send_errors.forEach(e => {
                    addToast({ type: 'error', title: `${e.channel} delivery failed`, message: e.error, duration: 6000 });
                });
            }

            if (onSent) onSent();
            onClose();
        } catch (err) {
            addToast({ type: 'error', title: 'Send failed', message: err.error || 'Could not send notification' });
        } finally {
            setSending(false);
        }
    }



    // Relevant templates
    const categoryFilter = triggerType === 'followup' ? 'Follow-Up'
        : triggerType === 'site_visit' ? 'Site Visit'
            : triggerType === 'booking' ? 'Booking'
                : null;

    const visibleTemplates = categoryFilter
        ? TEMPLATES.filter(t => t.category === categoryFilter)
        : TEMPLATES;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div
                className="modal"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: 760, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, #1e3a73, #06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Send size={16} color="white" />
                        </div>
                        <div>
                            <div className="modal-title" style={{ margin: 0 }}>Send Notification</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SMS · Email · WhatsApp</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left Column — Compose */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-light)' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
                            {/* Recipient */}
                            <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
                                <label className="form-label">Recipient</label>
                                <input
                                    className="form-control"
                                    placeholder="Search lead or customer…"
                                    value={recipient ? recipient.name : recipientSearch}
                                    onChange={e => {
                                        setRecipient(null);
                                        setRecipientSearch(e.target.value);
                                        setShowRecipientDrop(true);
                                    }}
                                    onFocus={() => setShowRecipientDrop(true)}
                                    style={{ paddingRight: 36 }}
                                />
                                {recipient && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                        {recipient.phone && <span className="badge badge-slate">📱 {recipient.phone}</span>}
                                        {recipient.email && <span className="badge badge-blue">📧 {recipient.email}</span>}
                                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => { setRecipient(null); setRecipientSearch(''); }}>
                                            <X size={10} /> Change
                                        </button>
                                    </div>
                                )}
                                {showRecipientDrop && !recipient && recipientSearch.length >= 1 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                        background: 'white', border: '1px solid var(--border-medium)',
                                        borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                                        maxHeight: 200, overflowY: 'auto',
                                    }}>
                                        {recipientOptions.slice(0, 10).map(r => (
                                            <div key={`${r.type}-${r.id}`}
                                                onClick={() => { setRecipient(r); setShowRecipientDrop(false); setRecipientSearch(r.name); }}
                                                style={{
                                                    padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem',
                                                    borderBottom: '1px solid var(--border-light)',
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <span className={`badge ${r.type === 'lead' ? 'badge-blue' : 'badge-violet'}`} style={{ fontSize: '0.65rem' }}>{r.type}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.phone}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {recipientOptions.length === 0 && (
                                            <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No results found</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Channel Selection (multi-select) */}
                            <div style={{ marginBottom: 16 }}>
                                <label className="form-label">Send Via</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {Object.values(CHANNELS).map(ch => (
                                        <button key={ch.id}
                                            onClick={() => {
                                                setMultiChannels(m => ({ ...m, [ch.id]: !m[ch.id] }));
                                                setActiveChannel(ch.id);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                padding: '7px 14px', border: '2px solid',
                                                borderColor: multiChannels[ch.id] ? ch.color : 'var(--border-medium)',
                                                borderRadius: 99, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                                                background: multiChannels[ch.id] ? ch.bg : 'white',
                                                color: multiChannels[ch.id] ? ch.color : 'var(--text-muted)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {ch.icon} {ch.label}
                                            {multiChannels[ch.id] && <span style={{ marginLeft: 2 }}>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Templates */}
                            <div style={{ marginBottom: 16 }}>
                                <label className="form-label">Template</label>
                                <div style={{ display: 'flex', flex: 1, gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {visibleTemplates.map(tpl => (
                                        <button key={tpl.id}
                                            onClick={() => { applyTemplate(tpl); setActiveChannel(tpl.channels[0]); }}
                                            style={{
                                                padding: '5px 12px', border: '1px solid',
                                                borderColor: selectedTemplate?.id === tpl.id ? 'var(--navy-500)' : 'var(--border-medium)',
                                                borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                                background: selectedTemplate?.id === tpl.id ? 'var(--navy-50)' : 'white',
                                                color: selectedTemplate?.id === tpl.id ? 'var(--navy-700)' : 'var(--text-secondary)',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {tpl.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject (Email) */}
                            {(multiChannels.email) && (
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label className="form-label">Email Subject</label>
                                    <input className="form-control" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line…" />
                                </div>
                            )}

                            {/* Message Body */}
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        Message {multiChannels.sms ? <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(used for SMS & WhatsApp)</span> : ''}
                                    </label>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(v => !v)} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                                        <Eye size={12} /> {showPreview ? 'Hide' : 'Preview'}
                                    </button>
                                </div>
                                <textarea
                                    className="form-control"
                                    rows={7}
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    placeholder="Type your message or pick a template above…"
                                    style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                                />
                            </div>

                            {/* Variable Chips */}
                            <div style={{ marginBottom: 4 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                                    Insert Variable
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {TEMPLATE_VARS.map(v => (
                                        <button key={v.key}
                                            onClick={() => insertVar(v.key)}
                                            style={{
                                                background: 'var(--navy-50)', border: '1px solid var(--navy-200)',
                                                borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem',
                                                fontFamily: 'monospace', cursor: 'pointer', color: 'var(--navy-700)',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            {v.key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer" style={{ flexShrink: 0 }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>
                                {Object.entries(multiChannels).filter(([, v]) => v).map(([k]) => CHANNELS[k].icon).join(' ')}
                                {' '}Sending via {Object.entries(multiChannels).filter(([, v]) => v).map(([k]) => CHANNELS[k].label).join(' + ') || '—'}
                            </div>
                            <button className="btn btn-secondary" onClick={onClose} disabled={sending}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSend}
                                disabled={sending || !recipient || !body.trim()}
                                style={{
                                    background: sending ? 'var(--slate-400)' : 'linear-gradient(135deg, var(--navy-700), var(--accent-cyan-dark))',
                                    minWidth: 110,
                                }}
                            >
                                {sending ? (
                                    <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Sending…</>
                                ) : (
                                    <><Send size={14} /> Send Now</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column — Preview */}
                    {showPreview && (
                        <div style={{ width: 300, flexShrink: 0, overflowY: 'auto', padding: '20px 16px', background: 'var(--slate-50)' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                                Live Preview
                            </div>

                            {/* Channel Tabs for preview */}
                            <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                                {Object.values(CHANNELS).filter(ch => multiChannels[ch.id]).map(ch => (
                                    <button key={ch.id}
                                        onClick={() => setActiveChannel(ch.id)}
                                        style={{
                                            padding: '4px 10px', border: 'none', borderRadius: 8, cursor: 'pointer',
                                            fontWeight: 700, fontSize: '0.72rem',
                                            background: activeChannel === ch.id ? ch.bg : 'white',
                                            color: activeChannel === ch.id ? ch.color : 'var(--text-muted)',
                                            boxShadow: activeChannel === ch.id ? `0 0 0 1.5px ${ch.color}` : '0 0 0 1px var(--border-light)',
                                        }}
                                    >{ch.icon} {ch.label}</button>
                                ))}
                            </div>

                            <PreviewPane
                                channel={activeChannel}
                                resolvedBody={activeChannel === 'sms' && selectedTemplate?.sms
                                    ? resolveVars(selectedTemplate.sms, varMap)
                                    : resolvedBody}
                                resolvedSubject={resolvedSubject}
                            />

                            {/* Resolved vars */}
                            {recipient && (
                                <div style={{ marginTop: 14 }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Resolved Variables</div>
                                    {Object.entries(varMap).filter(([, v]) => v).map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', padding: '3px 0', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                            <code style={{ color: 'var(--navy-600)' }}>{k}</code>
                                            <span style={{ fontWeight: 600 }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
