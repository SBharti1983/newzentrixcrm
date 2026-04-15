import { useState, useEffect } from 'react';
import { X, Sparkles, Send, Copy, RefreshCw, CheckCircle2, MessageSquare } from 'lucide-react';
import { aiApi, notificationsApi } from '../api/client';
import { useToast } from '../hooks/useToast';

export default function AIPitchModal({ lead, onClose, fixedProject }) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [pitch, setPitch] = useState(null);
    const [sending, setSending] = useState(false);

    const generatePitch = async () => {
        try {
            setLoading(true);
            const data = await aiApi.generatePitch({ 
                lead_id: lead.id === 'null' ? null : lead.id,
                project_id: fixedProject ? fixedProject.id : lead.project_id 
            });
            setPitch(data);
        } catch (err) {
            addToast({ type: 'error', title: 'AI Error', message: 'Failed to generate personalized pitch.' });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (lead) generatePitch();
    }, [lead]);

    const handleSendWhatsApp = async () => {
        if (!pitch || !lead.phone) return;
        try {
            setSending(true);
            const message = `*${pitch.headline}*\n\n${pitch.hook}\n\n${pitch.value_propositions.map(p => `• ${p}`).join('\n')}\n\n${pitch.cta}`;
            
            await notificationsApi.send({
                channels: ['WhatsApp'],
                lead_id: lead.id,
                recipient_phone: lead.phone,
                body: message
            });
            
            addToast({ type: 'success', title: 'Pitch Sent', message: 'Personalized project pitch sent via WhatsApp.' });
            onClose();
        } catch (err) {
            addToast({ type: 'error', title: 'Delivery Failed', message: 'Failed to send WhatsApp pitch.' });
        } finally {
            setSending(false);
        }
    };

    const handleCopy = () => {
        const text = `${pitch.headline}\n${pitch.hook}\n\n${pitch.value_propositions.join('\n')}\n\n${pitch.cta}`;
        navigator.clipboard.writeText(text);
        addToast({ type: 'success', title: 'Copied', message: 'Pitch text copied to clipboard.' });
    };

    return (
        <div className="modal-overlay" style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="modal" style={{ maxWidth: '600px', background: 'white', overflow: 'hidden', padding: 0 }}>
                
                {/* Header */}
                <div style={{ 
                    padding: '24px 32px', background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', 
                    color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'relative'
                }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
                        <Sparkles size={120} />
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <Sparkles size={18} color="var(--accent-cyan)" />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>AI Project Pitch</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Tailored specifically for {lead.name}</p>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ color: 'white', zIndex: 1 }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '32px' }}>
                    {loading ? (
                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                            <div className="ai-pulse" style={{ width: 64, height: 64, background: 'var(--navy-50)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw size={24} color="var(--accent-violet)" className="animate-spin" />
                            </div>
                            <h4 style={{ fontWeight: 800, color: 'var(--navy-900)' }}>Analyzing Interaction History...</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>Our AI Engine is crafting the perfect pitch based on recent conversations.</p>
                        </div>
                    ) : (
                        <div className="animate-fadeIn">
                            {/* Headline & Hook */}
                            {pitch ? (
                                <>
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 8, lineHeight: 1.3 }}>{pitch.headline}</div>
                                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '3px solid var(--accent-cyan)', paddingLeft: 16 }}>
                                            "{pitch.hook}"
                                        </p>
                                    </div>

                                    {/* Value Props */}
                                    <div style={{ background: 'var(--slate-50)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-light)', marginBottom: 24 }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Key Value Proposition</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {(pitch.value_propositions || []).map((prop, i) => (
                                                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                                        <CheckCircle2 size={12} color="white" />
                                                    </div>
                                                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--navy-800)' }}>{prop}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div style={{ marginBottom: 32 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-violet)', textTransform: 'uppercase', marginBottom: 8 }}>Call to Action</div>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)' }}>{pitch.cta}</div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <button className="btn btn-secondary" onClick={handleCopy} style={{ height: 48, borderRadius: 14 }}>
                                            <Copy size={16} /> Copy Text
                                        </button>
                                        <button className="btn btn-primary" onClick={handleSendWhatsApp} disabled={sending} style={{ height: 48, borderRadius: 14, background: '#25D366', border: 'none' }}>
                                            {sending ? <RefreshCw size={16} className="animate-spin" /> : <><MessageSquare size={16} /> Send WhatsApp</>}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <AlertTriangle size={32} color="var(--accent-amber)" style={{ marginBottom: 16 }} />
                                    <p style={{ color: 'var(--text-muted)' }}>Could not generate pitch. Please try again.</p>
                                    <button onClick={generatePitch} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Retry</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 32px', background: 'var(--slate-50)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                        POWERED BY GEMINI AI
                    </div>
                </div>
            </div>
        </div>
    );
}
