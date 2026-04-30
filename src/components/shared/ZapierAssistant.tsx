import { useState, useEffect } from 'react';
import { Sparkles, X, Zap, Target, MessageSquare, ChevronRight, Loader2, Wand2, ShieldCheck, BrainCircuit } from 'lucide-react';
import { zapierApi } from '../../api/client';

export default function ZapierAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        if (isOpen && recommendations.length === 0) {
            fetchRecs();
        }
    }, [isOpen]);

    const fetchRecs = async () => {
        setLoading(true);
        try {
            const data = await zapierApi.getRecommendations();
            setRecommendations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="zapier-trigger-btn animate-bounce-subtle"
                    aria-label="Open Zapier AI"
                >
                    <div className="trigger-inner">
                        <Sparkles size={24} />
                    </div>
                </button>
            )}

            {/* Sidebar Assistant Panel */}
            {isOpen && (
                <div className="zapier-panel animate-slideInRight">
                    <div className="panel-header">
                        <div className="header-content">
                            <div className="ai-badge">
                                <BrainCircuit size={18} />
                            </div>
                            <div className="header-text">
                                <h3>Zapier AI</h3>
                                <span className="status-label">LIVE INTELLIGENCE</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="close-panel-btn">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="panel-content">
                        {/* Recommendations Section */}
                        <div className="content-section">
                            <div className="section-head">
                                <Sparkles size={14} className="icon-sparkle" />
                                <h4>SMART RECOMMENDATIONS</h4>
                            </div>

                            {loading ? (
                                <div className="loading-state">
                                    <div className="loading-spinner">
                                        <Loader2 className="animate-spin" size={24} />
                                    </div>
                                    <p>AI is analyzing your pipeline...</p>
                                </div>
                            ) : recommendations.length > 0 ? (
                                <div className="recommendations-list">
                                    {recommendations.map((rec, i) => (
                                        <div key={i} className="rec-card glass-card">
                                            <div className="rec-accent" style={{ background: rec.priority === 'High' ? 'var(--accent-rose)' : '#FF4F00' }} />
                                            <div className="rec-header">
                                                {rec.type === 'opportunity' ? <Zap size={14} color="#f59e0b" /> : <Target size={14} color="#FF4F00" />}
                                                <span className="rec-title">{rec.title}</span>
                                            </div>
                                            <p className="rec-desc">{rec.description}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <Target size={32} />
                                    </div>
                                    <p>No new actions recommended.</p>
                                    <span>Check back as your leads progress.</span>
                                </div>
                            )}
                        </div>

                        {/* Tools Section */}
                        <div className="content-section">
                            <div className="section-head">
                                <Zap size={14} className="icon-zap" />
                                <h4>ZAPIER AI TOOLS</h4>
                            </div>
                            <div className="tools-grid">
                                <ToolButton 
                                    icon={<Wand2 size={18} />} 
                                    title="Draft Magic Message" 
                                    desc="AI-powered personalized responses" 
                                />
                                <ToolButton 
                                    icon={<Zap size={18} />} 
                                    title="Enrich Records" 
                                    desc="Deep data cleanup and insights" 
                                />
                                <ToolButton 
                                    icon={<MessageSquare size={18} />} 
                                    title="Predict Conversion" 
                                    desc="Likelihood scoring for every lead" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="panel-footer">
                        <div className="footer-status">
                            <ShieldCheck size={14} color="var(--accent-emerald)" />
                            <span>Enterprise API Secured</span>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .zapier-trigger-btn {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 64px;
                    height: 64px;
                    border-radius: 20px;
                    background: var(--navy-900);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 12px 40px rgba(10, 22, 40, 0.4);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    cursor: pointer;
                    z-index: 2100;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .zapier-trigger-btn:hover {
                    transform: scale(1.1) translateY(-5px);
                    box-shadow: 0 15px 45px rgba(10, 22, 40, 0.5);
                    border-color: var(--accent-cyan);
                }
                .trigger-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--accent-cyan);
                    animation: sparkle-rotate 6s infinite linear;
                }
                @keyframes sparkle-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .zapier-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 420px;
                    height: calc(100vh - 40px);
                    max-height: 850px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border-radius: 32px;
                    box-shadow: 0 20px 80px rgba(10, 22, 40, 0.2);
                    z-index: 2200;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    overflow: hidden;
                }
                
                .panel-header {
                    padding: 32px 32px 24px;
                    background: linear-gradient(to bottom, rgba(10, 22, 40, 0.05), transparent);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header-content {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .ai-badge {
                    background: var(--navy-900);
                    padding: 12px;
                    border-radius: 16px;
                    color: var(--accent-cyan);
                    box-shadow: 0 8px 24px rgba(10, 22, 40, 0.2);
                }
                .header-text h3 {
                    margin: 0;
                    font-size: 1.4rem;
                    font-weight: 900;
                    color: var(--navy-900);
                    letter-spacing: -0.02em;
                }
                .status-label {
                    font-size: 0.7rem;
                    letter-spacing: 0.12em;
                    font-weight: 800;
                    color: var(--accent-cyan-dark);
                    background: rgba(6, 182, 212, 0.1);
                    padding: 2px 8px;
                    border-radius: 4px;
                }
                .close-panel-btn {
                    background: white;
                    border: 1px solid var(--border-light);
                    color: var(--text-secondary);
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                .close-panel-btn:hover {
                    background: var(--slate-100);
                    transform: scale(1.1);
                }
                
                .panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 32px 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                }
                .content-section {
                    display: flex;
                    flex-direction: column;
                }
                .section-head {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .section-head h4 {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--slate-500);
                    font-weight: 900;
                    letter-spacing: 0.1em;
                }
                .icon-sparkle { color: var(--accent-amber); }
                .icon-zap { color: var(--accent-violet); }
                
                .rec-card {
                    background: white;
                    border: 1px solid var(--border-light);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 16px;
                    position: relative;
                    transition: all 0.3s;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                }
                .rec-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 32px rgba(10, 22, 40, 0.08);
                    border-color: var(--accent-cyan);
                }
                .rec-accent {
                    position: absolute;
                    left: 0;
                    top: 20px;
                    bottom: 20px;
                    width: 4px;
                    border-radius: 0 4px 4px 0;
                }
                .rec-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                .rec-title {
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: var(--navy-900);
                }
                .rec-desc {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    line-height: 1.5;
                }
                
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 60px 0;
                    gap: 20px;
                }
                .loading-spinner {
                    background: white;
                    width: 56px;
                    height: 56px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px rgba(10, 22, 40, 0.1);
                    color: var(--accent-cyan);
                }
                
                .panel-footer {
                    padding: 24px 32px;
                    background: rgba(255, 255, 255, 0.5);
                    border-top: 1px solid rgba(255, 255, 255, 0.4);
                }
                .footer-status {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.75rem;
                    color: var(--slate-500);
                    font-weight: 700;
                }

                .animate-bounce-subtle {
                    animation: bounce-subtle 4s infinite ease-in-out;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}} />
        </>
    );
}

