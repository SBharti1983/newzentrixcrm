import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLoader, PageError } from '../components/Feedback';
import { ChevronLeft, ChevronDown, Edit2, Mail, Phone, Calendar as CalendarIcon, CheckSquare, Settings, Search, Plus, UserPlus, Target, ThumbsUp, ThumbsDown, Copy, X, Sparkles, Brain, Wand2, RefreshCw, ExternalLink, TrendingUp, MessageSquare, Briefcase, Mic, ArrowRight, Zap, Home, MapPin, DollarSign, Tag, Smile, ShieldCheck, Rocket, ClipboardCheck, FileText, Clock, UploadCloud, Users, RotateCw, Volume2 } from 'lucide-react';
import { leadsApi, zapierApi, notificationsApi, aiApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { dialerEvents } from '../constants/events';
import NotificationComposer from '../components/NotificationComposer';
import FollowupModal from '../components/FollowupModal';
import { useMobile } from '../hooks/useMobile';

const LIFECYCLE_STAGES = ['New Lead', 'Connected', 'Qualified', 'Site Visit Scheduled', 'Site Visit Done', 'Interested', 'Proposal Shared', 'Negotiation', 'Won', 'Lost'];
const LIFECYCLE_COLORS = {
    'New Lead': { bg: 'rgba(59, 130, 246, 0.08)', text: 'var(--navy-600)', icon: UserPlus },
    'Connected': { bg: 'rgba(99, 102, 241, 0.08)', text: '#4338ca', icon: Target },
    'Qualified': { bg: 'rgba(6, 182, 212, 0.08)', text: 'var(--accent-cyan-dark)', icon: Zap },
    'Site Visit Scheduled': { bg: 'rgba(20, 184, 166, 0.08)', text: '#0f766e', icon: MapPin },
    'Site Visit Done': { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--accent-emerald-dark)', icon: ShieldCheck },
    'Interested': { bg: 'rgba(124, 77, 255, 0.08)', text: '#7c3aed', icon: TrendingUp },
    'Proposal Shared': { bg: 'rgba(217, 70, 239, 0.08)', text: '#c026d3', icon: FileText },
    'Negotiation': { bg: 'rgba(245, 158, 11, 0.08)', text: '#b45309', icon: DollarSign },
    'Won': { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--accent-emerald-dark)', icon: ShieldCheck },
    'Lost': { bg: 'rgba(244, 63, 94, 0.08)', text: 'var(--accent-rose-dark)', icon: X }
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
    const [editingInteraction, setEditingInteraction] = useState(null);
    const [editNote, setEditNote] = useState('');
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
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFollowupModal, setShowFollowupModal] = useState(false);
    const [justLogged, setJustLogged] = useState(false);
    const [isEditingInterest, setIsEditingInterest] = useState(false);
    const [editInterestData, setEditInterestData] = useState({ budget: '', property_type: '' });
    const [recalculatingScore, setRecalculatingScore] = useState(false);
    const [isAddingDeal, setIsAddingDeal] = useState(false);
    const [newDealData, setNewDealData] = useState({ unit_number: '', project_name: '', total_amount: '' });
    const [callOutcome, setCallOutcome] = useState('Connected');
    const [callDuration, setCallDuration] = useState('');
    const [generatingContent, setGeneratingContent] = useState(false);
    const isMobile = useMobile();

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
        if (!newNote) return;
        setGeneratingContent(true);
        try {
            const prompt = `Rewrite this draft professionally for ${activityType}: "${newNote}"`;
            const res = await aiApi.generatePitch({ leadId: id, prompt });
            if (res.hook) setNewNote(res.headline + '\n\n' + res.hook);
        } catch (e) {
            showToast("AI Generation failed", "error");
        } finally {
            setGeneratingContent(false);
        }
    };

    const handleRecalculateScore = async () => {
        setRecalculatingScore(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/leads/${id}/ai-score`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.newScore !== undefined) {
                setContact(prev => ({ ...prev, score: data.newScore }));
                showToast(`AI Intelligence Refresh: Lead Score is now ${data.newScore}`, "success");
            } else {
                throw new Error(data.error || 'Failed to refresh score');
            }
        } catch (err) {
            console.error('Recalculate error:', err);
            showToast("AI Refresh failed. Check connectivity.", "error");
        } finally {
            setRecalculatingScore(false);
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
            const data = await zapierApi.transcribeCall(formData);
            showToast(`Transcription complete! Sentiment: ${data.sentiment}`, 'success');
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
            setInteractions(rawInteractions);
        } catch (err) {
            setError(err.error || 'Failed to load contact');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const originalOverflowX = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = originalOverflowX || 'auto';
        };
    }, []);

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

    const handleUpdateStatus = async (newStatus, extras = {}) => {
        try {
            const updated = await leadsApi.update(id, { status: newStatus, ...extras });
            setContact(updated);
            showToast(`Lead status updated to ${newStatus}`, 'success');
            setShowActivityBox(false);
            setNewNote('');
        } catch (err) {
            showToast(err.error || 'Failed to update status', 'error');
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
            if (activityType === 'WhatsApp' || activityType === 'Email') {
                await notificationsApi.send({
                    channels: [activityType],
                    recipient_phone: activityType === 'WhatsApp' ? contact.phone : undefined,
                    recipient_email: activityType === 'Email' ? contact.email : undefined,
                    lead_id: id,
                    body: newNote
                });
                showToast(`${activityType} Message Sent successfully!`, 'success');
            } else {
                const payload = { type: activityType, note: newNote };
                if (activityType === 'Call') {
                    payload.outcome = callOutcome || 'Connected';
                    payload.duration = callDuration ? parseInt(callDuration, 10) : null;
                }
                await leadsApi.addInteraction(id, payload);
                showToast('Interaction logged successfully', 'success');
            }
            setNewNote('');
            setShowActivityBox(false);
            setJustLogged(true);
            setTimeout(() => setJustLogged(false), 10000); // Hide the suggestion after 10s
            loadData();
        } catch (e) {
            console.error('Send Error:', e);
            const msg = e.message || e.error || JSON.stringify(e);
            showToast(`Failed to process ${activityType}`, 'error');
        }
    };

    const handleDeleteInteraction = (interactionId) => {
        console.log('[DEBUG] Opening local confirm modal for:', interactionId);
        setConfirmDeleteId(interactionId);
    };

    const performDelete = async () => {
        const interactionId = confirmDeleteId;
        if (!interactionId) return;

        setIsDeleting(true);
        console.log('[DEBUG] performDelete initiated for:', interactionId);
        
        try {
            // Optimistic update
            setInteractions(prev => prev.filter(item => item.id !== interactionId));
            setConfirmDeleteId(null);
            
            await leadsApi.deleteInteraction(id, interactionId);
            showToast('Interaction removed', 'success');
            loadData();
        } catch (e) {
            console.error('[DEBUG] Interaction delete failed:', e);
            const msg = e.error || e.message || 'Failed to delete';
            showToast(`Delete failed: ${msg}`, 'error');
            loadData();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditInteraction = async (interactionId) => {
        console.log('[DEBUG] handleEditInteraction called for:', interactionId);
        if (!editNote.trim()) return;
        try {
            await leadsApi.updateInteraction(id, interactionId, { note: editNote });
            showToast('Interaction updated', 'success');
            setEditingInteraction(null);
            setEditNote('');
            loadData();
        } catch (e) {
            console.error('Update error:', e);
            showToast('Failed to update interaction', 'error');
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

    const downloadTranscript = async (interactionId) => {
        try {
            const token = sessionStorage.getItem('zentrix_token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
            const response = await fetch(`${apiUrl}/telephony/transcript/${interactionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to download');
            
            // Read text manually and construct standard Text Blob
            const textData = await response.text();
            const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
            
            const disposition = response.headers.get('Content-Disposition');
            const filenameMatch = disposition?.match(/filename="(.+?)"/);
            const fallbackName = `Transcript_${interactionId}.txt`;
            const filename = (filenameMatch && filenameMatch[1]) ? filenameMatch[1] : fallbackName;
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.setAttribute('download', filename); // Forcing the attribute directly
            
            document.body.appendChild(a);
            a.click();
            
            // Allow ample time for the OS download manager to capture the filename
            setTimeout(() => {
                if (document.body.contains(a)) document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 1000);
            
            showToast('Transcript downloaded!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to download transcript', 'error');
        }
    };



    const PALETTE = [
        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4',
        '#ef4444', '#6366f1', '#14b8a6', '#ec4899', '#f97316'
    ];
    const colorIndex = (contact.name || 'A').charCodeAt(0) % PALETTE.length;
    const avatarBg = PALETTE[colorIndex];
    const currentStageStyle = LIFECYCLE_COLORS[contact.stage] || LIFECYCLE_COLORS['New Lead'];

    return (
        <div className="contact-details-layout" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 56px)', maxWidth: '100vw', backgroundColor: '#f8fafc', fontFamily: 'var(--font-main)', overflow: 'hidden' }}>
            {/* LEFT COLUMN - Profile Summary (Modernized) */}
            <div className="contact-details-sidebar" style={{
                width: 400,
                flexShrink: 0,
                borderRight: '1px solid var(--border-light)',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                boxShadow: '4px 0 24px rgba(10,22,40,0.02)',
                zIndex: 10
            }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => navigate('/leads')} style={{
                        background: 'var(--slate-50)', border: '1px solid #e2e8f0', borderRadius: '10px',
                        padding: '6px 12px', fontSize: '12px', color: 'var(--navy-600)', fontWeight: 800,
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                    }}>
                        <ChevronLeft size={14} /> Back
                    </button>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{
                            padding: '4px 10px',
                            background: contact.status === 'Nurture' ? 'rgba(124,58,237,0.1)' : contact.status === 'Won' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                            color: contact.status === 'Nurture' ? '#7c3aed' : contact.status === 'Won' ? '#059669' : '#3b82f6',
                            borderRadius: '14px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'
                        }}>
                            {contact.status || 'Active'}
                        </div>
                        <div style={{ padding: '4px 10px', background: currentStageStyle.bg, color: currentStageStyle.text, borderRadius: '14px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {contact.stage}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '12px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <div style={{
                            width: 48, height: 48,
                            background: avatarBg,
                            color: 'white',
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', fontWeight: 900,
                            margin: '0 auto 8px',
                            boxShadow: `0 8px 20px ${avatarBg}20`,
                            border: '3px solid white',
                            position: 'relative'
                        }}>
                            {initial}
                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: '#10b981', border: '2px solid white', borderRadius: '50%' }} />
                        </div>
                        <h1 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.5px' }}>{contact.name}</h1>
                        <div style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <MapPin size={11} /> {contact.city || 'Location Pending'}
                        </div>
                    </div>

                    {contact.status === 'Nurture' && (
                        <div style={{
                            margin: '0 12px 16px', padding: '14px', background: '#fdf4ff', border: '1px solid #f5d0fe',
                            borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: 6
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: 900, color: '#a21caf', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RotateCw size={12} /> Reconnect: {new Date(contact.reconnect_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#701a75' }}>
                                Reason: {contact.nurture_reason}
                            </div>
                        </div>
                    )}

                    {/* Strategic Action Hub - HIGH DENSITY */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                        marginBottom: 12,
                        padding: '8px',
                        background: '#f8fafc',
                        borderRadius: '14px',
                        border: '1px solid #f1f5f9'
                    }}>
                        {[
                            { icon: Mail, label: 'Email', color: '#3b82f6', action: () => { setActivityType('Email'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Phone, label: 'Call', color: '#10b981', action: () => dialerEvents.call(contact.id, contact.phone, contact.name) },
                            { icon: MessageSquare, label: 'WhatsApp', color: '#25D366', action: () => { setActivityType('WhatsApp'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: Edit2, label: 'Note', color: '#f59e0b', action: () => { setActivityType('Note'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: CheckSquare, label: 'Task', color: '#6366f1', action: () => { setActivityType('Task'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            { icon: CalendarIcon, label: 'Meeting', color: '#ef4444', action: () => { setActivityType('Meeting'); setActiveTab('Activities'); setShowActivityBox(true); } },
                            {
                                icon: TrendingUp, label: contact.status === 'Nurture' ? 'Active' : 'Nurture', color: '#7c3aed', action: () => {
                                    if (contact.status === 'Nurture') {
                                        handleUpdateStatus('Active');
                                    } else {
                                        setActivityType('Move to Nurture');
                                        setActiveTab('Activities');
                                        setShowActivityBox(true);
                                    }
                                }
                            },
                            { icon: MapPin, label: 'Plan Visit', color: '#f59e0b', action: () => navigate(`/site-visits?leadId=${id}`) },
                            { icon: ClipboardCheck, label: 'Offer', color: '#8b5cf6', action: () => navigate(`/agreements?leadId=${id}`) }
                        ].map(act => (
                            <button
                                key={act.label}
                                onClick={act.action}
                                style={{
                                    padding: '8px 0', borderRadius: '10px', background: 'white',
                                    border: `1.5px solid #f1f5f9`, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer',
                                    transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                            >
                                <act.icon size={14} color={act.color} strokeWidth={2.5} />
                                <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--navy-700)', textTransform: 'uppercase' }}>{act.label}</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Core Identity Section */}
                        <div style={{
                            padding: '14px',
                            borderRadius: '18px',
                            background: '#f8fafc',
                            border: '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Core Identity</h3>
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={13} color="var(--slate-400)" /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {[
                                    { label: 'Email Address', value: contact.email, icon: Mail, color: '#3b82f6' },
                                    { label: 'Phone Number', value: contact.phone, icon: Phone, color: '#10b981' },
                                    { label: 'Lead Owner', value: contact.created_by_name || 'Direct / System', icon: UserPlus, color: '#8b5cf6' },
                                    { label: 'Assigned To', value: contact.agent_name || 'Unassigned', icon: Users, color: 'var(--accent-emerald)' }
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
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy-900)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{field.value}</div>
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
                            <div className="hover-lift" 
                                onClick={() => navigate('/projects')}
                                style={{
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
                                    {contact.project_name ? contact.project_name.slice(0, 2).toUpperCase() : '-'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--navy-900)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{contact.project_name || 'Unspecified'}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 800, marginTop: 2 }}>Budget: {contact.budget ? '₹'+contact.budget : 'Unspecified'}</div>
                                </div>
                                <ArrowRight size={16} color="var(--slate-300)" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MIDDLE COLUMN - Executive Intelligence & Timeline */}
            <div className="contact-details-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden', backgroundColor: '#fcfdfe' }}>
                <div style={{ padding: '0 16px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                    <div style={{ display: 'flex' }}>
                        {['Overview', 'Activities', 'Intelligence'].map(tab => (
                            <div
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1,
                                    padding: '12px 0',
                                    color: activeTab === tab ? 'var(--navy-900)' : 'var(--slate-400)',
                                    fontWeight: activeTab === tab ? 900 : 700,
                                    fontSize: '13px',
                                    borderBottom: `2.5px solid ${activeTab === tab ? 'var(--navy-900)' : 'transparent'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {tab === 'Overview' && <Home size={14} />}
                                {tab === 'Activities' && <TrendingUp size={14} />}
                                {tab === 'Intelligence' && <Brain size={14} />}
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }} className="animate-fadeIn">
                    {activeTab === 'Intelligence' ? (
                        <div style={{ maxWidth: 840, margin: '0 auto' }}>
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
                                <div style={{ textAlign: 'center', padding: '60px 40px', background: 'white', borderRadius: '32px', border: '2px dashed var(--slate-200)' }}>
                                    <div style={{ width: 80, height: 80, background: 'var(--navy-50)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative' }}>
                                        <Brain size={40} color="var(--accent-violet)" />
                                        <div className="pulse-dot" style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, background: 'var(--accent-violet)', borderRadius: '50%', border: '3px solid white' }} />
                                    </div>
                                    <h3 style={{ margin: '0 0 10px', color: 'var(--navy-900)', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Analyze Interaction Patterns</h3>
                                    <p style={{ fontSize: '15px', color: 'var(--slate-500)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6, fontWeight: 500 }}>
                                        Deploy our AI engine to cross-reference multiple data points and generate a custom conversion strategy for {contact.name}.
                                    </p>
                                    <button 
                                        onClick={handleEnrich} 
                                        disabled={enriching}
                                        className="btn h-xl" 
                                        style={{ 
                                            padding: '0 48px', height: 56, borderRadius: '18px', 
                                            background: enriching ? 'var(--navy-400)' : 'var(--navy-900)', 
                                            color: 'white', fontWeight: 900, fontSize: '15px', 
                                            boxShadow: '0 20px 40px rgba(10,22,40,0.2)',
                                            margin: '0 auto',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                        }}
                                    >
                                        {enriching ? <RefreshCw className="animate-spin" size={18} /> : null}
                                        {enriching ? 'Unlocking Intelligence...' : 'Unlock Full Intelligence'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'Overview' ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 40 }}>
                            {/* Deal Matrix Intelligence */}
                            <div style={{ padding: '6px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 4, height: 12, borderRadius: '2px', background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)' }} />
                                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deal Matrix Intelligence</h3>
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'var(--slate-400)', fontWeight: 700, background: '#f8fafc', padding: '1px 8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>ID: {contact.id.slice(0, 10).toUpperCase()}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                                    {[
                                        { label: 'Conversion', value: `${contact.score || 88}%`, Icon: Sparkles, color: '#f59e0b', trend: '+4.2%' },
                                        { label: 'Source', value: contact.source || 'Direct', Icon: Target, color: '#3b82f6' },
                                        { label: 'Last Signal', value: displayDates.lastContact ? displayDates.lastContact.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Pending', Icon: Zap, color: '#10b981' }
                                    ].map(stat => (
                                        <div key={stat.label} style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)', padding: '5px 10px', borderRadius: '10px', border: '1px solid #eef2f6', textAlign: 'center', position: 'relative' }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '6px', background: `${stat.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px', border: `1px solid ${stat.color}15` }}>
                                                <stat.Icon size={11} color={stat.color} />
                                            </div>
                                            <div style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 0 }}>{stat.label}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.3px', lineHeight: 1 }}>{stat.value}</div>
                                            {stat.trend && <div style={{ fontSize: '7px', fontWeight: 800, color: '#10b981', marginTop: 1, lineHeight: 1 }}>▲ {stat.trend}</div>}
                                        </div>
                                    ))}
                                    {/* Consult AI Specialist */}
                                    <button
                                        onClick={() => setActiveTab('Intelligence')}
                                        className="hover-lift"
                                        style={{
                                            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                                            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            justifyContent: 'center', gap: 2, padding: '4px 6px',
                                            boxShadow: '0 4px 16px rgba(10,22,40,0.2)',
                                            position: 'relative', overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)' }} />
                                        <Brain size={13} color="#f59e0b" />
                                        <div style={{ fontSize: '7px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>Consult AI</div>
                                        <div style={{ fontSize: '9px', fontWeight: 900, color: 'white', lineHeight: 1 }}>Specialist</div>
                                    </button>
                                </div>
                            </div>

                            {/* Dual Intelligence Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                {/* AI Strategic Window Card */}
                                <div style={{ 
                                    borderRadius: '12px', 
                                    background: 'linear-gradient(135deg, #0a1628, #152238, #1a2d4a)', 
                                    border: '1px solid rgba(255,255,255,0.05)', 
                                    boxShadow: '0 8px 32px rgba(10,22,40,0.25)', 
                                    padding: '10px 12px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center', 
                                    gap: 6 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                                        <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strategic Window</span>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 6px', borderRadius: '5px', border: '1px solid rgba(16,185,129,0.15)', marginLeft: 'auto' }}>94% CONF.</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '11px', fontWeight: 900, color: 'white' }}>
                                            <div style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>11:30</div>
                                            <span style={{ opacity: 0.3, color: 'white', fontSize: '10px' }}>→</span>
                                            <div style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>13:30</div>
                                        </div>
                                        <button onClick={() => { setComposerTrigger('followup'); setShowComposer(true); }} className="hover-lift" style={{ height: 22, padding: '0 10px', borderRadius: '6px', background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)', color: 'white', fontWeight: 900, fontSize: '9px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(6,182,212,0.3)', marginLeft: 'auto' }}>Schedule</button>
                                    </div>
                                </div>

                                {/* Behavioral IQ Card */}
                                <div style={{ 
                                    borderRadius: '12px', 
                                    background: 'linear-gradient(135deg, #0a1628, #152238, #1a2d4a)', 
                                    border: '1px solid rgba(255,255,255,0.05)', 
                                    boxShadow: '0 8px 32px rgba(10,22,40,0.25)', 
                                    padding: '8px 12px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 10 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Sparkles size={12} color="#f59e0b" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '7px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Behavioral IQ</div>
                                                <button 
                                                    onClick={handleRecalculateScore} 
                                                    disabled={recalculatingScore}
                                                    title="Recalculate with AI Intelligence"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                >
                                                    <RotateCw size={8} color={recalculatingScore ? "#f59e0b" : "rgba(255,255,255,0.3)"} className={recalculatingScore ? "animate-spin" : ""} />
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.3px' }}>{contact.score || 88}<span style={{ fontSize: '9px', opacity: 0.5 }}>%</span></div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${contact.score || 88}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '3px', boxShadow: '0 0 8px rgba(16,185,129,0.3)' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 3 }}>
                                            {[
                                                { label: 'INTNT', value: 'HIGH', color: '#10b981' },
                                                { label: 'SENT', value: 'POS', color: '#3b82f6' },
                                                { label: 'URGE', value: 'MED', color: '#f59e0b' }
                                            ].map(m => (
                                                <div key={m.label} style={{ flex: 1, minWidth: 0, padding: '2px 3px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '5.5px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                                                    <div style={{ fontSize: '8px', fontWeight: 900, color: m.color, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>{m.value}</div>
                                                </div>
                                            ))}
                                            <div style={{ padding: '0 5px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', fontSize: '6.5px', fontWeight: 900, color: 'rgba(255,255,255,0.6)', flexShrink: 0, letterSpacing: '0.03em' }}>
                                                <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#10b981', marginRight: 3, boxShadow: '0 0 4px #10b981' }} />
                                                LIVE
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Interest Profile + Interaction Pulse */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                {/* Interest Profile */}
                                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 4, height: 14, borderRadius: '2px', background: '#3b82f6' }} />
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interest Profile</h3>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (!isEditingInterest) setEditInterestData({ budget: contact.budget || '', property_type: contact.property_type || '' });
                                                else {
                                                    // Save
                                                    leadsApi.update(id, editInterestData).then(upd => { 
                                                        setContact(prev => ({ ...prev, ...upd })); 
                                                        showToast("Interest Profile updated", "success");
                                                        loadData(); // Refresh interaction pulse
                                                    }).catch(e => showToast("Update failed", "error"));
                                                }
                                                setIsEditingInterest(!isEditingInterest);
                                            }}
                                            style={{ background: 'none', border: 'none', color: isEditingInterest ? '#10b981' : '#3b82f6', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            {isEditingInterest ? <CheckSquare size={12} /> : <Edit2 size={12} />}
                                            {isEditingInterest ? 'Save' : 'Edit'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {[
                                            { key: 'property_type', label: 'Property Type', value: contact.property_type || 'Unspecified', Icon: Home, color: '#3b82f6' },
                                            { key: 'budget', label: 'Budget Range', value: `${contact.budget ? '₹'+contact.budget : 'Unspecified'}`, Icon: DollarSign, color: '#10b981' },
                                            { key: 'project_name', label: 'Project', value: contact.project_name || 'Unspecified', Icon: Target, color: '#f59e0b' }
                                        ].map(prop => (
                                            <div key={prop.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #eef2f6' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: `${prop.color}08`, border: `1px solid ${prop.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <prop.Icon size={13} color={prop.color} />
                                                </div>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: '8px', color: 'var(--slate-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{prop.label}</div>
                                                    {isEditingInterest && prop.key !== 'project_name' ? (
                                                        <input 
                                                            type="text" 
                                                            value={editInterestData[prop.key]} 
                                                            onChange={e => setEditInterestData({...editInterestData, [prop.key]: e.target.value})}
                                                            style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)', width: '100%', border: '1px solid #eef2f6', borderRadius: '4px', padding: '2px 4px', background: 'white' }}
                                                        />
                                                    ) : (
                                                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prop.value}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Interaction Pulse */}
                                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 4, height: 14, borderRadius: '2px', background: '#8b5cf6' }} />
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interaction Pulse</h3>
                                        </div>
                                        <button onClick={() => setActiveTab('Activities')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', fontWeight: 800, color: '#3b82f6', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                                            View all <ArrowRight size={10} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {interactions.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                                                <div style={{ fontSize: '20px', marginBottom: 4 }}>📭</div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-400)' }}>No interactions yet</div>
                                                <div style={{ fontSize: '9px', color: 'var(--slate-300)', marginTop: 2 }}>Log a call, note or meeting to start tracking</div>
                                            </div>
                                        ) : interactions.slice(0, 3).map((item, idx) => {
                                            const typeColor = item.type === 'Call' ? '#10b981' : item.type === 'Email' ? '#3b82f6' : item.type === 'WhatsApp' ? '#25D366' : '#f59e0b';
                                            return (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #eef2f6' }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: typeColor, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${typeColor}40` }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--navy-900)' }}>{item.type}</div>
                                                            <div style={{ fontSize: '9px', color: 'var(--slate-400)', fontWeight: 700 }}>{new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--slate-500)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>{item.note || 'Interaction logged.'}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Active Deals + Assigned Team */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                {/* Active Deals */}
                                <div style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid #e8edf3', background: 'white', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 4, height: 14, borderRadius: '2px', background: '#10b981' }} />
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Deals</h3>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontSize: '9px', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                                                {contact.deals && contact.deals.filter(d => d).length > 0 
                                                    ? `₹${(contact.deals.filter(d => d).reduce((s,d) => s + parseFloat(d.total_amount||0), 0) / 100000).toLocaleString('en-IN', {maximumFractionDigits:2})} L` 
                                                    : '₹0'}
                                            </div>
                                            <button 
                                                onClick={() => setIsAddingDeal(!isAddingDeal)}
                                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '3px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                                {isAddingDeal ? <X size={10} /> : <Plus size={10} />} {isAddingDeal ? 'Close' : 'Add'}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {isAddingDeal && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #10b98130' }}>
                                                <input placeholder="Project Name" value={newDealData.project_name} onChange={e => setNewDealData({...newDealData, project_name: e.target.value})} style={{ fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }} />
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input placeholder="Unit No" value={newDealData.unit_number} onChange={e => setNewDealData({...newDealData, unit_number: e.target.value})} style={{ fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', flex: 1, minWidth: 0 }} />
                                                    <input type="number" placeholder="Amount (₹)" value={newDealData.total_amount} onChange={e => setNewDealData({...newDealData, total_amount: e.target.value})} style={{ fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', flex: 1, minWidth: 0 }} />
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        if (!newDealData.total_amount) { showToast('Amount required', 'error'); return; }
                                                        leadsApi.addDeal(id, newDealData).then(() => {
                                                            showToast('Deal added', 'success');
                                                            setIsAddingDeal(false);
                                                            setNewDealData({ unit_number: '', project_name: '', total_amount: '' });
                                                            loadData();
                                                        }).catch(e => showToast('Failed to add deal', 'error'));
                                                    }}
                                                    style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', marginTop: 4, width: '100%' }}
                                                >
                                                    Save Deal
                                                </button>
                                            </div>
                                        )}
                                        {(contact.deals && contact.deals.filter(d => d).length > 0) ? contact.deals.filter(d => d).slice(0, 3).map((deal, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #eef2f6' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)' }}>{deal.unit_number ? `Unit ${deal.unit_number}` : (deal.project_name || 'Booking')}</div>
                                                    <div style={{ display: 'inline-flex', marginTop: 3, fontSize: '8px', fontWeight: 800, color: '#10b981', background: '#10b98110', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{deal.status || 'Active'}</div>
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#059669', letterSpacing: '-0.3px' }}>{deal.total_amount ? `₹${(deal.total_amount / 100000).toLocaleString('en-IN', {maximumFractionDigits:2})} L` : 'N/A'}</div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', padding: '16px 10px', color: 'var(--slate-400)' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700 }}>No active deals yet</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Assigned Team */}
                                <div style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid #e8edf3', background: 'white', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <div style={{ width: 4, height: 14, borderRadius: '2px', background: '#f59e0b' }} />
                                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assigned Team</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {(contact.team && contact.team.filter(t => t).length > 0) ? contact.team.filter(t => t).slice(0, 3).map((member, idx) => {
                                            const roleColors = { 'admin': '#3b82f6', 'sales_manager': '#8b5cf6', 'team_leader': '#f59e0b', 'agent': '#10b981' };
                                            const color = roleColors[member.role] || '#64748b';
                                            return (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #eef2f6' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '10px', background: `${color}12`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '10px', border: `1.5px solid ${color}20` }}>{member.name ? member.name[0].toUpperCase() : '?'}</div>
                                                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid #f8fafc' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
                                                    <div style={{ fontSize: '9px', color: 'var(--slate-400)', fontWeight: 700, textTransform: 'capitalize' }}>{(member.role || '').replace('_', ' ')}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'white', border: '1px solid #eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => window.open(`tel:${member.phone}`)}>
                                                        <Phone size={12} color="var(--slate-400)" />
                                                    </div>
                                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'white', border: '1px solid #eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => window.open(`mailto:${member.email}`)}>
                                                        <Mail size={12} color="var(--slate-400)" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}) : (
                                            <div style={{ textAlign: 'center', padding: '16px 10px', color: 'var(--slate-400)' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700 }}>Unassigned</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'Activities' ? (
                        <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => setShowFollowupModal(true)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', 
                                        borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', 
                                        color: 'var(--navy-900)', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s'
                                    }}
                                    className="hover-lift"
                                >
                                    <CalendarIcon size={14} color="#3b82f6" /> Schedule Next Follow-up
                                </button>
                            </div>
                            <div style={{
                                padding: '16px',
                                borderRadius: '20px',
                                background: 'white',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 4px 12px rgba(10,22,40,0.02)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    gap: 3,
                                    marginBottom: 16,
                                    background: '#f8fafc',
                                    padding: '4px',
                                    borderRadius: '14px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    {[
                                        { type: 'Note', icon: Edit2, color: '#6366f1' },
                                        { type: 'Task', icon: CheckSquare, color: '#8b5cf6' },
                                        { type: 'Email', icon: Mail, color: '#3b82f6' },
                                        { type: 'Call', icon: Phone, color: '#10b981' },
                                        { type: 'WhatsApp', icon: MessageSquare, color: '#25D366' },
                                        { type: 'Meeting', icon: Users, color: '#f59e0b' }
                                    ].map(btn => {
                                        const isActive = activityType === btn.type;
                                        return (
                                            <button
                                                key={btn.type}
                                                onClick={() => { setActivityType(btn.type); setShowActivityBox(true); }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: isActive ? 'white' : 'transparent',
                                                    color: isActive ? 'var(--navy-900)' : 'var(--slate-500)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    fontWeight: 800,
                                                    boxShadow: isActive ? '0 4px 12px rgba(10,22,40,0.08)' : 'none'
                                                }}
                                            >
                                                <btn.icon size={14} color={isActive ? btn.color : 'var(--slate-400)'} strokeWidth={2.5} />
                                                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{btn.type}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {showActivityBox && activityType === 'Move to Nurture' && (
                                    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ display: 'flex', gap: 16 }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Nurture Reason *</label>
                                                <select
                                                    className="form-control"
                                                    value={interactions[0]?.note || ''}
                                                    onChange={e => setNewNote(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                >
                                                    <option value="">Select reason...</option>
                                                    {['Budget issue', 'Timeline delay', 'No response', 'Inventory mismatch', 'Looking for better options'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Reconnect Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    onChange={e => (window._tmpReconnectDate = e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button
                                                onClick={() => setShowActivityBox(false)}
                                                className="hover-lift"
                                                style={{ flex: 1, padding: '0 16px', height: 48, borderRadius: '16px', background: '#f1f5f9', color: 'var(--slate-600)', fontWeight: 800, fontSize: '13px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('Nurture', { nurture_reason: newNote, reconnect_date: window._tmpReconnectDate })}
                                                className="hover-lift"
                                                style={{ flex: 2, height: 48, borderRadius: '16px', background: '#7c3aed', color: 'white', border: 'none', fontWeight: 900, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)' }}
                                            >
                                                Confirm Move to Nurture
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {showActivityBox && activityType !== 'Move to Nurture' && (
                                    <div className="animate-fadeIn">
                                        {activityType === 'Call' && (
                                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Call Outcome</label>
                                                    <select 
                                                        value={callOutcome} 
                                                        onChange={e => setCallOutcome(e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 700 }}
                                                    >
                                                        <option value="Connected">Connected</option>
                                                        <option value="No Answer">No Answer</option>
                                                        <option value="Busy">Busy</option>
                                                        <option value="Switch Off">Switch Off</option>
                                                        <option value="Not Interested">Not Interested</option>
                                                        <option value="Wrong Number">Wrong Number</option>
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Duration (seconds)</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="e.g. 45"
                                                        value={callDuration}
                                                        onChange={e => setCallDuration(e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 700 }}
                                                    />
                                                </div>
                                            </div>
                                        )}
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                <button onClick={handleVoice} className="hover-lift" style={{
                                                    width: 36, height: 36, borderRadius: '10px', border: '1px solid #f1f5f9',
                                                    background: isListening ? '#fee2e2' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Mic size={16} color={isListening ? '#ef4444' : 'var(--navy-600)'} />
                                                </button>
                                                <button onClick={handleSummarize} disabled={summarizing} className="hover-lift" style={{
                                                    height: 36, padding: '0 10px', borderRadius: '10px', border: '1px solid #f1f5f9',
                                                    background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}>
                                                    {summarizing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} color="#8b5cf6" />}
                                                    Summarize
                                                </button>
                                                {['Email', 'WhatsApp'].includes(activityType) && (
                                                    <button onClick={handleAIGenerate} disabled={generatingContent} className="hover-lift" style={{
                                                        height: 36, padding: '0 10px', borderRadius: '10px', border: '1px solid #e2e8f0',
                                                        background: 'linear-gradient(to right, rgba(139,92,246,0.1), rgba(6,182,212,0.1))', color: 'var(--navy-900)', fontWeight: 900, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                    }}>
                                                        {generatingContent ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} color="#8b5cf6" />}
                                                        Auto-Draft
                                                    </button>
                                                )}
                                                <label className="hover-lift" style={{
                                                    height: 36, padding: '0 10px', borderRadius: '10px', border: '1px solid #f1f5f9',
                                                    background: 'white', color: 'var(--navy-900)', fontWeight: 800, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}>
                                                    {uploadingAudio ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} color="#10b981" />}
                                                    {uploadingAudio ? 'Transcribing...' : 'Upload'}
                                                    <input
                                                        type="file"
                                                        accept="audio/*"
                                                        style={{ display: 'none' }}
                                                        onChange={handleAudioUpload}
                                                        disabled={uploadingAudio}
                                                    />
                                                </label>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    onClick={() => setShowActivityBox(false)}
                                                    className="hover-lift"
                                                    style={{ padding: '0 12px', height: 36, borderRadius: '8px', background: '#f1f5f9', color: 'var(--slate-600)', fontWeight: 800, fontSize: '11px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddNote}
                                                    className="hover-lift"
                                                    style={{ padding: '0 14px', height: 36, borderRadius: '8px', background: 'var(--navy-900)', color: 'white', fontWeight: 800, fontSize: '12px', boxShadow: '0 4px 12px rgba(10,22,40,0.15)', cursor: 'pointer', border: 'none' }}
                                                >
                                                    {['Email', 'WhatsApp'].includes(activityType) ? `Send ${activityType}` : 'Log Interaction'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {justLogged && (
                                    <div className="animate-scaleIn" style={{ 
                                        marginTop: 12, padding: '16px', background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', 
                                        borderRadius: '20px', border: '1px solid #b7ebc6', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                        boxShadow: '0 8px 16px rgba(16, 185, 129, 0.08)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CalendarIcon size={18} color="white" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#065f46' }}>Activity Logged!</div>
                                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Schedule the next step now?</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowFollowupModal(true)}
                                            style={{ 
                                                padding: '8px 16px', borderRadius: '10px', background: '#10b981', 
                                                color: 'white', border: 'none', fontWeight: 900, fontSize: '12px', 
                                                cursor: 'pointer', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' 
                                            }}
                                        >
                                            Schedule Follow-up
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {interactions.map((item) => {
                                    const cfg = item.type === 'Call' ? { icon: Phone, color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' } :
                                        item.type === 'Email' ? { icon: Mail, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' } :
                                            item.type === 'WhatsApp' ? { icon: MessageSquare, color: '#25D366', bg: 'rgba(37, 211, 102, 0.05)' } :
                                                { icon: Edit2, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' };
                                    return (
                                        <div key={item.id} style={{
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
                                                        <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600, marginTop: 2 }}>
                                                            {item.agent_name || 'System Interaction'} • {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {(item.outcome || item.duration) && (
                                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                                {item.outcome && (
                                                                    <div style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', textTransform: 'uppercase' }}>
                                                                        {item.outcome}
                                                                    </div>
                                                                )}
                                                                {item.duration && (
                                                                    <div style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', textTransform: 'uppercase' }}>
                                                                        {Math.floor(item.duration / 60)}m {item.duration % 60}s
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {item.entry_type !== 'system' && (
                                                        <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 5 }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingInteraction(item.id); setEditNote(item.note || ''); }}
                                                                style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={13} color="#3b82f6" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteInteraction(item.id); }}
                                                                style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Delete"
                                                            >
                                                                <X size={13} color="#ef4444" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {editingInteraction === item.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <textarea
                                                            value={editNote}
                                                            onChange={e => setEditNote(e.target.value)}
                                                            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fcfdfe', minHeight: 80, fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                                                        />
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                            <button onClick={() => { setEditingInteraction(null); setEditNote(''); }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)' }}>Cancel</button>
                                                            <button onClick={() => handleEditInteraction(item.id)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'var(--navy-900)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>Save Changes</button>
                                                        </div>
                                                    </div>
                                                ) : (item.transcript || (item.note && item.note.includes('[Automated AI Transcript'))) ? (() => {
                                                    let summaryText = null;
                                                    let highlightsText = null;
                                                    let whatsappText = null;
                                                    let draftStatus = null;
                                                    let transcriptText = item.transcript || ''; 
                                                    let sentimentBadge = item.sentiment;

                                                    if (item.note && item.note.includes('[Automated AI Transcript')) {
                                                        const lines = item.note.split('\n');
                                                        if (!sentimentBadge) {
                                                            const sentimentMatch = lines[0].match(/Sentiment: (.*?)]/);
                                                            if (sentimentMatch) sentimentBadge = sentimentMatch[1];
                                                        }

                                                        const summaryMatch = item.note.match(/--- AI SUMMARY ---\n([\s\S]*?)(?=\nHighlights:|\n---|\n$)/);
                                                        if (summaryMatch) summaryText = summaryMatch[1].trim();

                                                        const highlightsMatch = item.note.match(/Highlights:\n([\s\S]*?)(?=\n---|\n$)/);
                                                        if (highlightsMatch) highlightsText = highlightsMatch[1].trim();

                                                        const whatsappMatch = item.note.match(/--- AI WHATSAPP FOLLOW-UP (.*?)(?: ---)\n([\s\S]*?)(?=\n---|\n✅|$)/);
                                                        if (whatsappMatch) {
                                                            draftStatus = whatsappMatch[1].trim();
                                                            whatsappText = whatsappMatch[2].trim();
                                                        }

                                                        if (!transcriptText) {
                                                            const verbatimMatch = item.note.match(/--- VERBATIM TRANSCRIPT ---\n([\s\S]*?)(?=\n---|\n✅|$)/);
                                                            if (verbatimMatch) {
                                                                transcriptText = verbatimMatch[1].trim();
                                                            } else if (item.note.includes('Agent:') || item.note.includes('Client:')) {
                                                                 const tMatch = item.note.match(/(Agent|Client):[\s\S]*/);
                                                                 if (tMatch) transcriptText = tMatch[0].trim();
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-violet)', background: 'rgba(139, 92, 246, 0.1)', padding: '6px 12px', borderRadius: '12px' }}>
                                                                    <Sparkles size={12} /> Gemini AI Analysis
                                                                </div>
                                                                {sentimentBadge && (
                                                                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: sentimentBadge === 'Positive' ? '#10b981' : sentimentBadge === 'Negative' || sentimentBadge === 'Concerned' ? '#ef4444' : '#64748b', background: 'white', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentBadge === 'Positive' ? '#10b981' : sentimentBadge === 'Negative' || sentimentBadge === 'Concerned' ? '#ef4444' : '#94a3b8', display: 'inline-block', marginRight: 4 }} />
                                                                        {sentimentBadge} Intent
                                                                    </div>
                                                                )}
                                                                {item.recording_url && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', background: 'white', padding: '4px 8px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                        <audio controls preload="metadata" style={{ height: 28, width: 220, outline: 'none' }}>
                                                                            <source src={item.recording_url} type="audio/mp4" />
                                                                        </audio>
                                                                        {(() => {
                                                                            const expireDate = new Date(new Date(item.date).getTime() + 30 * 24 * 60 * 60 * 1000);
                                                                            const diffDays = Math.ceil((expireDate - new Date()) / (1000 * 60 * 60 * 24));
                                                                            if (diffDays > 0) {
                                                                                return (
                                                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: diffDays <= 5 ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                        <Clock size={10} /> Exp in {diffDays}d
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </div>
                                                                )}
                                                                {transcriptText && (
                                                                    <button
                                                                        onClick={() => downloadTranscript(item.id)}
                                                                        style={{
                                                                            marginLeft: item.recording_url ? 0 : 'auto', fontSize: '10px', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.08)',
                                                                            border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '5px 10px',
                                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                                        }}
                                                                    >
                                                                        <FileText size={11} /> Download .txt
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {summaryText && (
                                                                <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                                                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 900, color: 'var(--navy-900)' }}>Call Summary</h4>
                                                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-600)', lineHeight: 1.6, fontWeight: 500 }}>{summaryText}</p>
                                                                    
                                                                    {highlightsText && (
                                                                        <div style={{ marginTop: 12 }}>
                                                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Key Highlights</h4>
                                                                            <div style={{ fontSize: '13px', color: 'var(--navy-800)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                                                {highlightsText}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {whatsappText && (
                                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(37, 211, 102, 0.05)', padding: '12px 16px', borderRadius: '16px', border: '1px dashed rgba(37, 211, 102, 0.4)', marginBottom: 16 }}>
                                                                    <div style={{ width: 32, height: 32, borderRadius: '10px', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                        <MessageSquare size={16} />
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#166534', marginBottom: 4, textTransform: 'uppercase' }}>{draftStatus || 'Drafted WhatsApp Follow-up'}</div>
                                                                        <div style={{ fontSize: '12px', color: 'var(--navy-900)', fontWeight: 700, whiteSpace: 'pre-wrap' }}>{whatsappText}</div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => { setNewNote(whatsappText); setActivityType('WhatsApp'); setShowActivityBox(true); }}
                                                                        className="hover-lift"
                                                                        style={{ padding: '8px 12px', borderRadius: '10px', background: 'white', border: '1px solid #25D366', color: '#166534', fontWeight: 900, fontSize: '11px', cursor: 'pointer' }}
                                                                    >
                                                                        Use Draft
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {transcriptText && (
                                                                <details style={{ background: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                                    <summary style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)', outline: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <ClipboardCheck size={14} color="var(--slate-400)" /> View Full Verbatim Transcript
                                                                    </summary>
                                                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                                                                        {transcriptText.split('\n').filter(l => l.trim()).map((line, i) => {
                                                                            const isAgent = line.startsWith('Agent:');
                                                                            const text = line.replace(/^(Agent|Client):\s*/, '');
                                                                            if (!isAgent && !line.startsWith('Client:')) {
                                                                                return <div key={i} style={{ fontSize: '12px', color: 'var(--slate-500)', fontStyle: 'italic' }}>{line}</div>;
                                                                            }
                                                                            return (
                                                                                <div key={i} style={{
                                                                                    alignSelf: isAgent ? 'flex-end' : 'flex-start',
                                                                                    background: isAgent ? 'var(--navy-900)' : '#f8fafc',
                                                                                    color: isAgent ? 'white' : 'var(--navy-900)',
                                                                                    border: isAgent ? '1px solid var(--navy-900)' : '1px solid #e2e8f0',
                                                                                    padding: '10px 14px', borderRadius: '16px',
                                                                                    borderBottomRightRadius: isAgent ? '4px' : '16px',
                                                                                    borderBottomLeftRadius: !isAgent ? '4px' : '16px',
                                                                                    maxWidth: '85%', fontSize: '12px', fontWeight: 600, lineHeight: 1.5,
                                                                                    boxShadow: '0 4px 12px rgba(10,22,40,0.04)'
                                                                                }}>
                                                                                    <div style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: isAgent ? 'rgba(255,255,255,0.5)' : 'var(--slate-400)', marginBottom: 2, letterSpacing: '0.05em' }}>{isAgent ? 'Agent' : 'Client'}</div>
                                                                                    {text}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </details>
                                                            )}
                                                        </div>
                                                    );
                                                })() : (
                                                    <div style={{ fontSize: '14px', color: 'var(--navy-900)', fontWeight: 600, lineHeight: 1.6, background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #eef2f6', whiteSpace: 'pre-wrap' }}>
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

            {confirmDeleteId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="animate-scaleIn" style={{
                        maxWidth: 400, width: '100%', background: 'white', borderRadius: 24,
                        boxShadow: '0 32px 64px rgba(10,22,40,0.2)', padding: 32, textAlign: 'center'
                    }}>
                        <div style={{ 
                            width: 64, height: 64, borderRadius: 20, background: '#fef2f2', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            margin: '0 auto 24px', border: '1px solid #fee2e2' 
                        }}>
                            <X size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--navy-900)', margin: '0 0 8px' }}>Security Confirmation</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', margin: '0 0 32px', lineHeight: 1.6 }}>Are you sure you want to permanently delete this interaction? This action cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button 
                                onClick={() => setConfirmDeleteId(null)}
                                style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #e2e8f0', background: 'white', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={performDelete}
                                style={{ 
                                    flex: 1, padding: '14px', borderRadius: 14, border: 'none', 
                                    background: '#ef4444', color: 'white', fontWeight: 800, 
                                    fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.25)' 
                                }}
                            >
                                {isDeleting ? 'Removing...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showFollowupModal && (
                <FollowupModal 
                    onClose={() => setShowFollowupModal(false)}
                    leadId={id}
                    leadName={contact.name}
                    initialAgentId={contact.assigned_to}
                    onScheduled={() => {
                        setJustLogged(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
