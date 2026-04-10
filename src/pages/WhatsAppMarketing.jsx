import { useState, useEffect } from 'react';
import { 
    Send, Bot, MessageSquare, Users, Sparkles, 
    Zap, CheckCircle2, AlertCircle, Clock, 
    ChevronRight, Settings2, Smartphone, Plus
} from 'lucide-react';
import { marketingApi, leadsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useApi } from '../hooks/useApi';

export default function WhatsAppMarketing() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('broadcasts'); // broadcasts | chatbot
    const [isCreating, setIsCreating] = useState(false);
    
    // Broadcast State
    const [broadcastForm, setBroadcastForm] = useState({ name: '', message_body: '', segment: 'All' });
    const { data: broadcasts, refresh: refreshBroadcasts } = useApi(marketingApi.getBroadcasts);
    const { data: leads } = useApi(() => leadsApi.list({ limit: 1000 }));

    // Chatbot State
    const [chatbot, setChatbot] = useState(null);
    const [_savingBot, setSavingBot] = useState(false);

    useEffect(() => {
        marketingApi.getChatbot().then(setChatbot).catch(console.error);
    }, []);

    const handleCreateBroadcast = async () => {
        if (!broadcastForm.name || !broadcastForm.message_body) {
            return showToast('Please fill in all fields', 'error');
        }

        // Apply segmentation logic
        let targetLeads = leads?.leads || [];
        if (broadcastForm.segment === 'New Leads ONLY') {
            targetLeads = targetLeads.filter(l => l.stage === 'New');
        } else if (broadcastForm.segment === 'Site Visit Completed') {
            targetLeads = targetLeads.filter(l => l.stage === 'Site Visit Done' || l.stage === 'Follow-up');
        } else if (broadcastForm.segment === 'Hot Leads (Score > 80)') {
            targetLeads = targetLeads.filter(l => l.score > 80);
        }

        if (targetLeads.length === 0) {
            return showToast('No leads found in this segment', 'warning');
        }

        const leadIds = targetLeads.map(l => l.id);
        
        try {
            await marketingApi.createBroadcast({ ...broadcastForm, lead_ids: leadIds });
            showToast(`Broadcast for ${leadIds.length} leads initiated!`, 'success');
            setIsCreating(false);
            setBroadcastForm({ name: '', message_body: '', segment: 'All' });
            refreshBroadcasts();
        } catch (_err) {
            showToast('Failed to send broadcast', 'error');
        }
    };

    const handleUpdateChatbot = async (updates) => {
        setSavingBot(true);
        try {
            const res = await marketingApi.updateChatbot(updates);
            setChatbot(res);
            showToast('Chatbot settings updated', 'success');
        } catch (_err) {
            showToast('Update failed', 'error');
        } finally {
            setSavingBot(false);
        }
    };

    return (
        <div className="page-fade-in" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>WhatsApp Intelligence</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>High-frequency outreach and 24/7 autonomous AI responders.</p>
                </div>
                <div className="glass-card" style={{ display: 'flex', padding: 4, borderRadius: 16 }}>
                    <button 
                        onClick={() => setActiveTab('broadcasts')}
                        style={{ 
                            padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: activeTab === 'broadcasts' ? 'var(--navy-900)' : 'transparent',
                            color: activeTab === 'broadcasts' ? 'white' : 'var(--text-muted)',
                            fontWeight: 700, transition: '0.2s'
                        }}
                    >
                        Broadcasts
                    </button>
                    <button 
                        onClick={() => setActiveTab('chatbot')}
                        style={{ 
                            padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: activeTab === 'chatbot' ? 'var(--navy-900)' : 'transparent',
                            color: activeTab === 'chatbot' ? 'white' : 'var(--text-muted)',
                            fontWeight: 700, transition: '0.2s'
                        }}
                    >
                        AI Chatbot
                    </button>
                </div>
            </div>

            {activeTab === 'broadcasts' ? (
                /* Broadcast Tab */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        <div className="glass-card" style={{ padding: 24 }}>
                            <div style={{ color: 'var(--accent-cyan)', marginBottom: 12 }}><Send size={24} /></div>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Broadcasts</h4>
                            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{broadcasts?.length || 0}</div>
                        </div>
                        <div className="glass-card" style={{ padding: 24 }}>
                            <div style={{ color: 'var(--accent-emerald)', marginBottom: 12 }}><Users size={24} /></div>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Reach</h4>
                            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{(broadcasts || []).reduce((acc, b) => acc + (b.recipients_count || 0), 0)}</div>
                        </div>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="hover-lift"
                            style={{ 
                                border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)',
                                borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                justifyContent: 'center', gap: 12, color: 'var(--accent-cyan)', cursor: 'pointer'
                            }}
                        >
                            <Plus size={32} />
                            <span style={{ fontWeight: 800 }}>Create New Campaign</span>
                        </button>
                    </div>

                    {/* Create Modal - Simplified for view */}
                    {isCreating && (
                        <div className="glass-card" style={{ padding: 32, border: '2px solid var(--accent-cyan)' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 24 }}>New WhatsApp Broadcast</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div className="form-group">
                                        <label>Campaign Name</label>
                                        <input 
                                            value={broadcastForm.name}
                                            onChange={e => setBroadcastForm({...broadcastForm, name: e.target.value})}
                                            placeholder="e.g. Diwali Property Launch"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Target Segment</label>
                                        <select value={broadcastForm.segment} onChange={e => setBroadcastForm({...broadcastForm, segment: e.target.value})}>
                                            <option>All Leads</option>
                                            <option>New Leads ONLY</option>
                                            <option>Site Visit Completed</option>
                                            <option>Hot Leads (Score &gt; 80)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Message Content (supports {"{{name}}"} placeholders)</label>
                                    <textarea 
                                        style={{ height: 160 }}
                                        value={broadcastForm.message_body}
                                        onChange={e => setBroadcastForm({...broadcastForm, message_body: e.target.value})}
                                        placeholder="Hello {{name}}! We are excited to announce our new project..."
                                    />
                                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                        <button className="btn btn-primary" onClick={handleCreateBroadcast} style={{ flex: 1 }}>Launch Broadcast Now</button>
                                        <button className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Table */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Broadcast History</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>CAMPAIGN NAME</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>RECIPIENTS</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>STATUS</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>SENT DATE</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800 }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(broadcasts || []).map(b => (
                                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '20px 24px', fontWeight: 700 }}>{b.name}</td>
                                        <td style={{ padding: '20px 24px' }}>{b.recipients_count} Leads</td>
                                        <td style={{ padding: '20px 24px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800,
                                                background: b.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                color: b.status === 'Completed' ? '#10b981' : '#f59e0b'
                                            }}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(b.sent_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '20px 24px' }}><button className="btn-icon-tiny"><ChevronRight size={18} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Chatbot Tab */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
                    
                    {/* Left: Bot Identity & Toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
                            <div style={{ 
                                width: 100, height: 100, borderRadius: '35px', background: 'rgba(0,180,216,0.1)', 
                                margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Bot size={54} color="var(--accent-cyan)" />
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>{chatbot?.bot_name}</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>Zentrix Autonomous Sales Assistant</p>
                            
                            <button 
                                onClick={() => handleUpdateChatbot({ is_active: !chatbot.is_active })}
                                style={{ 
                                    width: '100%', padding: '16px', borderRadius: 16, border: 'none', 
                                    background: chatbot?.is_active ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.05)',
                                    color: 'white', fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
                                }}
                            >
                                {chatbot?.is_active ? <Zap size={20} fill="white" /> : <Clock size={20} />}
                                {chatbot?.is_active ? 'BOT IS ONLINE' : 'BOT IS OFFLINE'}
                            </button>
                        </div>

                        <div className="glass-card" style={{ padding: 24 }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20 }}>Core Behavior</h4>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label>Bot Handle Name</label>
                                <input value={chatbot?.bot_name} onChange={e => setChatbot({...chatbot, bot_name: e.target.value})} onBlur={() => handleUpdateChatbot({ bot_name: chatbot.bot_name })} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Sparkles size={18} color="var(--accent-cyan)" />
                                    <span style={{ fontWeight: 700 }}>AI Smart Response</span>
                                </div>
                                <input type="checkbox" checked={chatbot?.ai_enabled} onChange={e => handleUpdateChatbot({ ai_enabled: e.target.checked })} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Messages & AI Prompt */}
                    <div className="glass-card" style={{ padding: 32 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Settings2 size={22} color="var(--accent-cyan)" />
                            Response Automation
                        </h3>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>Default Greeting Message</label>
                            <textarea 
                                style={{ height: 80 }}
                                value={chatbot?.greeting_message}
                                onChange={e => setChatbot({...chatbot, greeting_message: e.target.value})}
                                onBlur={() => handleUpdateChatbot({ greeting_message: chatbot.greeting_message })}
                                placeholder="Sent when a new user messages for the first time."
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>AI System Instructions (Prompt Engineering)</label>
                            <textarea 
                                style={{ height: 160, background: 'rgba(0,180,216,0.02)', border: '1px solid rgba(0,180,216,0.2)' }}
                                value={chatbot?.ai_prompt}
                                onChange={e => setChatbot({...chatbot, ai_prompt: e.target.value})}
                                onBlur={() => handleUpdateChatbot({ ai_prompt: chatbot.ai_prompt })}
                                placeholder="You are a real estate agent for Zentrix. Be professional, answer pricing questions carefully, and always try to schedule a site visit..."
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                <Sparkles size={12} style={{ marginRight: 4 }} />
                                Powerd by Google Gemini 1.5 Pro for intelligent 24/7 engagement.
                            </p>
                        </div>

                        <div className="form-group">
                            <label>Fallback Response (If AI is off / fails)</label>
                            <textarea 
                                style={{ height: 80 }}
                                value={chatbot?.fallback_message}
                                onChange={e => setChatbot({...chatbot, fallback_message: e.target.value})}
                                onBlur={() => handleUpdateChatbot({ fallback_message: chatbot.fallback_message })}
                            />
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
