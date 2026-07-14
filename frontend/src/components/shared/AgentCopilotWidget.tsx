import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Maximize2, Minimize2 } from 'lucide-react';
import { copilotApi } from '../../api/client';

export default function AgentCopilotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hey! I'm your AI Copilot. Need info on a project or an objection-handling script?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await copilotApi.ask({ query: userMsg });
            setMessages(prev => [...prev, { role: 'assistant', text: res.answer }]);
        } catch (err) {
            console.error('[COPILOT X-DEBUG]', err);
            const errorMsg = err.error || err.message || "Unreachable AI Core";
            setMessages(prev => [...prev, { role: 'assistant', text: `🆔 [X-TRACE-77]: ${errorMsg}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Render markdown extremely safely (just simple bolding and bullet mapping for safety)
    const renderMessage = (text) => {
        return text.split('\n').map((line, i) => {
            if (line.trim() === '') return <br key={i} />;
            let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return <div key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
        });
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="hover-lift"
                style={{
                    position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
                    width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    boxShadow: '0 12px 24px rgba(79, 70, 229, 0.4)', border: 'none', cursor: 'pointer'
                }}
            >
                <Sparkles size={28} />
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed', bottom: 32, right: isExpanded ? '50%' : 32, 
            transform: isExpanded ? 'translateX(50%)' : 'none',
            zIndex: 9999, width: isExpanded ? '800px' : '380px', maxWidth: 'calc(100vw - 40px)',
            height: isExpanded ? '80vh' : '550px', maxHeight: 'calc(100vh - 40px)',
            background: 'white', borderRadius: '24px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(10,22,40,0.15)', overflow: 'hidden', border: '1px solid #f1f5f9',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '12px' }}>
                        <Bot size={20} color="#818cf8" />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, letterSpacing: '0.02em' }}>Zentrix Co-Pilot</h4>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Online (Gemini AI)
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }} className="hide-mobile">
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        {msg.role === 'assistant' && (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                                <Sparkles size={14} color="#6366f1" />
                            </div>
                        )}
                        <div style={{ 
                            padding: '12px 16px', borderRadius: '18px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500,
                            background: msg.role === 'user' ? '#6366f1' : 'white',
                            color: msg.role === 'user' ? 'white' : '#1e293b',
                            border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                            borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            {renderMessage(msg.text)}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={14} color="#6366f1" />
                        </div>
                        <div style={{ padding: '12px 16px', borderRadius: '18px', background: 'white', border: '1px solid #e2e8f0', borderTopLeftRadius: 4 }}>
                            <div className="typing-indicator" style={{ display: 'flex', gap: 4 }}>
                                <div style={{ width: 6, height: 6, background: '#cbd5e1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                                <div style={{ width: 6, height: 6, background: '#cbd5e1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                                <div style={{ width: 6, height: 6, background: '#cbd5e1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '8px 16px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about inventory, floor plans, or pitch advice..."
                        style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        style={{ 
                            background: input.trim() && !loading ? '#6366f1' : '#cbd5e1', color: 'white', border: 'none', 
                            width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: input.trim() && !loading ? 'pointer' : 'default', transition: 'all 0.2s'
                        }}
                    >
                        <Send size={16} style={{ marginLeft: 2 }} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                @media (max-width: 768px) {
                    .hide-mobile { display: none !important; }
                }
            `}</style>
        </div>
    );
}
