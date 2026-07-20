import { createPortal } from 'react-dom';
import { X, Book, MessageSquare, Phone, Mail, Globe, ShieldQuestion, Mic } from 'lucide-react';

interface HelpModalProps {
    onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
    return createPortal(
        <div className="help-modal-overlay animate-fadeIn" onClick={onClose}>
            <div className="help-modal glass-card" onClick={e => e.stopPropagation()}>

                <div className="help-header">
                    <div className="title-area">
                        <ShieldQuestion size={24} color="var(--navy-400)" />
                        <div>
                            <h3>Support & Help Center</h3>
                            <p>Find answers or get in touch with our team</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>

                <div className="help-body">
                    <div className="help-grid">
                        <div className="help-card">
                            <Book size={20} className="card-icon" />
                            <h4>Documentation</h4>
                            <p>Browse our detailed guides and API docs</p>
                            <button className="link-btn">Go to Docs</button>
                        </div>
                        <div className="help-card">
                            <MessageSquare size={20} className="card-icon" />
                            <h4>Live Chat</h4>
                            <p>Chat with a support specialist (9 AM - 6 PM)</p>
                            <button className="link-btn">Start Chat</button>
                        </div>
                        <div className="help-card">
                            <Phone size={20} className="card-icon" />
                            <h4>Call Support</h4>
                            <p>Direct line for enterprise customers only</p>
                            <button className="link-btn">+91 800 234 5678</button>
                        </div>
                        <div className="help-card">
                            <Mail size={20} className="card-icon" />
                            <h4>Email Us</h4>
                            <p>Average response time: 2-4 hours</p>
                            <button className="link-btn">support@zentrix.com</button>
                        </div>
                    </div>

                    {/* Voice Assistant Support Guide */}
                    <div style={{
                        marginTop: '16px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', pointerEvents: 'none' }} />
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Mic size={16} color="#6366f1" />
                            </div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>AI Voice Assistant Guide</h4>
                        </div>

                        <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                            To trigger Rohan (AI Sales Voice Agent), open the Dialer from the mobile hub or floating button and tap the <strong>AI Voice</strong> tab. You can speak directly or click these shortcut commands:
                        </p>

                        {/* Leads Commands */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6366f1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>📋 Lead Filters</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {[
                                    '"Show lost leads."',
                                    '"Show won leads."',
                                    '"Show hot leads."',
                                    '"Show cold leads."',
                                    '"Show nurture leads."',
                                    '"Show new leads."',
                                    '"Show all leads."',
                                ].map((cmd, i) => (
                                    <span key={i} style={{
                                        background: 'white', border: '1px solid rgba(99, 102, 241, 0.15)',
                                        borderRadius: '8px', padding: '4px 10px',
                                        fontSize: '0.67rem', fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace'
                                    }}>{cmd}</span>
                                ))}
                            </div>
                        </div>

                        {/* Call Commands */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0891b2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>📞 Calling</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {[
                                    '"Call Amit."',
                                    '"Call Priya."',
                                    '"Dial 9876543210."',
                                ].map((cmd, i) => (
                                    <span key={i} style={{
                                        background: 'white', border: '1px solid rgba(8, 145, 178, 0.15)',
                                        borderRadius: '8px', padding: '4px 10px',
                                        fontSize: '0.67rem', fontWeight: 700, color: '#0e7490', fontFamily: 'monospace'
                                    }}>{cmd}</span>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Commands */}
                        <div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#059669', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>🧭 Navigation</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {[
                                    '"Show my pipeline."',
                                    '"Show follow-ups."',
                                    '"Schedule a visit."',
                                    '"Open deals."',
                                    '"Go to dashboard."',
                                    '"Open calendar."',
                                ].map((cmd, i) => (
                                    <span key={i} style={{
                                        background: 'white', border: '1px solid rgba(5, 150, 105, 0.15)',
                                        borderRadius: '8px', padding: '4px 10px',
                                        fontSize: '0.67rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace'
                                    }}>{cmd}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="support-footer" style={{ marginTop: '16px' }}>
                        <div className="version-info">
                            <span>ZentrixCRM Version 1.2.4 (Enterprise Edition)</span>
                            <Globe size={14} />
                        </div>
                        <button className="feedback-btn">Send Feedback</button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .help-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(4, 13, 26, 0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .help-modal {
                    width: 100%;
                    max-width: 620px;
                    max-height: 88vh;
                    background: white;
                    border-radius: var(--border-radius-xl);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    position: relative;
                    margin: auto;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .help-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }
                .title-area {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .title-area h3 {
                    margin: 0;
                    font-size: 1.1rem;
                }
                .title-area p {
                    margin: 1px 0 0;
                    font-size: 0.8rem;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                    transition: all var(--transition-fast);
                }
                .close-btn:hover {
                    background: var(--slate-50);
                    color: var(--text-primary);
                }
                .help-body {
                    padding: 20px 24px;
                    flex: 1;
                    overflow-y: auto;
                    max-height: calc(88vh - 72px);
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }
                .help-body::-webkit-scrollbar {
                    width: 5px;
                }
                .help-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                .help-body::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 99px;
                }
                .help-body::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                .help-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .help-card {
                    padding: 16px;
                    border: 1px solid var(--border-light);
                    border-radius: var(--border-radius-lg);
                    transition: all var(--transition-fast);
                }
                .help-card:hover {
                    border-color: var(--navy-200);
                    background: var(--slate-50);
                }
                .card-icon {
                    color: var(--navy-500);
                    margin-bottom: 8px;
                }
                .help-card h4 {
                    margin: 0 0 6px 0;
                    font-size: 0.95rem;
                }
                .help-card p {
                    font-size: 0.775rem;
                    line-height: 1.4;
                    margin-bottom: 12px;
                }
                .link-btn {
                    display: block;
                    width: 100%;
                    padding: 6px;
                    background: white;
                    border: 1px solid var(--border-light);
                    border-radius: var(--border-radius-md);
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--navy-600);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    text-align: center;
                }
                .link-btn:hover {
                    background: var(--navy-600);
                    color: white;
                    border-color: var(--navy-600);
                }
                .support-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-light);
                }
                .version-info {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }
                .feedback-btn {
                    padding: 6px 12px;
                    background: var(--slate-100);
                    border: none;
                    border-radius: var(--border-radius-md);
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .feedback-btn:hover {
                    background: var(--slate-200);
                    color: var(--text-primary);
                }

            `}} />
        </div>,
        document.body
    );
}

