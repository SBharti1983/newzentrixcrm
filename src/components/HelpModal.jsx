import { createPortal } from 'react-dom';
import { X, Book, MessageSquare, Phone, Mail, Globe, ShieldQuestion } from 'lucide-react';

export default function HelpModal({ onClose }) {
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

                    <div className="support-footer">
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

