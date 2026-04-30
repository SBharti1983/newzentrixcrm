import { useState, useEffect } from 'react';
import { 
    Send, Bot, MessageSquare, Users, Sparkles, 
    Zap, CheckCircle2, AlertCircle, Clock, 
    ChevronRight, Settings2, Smartphone, Plus,
    BarChart3, Rocket, Target, Cpu, Globe, 
    Flame, MessageCircle, RotateCw, X
} from 'lucide-react';
import { marketingApi, leadsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { useApi } from '../../hooks/useApi';
import axios from 'axios';

const COLORS = {
    indigo: '#6366f1',
    violet: '#8b5cf6',
    emerald: '#10b981',
    cyan: '#06b6d4',
    rose: '#f43f5e',
    amber: '#f59e0b',
    slate950: '#040d1a',
    slate900: '#0a1628',
    slate800: '#1e293b',
    slate700: '#334155',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate200: '#e2e8f0',
    slate50: '#f8fafc',
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.82)',
    glassDark: 'rgba(15, 23, 42, 0.9)'
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.whatsapp-war-room {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${COLORS.slate900};
}

.premium-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 30px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.4);
    transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.premium-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 25px 50px rgba(0,0,0,0.06);
}

.tab-btn {
    padding: 12px 28px;
    border-radius: 16px;
    font-size: 0.9rem;
    font-weight: 800;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
}

.input-field {
    width: 100%;
    padding: 16px 20px;
    border-radius: 18px;
    border: 1.5px solid ${COLORS.slate200};
    background: white;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s;
}

.input-field:focus {
    outline: none;
    border-color: ${COLORS.indigo};
    box-shadow: 0 0 0 4px ${COLORS.indigo}15;
}

.bot-pulsar {
    animation: bot-glow 3s infinite ease-in-out;
}

@keyframes bot-glow {
    0% { transform: scale(1); box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); }
    50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(99, 102, 241, 0.4); }
    100% { transform: scale(1); box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); }
}

.shimmer-bg {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200% 100%;
    animation: shimmer-anim 2s infinite linear;
}