function ToolButton({ icon, title, desc }) {
    return (
        <button className="tool-btn">
            <div className="tool-icon-box">{icon}</div>
            <div className="tool-info">
                <span className="tool-title">{title}</span>
                <span className="tool-desc">{desc}</span>
            </div>
            <ChevronRight size={16} className="tool-arrow" />
            
            <style dangerouslySetInnerHTML={{ __html: `
                .tool-btn {
                    width: 100%;
                    padding: 16px;
                    background: #fff;
                    border: 1px solid #f1f5f9;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .tool-btn:hover {
                    border-color: #FF4F00;
                    background: #fffefb;
                    transform: translateX(4px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                }
                .tool-icon-box {
                    background: #f8fafc;
                    padding: 10px;
                    border-radius: 12px;
                    color: #1e293b;
                    transition: all 0.3s;
                }
                .tool-btn:hover .tool-icon-box {
                    background: #FF4F00;
                    color: white;
                }
                .tool-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .tool-title {
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 2px;
                }
                .tool-desc {
                    font-size: 0.75rem;
                    color: #64748b;
                }
                .tool-arrow {
                    color: #94a3b8;
                    transition: all 0.2s;
                }
                .tool-btn:hover .tool-arrow {
                    color: #FF4F00;
                    transform: translateX(2px);
                }
            `}} />
        </button>
    );
}

