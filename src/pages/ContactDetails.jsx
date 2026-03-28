import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLoader, PageError } from '../components/Feedback';
import { ChevronLeft, ChevronDown, Edit2, Mail, Phone, Calendar as CalendarIcon, CheckSquare, Settings, Search, Plus, UserPlus, Target, ThumbsUp, ThumbsDown, Copy, X, Sparkles, Brain, Wand2, RefreshCw, ExternalLink, TrendingUp, MessageSquare, Briefcase, Mic, ArrowRight, Zap, Home, MapPin, DollarSign, Tag, Smile, ShieldCheck, Rocket, ClipboardCheck, FileText, Clock, UploadCloud } from 'lucide-react';
import { leadsApi, zapierApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { dialerEvents } from '../constants/events';
import NotificationComposer from '../components/NotificationComposer';

const LIFECYCLE_STAGES = ['New', 'Contacted', 'Qualified', 'Disqualified', 'Nurture', 'Site Visit', 'Negotiation', 'Won', 'Lost'];
const LIFECYCLE_COLORS = {
    'New': { bg: 'rgba(59, 130, 246, 0.08)', text: 'var(--navy-600)', icon: UserPlus },
    'Contacted': { bg: 'rgba(99, 102, 241, 0.08)', text: '#4338ca', icon: Target },
    'Qualified': { bg: 'rgba(6, 182, 212, 0.08)', text: 'var(--accent-cyan-dark)', icon: Zap },
    'Disqualified': { bg: 'var(--slate-100)', text: 'var(--slate-600)', icon: X },
    'Nurture': { bg: 'rgba(124, 77, 255, 0.08)', text: '#7c3aed', icon: TrendingUp },
    'Site Visit': { bg: 'rgba(20, 184, 166, 0.08)', text: '#0f766e', icon: MapPin },
    'Negotiation': { bg: 'rgba(245, 158, 11, 0.08)', text: '#b45309', icon: DollarSign },
    'Won': { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--accent-emerald-dark)', icon: ShieldCheck },
    'Lost': { bg: 'rgba(244, 63, 94, 0.08)', text: 'var(--accent-rose-dark)', icon: CheckSquare }
};

export default function ContactDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('Overview');
    const [newNote, setNewNote] = useState('');
    const [showActivityBox, setShowActivityBox] = useState(false);
    const [activityType, setActivityType] = useState('Note');
    const [showAIReport, setShowAIReport] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [interactions, setInteractions] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [contact, setContact] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [showStageMenu, setShowStageMenu] = useState(false);
    const [updatingStage, setUpdatingStage] = useState(false);
    const [summarizing, setSummarizing] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [showComposer, setShowComposer] = useState(false);
    const [composerTrigger, setComposerTrigger] = useState(null);
    const [generatingContent, setGeneratingContent] = useState(false);

    const handleVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('Voice intelligence not supported in this browser', 'error');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setNewNote(prev => prev + (prev ? ' ' : '') + transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleSummarize = async () => {
        if (!newNote.trim()) {
            showToast('No content to summarize', 'warning');
            return;
        }
        setSummarizing(true);
        try {
            const result = await zapierApi.summarizeCall({ transcript: newNote });
            const summaryText = `\n\n--- AI SUMMARY ---\n${result.summary}\n\nKey Points:\n${result.keyPoints.map(p => `• ${p}`).join('\n')}\n\nAction Items:\n${result.actionItems.map(a => `• ${a}`).join('\n')}\nSentiment: ${result.sentiment}`;
            setNewNote(prev => prev + summaryText);
            showToast('AI Summary generated!', 'success');
        } catch (_e) {
            showToast('Failed to generate summary', 'error');
        } finally {
            setSummarizing(false);
        }
    };

    const handleAIGenerate = async () => {
        setGeneratingContent(true);
        showToast(`Drafting ${activityType}...`, 'info');
        try {
            const result = await zapierApi.generateContent({
                leadId: id,
                channel: activityType.toLowerCase(),
                tone: 'professional and persuasive',
                goal: 'Nurture relationship and request a prompt follow-up or site visit.'
            });
            const draft = result.subject ? `Subject: ${result.subject}\n\n${result.body}` : result.body;
            setNewNote(draft);
            if (result.tips) {
                showToast(`Agent Tip: ${result.tips}`, 'success');
            }
        } catch (_e) {
            showToast('Failed to auto-generate content', 'error');
        } finally {
            setGeneratingContent(false);
        }
    };

    const handleAudioUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAudio(true);
        showToast('Uploading and transcribing audio...', 'info');
        
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('leadId', id); // send lead ID to tie transcript chronologically

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:4000/api/zapier/transcribe-call', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to transcribe');
            
            showToast(`Transcription complete! Sentiment: ${data.sentiment}`, 'success');
            
            // Reload timeline to show the newly inserted audio log
            loadData();
            
        } catch (error) {
            console.error('Transcription Error:', error);
            showToast(error.message || 'Failed to process audio', 'error');
        } finally {
            setUploadingAudio(false);
            e.target.value = ''; // Reset input
        }
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await leadsApi.get(id);
            setContact(data);
            const rawInteractions = Array.isArray(data.interactions) ? data.interactions.filter(i => i && i.id) : [];
            if (rawInteractions.length === 0) {
                const now = new Date();
                setInteractions([
                    { id: 'd1', type: 'Call', entry_type: 'log', note: 'Outbound call successful. Client is interested in the 4BHK layout in Signature Tower. Asked to send the floor plans via WhatsApp.', date: new Date(now - 1000 * 60 * 60 * 2).toISOString(), agent_name: 'Siddharth M.' },
                    { id: 'd2', type: 'system', entry_type: 'system', note: 'Lead score increased from 64 to 92 based on high engagement with project walkthrough.', date: new Date(now - 1000 * 60 * 60 * 5).toISOString() },
                    { id: 'd3', type: 'Note', entry_type: 'log', note: 'Met with client at project site. Preferred high-floor units with North-East facing balcony.', date: new Date(now - 1000 * 60 * 60 * 24).toISOString(), agent_name: 'Priya Singh' },
                    { id: 'd4', type: 'Meeting', entry_type: 'log', note: 'Initial discovery session completed. Budget confirmed at ₹1.1 Cr - ₹1.4 Cr range.', date: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(), agent_name: 'Siddharth M.' }
                ]);
            } else {
                setInteractions(rawInteractions);
            }
        } catch (err) {
            setError(err.error || 'Failed to load contact');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateStage = async (newStage) => {
        if (newStage === contact.stage) {
            setShowStageMenu(false);
            return;
        }
        setUpdatingStage(true);
        try {
            const updated = await leadsApi.update(id, { stage: newStage });
            setContact(updated);
            showToast(`Lead moved to ${newStage}`, 'success');
            setShowStageMenu(false);
        } catch (_e) {
            showToast('Failed to update stage', 'error');
        } finally {
            setUpdatingStage(false);
        }
    };


    const displayDates = useMemo(() => {
        if (!contact) return {};
        const now = new Date();
        return {
            createdAt: new Date(contact.created_at || now),
            lastContact: contact.last_contact_at ? new Date(contact.last_contact_at) : null
        };
    }, [contact]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={() => window.location.reload()} />;
    if (!contact) return <div style={{ padding: 40, textAlign: 'center' }}>Contact not found</div>;

    const initial = contact.name ? contact.name[0].toUpperCase() : '?';

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            await leadsApi.addInteraction(id, { type: activityType, note: newNote });
            setNewNote('');
            setShowActivityBox(false);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        try {
            const res = await zapierApi.enrichLead(id);
            setAiInsights(res.insights || res.suggestions);
            showToast('Zapier AI has enriched this record', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to enrich record', 'error');
        } finally {
            setEnriching(false);
        }
    };



    const PALETTE = [
        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', 
        '#ef4444', '#6366f1', '#14b8a6', '#ec4899', '#f97316'
    ];
    const colorIndex = (contact.name || 'A').charCodeAt(0) % PALETTE.length;
    const avatarBg = PALETTE[colorIndex];
    const currentStageStyle = LIFECYCLE_COLORS[contact.stage] || LIFECYCLE_COLORS['New'];

    return (
        <div className="contact-details-layout" style={{ backgroundColor: '#f8fafc', fontFamily: 'var(--font-main)', overflow: 'hidden' }}>
            {/* LEFT COLUMN - Profile Summary (Modernized) */}
            <div className="contact-details-sidebar" style={{ 
                borderRight: '1px solid var(--border-light)', 
                backgroundColor: 'white', 
                display: 'flex', 
                flexDirection: 'column', 
                overflowY: 'auto',
                boxShadow: '4px 0 24px rgba(10,22,40,0.02)',
                zIndex: 10
            }}>
                <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-light)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => navigate('/leads')} className="hover-lift" style={{ 
                        background: 'var(--slate-50)', border: '1px solid #e2e8f0', borderRadius: '12px',
                        padding: '8px 14px', fontSize: '13px', color: 'var(--navy-600)', fontWeight: 800, 
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' 
                    }}>
                        <ChevronLeft size={16} /> Back
                    </button>
                    <div style={{ padding: '6px 14px', background: currentStageStyle.bg, color: currentStageStyle.text, borderRadius: '20px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {contact.stage}
                    </div>
                </div>

                <div style={{ padding: '32px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{
                            width: 84, height: 84,
                            background: avatarBg,
                            color: 'white',
                            borderRadius: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', fontWeight: 900,
                            margin: '0 auto 20px',
                            boxShadow: `0 20px 40px ${avatarBg}30`,
                            border: '4px solid white',
                            textTransform: 'uppercase',
                            position: 'relative'
                        }}>
                            {initial}
                            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, background: '#10b981', border: '4px solid white', borderRadius: '50%', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }} />
                        </div>
                        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.7px' }}>{contact.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <div style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MapPin size={14} color="var(--slate-400)" /> {contact.city || 'Location Not Set'}
                            </div>
                        </div>
                    </div>

                    {/* Strategic Action Hub */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: 12, 
                        marginBottom: 32,
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '24px',
                        border: '1.5px solid #f1f5f9'
                    }}>
                        {[
                            { icon: Edit2, label: 'Note', color: '#f59e0b', bg: 'white', action: () => { setActivityType('Note'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Mail, label: 'Email', color: '#3b82f6', bg: 'white', action: () => { setActivityType('Email'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Phone, label: 'Call', color: '#10b981', bg: 'white', action: () => dialerEvents.call(contact.id, contact.phone, contact.name) },
                            { icon: MessageSquare, label: 'WhatsApp', color: '#25D366', bg: 'white', action: () => { setActivityType('WhatsApp'); setActiveTab('Activities'); setShowActivityBox(true); } }
                        ].map(act => (
                            <button 
                                key={act.label} 
                                onClick={act.action} 
                                className="hover-lift" 
                                style={{ 
                                    padding: '16px 0', borderRadius: '18px', background: act.bg, 
                                    border: `1.5px solid #f1f5f9`, display: 'flex', flexDirection: 'column', 
                                    alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 4px 12px rgba(10,22,40,0.03)'
                                }}
                            >
                                <div style={{ 
                                    width: 38, height: 38, borderRadius: '12px', 
                                    background: `${act.color}10`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${act.color}20`
                                }}>
                                    <act.icon size={18} color={act.color} strokeWidth={2.5} />
                                </div>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{act.label}</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Core Identity Section */}
                        <div style={{ 
                            padding: '24px', 
                            borderRadius: '28px', 
                            background: '#f8fafc', 
                            border: '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Core Identity</h3>
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={13} color="var(--slate-400)" /></button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {[
                                    { label: 'Email Address', value: contact.email, icon: Mail, color: '#3b82f6' },
                                    { label: 'Phone Number', value: contact.phone, icon: Phone, color: '#10b981' },
                                    { label: 'Lead Owner', value: contact.agent_name || 'Arjun Sharma', icon: UserPlus, color: '#8b5cf6' }
                                ].map(field => (
                                    <div key={field.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ 
                                            width: 36, height: 36, borderRadius: '12px', 
                                            background: 'white', border: '1px solid #eef2f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 6px rgba(10,22,40,0.02)'
                                        }}>
                                            <field.icon size={16} color={field.color} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{field.label}</div>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy-900)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{field.value || 'Not provided'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ height: '1px', background: '#eef2f6', margin: '4px 0' }} />

                            {/* Journey Milestone - Refined */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShieldCheck size={14} color="var(--accent-emerald)" /> Journey Milestone
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setShowStageMenu(!showStageMenu)}
                                        style={{ 
                                            width: '100%', padding: '14px 16px', borderRadius: '16px', 
                                            background: 'white', 
                                            color: 'var(--navy-900)', 
                                            border: '1.5px solid #f1f5f9',
                                            fontSize: '13px', fontWeight: 900, 
                                            textAlign: 'left', display: 'flex', justifyContent: 'space-between', 
                                            alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: '0 4px 12px rgba(10,22,40,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentStageStyle.text }} />
                                            {contact.stage}
                                        </div>
                                        <ChevronDown size={14} style={{ transform: showStageMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }} />
                                    </button>
                                    {showStageMenu && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', boxShadow: '0 12px 30px rgba(10,22,40,0.12)', zIndex: 100, overflow: 'hidden' }}>
                                            {LIFECYCLE_STAGES.map(s => (
                                                <div key={s} onClick={() => handleUpdateStage(s)} style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 800, color: contact.stage === s ? 'var(--navy-900)' : 'var(--slate-600)', cursor: 'pointer', transition: 'all 0.15s', background: contact.stage === s ? 'var(--slate-50)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: LIFECYCLE_COLORS[s]?.text || 'var(--slate-400)' }} />
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inventory Pulse */}
                        <div style={{ 
                            padding: '24px', 
                            borderRadius: '28px', 
                            background: 'white', 
                            border: '1px solid #f1f5f9',
                            boxShadow: '0 10px 24px rgba(10,22,40,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Strategic Interest</h3>
                                <Sparkles size={14} color="#f59e0b" />
                            </div>
                            <div className="hover-lift" style={{ 
                                background: 'linear-gradient(135deg, #f8fafc, #ffffff)', 
                                padding: '16px', borderRadius: '20px', 
                                border: '1.5px solid #f1f5f9', 
                                display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' 
                            }}>
                                <div style={{ 
                                    width: 48, height: 48, borderRadius: '14px', 
                                    background: 'var(--navy-900)', color: 'white', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    fontWeight: 900, fontSize: '12px', flexShrink: 0, 
                                    boxShadow: '0 8px 16px rgba(10,22,40,0.15)' 
                                }}>
                                    {contact.project_name?.slice(0,2).toUpperCase() || 'SP'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--navy-900)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{contact.project_name || 'Signature Park'}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 800, marginTop: 2 }}>Budget: ₹{contact.budget || '1.1Cr'}</div>
                                </div>
                                <ArrowRight size={16} color="var(--slate-300)" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MIDDLE COLUMN - Executive Intelligence & Timeline */}
            <div className="contact-details-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#fcfdfe' }}>
                <div style={{ padding: '0 40px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                    <div style={{ display: 'flex', gap: 40 }}>
                        {['Overview', 'Activities', 'Intelligence'].map(tab => (
                            <div
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '24px 0',
                                    color: activeTab === tab ? 'var(--navy-900)' : 'var(--slate-400)',
                                    fontWeight: activeTab === tab ? 900 : 700,
                                    fontSize: '14px',
                                    borderBottom: `3.5px solid ${activeTab === tab ? 'var(--navy-900)' : 'transparent'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {tab === 'Overview' && <Home size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                                {tab === 'Activities' && <TrendingUp size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                                {tab === 'Intelligence' && <Brain size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                                {tab}
                                {tab === 'Intelligence' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid white', position: 'absolute', top: 18, right: -12 }} />}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="animate-fadeIn">
                    {activeTab === 'Intelligence' ? (
                        <div style={{ maxWidth: 800, margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Wand2 size={24} color="var(--accent-violet)" /> Data Enrichment
                                    </h2>
                                    <p style={{ color: 'var(--slate-500)', margin: '4px 0 0', fontSize: '14px' }}>AI-powered insights gathered from global databases and behavior.</p>
                                </div>
                                <button
                                    onClick={handleEnrich}
                                    disabled={enriching}
                                    className="btn btn-primary hover-lift"
                                    style={{ padding: '12px 24px', borderRadius: '14px', background: 'var(--navy-900)', boxShadow: '0 8px 16px rgba(10, 22, 40, 0.12)' }}>
                                    {enriching ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    {enriching ? 'Analyzing...' : 'Refresh Insights'}
                                </button>
                            </div>

                            {aiInsights ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    <div className="card glass-card ai-glow" style={{ gridColumn: 'span 2', padding: 40, borderRadius: '32px', border: '1px solid rgba(139, 92, 246, 0.18)', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(139, 92, 246, 0.05))' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent-violet)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Brain size={16} /> Lead Archetype
                                                </div>
                                                <h3 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, letterSpacing: '-1px' }}>{aiInsights.persona || 'High-Intent Professional'}</h3>
                                                <p style={{ fontSize: '15px', color: 'var(--slate-600)', marginTop: 12, maxWidth: 500, fontWeight: 500, lineHeight: 1.6 }}>Based on site behavior and global data signals, this lead is likely to close within the next 45 days.</p>
                                            </div>
                                            <div style={{ background: 'var(--accent-violet)', color: 'white', padding: '10px 20px', borderRadius: '16px', fontSize: '13px', fontWeight: 900, boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)' }}>
                                                94% MATCH
                                            </div>
                                        </div>
                                        
                                        {/* AI INTENT HEATMAP */}
                                        <div style={{ marginTop: 32, display: 'flex', gap: 32, alignItems: 'center' }}>
                                            <div style={{ position: 'relative', width: 120, height: 120 }}>
                                                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                                    <circle cx="18" cy="18" r="16" fill="none" stroke="var(--accent-violet)" strokeWidth="3" strokeDasharray="100, 100" strokeDashoffset={100 - (aiInsights.score || 88)} strokeLinecap="round" />
                                                </svg>
                                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '20px', fontWeight: 900, color: 'var(--navy-900)' }}>{aiInsights.score || 88}%</div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Propensity Matrix</div>
                                                <div style={{ display: 'flex', gap: 8, height: 40, alignItems: 'flex-end' }}>
                                                    {[40, 65, 80, 55, 90, 85, 95].map((h, i) => (
                                                        <div key={i} style={{ flex: 1, background: i === 6 ? 'var(--accent-violet)' : 'rgba(139, 92, 246, 0.1)', height: `${h}%`, borderRadius: '4px' }} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card" style={{ padding: 32, borderRadius: '28px', background: 'white', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <MessageSquare size={16} color="var(--accent-cyan)" /> Strategy Pointers
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {(aiInsights.talkingPoints || ['Focus on long-term capital appreciation', 'Mention upcoming metro connectivity', 'Highlight luxury ameneties']).map((tp, idx) => (
                                                <div key={idx} className="hover-lift" style={{ display: 'flex', gap: 14, fontSize: '14px', color: 'var(--navy-800)', lineHeight: 1.5, background: 'var(--slate-50)', padding: '16px', borderRadius: '16px', fontWeight: 600, border: '1px solid #f1f5f9' }}>
                                                    <div style={{ padding: '4px', background: '#f59e0b20', borderRadius: '6px' }}>
                                                        <Sparkles size={12} color="var(--accent-amber)" />
                                                    </div>
                                                    {tp}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="card" style={{ padding: 32, borderRadius: '28px', background: 'white', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <TrendingUp size={16} color="var(--accent-rose)" /> Market Alignment
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Portfolio</div>
                                                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--navy-900)' }}>{aiInsights.standardized?.location || 'Premium High-Rise Segment'}</div>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified Influence</div>
                                                <div style={{ fontSize: '14px', color: 'var(--navy-400)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                    {aiInsights.searchQuery || 'Review Professional Profile'} <ExternalLink size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '120px 40px', background: 'white', borderRadius: '32px', border: '2px dashed var(--slate-200)' }}>
                                    <div style={{ width: 80, height: 80, background: 'var(--navy-50)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}>
                                        <Brain size={40} color="var(--accent-violet)" />
                                        <div className="pulse-dot" style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, background: 'var(--accent-violet)', borderRadius: '50%', border: '3px solid white' }} />
                                    </div>
                                    <h3 style={{ margin: '0 0 12px', color: 'var(--navy-900)', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Analyze Interaction Patterns</h3>
                                    <p style={{ fontSize: '16px', color: 'var(--slate-500)', maxWidth: 400, margin: '0 auto 36px', lineHeight: 1.6, fontWeight: 500 }}>
                                        Deploy our AI engine to cross-reference multiple data points and generate a custom conversion strategy for {contact.name}.
                                    </p>
                                    <button onClick={handleEnrich} className="btn h-xl" style={{ padding: '0 48px', height: 60, borderRadius: '18px', background: 'var(--navy-900)', color: 'white', fontWeight: 900, fontSize: '16px', boxShadow: '0 20px 40px rgba(10,22,40,0.2)' }}>
                                        Unlock Full Intelligence
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'Overview' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Executive Deal Matrix */}
                            <div style={{ 
                                padding: '32px', 
                                borderRadius: '32px', 
                                background: 'white', 
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 12px 32px rgba(10,22,40,0.02)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Deal Matrix Intelligence</h3>
                                    <div style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 800 }}>OBJECT ID: {contact.id.slice(0, 12).toUpperCase()}</div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                                    {[
                                        { label: 'Conversion Score', value: `${contact.score || 88}%`, Icon: Sparkles, color: '#f59e0b', desc: 'Forecast Confidence' },
                                        { label: 'Origin Channel', value: contact.source || 'Direct', Icon: Target, color: '#3b82f6', desc: 'Marketing Trait' },
                                        { label: 'Last Signal', value: displayDates.lastContact ? displayDates.lastContact.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Pending', Icon: Zap, color: '#10b981', desc: 'Response Latency' }
                                    ].map(stat => (
                                        <div key={stat.label} style={{ 
                                            background: '#fcfdfe', 
                                            padding: '24px', 
                                            borderRadius: '24px', 
                                            border: '1.5px solid #f1f5f9', 
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            textAlign: 'left'
                                        }} className="hover-lift">
                                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${stat.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: `1px solid ${stat.color}20` }}>
                                                <stat.Icon size={20} color={stat.color} strokeWidth={2.5} />
                                            </div>
                                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{stat.label}</div>
                                            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.5px' }}>{stat.value}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 4 }}>{stat.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                                                            {/* Strategic Outreach Hub (AI Powered) */}
                                <div style={{ 
                                    padding: '32px', 
                                    borderRadius: '32px', 
                                    background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', 
                                    border: '1px solid #f1f5f9',
                                    color: 'white',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 20px 48px rgba(10,22,40,0.15)',
                                }}>
                                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                                        <Clock size={160} />
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-cyan)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Sparkles size={14} /> AI Outreach Intelligence
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Strategic Outreach Window</h3>
                                            </div>
                                            <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 4 }}>Forecast Confidence</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent-emerald)' }}>94.2% HIGH</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                                                <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: '24px', fontWeight: 900 }}>11:30</div>
                                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>AM</div>
                                                </div>
                                                <div style={{ fontSize: '24px', fontWeight: 300, color: 'rgba(255,255,255,0.2)' }}>→</div>
                                                <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: '24px', fontWeight: 900 }}>01:30</div>
                                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>PM</div>
                                                </div>
                                                <div style={{ marginLeft: 16 }}>
                                                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>Optimal Trigger Window</div>
                                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4 }}>Historical response peak detected.</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <button onClick={() => { setComposerTrigger('followup'); setShowComposer(true); }} className="btn hover-lift" style={{ height: 52, padding: '0 32px', borderRadius: '18px', background: 'var(--accent-cyan)', color: 'var(--navy-900)', fontWeight: 900, border: 'none', fontSize: '14px', boxShadow: '0 12px 24px rgba(6, 182, 212, 0.3)', cursor: 'pointer' }}>
                                                    Schedule Follow-up
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                {/* Interest Profile */}
                                <div style={{ padding: '32px', borderRadius: '32px', background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 12px 32px rgba(10,22,40,0.02)' }}>
                                    <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 28, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Interest Profile</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {[
                                            { label: 'Property Type', value: contact.property_type || 'Residential', Icon: Home, color: '#3b82f6' },
                                            { label: 'Budget Range', value: `₹${contact.budget || '1.1Cr'}`, Icon: DollarSign, color: '#10b981' },
                                            { label: 'Preferred Project', value: contact.project_name || 'Zentrix Signature', Icon: Target, color: '#f59e0b' },
                                            { label: 'Market Location', value: contact.city || 'Worli, Mumbai', Icon: MapPin, color: '#8b5cf6' }
                                        ].map(prop => (
                                            <div key={prop.label} style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 18, border: '1px solid #f1f5f9' }}>
                                                    <prop.Icon size={18} color={prop.color} strokeWidth={2.5} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{prop.label}</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{prop.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Interaction Pulse */}
                                <div style={{ padding: '32px', borderRadius: '32px', background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 12px 32px rgba(10,22,40,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Interaction Pulse</h3>
                                        <button onClick={() => setActiveTab('Activities')} style={{ fontSize: '11px', fontWeight: 900, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Timeline <ArrowRight size={12} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        {interactions.slice(0, 3).map((item, idx) => {
                                            const typeColor = item.type === 'Site Visit' ? 'var(--accent-emerald)' : item.type === 'Offer' ? 'var(--accent-cyan)' : 'var(--accent-violet)';
                                            return (
                                                <div key={idx} style={{ position: 'relative', paddingLeft: 36, paddingBottom: idx < 2 ? 8 : 0 }}>
                                                    <div style={{ position: 'absolute', left: 4, top: 6, width: 10, height: 10, borderRadius: '50%', background: typeColor, boxShadow: `0 0 12px ${typeColor}60`, border: '2px solid white', zIndex: 2 }} />
                                                    {idx < 2 && <div style={{ position: 'absolute', left: 8.5, top: 16, width: 1, height: '120%', background: '#f1f5f9', zIndex: 1 }} />}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy-900)' }}>{item.type}</div>
                                                        <div style={{ fontSize: '10px', color: 'var(--slate-400)', fontWeight: 700, textTransform: 'uppercase' }}>{new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--slate-500)', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                        {item.note || item.description || item.subject || 'Strategic interaction logged.'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'Activities' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
                            {/* Strategic Activity Composer */}
                            <div style={{ 
                                padding: '24px', 
                                borderRadius: '32px', 
                                background: 'white', 
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 8px 24px rgba(10,22,40,0.02)'
                            }}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                                    {[
                                        { type: 'Note', icon: Edit2, color: '#f59e0b' },
                                        { type: 'Email', icon: Mail, color: '#3b82f6' },
                                        { type: 'Call', icon: Phone, color: '#10b981' },
                                        { type: 'WhatsApp', icon: MessageSquare, color: '#25D366' },
                                        { type: 'Meeting', icon: CalendarIcon, color: '#ef4444' }
                                    ].map(btn => (
                                        <button 
                                            key={btn.type}
                                            onClick={() => { setActivityType(btn.type); setShowActivityBox(true); }}
                                            style={{
                                                flex: 1, padding: '12px 0', borderRadius: '16px', border: '1px solid',
                                                borderColor: activityType === btn.type ? btn.color : '#f1f5f9',
                                                background: activityType === btn.type ? `${btn.color}05` : 'transparent',
                                                color: activityType === btn.type ? 'var(--navy-900)' : 'var(--slate-400)',
                                                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                                transition: 'all 0.2s', fontWeight: 800
                                            }}
                                        >
                                            <btn.icon size={18} color={activityType === btn.type ? btn.color : 'var(--slate-300)'} strokeWidth={2.5} />
                                            <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{btn.type}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                {showActivityBox && (
                                    <div className="animate-fadeIn">
                                        <textarea
                                            value={newNote}
                                            onChange={e => setNewNote(e.target.value)}
                                            placeholder={`Crafting a professional ${activityType.toLowerCase()} response...`}
                                            style={{ 
                                                width: '100%', padding: '24px', borderRadius: '24px', 
                                                border: '1px solid #f1f5f9', background: '#fcfdfe', 
                                                minHeight: 140, fontSize: '15px', fontWeight: 500,
                                                outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                                                color: 'var(--navy-900)'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={handleVoice} className="hover-lift" style={{ 
                                                    width: 44, height: 44, borderRadius: '14px', border: '1px solid #f1f5f9', 
                                                    background: isListening ? '#fee2e2' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                                }}>
                                                    <Mic size={18} color={isListening ? '#ef4444' : 'var(--navy-600)'} />
                                                </button>
                                                <button onClick={handleSummarize} disabled={summarizing} className="hover-lift" style={{ 
                                                    height: 44, padding: '0 20px', borderRadius: '14px', border: '1px solid #f1f5f9', 
                                                    background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 
                                                }}>
                                                    {summarizing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} color="#8b5cf6" />}
                                                    AI Summarize
                                                </button>
                                                {['Email', 'WhatsApp'].includes(activityType) && (
                                                    <button onClick={handleAIGenerate} disabled={generatingContent} className="hover-lift" style={{ 
                                                        height: 44, padding: '0 20px', borderRadius: '14px', border: '1px solid #e2e8f0', 
                                                        background: 'linear-gradient(to right, rgba(139,92,246,0.1), rgba(6,182,212,0.1))', color: 'var(--navy-900)', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 
                                                    }}>
                                                        {generatingContent ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} color="#8b5cf6" />}
                                                        Auto-Draft
                                                    </button>
                                                )}
                                                <label className="hover-lift" style={{ 
                                                    height: 44, padding: '0 20px', borderRadius: '14px', border: '1px solid #f1f5f9', 
                                                    background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 
                                                }}>
                                                    {uploadingAudio ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} color="#10b981" />}
                                                    {uploadingAudio ? 'Transcribing...' : 'Upload Call'}
                                                    <input 
                                                        type="file" 
                                                        accept="audio/*" 
                                                        style={{ display: 'none' }} 
                                                        onChange={handleAudioUpload} 
                                                        disabled={uploadingAudio}
                                                    />
                                                </label>
                                            </div>
                                            <button 
                                                onClick={handleAddNote}
                                                className="hover-lift"
                                                style={{ padding: '0 32px', height: 48, borderRadius: '16px', background: 'var(--navy-900)', color: 'white', fontWeight: 900, fontSize: '14px', boxShadow: '0 8px 20px rgba(10,22,40,0.15)', cursor: 'pointer', border: 'none' }}
                                            >
                                                Log Interaction
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Activity Pulse Timeline */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {interactions.map((item, idx) => {
                                    const cfg = item.type === 'Call' ? { icon: Phone, color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' } : 
                                                item.type === 'Email' ? { icon: Mail, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' } :
                                                item.type === 'WhatsApp' ? { icon: MessageSquare, color: '#25D366', bg: 'rgba(37, 211, 102, 0.05)' } :
                                                { icon: Edit2, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' };
                                    return (
                                        <div key={idx} style={{ 
                                            padding: '28px', borderRadius: '28px', background: 'white', border: '1px solid #f1f5f9',
                                            boxShadow: '0 4px 12px rgba(10,22,40,0.01)', display: 'flex', gap: 24
                                        }}>
                                            <div style={{ 
                                                width: 48, height: 48, borderRadius: '16px', background: cfg.bg, 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                border: `1px solid ${cfg.color}20`
                                            }}>
                                                <cfg.icon size={22} color={cfg.color} strokeWidth={2.5} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                    <div>
                                                        <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--navy-900)' }}>{item.type} Interaction</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 2 }}>{item.agent_name || 'System Interaction'} • {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                                
                                                {item.note && item.note.includes('[Automated AI Transcript') ? (() => {
                                                    const lines = item.note.split('\n');
                                                    const headerLine = lines[0];
                                                    const sentimentMatch = headerLine.match(/Sentiment: (.*?)]/);
                                                    const sentimentBadge = sentimentMatch ? sentimentMatch[1] : null;
                                                    const transcriptLines = lines.slice(2).filter(l => l.trim().length > 0);
                                                    
                                                    return (
                                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-violet)', background: 'rgba(139, 92, 246, 0.1)', padding: '6px 12px', borderRadius: '12px' }}><Sparkles size={12}/> AI Audio Parser</div>
                                                                {sentimentBadge && (
                                                                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: sentimentBadge === 'Positive' ? '#10b981' : sentimentBadge === 'Negative' || sentimentBadge === 'Concerned' ? '#ef4444' : '#64748b', background: 'white', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>Sentiment: {sentimentBadge}</div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {transcriptLines.map((line, i) => {
                                                                    const isAgent = line.startsWith('Agent:');
                                                                    const text = line.replace(/^(Agent|Client):\s*/, '');
                                                                    return (
                                                                        <div key={i} style={{ 
                                                                            alignSelf: isAgent ? 'flex-end' : 'flex-start',
                                                                            background: isAgent ? 'var(--navy-900)' : 'white',
                                                                            color: isAgent ? 'white' : 'var(--navy-900)',
                                                                            border: isAgent ? '1px solid var(--navy-900)' : '1px solid #e2e8f0',
                                                                            padding: '12px 16px',
                                                                            borderRadius: '20px',
                                                                            borderBottomRightRadius: isAgent ? '4px' : '20px',
                                                                            borderBottomLeftRadius: !isAgent ? '4px' : '20px',
                                                                            maxWidth: '85%',
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            lineHeight: 1.5,
                                                                            boxShadow: '0 6px 16px rgba(10,22,40,0.04)'
                                                                        }}>
                                                                            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: isAgent ? 'rgba(255,255,255,0.5)' : 'var(--slate-400)', marginBottom: 4, letterSpacing: '0.05em' }}>{isAgent ? 'Agent' : 'Client'}</div>
                                                                            {text}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                    <div style={{ fontSize: '14px', color: 'var(--navy-800)', fontWeight: 600, lineHeight: 1.6, background: '#fcfdfe', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                                        {item.note}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            {/* RIGHT COLUMN - Market Intelligence & Context */}
            <div className="contact-details-right" style={{ 
                width: 380, 
                background: 'white', 
                borderLeft: '1px solid #f1f5f9', 
                display: 'flex', 
                flexDirection: 'column', 
                overflowY: 'auto' 
            }}>
                <div style={{ padding: '32px 24px' }}>
                    {/* Behavioral IQ Radar */}
                    <div style={{ 
                        padding: '24px', 
                        borderRadius: '32px', 
                        background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', 
                        color: 'white',
                        marginBottom: 32,
                        boxShadow: '0 20px 40px rgba(10,22,40,0.15)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                            <Brain size={120} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={16} color="var(--accent-amber)" />
                                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Behavioral IQ</span>
                            </div>
                            <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '10px', fontWeight: 900 }}>REAL-TIME</div>
                        </div>

                        <div style={{ marginBottom: 24, position: 'relative' }}>
                            <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Conversion Propensity</div>
                            <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>{contact.score || 88}%</div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: 12, overflow: 'hidden' }}>
                                <div style={{ width: `${contact.score || 88}%`, height: '100%', background: 'var(--accent-emerald)', boxShadow: '0 0 12px var(--accent-emerald)' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '9px', opacity: 0.6, fontWeight: 800, marginBottom: 4 }}>INTENT</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>HIGH</div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '9px', opacity: 0.6, fontWeight: 800, marginBottom: 4 }}>SENTIMENT</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6' }}>POSITIVE</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Documents & Deals */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ padding: '24px', borderRadius: '28px', border: '1.5px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Deals</h3>
                                <button style={{ border: 'none', background: 'none' }}><Plus size={16} color="var(--slate-400)" /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {[
                                    { name: 'Unit 402 - Signature Tower', val: '₹1.15 Cr', status: 'In Negotiation' },
                                    { name: 'Parking P12 - Basement', val: '₹4.50 L', status: 'Ready' }
                                ].map((it, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: idx === 0 ? '1px solid #f1f5f9' : 'none' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#f8fafc', border: '1px solid #eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <TrendingUp size={18} color="var(--navy-600)" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--navy-900)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{it.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 700, marginTop: 2 }}>{it.status}</div>
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent-emerald)' }}>{it.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Assigned Team */}
                        <div style={{ padding: '24px', borderRadius: '28px', border: '1.5px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Assigned Team</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {[
                                    { name: 'Siddharth M.', role: 'Senior Manager', initial: 'SM', color: '#3b82f6' },
                                    { name: 'Priya Singh', role: 'Sales Executive', initial: 'PS', color: '#f59e0b' }
                                ].map((it, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${it.color}10`, color: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px', border: `1px solid ${it.color}20` }}>{it.initial}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--navy-900)' }}>{it.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 700 }}>{it.role}</div>
                                        </div>
                                        <Phone size={14} color="var(--slate-300)" style={{ cursor: 'pointer' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 40 }}>
                        <button className="hover-lift" style={{ 
                            width: '100%', padding: '20px', borderRadius: '24px', background: 'var(--navy-900)', color: 'white', fontWeight: 900, fontSize: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: 'none', cursor: 'pointer',
                            boxShadow: '0 12px 24px rgba(10,22,40,0.15)'
                        }}>
                            <Brain size={18} /> CONSULT AI SPECIALIST
                        </button>
                    </div>
                </div>
            </div>

            {/* STRATEGIC COMMAND DOCK */}
            <div style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <button 
                    onClick={() => { setComposerTrigger('site_visit'); setShowComposer(true); }}
                    className="hover-lift" 
                    style={{
                        padding: '10px 22px', borderRadius: '14px', background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer'
                    }}
                >
                    <MapPin size={14} /> Book Visit
                </button>
                <button 
                    onClick={() => { setComposerTrigger('followup'); setShowComposer(true); }}
                    className="hover-lift" 
                    style={{
                        padding: '10px 22px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', 
                        fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
                    }}
                >
                    <FileText size={14} /> Send Offers
                </button>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.12)', margin: '4px 6px' }} />
                <button 
                    onClick={() => setShowStageMenu(!showStageMenu)}
                    style={{
                        padding: '10px 20px', borderRadius: '14px', background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', 
                        fontWeight: 800, fontSize: '12px', border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                    }}
                >
                    <ArrowRight size={13} /> Move Stage
                </button>
            </div>

            {/* Stage Selector Portal */}
            {showStageMenu && (
                <div 
                    onClick={() => setShowStageMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(12px)' }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        className="animate-fadeIn"
                        style={{ background: 'white', borderRadius: '28px', padding: '32px', width: 440, maxWidth: '92vw', boxShadow: '0 32px 64px rgba(0,0,0,0.25)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--navy-900)' }}>Move Lead Stage</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--slate-400)', fontWeight: 600 }}>Current: <strong style={{ color: currentStageStyle.text }}>{contact.stage}</strong></p>
                            </div>
                            <button onClick={() => setShowStageMenu(false)} style={{ width: 36, height: 36, borderRadius: '12px', background: 'var(--slate-50)', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color="var(--slate-400)" /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {LIFECYCLE_STAGES.map(s => {
                                const styles = LIFECYCLE_COLORS[s] || { bg: '#f1f5f9', text: '#64748b', icon: CheckSquare };
                                const StageIcon = styles.icon || CheckSquare;
                                const isActive = contact.stage === s;
                                return (
                                    <button 
                                        key={s}
                                        onClick={() => handleUpdateStage(s)}
                                        className="hover-lift"
                                        style={{
                                            padding: '14px 12px', borderRadius: '16px', border: '2px solid',
                                            borderColor: isActive ? styles.text : '#f1f5f9',
                                            background: isActive ? styles.bg : 'white',
                                            cursor: 'pointer', textAlign: 'center',
                                            transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                                        }}
                                    >
                                        <StageIcon size={16} color={styles.text} strokeWidth={2.5} />
                                        <div style={{ fontSize: '11px', fontWeight: isActive ? 900 : 700, color: isActive ? styles.text : 'var(--slate-600)' }}>{s}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {/* Smart Trigger Composer */}
            {showComposer && (
                <NotificationComposer
                    onClose={() => setShowComposer(false)}
                    onSent={() => { 
                        showToast(`Intelligence Engine triggered ${composerTrigger.replace('_', ' ')} flow`, 'success');
                        loadData();
                    }}
                    prefillLead={contact}
                    triggerType={composerTrigger}
                />
            )}
        </div>
    );
}
