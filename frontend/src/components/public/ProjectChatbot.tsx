import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
    role: 'user' | 'bot';
    text: string;
}

export default function ProjectChatbot({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: `Hi! I'm your Zentrix Assistant. Interested in ${projectName}? Ask me anything about the location, amenities, or configuration!` }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!message.trim() || loading) return;

        const userMsg = message.trim();
        setMessage('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/public/projects/${projectId}/chat`, {
                message: userMsg,
                history: messages.slice(-6).map(m => ({ role: m.role === 'bot' ? 'model' : 'user', text: m.text }))
            });

            setMessages(prev => [...prev, { role: 'bot', text: response.data.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "I'm having a bit of trouble connecting. Please try again or use the enquiry form above!" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                        color: 'white', border: 'none', cursor: 'pointer',
                        boxShadow: '0 10px 30px rgba(30, 58, 138, 0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.3s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MessageSquare size={28} />
                    <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, background: '#10b981', borderRadius: '50%', border: '3px solid white' }} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    width: 380, height: 500, background: 'white', borderRadius: 24,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {/* Header */}
                    <div style={{ 
                        padding: '20px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', 
                        color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={22} />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 800 }}>Zentrix Concierge</div>
                                <div style={{ fontSize: 11, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }} />
                                    Online • AI Powered
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ 
                                display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%'
                            }}>
                                <div style={{ 
                                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                    background: m.role === 'user' ? '#e2e8f0' : '#1e3a8a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginTop: 4
                                }}>
                                    {m.role === 'user' ? <User size={14} color="#64748b" /> : <Sparkles size={14} color="white" />}
                                </div>
                                <div style={{ 
                                    padding: '12px 16px', borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                                    background: m.role === 'user' ? '#1e3a8a' : 'white',
                                    color: m.role === 'user' ? 'white' : '#1e293b',
                                    boxShadow: m.role === 'bot' ? '0 2px 10px rgba(0,0,0,0.03)' : 'none',
                                    border: m.role === 'bot' ? '1px solid #edf2f7' : 'none',
                                    borderTopLeftRadius: m.role === 'bot' ? 4 : 16,
                                    borderTopRightRadius: m.role === 'user' ? 4 : 16,
                                }}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sparkles size={14} color="white" />
                                </div>
                                <div style={{ padding: '12px 16px', background: 'white', borderRadius: 16, borderTopLeftRadius: 4, display: 'flex', alignItems: 'center' }}>
                                    <Loader2 size={16} className="animate-spin" color="#1e3a8a" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: 20, borderTop: '1px solid #edf2f7' }}>
                        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
                            <input 
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about price, location..."
                                style={{
                                    flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #edf2f7',
                                    fontSize: 13, outline: 'none', transition: 'border-color 0.2s'
                                }}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!message.trim() || loading}
                                style={{
                                    width: 44, height: 44, borderRadius: 12, border: 'none',
                                    background: '#1e3a8a', color: 'white', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
