import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { ChevronLeft, ChevronDown, Edit2, Mail, Phone, Calendar as CalendarIcon, CheckSquare, Settings, Search, Plus, UserPlus, Target, ThumbsUp, ThumbsDown, Copy, X, Sparkles, Brain, Wand2, RefreshCw, ExternalLink, TrendingUp, MessageSquare, Briefcase, Mic, ArrowRight, Zap, Home, MapPin, DollarSign, Tag, Smile, ShieldCheck, Rocket, ClipboardCheck, FileText, Clock, UploadCloud, Users, RotateCw, Volume2, Play } from 'lucide-react';
import { leadsApi, zapierApi, notificationsApi, aiApi, BASE_URL, getToken } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { dialerEvents } from '../../constants/events';
import NotificationComposer from '../../components/notifications/NotificationComposer';
import FollowupModal from '../../components/modals/FollowupModal';
import { useMobile } from '../../hooks/useMobile';
import SiteVisitScheduler from '../../components/SiteVisitScheduler';
import * as dateUtils from '../../utils/dateUtils';
import { usePageInfo } from '../../context/PageContext';

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

const STAGE_CHECKLISTS: Record<string, string[]> = {
    'New Lead': [
        'Verify lead contact details (Phone & Email)',
        'Call within 15 minutes of inbound query',
        'Send introductory WhatsApp message with company profile'
    ],
    'Connected': [
        'Log property requirement (BHK, Location, Budget)',
        'Share initial project brochures & costing details',
        'Schedule formal qualification/discussion call'
    ],
    'Qualified': [
        'Identify buyer timeline & financing options',
        'Select top 3 project matches based on budget',
        'Invite lead for an in-person site visit'
    ],
    'Site Visit Scheduled': [
        'Arrange cab/transportation or send directions pin',
        'Brief site executive on lead’s profile and interest',
        'Send site visit reminder invitation via WhatsApp'
    ],
    'Site Visit Done': [
        'Log site visit feedback & unit preference',
        'Provide detailed cost sheets & pricing breakdowns',
        'Follow up within 24 hours of visit completion'
    ],
    'Interested': [
        'Customize final proposal & payment schedule',
        'Block preferred unit tentatively in inventory',
        'Collect KYC documents (PAN, Aadhaar)'
    ],
    'Proposal Shared': [
        'Confirm receipt and review of proposal document',
        'Schedule quick review call to answer questions',
        'Identify and resolve first-level pricing objections'
    ],
    'Negotiation': [
        'Get management approval for special discounts',
        'Finalize payment milestones & token booking amount',
        'Send formal booking link / bank transfer details'
    ],
    'Won': [
        'Validate booking amount credit in bank',
        'Generate Pro-Forma Invoice and Booking Agreement',
        'Handover file to CRM Operations for onboarding'
    ],
    'Lost': [
        'Log primary reason for loss (Budget, Competitor, etc.)',
        'Move lead to automated cold-outreach list',
        'Set reminder for check-in after 6 months'
    ]
};