@keyframes shimmer-anim {
    to { background-position: 200% center; }
}
`;

export default function WhatsAppMarketing() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('broadcasts'); // broadcasts | chatbot
    const [isCreating, setIsCreating] = useState(false);
    
    // Broadcast State
    const [broadcastForm, setBroadcastForm] = useState({ name: '', message_body: '', segment: 'All' });
    const { data: broadcasts, refresh: refreshBroadcasts } = useApi(marketingApi.getBroadcasts);
    const { data: leadsRes } = useApi(() => leadsApi.list({ limit: 1000 }));
    const leads = leadsRes?.data || [];

    const [chatbot, setChatbot] = useState(null);
    const [_savingBot, setSavingBot] = useState(false);

    // AI Generator State
    const [aiGoal, setAiGoal] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiVariations, setAiVariations] = useState([]);

    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        marketingApi.getChatbot().then(setChatbot).catch(console.error);
        return () => document.head.removeChild(styleEl);
    }, []);

    const [isAIPersonalized, setIsAIPersonalized] = useState(false);

    const handleCreateBroadcast = async () => {
        if (!broadcastForm.name || (!isAIPersonalized && !broadcastForm.message_body)) {
            return showToast('Please fill in all fields', 'error');
        }

        if (isAIPersonalized && !aiGoal) {
            return showToast('Please define an AI Goal for personalization', 'error');
        }

        let targetLeads = leads || [];
        if (broadcastForm.segment === 'New Leads ONLY') {
            targetLeads = targetLeads.filter(l => l.stage === 'New');
        } else if (broadcastForm.segment === 'Site Visit Completed') {
            targetLeads = targetLeads.filter(l => l.stage === 'Site Visit Done' || l.stage === 'Follow-up');
        } else if (broadcastForm.segment === 'Hot Leads (Score > 80)') {
            targetLeads = targetLeads.filter(l => l.score > 80);
        } else if (broadcastForm.segment === 'Cold Leads (No action > 7 days)') {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            targetLeads = targetLeads.filter(l => new Date(l.updated_at || l.created_at) < sevenDaysAgo);
        }

        if (targetLeads.length === 0) {
            return showToast('No leads found in this segment', 'warning');
        }

        const leadIds = targetLeads.map(l => l.id);
        
        try {
            if (isAIPersonalized) {
                await axios.post('/api/marketing/ai-personalized-broadcast', {
                    name: broadcastForm.name,
                    goal: aiGoal,
                    lead_ids: leadIds
                });
                showToast(`AI Personalization Campaign for ${leadIds.length} leads initiated!`, 'success');
            } else {
                await marketingApi.createBroadcast({ ...broadcastForm, lead_ids: leadIds });
                showToast(`Standard Broadcast for ${leadIds.length} leads initiated!`, 'success');
            }
            
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

    const handleGenerateAITemplates = async () => {
        if (!aiGoal) return showToast('Please define a goal first', 'warning');
        setIsGeneratingAI(true);
        try {
            const res = await marketingApi.generateCampaignTemplate({
                goal: aiGoal,
                segment: broadcastForm.segment
            });
            setAiVariations(res);
            showToast('AI synthesized 3 variations!', 'success');
        } catch (err) {
            showToast('AI failed to generate templates', 'error');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    return (
        <div className="whatsapp-war-room" style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* 🚀 War Room Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <Flame size={20} color={COLORS.rose} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.rose, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            Marketing Intelligence Hub
                        </span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '-2.5px' }}>
                        WhatsApp <span style={{ color: COLORS.indigo }}>Intelligence</span>
                    </h1>
                    <p style={{ margin: '8px 0 0', color: COLORS.slate500, fontSize: '1.2rem', fontWeight: 600 }}>
                        Autonomous AI engagement and high-frequency campaign broadcasting.
                    </p>
                </div>

                <div className="premium-card" style={{ display: 'flex', padding: '6px', borderRadius: '20px', background: 'white' }}>
                    <button className="tab-btn" onClick={() => setActiveTab('broadcasts')} style={{ 
                        background: activeTab === 'broadcasts' ? COLORS.slate950 : 'transparent', 
                        color: activeTab === 'broadcasts' ? 'white' : COLORS.slate500 
                    }}>
                        <Send size={18} /> Broadcasts
                    </button>
                    <button className="tab-btn" onClick={() => setActiveTab('chatbot')} style={{ 
                        background: activeTab === 'chatbot' ? COLORS.slate950 : 'transparent', 
                        color: activeTab === 'chatbot' ? 'white' : COLORS.slate500 
                    }}>
                        <Bot size={18} /> AI Chatbot
                    </button>
                </div>
            </div>

            {activeTab === 'broadcasts' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* 📊 Broadcast Intelligence Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px' }}>
                        <div className="premium-card" style={{ padding: '28px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${COLORS.indigo}10`, color: COLORS.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <BarChart3 size={24} />
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 950, color: COLORS.slate950 }}>{broadcasts?.length || 0}</div>
                            <div style={{ fontSize: '0.85rem', color: COLORS.slate500, fontWeight: 750, marginTop: '4px' }}>Active Campaigns</div>
                        </div>
                        <div className="premium-card" style={{ padding: '28px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${COLORS.emerald}10`, color: COLORS.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <Users size={24} />
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 950, color: COLORS.slate950 }}>
                                {(broadcasts || []).reduce((acc, b) => acc + (b.recipients_count || 0), 0)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: COLORS.slate500, fontWeight: 750, marginTop: '4px' }}>Platform Reach</div>
                        </div>
                        <div className="premium-card" style={{ padding: '28px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${COLORS.cyan}10`, color: COLORS.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <Globe size={24} />
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 950, color: COLORS.slate950 }}>96%</div>
                            <div style={{ fontSize: '0.85rem', color: COLORS.slate500, fontWeight: 750, marginTop: '4px' }}>Delivery Success</div>
                        </div>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="premium-card" 
                            style={{ 
                                padding: '28px', background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.violet})`, 
                                color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                justifyContent: 'center', cursor: 'pointer', border: 'none' 
                            }}
                        >
                            <Rocket size={32} strokeWidth={2.5} style={{ marginBottom: '12px' }} />
                            <div style={{ fontWeight: 900, fontSize: '1rem' }}>Initiate Campaign</div>
                        </button>
                    </div>

                    {/* 🚀 Campaign Launcher */}
                    {isCreating && (
                        <div className="premium-card" style={{ padding: '40px', border: `2px solid ${COLORS.indigo}`, marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, color: COLORS.slate950 }}>New Strategic Broadcast</h3>
                                    <p style={{ margin: '4px 0 0', color: COLORS.slate500, fontSize: '0.85rem', fontWeight: 600 }}>Craft a high-frequency campaign manually or use AI Intelligence.</p>
                                </div>
                                <button onClick={() => setIsCreating(false)} style={{ background: COLORS.slate100, border: 'none', width: 40, height: 40, borderRadius: '12px', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '48px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Campaign Name</label>
                                        <input className="input-field" value={broadcastForm.name} onChange={e => setBroadcastForm({...broadcastForm, name: e.target.value})} placeholder="e.g. M3M Antalya Hills Launch" />
                                    </div>
                                    
                                    <div style={{ padding: '24px', background: `${COLORS.indigo}05`, borderRadius: '24px', border: `1px solid ${COLORS.indigo}15` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.indigo }}>
                                                <Sparkles size={18} />
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>AI Intelligence Mode</span>
                                            </div>
                                            <div 
                                                onClick={() => setIsAIPersonalized(!isAIPersonalized)}
                                                style={{ 
                                                    width: 44, height: 24, background: isAIPersonalized ? COLORS.indigo : COLORS.slate200, 
                                                    borderRadius: 12, padding: 2, cursor: 'pointer', transition: 'all 0.3s'
                                                }}
                                            >
                                                <div style={{ width: 20, height: 20, background: 'white', borderRadius: 10, transform: isAIPersonalized ? 'translateX(20px)' : 'translateX(0)', transition: 'all 0.3s' }} />
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.slate500, marginBottom: 4 }}>
                                                {isAIPersonalized ? "Define the campaign goal. Gemini will write a UNIQUE message for every lead based on their profile." : "Goal for AI template generation:"}
                                            </div>
                                            <input 
                                                className="input-field" 
                                                style={{ border: 'none', background: 'white', fontSize: '0.85rem' }} 
                                                value={aiGoal} 
                                                onChange={e => setAiGoal(e.target.value)} 
                                                placeholder={isAIPersonalized ? "e.g. Re-engage leads who visited but didn't book" : "What's the goal? (e.g. invite to site visit)"} 
                                            />
                                            {!isAIPersonalized && (
                                                <button 
                                                    onClick={handleGenerateAITemplates}
                                                    disabled={isGeneratingAI}
                                                    style={{ 
                                                        width: '100%', padding: '14px', borderRadius: '14px', border: 'none', 
                                                        background: COLORS.indigo, color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 
                                                    }}
                                                >
                                                    {isGeneratingAI ? <RotateCw className="animate-spin" size={16} /> : <Cpu size={16} />}
                                                    {isGeneratingAI ? 'Synthesizing...' : 'Generate AI Variations'}
                                                </button>
                                            )}
                                        </div>

                                        {aiVariations.length > 0 && (
                                            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {aiVariations.map((v, i) => (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => setBroadcastForm({...broadcastForm, message_body: v.body})}
                                                        style={{ 
                                                            padding: '16px', background: 'white', borderRadius: '14px', border: `1.5px solid ${broadcastForm.message_body === v.body ? COLORS.indigo : 'transparent'}`,
                                                            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.indigo, textTransform: 'uppercase', marginBottom: '4px' }}>{v.title}</div>
                                                        <div style={{ fontSize: '0.8rem', color: COLORS.slate600, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.body}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Target Segment</label>
                                        <select className="input-field" value={broadcastForm.segment} onChange={e => setBroadcastForm({...broadcastForm, segment: e.target.value})}>
                                            <option>All Leads</option>
                                            <option>New Leads ONLY</option>
                                            <option>Site Visit Completed</option>
                                            <option>Hot Leads (Score &gt; 80)</option>
                                            <option>Cold Leads (No action &gt; 7 days)</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Message Body (Protocol)</label>
                                        <textarea className="input-field" style={{ height: '180px', resize: 'none', background: '#fafafa' }} value={broadcastForm.message_body} onChange={e => setBroadcastForm({...broadcastForm, message_body: e.target.value})} placeholder="Message content..." />
                                        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                            <button onClick={handleCreateBroadcast} style={{ 
                                                flex: 2, padding: '18px', borderRadius: '18px', border: 'none', background: COLORS.slate950, 
                                                color: 'white', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 12px 24px rgba(15,23,42,0.2)' 
                                            }}>Launch Campaign</button>
                                            <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '18px', borderRadius: '18px', border: `2px solid ${COLORS.slate200}`, background: 'transparent', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 📜 Mission Logs (History) */}
                    <div className="premium-card" style={{ padding: 0 }}>
                        <div style={{ padding: '28px', borderBottom: `1px solid ${COLORS.slate200}` }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 950, color: COLORS.slate950 }}>Historical Archives</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: `${COLORS.slate50}`, color: COLORS.slate400, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '20px 28px', textAlign: 'left' }}>Persona (Name)</th>
                                        <th style={{ padding: '20px 28px', textAlign: 'left' }}>Impact (Recipients)</th>
                                        <th style={{ padding: '20px 28px', textAlign: 'left' }}>Lifecycle</th>
                                        <th style={{ padding: '20px 28px', textAlign: 'left' }}>Deployment Date</th>
                                        <th style={{ padding: '20px 28px', textAlign: 'left' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(broadcasts || []).map(b => (
                                        <tr key={b.id} style={{ borderBottom: `1px solid ${COLORS.slate200}` }}>
                                            <td style={{ padding: '24px 28px', fontWeight: 900, fontSize: '0.95rem', color: COLORS.slate950 }}>{b.name}</td>
                                            <td style={{ padding: '24px 28px', fontWeight: 700, color: COLORS.slate700 }}>{b.recipients_count} Targets</td>
                                            <td style={{ padding: '24px 28px' }}>
                                                <div style={{ 
                                                    display: 'inline-flex', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 900,
                                                    background: b.status === 'Completed' ? `${COLORS.emerald}10` : `${COLORS.amber}10`,
                                                    color: b.status === 'Completed' ? COLORS.emerald : COLORS.amber
                                                }}>
                                                    {b.status === 'Completed' ? <CheckCircle2 size={14} style={{ marginRight: '6px' }} /> : <Clock size={14} style={{ marginRight: '6px' }} />}
                                                    {b.status}
                                                </div>
                                            </td>
                                            <td style={{ padding: '24px 28px', color: COLORS.slate400, fontWeight: 600 }}>{new Date(b.sent_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ padding: '24px 28px' }}><button style={{ background: `${COLORS.slate100}`, border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><ChevronRight size={18} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '40px' }}>
                    
                    {/* 🤖 Bot Core Identity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div className="premium-card" style={{ padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                            <div className="shimmer-bg" style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }} />
                            <div className="bot-pulsar" style={{ 
                                width: 120, height: 120, borderRadius: '44px', background: 'white', 
                                margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: `1.5px solid ${COLORS.slate200}`
                            }}>
                                <Bot size={64} color={COLORS.indigo} strokeWidth={2.5} />
                            </div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, marginBottom: '8px', color: COLORS.slate950 }}>{chatbot?.bot_name}</h2>
                            <p style={{ fontSize: '1rem', color: COLORS.slate500, fontWeight: 600, marginBottom: '32px' }}>Zentrix Autonomous Responder</p>
                            
                            <button 
                                onClick={() => handleUpdateChatbot({ is_active: !chatbot.is_active })}
                                style={{ 
                                    width: '100%', padding: '20px', borderRadius: '22px', border: 'none', 
                                    background: chatbot?.is_active ? `linear-gradient(135deg, ${COLORS.emerald}, #059669)` : COLORS.slate100,
                                    color: chatbot?.is_active ? 'white' : COLORS.slate500, fontWeight: 950, fontSize: '1rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    boxShadow: chatbot?.is_active ? '0 12px 24px rgba(16,185,129,0.3)' : 'none', transition: 'all 0.3s ease'
                                }}
                            >
                                {chatbot?.is_active ? <Zap size={20} fill="white" /> : <Clock size={20} />}
                                {chatbot?.is_active ? 'MISSION ACTIVE' : 'MISSION STANDBY'}
                            </button>
                        </div>

                        <div className="premium-card" style={{ padding: '32px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase', marginBottom: '24px', letterSpacing: '0.1em' }}>Autonomous Logic</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate600 }}>Bot Identity Name</label>
                                    <input className="input-field" value={chatbot?.bot_name} onChange={e => setChatbot({...chatbot, bot_name: e.target.value})} onBlur={() => handleUpdateChatbot({ bot_name: chatbot.bot_name })} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: `${COLORS.indigo}05`, borderRadius: '20px', border: `1px dashed ${COLORS.indigo}30` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <Sparkles size={20} color={COLORS.indigo} />
                                        <span style={{ fontWeight: 800, color: COLORS.slate900 }}>Gemini 1.5 Cognitive Engine</span>
                                    </div>
                                    <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={chatbot?.ai_enabled} onChange={e => handleUpdateChatbot({ ai_enabled: e.target.checked })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ⚙️ AI Prompt Engineering Hub */}
                    <div className="premium-card" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                             <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${COLORS.indigo}10`, color: COLORS.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Settings2 size={24} />
                             </div>
                             <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: COLORS.slate950 }}>Behavioral Configuration</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Inbound Greeting (Protocol 1)</label>
                                <textarea 
                                    className="input-field" style={{ height: '100px', resize: 'none' }}
                                    value={chatbot?.greeting_message}
                                    onChange={e => setChatbot({...chatbot, greeting_message: e.target.value})}
                                    onBlur={() => handleUpdateChatbot({ greeting_message: chatbot.greeting_message })}
                                    placeholder="The initial autonomous response to first-time contacts."
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Cognitive Prompt (Gemini Instructions)</label>
                                <textarea 
                                    className="input-field" style={{ height: '200px', resize: 'none', background: `${COLORS.indigo}02`, border: `1.5px solid ${COLORS.indigo}30` }}
                                    value={chatbot?.ai_prompt}
                                    onChange={e => setChatbot({...chatbot, ai_prompt: e.target.value})}
                                    onBlur={() => handleUpdateChatbot({ ai_prompt: chatbot.ai_prompt })}
                                    placeholder="Define the bot's tone, property knowledge base, and site-visit scheduling logic..."
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.indigo, fontSize: '0.75rem', fontWeight: 800, marginTop: '4px' }}>
                                    <Target size={12} /> Instructions are processed in real-time on every interaction.
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate500, textTransform: 'uppercase' }}>Fallback Buffer</label>
                                <textarea 
                                    className="input-field" style={{ height: '80px', resize: 'none' }}
                                    value={chatbot?.fallback_message}
                                    onChange={e => setChatbot({...chatbot, fallback_message: e.target.value})}
                                    onBlur={() => handleUpdateChatbot({ fallback_message: chatbot.fallback_message })}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