function ContactDetailsSkeleton() {
    return (
        <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 56px)', maxWidth: '100vw', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
            {/* LEFT COLUMN - Profile Summary Skeleton */}
            <div style={{
                width: 400,
                flexShrink: 0,
                borderRight: '1px solid var(--border-light)',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 24px rgba(10,22,40,0.02)',
                zIndex: 10,
                padding: '12px'
            }}>
                {/* Back Button Skeleton */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
                    <div className="dash-skeleton" style={{ width: 80, height: 32, borderRadius: '10px' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="dash-skeleton" style={{ width: 60, height: 20, borderRadius: '10px' }} />
                        <div className="dash-skeleton" style={{ width: 80, height: 20, borderRadius: '10px' }} />
                    </div>
                </div>

                {/* Avatar & Name Skeleton */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div className="dash-skeleton dash-skeleton-circle" style={{ width: 48, height: 48, margin: '0 auto 12px' }} />
                    <div className="dash-skeleton dash-skeleton-bar" style={{ width: '40%', height: 16, margin: '0 auto 8px' }} />
                    <div className="dash-skeleton dash-skeleton-bar" style={{ width: '25%', height: 12, margin: '0 auto' }} />
                </div>

                {/* Strategic Action Hub (9 buttons) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                    marginBottom: 16,
                    padding: '8px',
                    background: '#f8fafc',
                    borderRadius: '14px'
                }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="dash-skeleton" style={{ height: 46, borderRadius: '10px', background: '#e2e8f0' }} />
                    ))}
                </div>

                {/* Core Identity Section */}
                <div style={{
                    padding: '14px',
                    borderRadius: '18px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div className="dash-skeleton dash-skeleton-bar" style={{ width: '30%', height: 10 }} />
                        <div className="dash-skeleton dash-skeleton-circle" style={{ width: 14, height: 14 }} />
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 36, height: 36, borderRadius: '12px' }} />
                            <div style={{ flex: 1 }}>
                                <div className="dash-skeleton dash-skeleton-bar" style={{ width: '40%', height: 8, marginBottom: 4 }} />
                                <div className="dash-skeleton dash-skeleton-bar" style={{ width: '70%', height: 12 }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Journey Milestone Section */}
                <div style={{ marginTop: 12, padding: '14px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div className="dash-skeleton dash-skeleton-bar" style={{ width: '40%', height: 10, marginBottom: 12 }} />
                    <div className="dash-skeleton" style={{ width: '100%', height: 44, borderRadius: '16px' }} />
                </div>
            </div>

            {/* MIDDLE COLUMN - Timeline & Intelligence Skeleton */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden', backgroundColor: '#fcfdfe', padding: '16px' }}>
                {/* Tabs Skeleton */}
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: 'white', paddingBottom: 10, marginBottom: 16 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <div className="dash-skeleton dash-skeleton-bar" style={{ width: '50%', height: 14 }} />
                        </div>
                    ))}
                </div>

                {/* Overview content skeleton */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Deal Matrix Intelligence */}
                    <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3' }}>
                        <div className="dash-skeleton dash-skeleton-bar" style={{ width: '20%', height: 12, marginBottom: 12 }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #eef2f6', textAlign: 'center' }}>
                                    <div className="dash-skeleton dash-skeleton-circle" style={{ width: 22, height: 22, margin: '0 auto 6px' }} />
                                    <div className="dash-skeleton dash-skeleton-bar" style={{ width: '60%', height: 8, margin: '0 auto 4px' }} />
                                    <div className="dash-skeleton dash-skeleton-bar" style={{ width: '40%', height: 10, margin: '0 auto' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Lead Lifecycle Journey Stepper */}
                    <div style={{ padding: '16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3' }}>
                        <div className="dash-skeleton dash-skeleton-bar" style={{ width: '15%', height: 12, marginBottom: 16 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 10px', marginBottom: 12 }}>
                            <div style={{ position: 'absolute', top: '50%', left: 10, right: 10, height: 3, background: '#f1f5f9', transform: 'translateY(-50%)', zIndex: 0 }} />
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="dash-skeleton dash-skeleton-circle" style={{ width: 20, height: 20, zIndex: 1, border: '2.5px solid white' }} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div className="dash-skeleton dash-skeleton-bar" style={{ width: '15%', height: 8 }} />
                            <div className="dash-skeleton dash-skeleton-bar" style={{ width: '15%', height: 8 }} />
                        </div>
                    </div>

                    {/* Cards grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* Strategic window card */}
                        <div className="dash-skeleton-card" style={{ height: 72, background: 'linear-gradient(135deg, #0a1628, #152238)', padding: 12 }}>
                            <div className="dash-skeleton" style={{ width: '30%', height: 8, marginBottom: 8, opacity: 0.3 }} />
                            <div className="dash-skeleton" style={{ width: '60%', height: 12, opacity: 0.3 }} />
                        </div>
                        {/* Behavioral IQ card */}
                        <div className="dash-skeleton-card" style={{ height: 72, background: 'linear-gradient(135deg, #0a1628, #152238)', padding: 12 }}>
                            <div className="dash-skeleton" style={{ width: '30%', height: 8, marginBottom: 8, opacity: 0.3 }} />
                            <div className="dash-skeleton" style={{ width: '60%', height: 12, opacity: 0.3 }} />
                        </div>
                    </div>

                    {/* Suggested Next Action */}
                    <div style={{ padding: '16px', borderRadius: '16px', background: 'white', border: '1px solid rgba(16, 185, 129, 0.15)', borderLeft: '5px solid #10b981' }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 20, height: 20, borderRadius: '6px' }} />
                            <div className="dash-skeleton dash-skeleton-bar" style={{ width: '40%', height: 10 }} />
                        </div>
                        <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--full" style={{ height: 14, marginBottom: 6 }} />
                        <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--full" style={{ height: 14, marginBottom: 12, width: '80%' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="dash-skeleton" style={{ width: 120, height: 28, borderRadius: '8px' }} />
                            <div className="dash-skeleton" style={{ width: 100, height: 28, borderRadius: '8px' }} />
                        </div>
                    </div>

                    {/* AI Engagement Checklist */}
                    <div style={{ padding: '16px', borderRadius: '16px', background: 'white', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div className="dash-skeleton dash-skeleton-circle" style={{ width: 20, height: 20, borderRadius: '6px' }} />
                                <div className="dash-skeleton dash-skeleton-bar" style={{ width: 140, height: 12 }} />
                            </div>
                            <div className="dash-skeleton dash-skeleton-bar" style={{ width: 80, height: 12 }} />
                        </div>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, background: '#f8fafc', borderRadius: '10px' }}>
                                <div className="dash-skeleton dash-skeleton-circle" style={{ width: 18, height: 18, borderRadius: '5px' }} />
                                <div className="dash-skeleton dash-skeleton-bar" style={{ width: '70%', height: 10 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ContactDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(`lead_checklist_${id}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    useEffect(() => {
        try {
            const saved = localStorage.getItem(`lead_checklist_${id}`);
            setChecklistState(saved ? JSON.parse(saved) : {});
        } catch (e) {
            setChecklistState({});
        }
    }, [id]);

    const handleToggleChecklist = (task: string) => {
        const nextState = { ...checklistState, [task]: !checklistState[task] };
        setChecklistState(nextState);
        try {
            localStorage.setItem(`lead_checklist_${id}`, JSON.stringify(nextState));
        } catch (e) {
            console.error('Failed to save checklist state', e);
        }
    };

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
    const [generatingAISuggestion, setGeneratingAISuggestion] = useState(false);
    const [aiSuggestedMessage, setAiSuggestedMessage] = useState('');
    const [showSiteVisitScheduler, setShowSiteVisitScheduler] = useState(false);
    const [showFloatingComposer, setShowFloatingComposer] = useState(false);
    const [activityFilter, setActivityFilter] = useState<'All' | 'Follow-ups Due' | 'Calls' | 'Meetings' | 'Emails' | 'AI Insights'>('All');
    const [activitySearchQuery, setActivitySearchQuery] = useState('');
    const isMobile = useMobile();
    const { setPageInfo } = usePageInfo();

    const filteredInteractions = useMemo(() => {
        let items = [...(interactions || [])];

        // Intent-based filter logic
        if (activityFilter === 'Follow-ups Due') {
            items = items.filter(item =>
                item.type === 'Task' || item.type === 'Meeting' ||
                (item.note && (item.note.toLowerCase().includes('follow-up') || item.note.toLowerCase().includes('follow up') || item.note.toLowerCase().includes('next step') || item.note.toLowerCase().includes('reminder')))
            );
        } else if (activityFilter === 'Calls') {
            items = items.filter(item => item.type === 'Call');
        } else if (activityFilter === 'Meetings') {
            items = items.filter(item => item.type === 'Meeting');
        } else if (activityFilter === 'Emails') {
            items = items.filter(item => item.type === 'Email');
        } else if (activityFilter === 'AI Insights') {
            items = items.filter(item =>
                (item.note && (item.note.includes('AI') || item.note.toLowerCase().includes('automated') || item.note.toLowerCase().includes('suggested') || item.note.toLowerCase().includes('summary'))) || item.transcript
            );
        }

        if (activitySearchQuery.trim()) {
            const q = activitySearchQuery.toLowerCase();
            if (q === 'unanswered questions' || q === 'questions') {
                items = items.filter(item =>
                    item.note && (item.note.includes('?') || item.note.toLowerCase().includes('question') || item.note.toLowerCase().includes('ask') || item.note.toLowerCase().includes('inquire'))
                );
            } else if (q === 'follow-ups' || q === 'follow-up') {
                items = items.filter(item =>
                    item.type === 'Task' || item.type === 'Meeting' || (item.note && (item.note.toLowerCase().includes('follow-up') || item.note.toLowerCase().includes('reminder') || item.note.toLowerCase().includes('next step')))
                );
            } else if (q === 'ai summaries' || q === 'ai generated') {
                items = items.filter(item =>
                    (item.note && (item.note.includes('AI') || item.note.toLowerCase().includes('automated') || item.note.toLowerCase().includes('suggested'))) || item.transcript
                );
            } else {
                items = items.filter(item =>
                    item.type.toLowerCase().includes(q) ||
                    (item.note && item.note.toLowerCase().includes(q)) ||
                    (item.agent_name && item.agent_name.toLowerCase().includes(q)) ||
                    (item.outcome && item.outcome.toLowerCase().includes(q))
                );
            }
        }
        return items;
    }, [interactions, activityFilter, activitySearchQuery]);

    useEffect(() => {
        if (contact) {
            setPageInfo({ 
                title: 'Lead Workspace', 
                subtitle: `Managing ${contact.name || 'Lead'}` 
            });
        }
        return () => setPageInfo({});
    }, [contact, setPageInfo]);

    const handleVoice = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('Voice intelligence not supported in this browser', 'error');
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setNewNote(prev => prev + (prev ? ' ' : '') + transcript);
            };
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);
            recognition.start();
        } catch (err: any) {
            console.error('Speech recognition error:', err);
            showToast('Failed to start voice recognition', 'error');
            setIsListening(false);
        }
    };

    const handleSummarize = async () => {
        if (!newNote.trim()) {
            showToast('No content to summarize', 'warning');
            return;
        }
        setSummarizing(true);
        try {
            const result = await zapierApi.summarizeCall({ transcript: newNote });
            if (!result || !result.summary) throw new Error('Empty summary returned');
            const summaryText = `\n\n--- AI SUMMARY ---\n${result.summary}\n\nKey Points:\n${(result.keyPoints || []).map(p => `• ${p}`).join('\n')}\n\nAction Items:\n${(result.actionItems || []).map(a => `• ${a}`).join('\n')}\nSentiment: ${result.sentiment || 'Neutral'}`;
            setNewNote(prev => prev + summaryText);
            showToast('AI Summary generated!', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Failed to generate summary', 'error');
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
        } catch (err: any) {
            showToast(err?.message || "AI Generation failed", "error");
        } finally {
            setGeneratingContent(false);
        }
    };

    const handleGenerateAISuggestion = async () => {
        setGeneratingAISuggestion(true);
        try {
            const res = await aiApi.suggestMessage({ 
                lead_id: id, 
                reason: contact.nurture_reason || 'Proactive Re-engagement' 
            });
            setAiSuggestedMessage(res.message);
            showToast('AI Draft Ready!', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Failed to generate AI suggestion', 'error');
        } finally {
            setGeneratingAISuggestion(false);
        }
    };

    const handleRecalculateScore = async () => {
        setRecalculatingScore(true);
        try {
            const response = await fetch(`${BASE_URL}/leads/${id}/ai-score`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
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
        } catch (err: any) {
            console.error('Recalculate error:', err);
            showToast(err?.error || "AI Refresh failed. Check connectivity.", "error");
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
        } catch (err: any) {
            console.error('Transcription Error:', err);
            showToast(err?.message || 'Failed to process audio', 'error');
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
        } catch (err: any) {
            setError(err?.error || 'Failed to load contact');
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    setIsEditingInterest(prev => {
                        if (!prev) {
                            if (contact) {
                                setEditInterestData({ budget: contact.budget || '', property_type: contact.property_type || '' });
                            }
                        } else {
                            if (contact) {
                                leadsApi.update(id, editInterestData).then(upd => { 
                                    setContact(p => p ? { ...p, ...upd } : null); 
                                    showToast("Interest Profile updated", "success");
                                    loadData();
                                }).catch(() => showToast("Update failed", "error"));
                            }
                        }
                        return !prev;
                    });
                } else if (e.key === 'n' || e.key === 'N') {
                    e.preventDefault();
                    setActivityType('Note');
                    setActiveTab('Activities');
                    setShowActivityBox(true);
                    setTimeout(() => {
                        const inputEl = document.getElementById('activity-note-input');
                        if (inputEl) inputEl.focus();
                    }, 100);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [id, contact, editInterestData, loadData, showToast]);

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
        } catch (err: any) {
            showToast(err?.error || 'Failed to update stage', 'error');
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
        } catch (err: any) {
            showToast(err?.error || 'Failed to update status', 'error');
        }
    };


    const displayDates = useMemo(() => {
        if (!contact) return {};
        return {
            createdAt: dateUtils.parseSafe(contact.created_at) || dateUtils.getNow(),
            lastContact: contact.last_contact_at ? dateUtils.parseSafe(contact.last_contact_at) : null
        };
    }, [contact]);

    if (loading) return <ContactDetailsSkeleton />;
    if (error) return <PageError message={error} onRetry={loadData} />;
    if (!contact) return <div style={{ padding: 40, textAlign: 'center' }}>Contact not found</div>;

    const initial = (contact.name || 'Unknown').split(' ').filter(Boolean).map(n => n[0])[0]?.toUpperCase() || '?';

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
                const payload: any = { type: activityType, note: newNote };
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
        } catch (err: any) {
            console.error('Send Error:', err);
            showToast(err?.message || err?.error || 'Failed to process activity', 'error');
        }
    };

    const handleDeleteInteraction = (interactionId) => {

        setConfirmDeleteId(interactionId);
    };

    const performDelete = async () => {
        const interactionId = confirmDeleteId;
        if (!interactionId) return;

        setIsDeleting(true);

        
        try {
            // Optimistic update
            setInteractions(prev => prev.filter(item => item.id !== interactionId));
            setConfirmDeleteId(null);
            
            await leadsApi.deleteInteraction(id, interactionId);
            showToast('Interaction removed', 'success');
            loadData();
        } catch (err: any) {
            console.error('[DEBUG] Interaction delete failed:', err);
            showToast(err?.error || err?.message || 'Failed to delete', 'error');
            loadData();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditInteraction = async (interactionId) => {

        if (!editNote.trim()) return;
        try {
            await leadsApi.updateInteraction(id, interactionId, { note: editNote });
            showToast('Interaction updated', 'success');
            setEditingInteraction(null);
            setEditNote('');
            loadData();
        } catch (err: any) {
            console.error('Update error:', err);
            showToast(err?.error || 'Failed to update interaction', 'error');
        }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        try {
            const res = await zapierApi.enrichLead(id);
            setAiInsights(res.insights || res.suggestions);
            showToast('Zapier AI has enriched this record', 'success');
        } catch (err: any) {
            console.error(err);
            showToast(err?.error || 'Failed to enrich record', 'error');
        } finally {
            setEnriching(false);
        }
    };

    const downloadTranscript = async (interactionId) => {
        try {
            const token = getToken();
            const response = await fetch(`${BASE_URL}/telephony/transcript/${interactionId}`, {
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
        } catch (err: any) {
            console.error(err);
            showToast(err?.message || 'Failed to download transcript', 'error');
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
        <div className="contact-details-layout" style={{ 
            display: 'flex', 
            width: 'auto', 
            margin: isMobile ? '-16px -12px' : '-16px -28px', 
            height: 'calc(100vh - 56px)', 
            backgroundColor: '#f8fafc', 
            fontFamily: 'var(--font-main)', 
            overflow: 'hidden' 
        }}>
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
                                <RotateCw size={12} /> Reconnect: {dateUtils.parseSafe(contact.reconnect_date) ? dateUtils.parseSafe(contact.reconnect_date)!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#701a75' }}>
                                Reason: {contact.nurture_reason}
                            </div>
                            
                            <button 
                                onClick={handleGenerateAISuggestion}
                                disabled={generatingAISuggestion}
                                style={{
                                    marginTop: 8, padding: '10px', borderRadius: '12px',
                                    background: 'white', border: '1.5px solid #f0abfc',
                                    color: '#a21caf', fontSize: '11px', fontWeight: 900,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    cursor: 'pointer', boxShadow: '0 4px 10px rgba(162,28,175,0.05)'
                                }}
                            >
                                {generatingAISuggestion ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />}
                                {generatingAISuggestion ? 'DRAFTING...' : '✨ MAGIC AI DRAFT'}
                            </button>

                            {aiSuggestedMessage && (
                                <div style={{
                                    marginTop: 12, padding: '12px', borderRadius: '12px',
                                    background: 'white', border: '1px solid #f5d0fe',
                                    position: 'relative'
                                }}>
                                    <p style={{ fontSize: '12px', color: '#701a75', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                                        "{aiSuggestedMessage}"
                                    </p>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                        <button 
                                            onClick={() => {
                                                setNewNote(aiSuggestedMessage);
                                                setActivityType('WhatsApp');
                                                setShowActivityBox(true);
                                                setAiSuggestedMessage('');
                                            }}
                                            style={{ flex: 1, padding: '6px', borderRadius: '8px', background: '#7c3aed', color: 'white', border: 'none', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                            USE MESSAGE
                                        </button>
                                        <button 
                                            onClick={() => setAiSuggestedMessage('')}
                                            style={{ padding: '6px 10px', borderRadius: '8px', background: 'white', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                            DISMISS
                                        </button>
                                    </div>
                                </div>
                            )}
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
                            { icon: MapPin, label: 'Plan Visit', color: '#f59e0b', action: () => setShowSiteVisitScheduler(true) },
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
                                <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--navy-700)', textTransform: 'uppercase' }}>{act.label}</span>
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
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Core Identity</h3>
                                <button aria-label="Edit Core Identity" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={13} color="var(--slate-400)" /></button>
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
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <div style={{ padding: '0 12px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                    <div style={{ display: 'flex' }}>
                        {['Overview', 'Activities', 'Intelligence'].map(tab => (
                            <div
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    color: activeTab === tab ? 'var(--navy-900)' : 'var(--slate-400)',
                                    fontWeight: activeTab === tab ? 900 : 700,
                                    fontSize: '13px',
                                    borderBottom: `2px solid ${activeTab === tab ? 'var(--navy-900)' : 'transparent'}`,
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
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }} className="animate-fadeIn">
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
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10 }}>
                            {/* ── 13. STICKY FOLLOW-UP PANEL ── */}
                            <div style={{
                                position: 'sticky', top: 0, zIndex: 100,
                                background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
                                borderRadius: '10px', padding: '4px 8px', border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(10,22,40,0.06)', marginBottom: '1px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>NEXT FOLLOW-UP:</span>
                                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>Today, 6:00 PM</span>
                                    </div>

                                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: '5px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Phone size={10} color="#2563eb" /> Call
                                    </div>

                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                                        Assigned: <strong style={{ color: '#0f172a' }}>{contact.assigned_to_name || 'Tanu'}</strong>
                                    </div>

                                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#7c3aed', background: '#f3e8ff', padding: '1px 6px', borderRadius: '5px', border: '1px solid #e9d5ff' }}>
                                        Probability: <strong>91%</strong>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setActivityType('Call');
                                        setShowActivityBox(true);
                                    }}
                                    className="hover-lift"
                                    style={{
                                        padding: '4px 10px', borderRadius: '6px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: 'white', border: 'none', fontWeight: 900, fontSize: '10px',
                                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                        display: 'flex', alignItems: 'center', gap: 4
                                    }}
                                >
                                    <Rocket size={11} color="white" /> Execute Action
                                </button>
                            </div>
                            {/* Deal Matrix Intelligence - Executive Dashboard */}
                            <div className="cd-card-animate cd-stagger-1 cd-hover-glow" style={{ padding: '6px 10px', borderRadius: '10px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 2px 8px rgba(10,22,40,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: 4, height: 10, borderRadius: '2px', background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)' }} />
                                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>DEAL MATRIX INTELLIGENCE</h3>
                                    </div>
                                    <div style={{ fontSize: '8.5px', color: 'var(--slate-500)', fontWeight: 800, background: '#f8fafc', padding: '1px 6px', borderRadius: '5px', border: '1px solid #e2e8f0' }}>ID: {contact.id.slice(0, 10).toUpperCase()}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                                    {[
                                        { label: 'Lead Health', value: '92%', Icon: ShieldCheck, color: '#10b981', tag: 'High' },
                                        { label: 'Conversion', value: `${contact.score || 50}%`, Icon: Sparkles, color: '#8b5cf6', trend: '+4.2%' },
                                        { label: 'Days in Stage', value: '3 Days', Icon: Clock, color: '#f59e0b' },
                                        { label: 'Last Activity', value: displayDates.lastContact ? displayDates.lastContact.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Today', Icon: Zap, color: '#06b6d4' }
                                    ].map(stat => (
                                        <div key={stat.label} style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)', padding: '4px 6px', borderRadius: '8px', border: '1px solid #eef2f6', textAlign: 'center', position: 'relative' }}>
                                            <div style={{ width: 18, height: 18, borderRadius: '5px', background: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2px', border: `1px solid ${stat.color}20` }}>
                                                <stat.Icon size={10} color={stat.color} />
                                            </div>
                                            <div style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>{stat.label}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-0.3px', lineHeight: 1 }}>{stat.value}</div>
                                            {stat.trend && <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#10b981', marginTop: 1, lineHeight: 1 }}>▲ {stat.trend}</div>}
                                            {stat.tag && <div style={{ fontSize: '7px', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '0.5px 4px', borderRadius: '3px', display: 'inline-block', marginTop: 1 }}>{stat.tag}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                             {/* Lead Lifecycle Journey Stepper (Customer Evolution Journey) */}
                             <div className="cd-card-animate cd-stagger-2" style={{ padding: '8px 12px', borderRadius: '12px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                 {(() => {
                                     const isLost = contact.stage === 'Lost';
                                     const evolutionStages = [
                                         { day: 'Day 1', label: 'Cold', active: true, done: true, color: '#3b82f6' },
                                         { day: 'Day 3', label: 'Interested', active: true, done: true, color: '#8b5cf6' },
                                         { day: 'Day 5', label: 'Site Visit', active: contact.stage !== 'New Lead' && contact.stage !== 'Connected' && contact.stage !== 'Qualified', done: contact.stage !== 'New Lead' && contact.stage !== 'Connected' && contact.stage !== 'Qualified', color: '#10b981' },
                                         { day: 'Day 8', label: 'Negotiation', active: ['Negotiation', 'Won', 'Lost'].includes(contact.stage), done: ['Won', 'Lost'].includes(contact.stage), color: '#f59e0b' },
                                         { day: 'Day 12', label: 'Booked', active: contact.stage === 'Won', done: contact.stage === 'Won', color: '#10b981' }
                                     ];
                                     return (
                                         <>
                                             {/* Header */}
                                             <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                 <div style={{ width: 4, height: 12, borderRadius: '2px', background: isLost ? '#f43f5e' : 'linear-gradient(180deg, #3b82f6, #10b981)' }} />
                                                 <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer Evolution Journey</h3>
                                                 <div style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 900, color: isLost ? '#f43f5e' : '#10b981', background: isLost ? 'rgba(244,63,94,0.06)' : 'rgba(16,185,129,0.06)', padding: '2px 6px', borderRadius: '6px', border: `1px solid ${isLost ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)'}` }}>
                                                     {isLost ? '✕ Lost' : 'AI Modeled'}
                                                 </div>
                                             </div>

                                             {/* Stepper Track + Dots */}
                                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', overflowX: 'auto' }}>
                                                 {evolutionStages.map((stg, sIdx) => {
                                                     return (
                                                         <div key={stg.label} style={{ display: 'flex', alignItems: 'center', flex: sIdx < evolutionStages.length - 1 ? 1 : 'none' }}>
                                                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                                                                 <span style={{ fontSize: '7.5px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 2 }}>{stg.day}</span>
                                                                 <div style={{ 
                                                                     width: 18, height: 18, borderRadius: '50%', 
                                                                     background: stg.done ? stg.color : 'white', 
                                                                     border: `2px solid ${stg.active ? stg.color : '#e2e8f0'}`,
                                                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                     fontSize: '8px', fontWeight: 900, color: stg.done ? 'white' : 'var(--slate-400)',
                                                                     boxShadow: stg.active ? `0 2px 4px ${stg.color}20` : 'none'
                                                                 }}>
                                                                     {stg.done ? '✓' : sIdx + 1}
                                                                 </div>
                                                                 <span style={{ fontSize: '8.5px', fontWeight: 800, color: stg.active ? 'var(--navy-900)' : 'var(--slate-400)', marginTop: 3 }}>{stg.label}</span>
                                                             </div>
                                                             {sIdx < evolutionStages.length - 1 && (
                                                                 <div style={{ flex: 1, height: 2, background: stg.done ? `linear-gradient(90deg, ${stg.color}, ${evolutionStages[sIdx+1].color})` : '#f1f5f9', margin: '0 2px', position: 'relative', top: 5 }} />
                                                             )}
                                                         </div>
                                                     );
                                                 })}
                                             </div>

                                             {/* Lost Alert Banner */}
                                             {isLost && (
                                                 <div style={{ padding: '6px 10px', background: 'linear-gradient(135deg, rgba(244,63,94,0.03), rgba(244,63,94,0.07))', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                     <div style={{ width: 20, height: 20, borderRadius: '6px', background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(244,63,94,0.15)' }}>
                                                         <X size={10} color="#f43f5e" strokeWidth={3} />
                                                     </div>
                                                     <div>
                                                         <div style={{ fontSize: '10px', fontWeight: 800, color: '#be123c' }}>Lead marked as Lost</div>
                                                         <div style={{ fontSize: '8.5px', fontWeight: 600, color: '#f87171', marginTop: 1 }}>Pipeline journey ended — consider reactivation</div>
                                                     </div>
                                                     <button onClick={() => handleUpdateStage('New Lead')} className="hover-lift" style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: '5px', background: 'white', border: '1px solid rgba(244,63,94,0.2)', color: '#be123c', fontWeight: 800, fontSize: '8.5px', cursor: 'pointer', flexShrink: 0 }}>
                                                         Reactivate
                                                     </button>
                                                 </div>
                                             )}
                                         </>
                                     );
                                 })()}
                             </div>


                            {/* Executive AI Intelligence Summary Card */}
                            <div className="cd-card-animate cd-stagger-4" style={{
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                                border: '1px solid #e9d5ff',
                                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.06)',
                                padding: '10px 12px',
                                marginBottom: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={14} color="#8b5cf6" />
                                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#1e1b4b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI SUMMARY & INTELLIGENCE</h3>
                                    </div>
                                    <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', fontWeight: 800, padding: '2px 7px', borderRadius: 10, fontSize: '8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Zap size={8} /> ROHAN AI LIVE
                                    </div>
                                </div>

                                {/* Structured Bullet Insights (2-Column Grid) */}
                                <div style={{
                                    fontSize: '0.78rem', color: '#334155', lineHeight: 1.4, fontWeight: 600,
                                    display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '4px 12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.9rem' }}>•</span>
                                        <span>Interested in <strong>{contact.property_type || '3 BHK'}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.9rem' }}>•</span>
                                        <span>Family decision maker</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.9rem' }}>•</span>
                                        <span>Budget <strong>{contact.budget ? (String(contact.budget).startsWith('₹') ? contact.budget : `₹${contact.budget}`) : '₹85L'}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.9rem' }}>•</span>
                                        <span>Requested callback after 6PM</span>
                                    </div>
                                </div>

                                {/* Supporting Evidence & AI Confidence Bar */}
                                <div style={{
                                    marginTop: '8px', paddingTop: '8px',
                                    borderTop: '1px solid #f3e8ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                                        <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.04em' }}>Detected from:</span>
                                        <span style={{ color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: 5, fontWeight: 800 }}>✓ Call</span>
                                        <span style={{ color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: 5, fontWeight: 800 }}>✓ WhatsApp</span>
                                        <span style={{ color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: 5, fontWeight: 800 }}>✓ Meeting Note</span>
                                    </div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', background: '#f3e8ff', padding: '1px 6px', borderRadius: 6, border: '1px solid #e9d5ff' }}>
                                        Confidence: <strong>94%</strong>
                                    </div>
                                </div>

                                {/* AI Memory Updates (Section 6) */}
                                <div style={{
                                    marginTop: '8px', paddingTop: '8px',
                                    borderTop: '1px solid #f3e8ff',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <Brain size={12} color="#8b5cf6" />
                                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Memory Updates</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <div style={{ background: 'white', border: '1.5px dashed #ddd6fe', borderRadius: '8px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#9333ea', background: '#f5f3ff', padding: '1px 4px', borderRadius: '4px' }}>Budget Increased</span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-400)', textDecoration: 'line-through' }}>85L</span>
                                            <span style={{ fontSize: '10px', color: 'var(--slate-400)' }}>➔</span>
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#16a34a' }}>90L</span>
                                            <span style={{ fontSize: '8px', fontWeight: 800, color: '#6d28d9', background: 'rgba(139,92,246,0.08)', padding: '1px 4px', borderRadius: 4, marginLeft: 4 }}>98% Conf.</span>
                                        </div>
                                        <div style={{ background: 'white', border: '1.5px dashed #ddd6fe', borderRadius: '8px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#9333ea', background: '#f5f3ff', padding: '1px 4px', borderRadius: '4px' }}>Property Type</span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-400)', textDecoration: 'line-through' }}>2 BHK</span>
                                            <span style={{ fontSize: '10px', color: 'var(--slate-400)' }}>➔</span>
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#16a34a' }}>3 BHK</span>
                                            <span style={{ fontSize: '8px', fontWeight: 800, color: '#6d28d9', background: 'rgba(139,92,246,0.08)', padding: '1px 4px', borderRadius: 4, marginLeft: 4 }}>95% Conf.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics Grid: Conversion Probability & Recommended Action */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8,
                                    marginTop: '10px', paddingTop: '10px',
                                    borderTop: '1px solid #f3e8ff'
                                }}>
                                    <div style={{ background: '#f5f3ff', padding: '6px 10px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Conversion Probability
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#5b21b6', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {contact.score ? `${contact.score}%` : '91%'}
                                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '1px 5px', borderRadius: 6 }}>High Intent</span>
                                        </div>
                                    </div>

                                    <div style={{ background: '#ecfdf5', padding: '6px 10px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                Recommended Action
                                            </div>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#047857', background: '#d1fae5', padding: '1px 5px', borderRadius: 6, border: '1px solid #6ee7b7' }}>
                                                Est. Lift: <strong>+18%</strong>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#065f46', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            📞 {contact.ai_next_action || 'Call Today'}
                                        </div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#047857', marginTop: 4, paddingTop: 4, borderTop: '1px solid #a7f3d0' }}>
                                            <strong>Reason:</strong> Customer requested callback after 6PM.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Suggested Next Best Action Card */}
                            <div className="cd-card-animate cd-stagger-5 cd-hero-card" style={{ 
                                borderRadius: '12px', 
                                background: 'white', 
                                border: '1px solid rgba(16, 185, 129, 0.15)', 
                                borderLeft: '5px solid #10b981',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)', 
                                padding: '8px 12px',
                                marginBottom: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <div style={{ padding: '4px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                                        <Rocket size={14} color="#10b981" />
                                    </div>
                                    <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#065f46', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Suggested Next Best Action</h3>
                                </div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--navy-900)', lineHeight: 1.4 }}>
                                    {contact.ai_next_action || "Schedule a personal site visit to demonstrate the luxury amenities and lock in the current inventory price."}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                    <button 
                                        onClick={() => navigate(`/site-visits?leadId=${id}`)}
                                        className="hover-lift"
                                        style={{ padding: '4px 10px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)' }}
                                    >
                                        <MapPin size={11} /> Generate Itinerary
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            setActivityType('WhatsApp');
                                            setShowActivityBox(true);
                                        }}
                                        className="hover-lift"
                                        style={{ padding: '4px 10px', background: '#25D366', color: 'white', borderRadius: '8px', border: 'none', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(37, 211, 102, 0.15)' }}
                                    >
                                        <MessageSquare size={11} /> Draft WhatsApp
                                    </button>

                                    <button 
                                        onClick={() => setShowFollowupModal(true)}
                                        className="hover-lift"
                                        style={{ padding: '4px 10px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)' }}
                                    >
                                        <CalendarIcon size={11} /> Create Meeting
                                    </button>

                                    <button 
                                        onClick={async () => {
                                            try {
                                                await leadsApi.addInteraction(contact.id, { type: 'Task', note: 'AI Auto-Assigned Follow-up Reminder', date: dateUtils.getNow().toISOString() });
                                                showToast('Reminder assigned for today!', 'success');
                                            } catch (e) {
                                                showToast('Failed to set reminder', 'error');
                                            }
                                        }}
                                        className="hover-lift"
                                        style={{ padding: '4px 10px', background: '#f59e0b', color: 'white', borderRadius: '8px', border: 'none', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)' }}
                                    >
                                        <Clock size={11} /> Assign Reminder
                                    </button>

                                    <button 
                                        onClick={() => {
                                            setActivityType('Offer');
                                            setShowActivityBox(true);
                                        }}
                                        className="hover-lift"
                                        style={{ padding: '4px 10px', background: '#8b5cf6', color: 'white', borderRadius: '8px', border: 'none', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(139, 92, 246, 0.15)' }}
                                    >
                                        <FileText size={11} /> Generate Proposal
                                    </button>
                                </div>
                            </div>


                            {/* ── 5. DAILY AI ACTIVITY SUMMARY BRIEFING ── */}
                            <div className="cd-card-animate cd-stagger-6 cd-hero-card" style={{
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                color: 'white',
                                padding: '10px 14px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
                                marginBottom: '8px',
                                width: '600px',
                                boxSizing: 'border-box'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={13} color="#a78bfa" />
                                        <div>
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily AI Summary</h3>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                                        Live
                                    </span>
                                </div>

                                {/* Summary Bullets */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ color: '#38bdf8', fontWeight: 900 }}>•</span> Customer engaged twice today
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ color: '#38bdf8', fontWeight: 900 }}>•</span> Callback after 6PM
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ color: '#38bdf8', fontWeight: 900 }}>•</span> Budget confirmed (₹{contact.budget || '85L'})
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ color: '#38bdf8', fontWeight: 900 }}>•</span> Site visit pending
                                        </div>
                                    </div>
                                </div>

                                <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#4ade80' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.04em' }}>Rec:</span> 🎯 <strong>Call Today</strong>
                                    </div>
                                    <div style={{ fontSize: '8px', fontWeight: 800, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                                        +18%
                                    </div>
                                </div>
                            </div>

                            {/* ── 6. CONVERSATION PROGRESSION TIMELINE ── */}
                            <div className="cd-card-animate cd-stagger-7" style={{
                                padding: '10px 14px', borderRadius: '12px', background: 'white', border: '1px solid #e8edf3',
                                boxShadow: '0 1px 3px rgba(10,22,40,0.04)', marginBottom: '8px',
                                height: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxSizing: 'border-box'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 4, height: 12, borderRadius: '2px', background: 'linear-gradient(180deg, #3b82f6, #10b981)' }} />
                                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer Conversation Progression Flow</h3>
                                    </div>
                                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '1px 6px', borderRadius: 5, border: '1px solid #a7f3d0' }}>
                                        Connected Journey
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                                    {[
                                        { stage: 'Call', icon: Phone, color: '#10b981', status: 'Completed', bg: '#ecfdf5' },
                                        { stage: 'WhatsApp', icon: MessageSquare, color: '#25D366', status: 'Completed', bg: '#f0fdf4' },
                                        { stage: 'Email', icon: Mail, color: '#3b82f6', status: 'Completed', bg: '#eff6ff' },
                                        { stage: 'Meeting', icon: Users, color: '#f59e0b', status: 'Scheduled', bg: '#fffbeb' },
                                        { stage: 'Offer', icon: FileText, color: '#8b5cf6', status: 'Pending', bg: '#f5f3ff' },
                                        { stage: 'Booking', icon: Rocket, color: '#ec4899', status: 'Next Goal', bg: '#fdf2f8' }
                                    ].map((step, idx, arr) => (
                                        <div key={step.stage} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                            <div style={{
                                                padding: '6px 10px', borderRadius: '10px', background: step.bg,
                                                border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', gap: 6,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                            }}>
                                                <div style={{ width: 18, height: 18, borderRadius: '5px', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <step.icon size={10} color="white" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', lineHeight: 1 }}>{step.stage}</div>
                                                    <div style={{ fontSize: '7.5px', fontWeight: 800, color: step.color, marginTop: 1, textTransform: 'uppercase' }}>{step.status}</div>
                                                </div>
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div style={{ color: '#cbd5e1', fontWeight: 900, fontSize: '12px', padding: '0 1px' }}>➔</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Interest Profile + Interaction Timeline */}
                            <div className="cd-card-animate cd-stagger-5" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
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
                                                        loadData(); // Refresh interaction timeline
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
                                            { 
                                                key: 'property_type', 
                                                label: 'Property Type', 
                                                value: contact.property_type || '2BHK', 
                                                Icon: Home, 
                                                color: '#3b82f6',
                                                confidence: '96%',
                                                sources: [
                                                    { name: 'Call', strength: 'High', icon: '☎' },
                                                    { name: 'WhatsApp', strength: 'High', icon: '💬' }
                                                ]
                                            },
                                            { 
                                                key: 'budget', 
                                                label: 'Budget Range', 
                                                value: contact.budget ? `₹${contact.budget}` : '₹85L', 
                                                Icon: DollarSign, 
                                                color: '#10b981',
                                                confidence: '92%',
                                                sources: [
                                                    { name: 'Call', strength: 'High', icon: '☎' },
                                                    { name: 'WhatsApp', strength: 'Medium', icon: '💬' },
                                                    { name: 'Meeting', strength: 'Confirmed', icon: '🤝' }
                                                ]
                                            },
                                            { 
                                                key: 'project_name', 
                                                label: 'Project', 
                                                value: contact.project_name || 'Unspecified', 
                                                Icon: Target, 
                                                color: '#f59e0b',
                                                confidence: '88%',
                                                sources: [
                                                    { name: 'Email', strength: 'Medium', icon: '📧' },
                                                    { name: 'Call', strength: 'Low', icon: '☎' }
                                                ]
                                            }
                                        ].map(prop => (
                                            <div key={prop.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #eef2f6' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: `${prop.color}08`, border: `1px solid ${prop.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
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
                                                        <>
                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)' }}>{prop.value}</div>
                                                            {/* AI Reasoning Block */}
                                                            <div style={{ marginTop: 6, borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--accent-violet)', background: 'rgba(139, 92, 246, 0.08)', padding: '1px 5px', borderRadius: 4 }}>
                                                                        Confidence: {prop.confidence}
                                                                    </span>
                                                                    <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                        AI Reasoning
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                                    {prop.sources.map((src, i) => (
                                                                        <span key={i} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 5, fontSize: '8px', fontWeight: 700, color: 'var(--navy-900)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                                            <span>{src.icon}</span>
                                                                            <span>{src.name}</span>
                                                                            <span style={{ color: src.strength === 'High' || src.strength === 'Confirmed' ? '#10b981' : src.strength === 'Medium' ? '#f59e0b' : '#94a3b8', fontSize: '7.5px', fontWeight: 900 }}>
                                                                                ({src.strength})
                                                                            </span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Interaction History Timeline */}
                                <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 4, height: 14, borderRadius: '2px', background: 'var(--accent-violet)' }} />
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interaction Timeline</h3>
                                        </div>
                                        <button onClick={() => setActiveTab('Activities')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', fontWeight: 800, color: 'var(--accent-violet)', background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.12)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                                            View all <ArrowRight size={10} />
                                        </button>
                                    </div>
                                    
                                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: '8px' }}>
                                        {/* Vertical Timeline track line */}
                                        {interactions.length > 1 && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                left: 12, 
                                                top: 12, 
                                                bottom: 12, 
                                                width: 2, 
                                                background: 'linear-gradient(180deg, #e2e8f0, #f1f5f9)', 
                                                zIndex: 0 
                                            }} />
                                        )}

                                        {interactions.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                                                <div style={{ fontSize: '20px', marginBottom: 4 }}>📭</div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-400)' }}>No interactions yet</div>
                                                <div style={{ fontSize: '9px', color: 'var(--slate-300)', marginTop: 2 }}>Log a call, note or meeting to start tracking</div>
                                            </div>
                                        ) : interactions.slice(0, 3).map((item, idx) => {
                                            let IconComp = FileText;
                                            let iconColor = '#8b5cf6'; // 🟣 AI Summary / Note (Default)
                                            
                                            if (item.type === 'Call') {
                                                IconComp = Phone;
                                                iconColor = '#10b981'; // 🟢 Calls
                                            } else if (item.type === 'Email') {
                                                IconComp = Mail;
                                                iconColor = '#3b82f6'; // 🔵 Email
                                            } else if (item.type === 'WhatsApp') {
                                                IconComp = MessageSquare;
                                                iconColor = '#25D366'; // 🟢 WhatsApp
                                            } else if (item.type === 'Meeting') {
                                                IconComp = Users;
                                                iconColor = '#f97316'; // 🟠 Meeting
                                            } else if (item.type === 'Lost') {
                                                IconComp = X;
                                                iconColor = '#ef4444'; // 🔴 Lost
                                            }
                                            
                                            const formattedDate = dateUtils.parseSafe(item.date)?.toLocaleDateString(undefined, { 
                                                day: 'numeric', 
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) || '—';

                                            return (
                                                <div key={idx} style={{ display: 'flex', gap: 14, zIndex: 1, position: 'relative' }}>
                                                    {/* Timeline Node Icon Badge */}
                                                    <div style={{ 
                                                        width: 26, 
                                                        height: 26, 
                                                        borderRadius: '50%', 
                                                        background: 'white', 
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                                        border: `2px solid ${iconColor}`,
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        flexShrink: 0
                                                    }}>
                                                        <IconComp size={12} color={iconColor} style={{ strokeWidth: 2.5 }} />
                                                    </div>

                                                    {/* Timeline content bubble */}
                                                    <div style={{ 
                                                        flex: 1, 
                                                        minWidth: 0, 
                                                        background: '#f8fafc', 
                                                        border: '1px solid #eef2f6', 
                                                        padding: '10px 12px', 
                                                        borderRadius: '12px',
                                                        position: 'relative'
                                                    }}>
                                                        {/* Triangle pointing to the node */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: -6,
                                                            top: 8,
                                                            width: 0,
                                                            height: 0,
                                                            borderTop: '6px solid transparent',
                                                            borderBottom: '6px solid transparent',
                                                            borderRight: '6px solid #f8fafc',
                                                            zIndex: 1
                                                        }} />
                                                        
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-900)' }}>
                                                                {item.type} {item.outcome && `(${item.outcome})`}
                                                            </span>
                                                            <span style={{ fontSize: '8px', color: 'var(--slate-400)', fontWeight: 800 }}>
                                                                {formattedDate}
                                                            </span>
                                                        </div>
                                                        <div style={{ 
                                                            fontSize: '11px', 
                                                            color: 'var(--slate-600)', 
                                                            fontWeight: 500, 
                                                            lineHeight: 1.45,
                                                            wordBreak: 'break-word',
                                                            whiteSpace: 'pre-wrap'
                                                        }}>
                                                            {item.note || 'Interaction logged.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Active Deals + Assigned Team */}
                            <div className="cd-card-animate cd-stagger-6" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
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

                            {/* Communication Pulse + Lead Vitals */}
                            <div className="cd-card-animate cd-stagger-7" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                {/* Communication Activity Pulse */}
                                <div className="cd-hover-glow" style={{ padding: '14px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <div style={{ width: 4, height: 14, borderRadius: '2px', background: '#06b6d4' }} />
                                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Communication Pulse</h3>
                                    </div>
                                    {(() => {
                                        const types = [
                                            { type: 'Call', Icon: Phone, color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
                                            { type: 'Email', Icon: Mail, color: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
                                            { type: 'WhatsApp', Icon: MessageSquare, color: '#25D366', bg: 'rgba(37,211,102,0.06)' },
                                            { type: 'Note', Icon: Edit2, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
                                            { type: 'Meeting', Icon: Users, color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' }
                                        ];
                                        const counts: Record<string, number> = {};
                                        interactions.forEach((i: any) => { counts[i.type] = (counts[i.type] || 0) + 1; });
                                        const totalCount = interactions.length;
                                        const maxCount = Math.max(...types.map(t => counts[t.type] || 0), 1);
                                        return (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                                                    <span className="cd-count-animate" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy-900)', letterSpacing: '-1px', display: 'inline-block' }}>{totalCount}</span>
                                                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Total Interactions</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {types.map(t => {
                                                        const count = counts[t.type] || 0;
                                                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                        return (
                                                            <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ width: 22, height: 22, borderRadius: '6px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <t.Icon size={10} color={t.color} />
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                                        <div className={`cd-bar-animate cd-bar-delay-${types.indexOf(t) + 1}`} style={{ width: `${pct}%`, height: '100%', background: t.color, borderRadius: '3px' }} />
                                                                    </div>
                                                                </div>
                                                                <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', minWidth: 14, textAlign: 'right' }}>{count}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Lead Vitals */}
                                <div className="cd-hover-glow" style={{ padding: '14px 16px', borderRadius: '16px', background: 'white', border: '1px solid #e8edf3', boxShadow: '0 1px 3px rgba(10,22,40,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <div style={{ width: 4, height: 14, borderRadius: '2px', background: '#f43f5e' }} />
                                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--navy-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lead Vitals</h3>
                                    </div>
                                    {(() => {
                                        const now = new Date();
                                        const created = dateUtils.parseSafe(contact.created_at);
                                        const leadAgeDays = created ? Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                        const lastContactDate = contact.last_contact_at ? dateUtils.parseSafe(contact.last_contact_at) : null;
                                        const daysSinceContact = lastContactDate ? Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                        const nextFollowup = contact.followups && contact.followups.length > 0 ? contact.followups[0] : null;
                                        const StageIconVital = currentStageStyle.icon;
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {[
                                                    { label: 'Lead Age', value: `${leadAgeDays} days`, subtext: created ? created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A', Icon: Clock, color: '#3b82f6' },
                                                    { label: 'Last Contact', value: daysSinceContact !== null ? (daysSinceContact === 0 ? 'Today' : `${daysSinceContact}d ago`) : 'Never', subtext: lastContactDate ? lastContactDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No contact', Icon: Phone, color: daysSinceContact !== null && daysSinceContact <= 3 ? '#10b981' : daysSinceContact !== null && daysSinceContact <= 7 ? '#f59e0b' : '#ef4444' },
                                                    { label: 'Stage', value: contact.stage, subtext: contact.status || 'Active', Icon: StageIconVital, color: currentStageStyle.text },
                                                    { label: 'Next Follow-up', value: nextFollowup ? (dateUtils.parseSafe(nextFollowup.scheduled_at)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || 'Scheduled') : 'None set', subtext: nextFollowup ? (nextFollowup.type || 'General') : 'Schedule one', Icon: CalendarIcon, color: '#8b5cf6' }
                                                ].map(item => (
                                                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #eef2f6' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: `${item.color}08`, border: `1px solid ${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <item.Icon size={12} color={item.color} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--navy-900)' }}>{item.value}</div>
                                                        </div>
                                                        <div style={{ fontSize: '8px', color: 'var(--slate-400)', fontWeight: 600, textAlign: 'right' }}>{item.subtext}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
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

                            {/* ── Conversational Activity Composer ── */}
                            <div style={{
                                padding: '16px',
                                borderRadius: '20px',
                                background: 'white',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 4px 12px rgba(10,22,40,0.02)'
                            }}>
                                {/* Context-aware prompt heading */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={14} color="#6366f1" />
                                        <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--navy-900)' }}>
                                            {activityType === 'Call' ? 'What happened on the call?' :
                                             activityType === 'Meeting' ? 'How did the meeting go?' :
                                             activityType === 'WhatsApp' ? 'What was the WhatsApp conversation about?' :
                                             activityType === 'Email' ? 'What did you send or receive?' :
                                             activityType === 'Task' ? 'Describe the task to complete' :
                                             'What happened with this lead?'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                                        ✨ AI will summarize
                                    </span>
                                </div>

                                {/* Smart Textarea */}
                                <textarea
                                    id="activity-note-input"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder={
                                        activityType === 'Call' ? 'e.g. Customer asked about 3BHK availability, budget is ₹90L, prefers east-facing units...' :
                                        activityType === 'Meeting' ? 'e.g. Met at site office, showed 2 units, customer interested in Unit 405...' :
                                        activityType === 'WhatsApp' ? 'e.g. Sent brochure, customer replied they want to visit next weekend...' :
                                        activityType === 'Email' ? 'e.g. Followed up with pricing sheet, awaiting response...' :
                                        activityType === 'Task' ? 'e.g. Send customized proposal by tomorrow 6PM...' :
                                        'Write a quick note about what happened... AI will extract insights automatically.'
                                    }
                                    rows={3}
                                    style={{
                                        width: '100%', resize: 'vertical',
                                        padding: '12px 14px', borderRadius: '14px',
                                        border: '1.5px solid #e2e8f0', background: '#fafbfc',
                                        fontSize: '13px', fontWeight: 600, color: 'var(--navy-900)',
                                        lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
                                        fontFamily: 'var(--font-main)',
                                        transition: 'border-color 0.2s',
                                        minHeight: 80
                                    }}
                                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                />

                                {/* Secondary actions row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Log as:</span>
                                    {[
                                        { type: 'Note', icon: Edit2, color: '#6366f1' },
                                        { type: 'Call', icon: Phone, color: '#10b981' },
                                        { type: 'WhatsApp', icon: MessageSquare, color: '#25D366' },
                                        { type: 'Email', icon: Mail, color: '#3b82f6' },
                                        { type: 'Meeting', icon: Users, color: '#f59e0b' },
                                        { type: 'Task', icon: CheckSquare, color: '#8b5cf6' }
                                    ].map(btn => {
                                        const isActive = activityType === btn.type;
                                        return (
                                            <button
                                                key={btn.type}
                                                onClick={() => { setActivityType(btn.type); setShowActivityBox(true); }}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    border: isActive ? `1.5px solid ${btn.color}` : '1.5px solid #e2e8f0',
                                                    background: isActive ? `${btn.color}12` : 'white',
                                                    color: isActive ? btn.color : 'var(--slate-500)',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                    transition: 'all 0.18s',
                                                    fontWeight: 800,
                                                    fontSize: '10px',
                                                    flexShrink: 0
                                                }}
                                                className="hover-lift"
                                            >
                                                <btn.icon size={11} color={isActive ? btn.color : 'var(--slate-400)'} strokeWidth={2.5} />
                                                {btn.type}
                                            </button>
                                        );
                                    })}
                                    <div style={{ flex: 1 }} />
                                    {newNote.trim() && (
                                        <button
                                            onClick={() => {
                                                setShowActivityBox(true);
                                                // trigger log via existing form
                                                const el = document.getElementById('activity-log-submit-btn') as HTMLButtonElement;
                                                if (el) el.click();
                                            }}
                                            className="hover-lift"
                                            style={{
                                                padding: '6px 16px', borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: 'white', border: 'none',
                                                fontSize: '11px', fontWeight: 900,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                                boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                                            }}
                                        >
                                            <Sparkles size={12} /> Log & Summarize
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Expanded Activity Form (shown when showActivityBox is true) ── */}
                            <div style={{
                                padding: '16px',
                                borderRadius: '20px',
                                background: 'white',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 4px 12px rgba(10,22,40,0.02)',
                                display: showActivityBox ? 'block' : 'none'
                            }}>
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
                                            id="activity-note-input"
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
                                                <button onClick={handleVoice} aria-label="Use voice input" className="hover-lift" style={{
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

                            {/* Intent-Based Activity Filters & Search Bar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                {/* Primary intent filters */}
                                <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                                    {([
                                        { id: 'All', label: 'All', icon: '🗂️', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
                                        { id: 'Follow-ups Due', label: 'Follow-ups Due', icon: '⏰', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
                                        { id: 'Calls', label: 'Calls', icon: '📞', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
                                        { id: 'Meetings', label: 'Meetings', icon: '🤝', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                                        { id: 'Emails', label: 'Emails', icon: '📧', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                                        { id: 'AI Insights', label: 'AI Insights', icon: '✨', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
                                    ] as const).map(flt => {
                                        const active = activityFilter === flt.id;
                                        return (
                                            <button
                                                key={flt.id}
                                                onClick={() => setActivityFilter(flt.id)}
                                                className="hover-lift"
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '10px',
                                                    border: active ? `1.5px solid ${flt.border}` : '1.5px solid #e2e8f0',
                                                    background: active ? flt.bg : 'white',
                                                    color: active ? flt.color : '#64748b',
                                                    fontSize: '11px',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                    boxShadow: active ? `0 2px 8px ${flt.border}60` : '0 1px 2px rgba(0,0,0,0.04)',
                                                    transition: 'all 0.18s',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <span style={{ fontSize: '12px' }}>{flt.icon}</span>
                                                {flt.label}
                                                {flt.id !== 'All' && (
                                                    <span style={{
                                                        fontSize: '9px', fontWeight: 900,
                                                        background: active ? flt.color : '#e2e8f0',
                                                        color: active ? 'white' : '#94a3b8',
                                                        borderRadius: '6px', padding: '1px 5px',
                                                        minWidth: 16, textAlign: 'center'
                                                    }}>
                                                        {flt.id === 'Follow-ups Due' ? (interactions || []).filter(i => i.type === 'Task' || i.type === 'Meeting' || (i.note && (i.note.toLowerCase().includes('follow-up') || i.note.toLowerCase().includes('next step')))).length
                                                         : flt.id === 'Calls' ? (interactions || []).filter(i => i.type === 'Call').length
                                                         : flt.id === 'Meetings' ? (interactions || []).filter(i => i.type === 'Meeting').length
                                                         : flt.id === 'Emails' ? (interactions || []).filter(i => i.type === 'Email').length
                                                         : flt.id === 'AI Insights' ? (interactions || []).filter(i => i.transcript || (i.note && (i.note.includes('AI') || i.note.toLowerCase().includes('summary')))).length
                                                         : 0}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Search row */}
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by keyword, topic, or outcome..."
                                        value={activitySearchQuery}
                                        onChange={e => setActivitySearchQuery(e.target.value)}
                                        style={{
                                            width: '100%', padding: '7px 30px 7px 32px', borderRadius: '10px',
                                            border: '1.5px solid #e2e8f0', background: 'white', fontSize: '12px',
                                            fontWeight: 600, outline: 'none', color: 'var(--navy-900)',
                                            boxSizing: 'border-box', transition: 'border-color 0.2s'
                                        }}
                                        onFocus={e => (e.target.style.borderColor = '#6366f1')}
                                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                    />
                                    {activitySearchQuery && (
                                        <button onClick={() => setActivitySearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            <X size={12} color="#94a3b8" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* AI Auto Categorization Tag Bar (Smart Filters) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', flexShrink: 0, letterSpacing: '0.04em' }}>Smart Filters:</span>
                                {[
                                    { label: 'Objections', value: 'Objection' },
                                    { label: 'Pricing', value: 'Pricing' },
                                    { label: 'AI Summaries', value: 'AI Summaries' },
                                    { label: 'Unanswered Questions', value: 'Questions' },
                                    { label: 'Follow-ups', value: 'Follow-ups' },
                                    { label: 'Budget', value: 'Budget' },
                                    { label: 'Competition', value: 'Competition' },
                                    { label: 'Site Visits', value: 'Visit' }
                                ].map(tag => {
                                    const isSelected = activitySearchQuery.toLowerCase() === tag.value.toLowerCase();
                                    return (
                                        <button
                                            key={tag.label}
                                            onClick={() => setActivitySearchQuery(isSelected ? '' : tag.value)}
                                            className="hover-lift"
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                border: isSelected ? '1px solid #8b5cf6' : '1px solid #e2e8f0',
                                                background: isSelected ? '#f5f3ff' : 'white',
                                                color: isSelected ? '#6d28d9' : 'var(--slate-600)',
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            🏷️ {tag.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Vertical Activity Timeline */}
                            <div style={{ position: 'relative', paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
                                {/* Connected Enterprise Gradient Vertical Stepper Line */}
                                <div style={{
                                    position: 'absolute', top: 32, bottom: 45, left: 15, width: 3,
                                    background: 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%)',
                                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.35)', borderRadius: '2px', zIndex: 0
                                }} />

                                {/* Top Stem Node: Lead Discovered Start */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, marginBottom: 4 }}>
                                    <div style={{
                                        position: 'absolute', left: -32, top: 0, width: 18, height: 18, borderRadius: '50%',
                                        background: '#3b82f6', border: '3px solid white', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6
                                    }} />
                                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '12px', border: '1px solid #bfdbfe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        ◦ LEAD DISCOVERED • TIMELINE STARTED
                                    </span>
                                </div>

                                {filteredInteractions.length === 0 ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 700 }}>
                                        No interactions found for filter "{activityFilter}"
                                    </div>
                                ) : filteredInteractions.map((item) => {
                                    // Blue as primary accent; orange only for Meeting deadlines; red only for Lost
                                    const cfg = item.type === 'Call' ? { icon: Phone, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' } :
                                        item.type === 'Email' ? { icon: Mail, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' } :
                                            item.type === 'WhatsApp' ? { icon: MessageSquare, color: '#059669', bg: '#f0fdf4', border: '#d1fae5' } :
                                                item.type === 'Meeting' ? { icon: Users, color: '#b45309', bg: '#fffbeb', border: '#fde68a' } :
                                                    item.type === 'Lost' ? { icon: X, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' } :
                                                        { icon: FileText, color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe' };
                                    const itemDate = dateUtils.parseSafe(item.date);
                                    const isToday = itemDate && new Date().toDateString() === itemDate.toDateString();
                                    const timeFormatted = itemDate ? itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                    const dateLabel = isToday ? `Today ${timeFormatted}` : itemDate ? `${itemDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${timeFormatted}` : '—';

                                    return (
                                        <div key={item.id} style={{ position: 'relative', zIndex: 1 }}>
                                            {/* Node Circle Anchor on Timeline */}
                                            <div style={{
                                                position: 'absolute', left: -28, top: 14,
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: 'white', border: `1.5px solid ${cfg.color}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                                            }}>
                                                <cfg.icon size={13} color={cfg.color} strokeWidth={2} />
                                            </div>

                                            {/* Timeline Item Card */}
                                            <div style={{
                                                padding: '18px 22px', borderRadius: '18px',
                                                background: 'white',
                                                border: `1px solid ${cfg.border}`,
                                                boxShadow: '0 1px 6px rgba(10,22,40,0.04)', position: 'relative',
                                                borderLeft: `3px solid ${cfg.color}`
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy-900)' }}>{item.type} Interaction</span>
                                                            <span style={{ fontSize: '10px', fontWeight: 800, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${cfg.border}` }}>
                                                                {dateLabel}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, marginTop: 3 }}>
                                                            {item.agent_name || 'System Interaction'}
                                                        </div>
                                                        {/* Type-Specific Custom Layout Blocks */}
                                                        {item.type === 'Call' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 6, borderBottom: '1px solid #bbf7d0', alignItems: 'center' }}>
                                                                    <div style={{ fontSize: '11px', color: 'var(--navy-900)' }}>
                                                                        <strong>Duration:</strong> <span style={{ fontWeight: 800 }}>{item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : '8 min'}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--navy-900)' }}>
                                                                        <strong>Sentiment:</strong> <span style={{ fontWeight: 800, color: '#10b981' }}>Positive</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--navy-900)' }}>
                                                                        <strong>Outcome:</strong> <span style={{ fontWeight: 800, color: '#047857' }}>{item.outcome || 'Interested'}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => showToast('Playing call recording audio...', 'info')}
                                                                        className="hover-lift"
                                                                        style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 900, padding: '3px 9px', borderRadius: '6px', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                                    >
                                                                        <Play size={10} fill="white" /> Play Recording
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* AI Suggestions (Section 5) */}
                                                                <div style={{ background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 12px', marginTop: 4 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                                        <Brain size={12} color="#8b5cf6" />
                                                                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI noticed</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '11.5px', color: '#1e1b4b', fontWeight: 700, marginBottom: 6 }}>
                                                                        Customer asked about parking availability and amenities.
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 700, marginBottom: 8, background: 'rgba(139,92,246,0.06)', padding: '6px 8px', borderRadius: '6px', borderLeft: '3px solid #8b5cf6' }}>
                                                                        <strong>Suggested action:</strong> Dispatch unit layout brochure & customized covered parking option cost sheet.
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                        <button 
                                                                            onClick={() => { setActivityType('WhatsApp'); setShowActivityBox(true); }}
                                                                            className="hover-lift" 
                                                                            style={{ padding: '4px 8px', background: 'white', border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '10px', fontWeight: 800, color: '#6d28d9', cursor: 'pointer' }}
                                                                        >
                                                                            Generate WhatsApp
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setShowFollowupModal(true)}
                                                                            className="hover-lift" 
                                                                            style={{ padding: '4px 8px', background: 'white', border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '10px', fontWeight: 800, color: '#6d28d9', cursor: 'pointer' }}
                                                                        >
                                                                            Create Meeting
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => showToast('Pricing Sheet generated and copied to clipboard!', 'success')}
                                                                            className="hover-lift" 
                                                                            style={{ padding: '4px 8px', background: 'white', border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '10px', fontWeight: 800, color: '#6d28d9', cursor: 'pointer' }}
                                                                        >
                                                                            Generate Pricing Sheet
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.type === 'Meeting' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, background: 'rgba(255, 255, 255, 0.85)', padding: '12px 14px', borderRadius: '14px', border: '1px solid #ffedd5' }}>
                                                                <div style={{ borderBottom: '1px solid #ffedd5', paddingBottom: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#ea580c' }}>Meeting Details</span>
                                                                    <button 
                                                                        onClick={() => window.open('https://meet.google.com', '_blank')}
                                                                        className="hover-lift"
                                                                        style={{ padding: '4px 10px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(234, 88, 12, 0.15)' }}
                                                                    >
                                                                        <ExternalLink size={10} color="white" /> Join Meet
                                                                    </button>
                                                                </div>

                                                                <div style={{ fontSize: '11px', color: 'var(--navy-900)' }}>
                                                                    <strong>Outcome:</strong> <span style={{ fontWeight: 800, color: '#c2410c' }}>Agreed to lock unit if covered parking is included</span>
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--navy-900)' }}>
                                                                    <strong>Next Action:</strong> <span style={{ fontWeight: 800, color: '#c2410c' }}>Prepare proposal draft with covered parking inclusion</span>
                                                                </div>
                                                                
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                                                                    <span style={{ fontSize: '10px', color: '#ea580c', fontWeight: 800 }}>Files:</span>
                                                                    <a 
                                                                        href="#"
                                                                        onClick={(e) => { e.preventDefault(); showToast('Downloading unit layout PDF...', 'info'); }}
                                                                        style={{ fontSize: '10px', color: '#ea580c', fontWeight: 800, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 3 }}
                                                                    >
                                                                        📄 unit_405_revised_layout.pdf
                                                                    </a>
                                                                </div>

                                                                {/* AI Summary (collapsed details toggle) */}
                                                                <details style={{ marginTop: 4, cursor: 'pointer' }}>
                                                                    <summary style={{ fontSize: '10.5px', fontWeight: 800, color: '#ea580c', outline: 'none' }}>
                                                                        AI Summary
                                                                    </summary>
                                                                    <div style={{ padding: '8px 10px', background: '#fffaf5', borderRadius: '8px', border: '1px solid #ffedd5', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'default' }}>
                                                                        <div style={{ fontSize: '10.5px', color: '#c2410c' }}>
                                                                            <strong>Agenda:</strong> Pricing Discussion & Block Unit 405
                                                                        </div>
                                                                        <div style={{ fontSize: '10.5px', color: '#c2410c' }}>
                                                                            <strong>Attendees:</strong> Tanu (Agent), Viraj (Client), Neha (Sales Head)
                                                                        </div>
                                                                    </div>
                                                                </details>
                                                            </div>
                                                        )}

                                                        {item.type === 'WhatsApp' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, background: 'rgba(255, 255, 255, 0.85)', padding: '12px 14px', borderRadius: '14px', border: '1.5px dashed #25D366' }}>
                                                                <div style={{ fontSize: '11.5px', color: '#1e293b', background: '#e2e8f0', padding: '8px 10px', borderRadius: '8px', fontStyle: 'italic' }}>
                                                                    💬 <strong>Preview:</strong> "Is the club house ready?"
                                                                </div>
                                                                <div style={{ fontSize: '11.5px', color: '#15803d', background: '#dcfce7', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                                                    ✨ <strong>Suggested Reply:</strong> "Yes, the club house is fully operational with a swimming pool, gym, and lounge area. Would you like me to send photos?"
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                                                                    <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800 }}>Channel: Official API</span>
                                                                    <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800, marginLeft: 6 }}>✓✓ Read</span>
                                                                    <button 
                                                                        onClick={() => showToast('AI drafted WhatsApp message sent successfully!', 'success')}
                                                                        className="hover-lift"
                                                                        style={{ marginLeft: 'auto', padding: '5px 12px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(37, 211, 102, 0.2)' }}
                                                                    >
                                                                        Send AI Draft
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.type === 'Email' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, background: 'rgba(255, 255, 255, 0.85)', padding: '12px 14px', borderRadius: '14px', border: '1.5px dashed #3b82f6' }}>
                                                                <div style={{ fontSize: '11px', color: 'var(--navy-900)' }}>
                                                                    <strong>Subject:</strong> <span style={{ fontWeight: 800 }}>Property Brochure & Unit Availability List</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                                                    <span style={{ fontSize: '9px', fontWeight: 900, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        ✓ Opened
                                                                    </span>
                                                                    <span style={{ fontSize: '9px', fontWeight: 900, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        ✓ Clicked
                                                                    </span>
                                                                    <span style={{ fontSize: '9px', fontWeight: 900, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        ✓ Downloaded Brochure
                                                                    </span>
                                                                    <span style={{ fontSize: '9px', fontWeight: 900, background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        ✓ Proposal Viewed
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, fontSize: '9px', color: 'var(--slate-400)', fontWeight: 700 }}>
                                                                    <span>Sender: Mandrill Outbound</span>
                                                                    <span>IP: 103.45.2.112</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.type === 'Lost' && (
                                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, background: 'rgba(255, 255, 255, 0.75)', padding: '10px 14px', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '11px' }}>
                                                                <div style={{ color: '#ef4444' }}>
                                                                    <strong>Status:</strong> <span style={{ fontWeight: 800 }}>Lead Lost</span>
                                                                </div>
                                                                <div style={{ color: 'var(--navy-900)' }}>
                                                                    <strong>Reason:</strong> <span style={{ fontWeight: 800 }}>Out of budget / No response</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.type !== 'Call' && item.type !== 'Email' && item.type !== 'WhatsApp' && item.type !== 'Meeting' && item.type !== 'Lost' && (
                                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, background: 'rgba(255, 255, 255, 0.75)', padding: '10px 14px', borderRadius: '12px', border: '1px solid #ddd6fe', fontSize: '11px' }}>
                                                                <div style={{ color: 'var(--navy-900)' }}>
                                                                    <strong>Category:</strong> <span style={{ fontWeight: 800, color: '#6d28d9' }}>Sales Action Log</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {item.entry_type !== 'system' && (
                                                        <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 5 }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingInteraction(item.id); setEditNote(item.note || ''); }}
                                                                style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Edit"
                                                                aria-label="Edit interaction"
                                                            >
                                                                <Edit2 size={13} color="#3b82f6" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteInteraction(item.id); }}
                                                                style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Delete"
                                                                aria-label="Delete interaction"
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
                                                                            const itemDate = dateUtils.parseSafe(item.date);
                                                                            if (!itemDate) return null;
                                                                            const expireDate = dateUtils.getNow();
                                                                            expireDate.setTime(itemDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                                                                            const diffDays = Math.ceil((expireDate.getTime() - dateUtils.getNow().getTime()) / (1000 * 60 * 60 * 24));
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
                                                            </div>
                                                            
                                                            {/* 🔥 NEW: AI Coaching Insight Section */}
                                                            {(item.rapport_score || item.closing_score) && (
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16, background: 'rgba(255,255,255,0.5)', padding: 16, borderRadius: 16, border: '1px dashed #e2e8f0' }}>
                                                                    <div className="skill-card">
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Rapport Score</span>
                                                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#7c3aed' }}>{item.rapport_score}%</span>
                                                                        </div>
                                                                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                                                            <div style={{ width: `${item.rapport_score}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #c026d3)' }} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="skill-card">
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Closing Intensity</span>
                                                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#0ea5e9' }}>{item.closing_score}%</span>
                                                                        </div>
                                                                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                                                            <div style={{ width: `${item.closing_score}%`, height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)' }} />
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ gridColumn: 'span 2' }}>
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                            {item.ai_skills?.split(',').map((skill: string) => (
                                                                                <div key={skill} style={{ fontSize: '9px', fontWeight: 900, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                    💎 {skill.trim()}
                                                                                </div>
                                                                            ))}
                                                                            {item.projects_discussed && (
                                                                                <div style={{ fontSize: '9px', fontWeight: 900, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '8px' }}>
                                                                                    🏢 Discussed: {item.projects_discussed}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

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
                                                        <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10px', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                                                                <Sparkles size={12} color="#8b5cf6" /> AI Call & Interaction Summary
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px 12px', fontSize: '12px', marginBottom: 10 }}>
                                                                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Customer Wants</div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{contact.property_type || '3 BHK Unit'}</div>
                                                                </div>
                                                                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Budget</div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{contact.budget ? (String(contact.budget).startsWith('₹') ? contact.budget : `₹${contact.budget}`) : '₹85L Budget'}</div>
                                                                </div>
                                                                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interested In</div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Club House & Luxury Amenities</div>
                                                                </div>
                                                                <div style={{ background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Concern</div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>Covered Parking Space</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', color: 'var(--navy-900)', fontWeight: 600, lineHeight: 1.5 }}>
                                                                {item.note || 'Logged interaction with customer.'}
                                                            </div>
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
                            <button onClick={() => setShowStageMenu(false)} aria-label="Close stage menu" style={{ width: 36, height: 36, borderRadius: '12px', background: 'var(--slate-50)', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color="var(--slate-400)" /></button>
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
            {/* Site Visit Scheduler Modal */}
            {showSiteVisitScheduler && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowSiteVisitScheduler(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <button 
                                onClick={() => setShowSiteVisitScheduler(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Close site visit scheduler modal"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <SiteVisitScheduler 
                            lead={contact} 
                            onSuccess={() => {
                                loadData();
                                setTimeout(() => setShowSiteVisitScheduler(false), 2000);
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
