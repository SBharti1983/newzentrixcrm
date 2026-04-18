import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
    Play, BookOpen, Sparkles, GraduationCap, CheckCircle2, 
    ArrowRight, Search, Filter, Trophy, Star, Clock, 
    MessageSquare, Flame, Download, ExternalLink, Library, Layout, Target, Zap,
    Plus, X, FileText, Video, Image as ImageIcon, FileCode, Upload,
    ShieldCheck, Music, RotateCw, Mic, MicOff, Send
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { academyApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { PageLoader, PageError } from '../components/Feedback';

const COLORS = {
    purple: '#8b5cf6',
    rose: '#f43f5e',
    emerald: '#10b981',
    blue: '#3b82f6',
    amber: '#f59e0b',
    navy: '#0f172a',
    border: '#e2e8f0',
    bg: '#f8fafc'
};

const MODULES = [
    {
        id: '1',
        title: 'Mastering Real Estate Objections',
        category: 'Sales Techniques',
        type: 'Video',
        duration: '15m',
        xp: 250,
        thumbnail: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80',
        instructor: 'Sarah J. (Top Closer)',
        completed: true,
        progress: 100
    },
    {
        id: '2',
        title: 'Project Deep-Dive: Elan The Presidential',
        category: 'Infrastructure',
        type: 'Webinar',
        duration: '45m',
        xp: 500,
        thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
        instructor: 'Product Team',
        completed: false,
        progress: 45
    },
    {
        id: '3',
        title: 'AI Copilot: Maximizing Efficiency',
        category: 'Technology',
        type: 'Interactive',
        duration: '10m',
        xp: 150,
        thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
        instructor: 'ZenBot AI',
        completed: false,
        progress: 0
    },
    {
        id: '4',
        title: 'Closing High-Value Commercial Leads',
        category: 'Sales Techniques',
        type: 'Video',
        duration: '22m',
        xp: 350,
        thumbnail: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=800&q=80',
        instructor: 'Vikram Mehta',
        completed: false,
        progress: 0
    }
];


export default function Academy() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('library'); // library, simulator, leaderboard
    const [showUpload, setShowUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeModule, setActiveModule] = useState(null); // The module being viewed
    const [isSimulatorActive, setIsSimulatorActive] = useState(false);
    const [simStage, setSimStage] = useState('selection'); // selection, active, feedback
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [simLanguage, setSimLanguage] = useState('English');
    const [simTranscripts, setSimTranscripts] = useState([]);
    const [isAITalking, setIsAITalking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [agentInput, setAgentInput] = useState('');
    const [showCustomSim, setShowCustomSim] = useState(false);
    const [customSimForm, setCustomSimForm] = useState({ persona: 'Mr. Khurana', focus: 'ROI', goal: 'Handle aggressive price negotiation.' });

    // Use a simple effect to catch window width for specific mobile overrides
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Battle Cards State
    const [showBattleCardModal, setShowBattleCardModal] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [cardForm, setCardForm] = useState({ project_name: '', usp: '', objections: [{q:'', a:''}], target_audience: '' });

    // Fetch Modules
    const { data: dbModules, loading: modulesLoading, error: modulesError, refetch: refetchModules } = useApi(
        useCallback(() => academyApi.getModules(), []),
        []
    );

    // Fetch Leaderboard
    const { data: boardData, loading: boardLoading } = useApi(
        useCallback(() => academyApi.getLeaderboard(), []),
        []
    );

    // Fetch Battle Cards
    const { data: dbBattleCards, refetch: refetchBattleCards } = useApi(
        useCallback(() => academyApi.getBattleCards(), []),
        []
    );

    const SCENARIOS = [
        { id: 'hni-investor', title: 'The Skeptical HNI', persona: 'Mr. Singhania', difficulty: 'Hard', focus: 'ROI & Capital Appreciation', goal: 'Handle aggressive price negotiation and tax-saving queries.' },
        { id: 'first-time', title: 'The Nervous First-timer', persona: 'Ankit Gupta', difficulty: 'Easy', focus: 'Trust & Amenities', goal: 'Build emotional connection and explain the home-buying process.' },
        { id: 'commercial', title: 'Commercial Portfolio Mgr', persona: 'Jessica Chen', difficulty: 'Medium', focus: 'Leasing & Footfall', goal: 'Explain the retail potential and brand-mix of the commercial project.' }
    ];

    const GREETINGS = {
        English: "Hello? I was looking at your project website... but frankly, I think the prices are a bit inflated for this locality. What do you have to say?",
        Hindi: "नमस्ते? मैंने आपकी प्रोजेक्ट वेबसाइट देखी थी... लेकिन सच कहूँ तो मुझे लगता है कि इस इलाके के हिसाब से कीमतें काफी ज्यादा हैं। आप क्या कहेंगे?",
        Hinglish: "Hello? Maine aapki project website dekhi thi... and frankly, mujhe lagta hai ki prices thode inflated hain is locality ke liye. What is your take on this?"
    };

    const startSimulation = (scenario) => {
        setSelectedScenario(scenario);
        setSimStage('active');
        setIsSimulatorActive(true);

        // Dynamic initial greeting
        let greetingText = GREETINGS[simLanguage];
        if (scenario.id === 'custom') {
            const isHindi = simLanguage === 'Hindi';
            const isHinglish = simLanguage === 'Hinglish';
            
            if (isHindi) {
                greetingText = `नमस्ते, मुझे आपसे ${scenario.focus} के बारे में बात करनी है। क्या आप मेरी मदद कर सकते हैं?`;
            } else if (isHinglish) {
                greetingText = `Hello, mujhe specificially ${scenario.focus} ke baare mein discuss karna tha. What is the status?`;
            } else {
                greetingText = `Hello, I wanted to talk specifically about ${scenario.focus}. Can you help me with this?`;
            }
        }

        setSimTranscripts([{ 
            type: 'bot', 
            text: `[Incoming Call from ${scenario.persona}] ${greetingText}` 
        }]);
        
        // Simulated AI response delays
        setTimeout(() => setIsAITalking(true), 1200);
        setTimeout(() => setIsAITalking(false), 4500);
    };

    const handleSimComplete = () => {
        setSimStage('feedback');
    };

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('Voice recognition not supported in this browser', 'error');
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = simLanguage === 'English' ? 'en-US' : (simLanguage === 'Hindi' ? 'hi-IN' : 'hi-IN'); // Hinglish uses Hindi STT usually
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            processAgentInput(transcript);
        };

        recognition.start();
    };

    const processAgentInput = async (text) => {
        if (!text.trim()) return;
        
        // Add agent message to local transcript immediately
        const currentTranscripts = [...simTranscripts, { type: 'agent', text }];
        setSimTranscripts(currentTranscripts);
        setAgentInput('');
        setIsAITalking(true);

        try {
            // Call the live AI simulation API
            const response = await academyApi.simulate({
                message: text,
                history: currentTranscripts,
                persona: selectedScenario?.persona,
                language: simLanguage,
                context: selectedScenario?.focus
            });

            setIsAITalking(false);
            if (response && response.text) {
                setSimTranscripts(prev => [...prev, { type: 'bot', text: response.text }]);
            }
        } catch (err) {
            setIsAITalking(false);
            showToast('AI Simulation connection interrupted', 'warning');
            
            // Fallback to a static response if API fails
            setTimeout(() => {
                setSimTranscripts(prev => [...prev, { 
                    type: 'bot', 
                    text: simLanguage === 'Hindi' ? "माफ़ करें, अभी मेरा नेटवर्क थोड़ा स्लो है। क्या आप फिर से कह सकते हैं?" : "I'm having a bit of trouble connecting. Could you repeat that?" 
                }]);
            }, 1000);
        }
    };

    const resetSim = () => {
        setIsSimulatorActive(false);
        setSimStage('selection');
        setSelectedScenario(null);
        setSimTranscripts([]);
    };

    // Auto-scroll transcript
    useEffect(() => {
        const chatWindow = document.getElementById('sim-transcript-list');
        if (chatWindow) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }, [simTranscripts, isAITalking]);

    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        category: 'Real Estate Mastery',
        type: 'Video',
        xp_points: 100,
        duration: '10-15m',
        instructor: user?.name || 'Zentrix Coach',
        file: null
    });

    const categories = ['Real Estate Mastery', 'Sales Techniques', 'Project Deep-Dive', 'CRM Training', 'AI & Technology'];
    const types = [
        { id: 'Video', icon: Video },
        { id: 'PDF', icon: FileText },
        { id: 'PPT', icon: FileCode },
        { id: 'Word', icon: FileText },
        { id: 'Image', icon: ImageIcon }
    ];

    const filteredModules = useMemo(() => {
        const base = (dbModules && dbModules.length > 0) ? dbModules : MODULES;
        return base.filter(m => 
            m.title.toLowerCase().includes(search.toLowerCase()) || 
            (m.category && m.category.toLowerCase().includes(search.toLowerCase()))
        );
    }, [search, dbModules]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadForm.file || !uploadForm.title) {
            showToast('Title and File are required', 'warning');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            Object.entries(uploadForm).forEach(([key, value]) => {
                if (key === 'file') {
                    formData.append('file', value);
                } else {
                    formData.append(key, value);
                }
            });

            await academyApi.upload(formData);
            showToast('Training material uploaded successfully!', 'success');
            setShowUpload(false);
            setUploadForm({ title: '', description: '', category: 'Real Estate Mastery', type: 'Video', xp_points: 100, duration: '10-15m', instructor: user?.name, file: null });
            refetchModules();
        } catch (err) {
            showToast(err.error || 'Failed to upload material', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProgress = async (moduleId, progress, completed = false) => {
        try {
            await academyApi.updateProgress({ module_id: moduleId, progress, completed });
            if (completed) {
                showToast('Module Completed! +XP Earned', 'success');
                refetchModules();
            }
        } catch (err) {
            console.error('Progress update failed', err);
        }
    };

    const handleDeleteModule = async (moduleId) => {
        // Prevent deleting mock/demo modules (which have numeric IDs)
        if (typeof moduleId === 'number' || !moduleId.includes('-')) {
            showToast('Demo modules cannot be deleted', 'error');
            return;
        }

        if (!window.confirm('Are you sure you want to remove this training material?')) return;
        try {
            await academyApi.deleteModule(moduleId);
            showToast('Material removed successfully', 'success');
            refetchModules();
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    // Battle Card Handlers
    const handleSaveBattleCard = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...cardForm,
                usp: typeof cardForm.usp === 'string' ? cardForm.usp.split(',').map(s => s.trim()) : cardForm.usp
            };
            if (editingCard) {
                await academyApi.updateBattleCard(editingCard.id, data);
                showToast('Battle Card updated', 'success');
            } else {
                await academyApi.createBattleCard(data);
                showToast('Battle Card created', 'success');
            }
            setShowBattleCardModal(false);
            setEditingCard(null);
            setCardForm({ project_name: '', usp: '', objections: [{q:'', a:''}], target_audience: '' });
            refetchBattleCards();
        } catch (err) {
            showToast('Failed to save battle card', 'error');
        }
    };

    const handleDeleteBattleCard = async (id) => {
        if (!window.confirm('Remove this battle card?')) return;
        try {
            await academyApi.deleteBattleCard(id);
            showToast('Battle card removed', 'success');
            refetchBattleCards();
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    const openEditBattleCard = (card) => {
        setEditingCard(card);
        setCardForm({
            project_name: card.project_name,
            usp: card.usp.join(', '),
            objections: card.objections && card.objections.length > 0 ? card.objections : [{q:'', a:''}],
            target_audience: card.target_audience || ''
        });
        setShowBattleCardModal(true);
    };

    const isAdmin = ['admin', 'superadmin', 'sales_manager'].includes(user?.role);

    if (modulesLoading && !dbModules) return <PageLoader />;
    if (modulesError) return <PageError message={modulesError} onRetry={refetchModules} />;

    return (
        <div className="animate-fadeIn" style={{ padding: '24px 32px', minHeight: '100vh', background: COLORS.bg }}>
            {/* Enterprise Header */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'flex-end', 
                marginBottom: 40,
                gap: isMobile ? 24 : 0
            }}>
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <GraduationCap size={14} /> Zentrix Academy
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Level 12 Closer • 4,500 XP Earned</span>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: 950, color: COLORS.navy, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>Knowledge Command</h1>
                    <p style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 8 }}>Upgrade your sales arsenal with AI-coached modules and project intelligence.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: isMobile ? 'stretch' : 'center', width: isMobile ? '100%' : 'auto' }}>
                    {isAdmin && (
                        <button 
                            onClick={() => setShowUpload(true)}
                            className="hover-lift"
                            style={{ background: 'var(--navy-900)', border: 'none', color: 'white', padding: '12px 24px', borderRadius: '14px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' }}
                        >
                            <Plus size={18} /> Upload Material
                        </button>
                    )}

                    <div style={{ display: 'flex', background: 'white', padding: '4px', borderRadius: '14px', border: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)', overflowX: isMobile ? 'auto' : 'visible', width: isMobile ? '100%' : 'auto' }}>
                        {[
                            { id: 'library', label: 'Library', icon: Library },
                            { id: 'simulator', label: 'AI Simulator', icon: Zap },
                            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 14px' : '10px 20px',
                                    background: activeTab === tab.id ? 'var(--navy-900)' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                    border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.85rem',
                                    cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                                }}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div className="card animate-scaleUp" style={{ width: '100%', maxWidth: 640, background: 'white', borderRadius: 32, padding: 40, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: 'linear-gradient(90deg, var(--purple-500), var(--rose-500))' }} />
                        <button onClick={() => setShowUpload(false)} style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        
                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: COLORS.navy }}>Upload Training Material</h2>
                            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Add Videos, PDFs, PPTs, or Documents to the Academy.</p>
                        </div>

                        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>Module Title</label>
                                <input className="input" placeholder="e.g. Closing Techniques for HNI clients" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>Category</label>
                                    <select className="select" value={uploadForm.category} onChange={e => setUploadForm({...uploadForm, category: e.target.value})}>
                                        {categories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>Material Type</label>
                                    <select className="select" value={uploadForm.type} onChange={e => setUploadForm({...uploadForm, type: e.target.value})}>
                                        {types.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>XP Points</label>
                                    <input type="number" className="input" value={uploadForm.xp_points} onChange={e => setUploadForm({...uploadForm, xp_points: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>Duration</label>
                                    <input className="input" placeholder="e.g. 15m" value={uploadForm.duration} onChange={e => setUploadForm({...uploadForm, duration: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>Select File</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="file" 
                                        onChange={e => setUploadForm({...uploadForm, file: e.target.files[0]})}
                                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 10 }} 
                                    />
                                    <div style={{ height: 100, border: '2px dashed var(--border-light)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 8 }}>
                                        <Upload size={24} color={COLORS.purple} />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            {uploadForm.file ? uploadForm.file.name : 'Click or Drag file to upload'}
                                        </span>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>Supported: MP4, PDF, PPTX, DOCX, JPG, PNG (Max 50MB)</p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isUploading}
                                style={{ width: '100%', marginTop: 12, padding: '16px', background: 'var(--navy-900)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                            >
                                {isUploading ? 'Uploading to Zentrix Cloud...' : 'Add to Academy'}
                                {!isUploading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Module Viewer Modal */}
            {activeModule && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>
                            <div style={{ color: COLORS.purple, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeModule.category}</div>
                            <h2 style={{ color: 'white', fontSize: '1.4rem', margin: '4px 0 0 0', fontWeight: 900, letterSpacing: '-0.02em' }}>{activeModule.title}</h2>
                        </div>
                        <button 
                            onClick={() => setActiveModule(null)}
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 40px' }}>
                        <div className="animate-scaleUp" style={{ width: '100%', maxWidth: 1100, height: '100%', maxHeight: 600, background: '#000', borderRadius: 32, overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {activeModule.type === 'Video' ? (
                                <video 
                                    className="w-full h-full"
                                    controls 
                                    autoPlay 
                                    style={{ width: '100%', height: '100%' }}
                                    onEnded={() => handleUpdateProgress(activeModule.id, 100, true)}
                                >
                                    <source src={activeModule.file_url} type={activeModule.mime_type} />
                                    Your browser does not support the video tag.
                                </video>
                            ) : activeModule.type === 'PDF' ? (
                                <iframe 
                                    src={activeModule.file_url} 
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="PDF Viewer"
                                    onLoad={() => handleUpdateProgress(activeModule.id, 100, true)}
                                />
                            ) : activeModule.type === 'Image' ? (
                                <img 
                                    src={activeModule.file_url} 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    onLoad={() => handleUpdateProgress(activeModule.id, 100, true)}
                                />
                            ) : (
                                <div style={{ color: 'white', textAlign: 'center', padding: '100px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                        <FileText size={40} style={{ opacity: 0.5 }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Document Preview</h3>
                                    <p style={{ opacity: 0.6, maxWidth: 400, margin: '12px 0 32px 0', lineHeight: 1.6 }}>Please download the file to complete this training module.</p>
                                    <a 
                                        href={activeModule.file_url} 
                                        download 
                                        onClick={() => handleUpdateProgress(activeModule.id, 100, true)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'white', color: COLORS.navy, padding: '16px 32px', borderRadius: 16, fontWeight: 900, textDecoration: 'none' }}
                                    >
                                        <Download size={20} /> Download Material
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '40px 60px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 80 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <Layout size={20} color={COLORS.purple} />
                                <h4 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>About this Module</h4>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{activeModule.description || 'Enhance your professional capabilities with Zentrix Academy.'}</p>
                        </div>
                        <div style={{ width: 240, background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: 8 }}>Incentive Reward</div>
                            <div style={{ color: COLORS.amber, fontSize: '1.8rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Star size={24} fill={COLORS.amber} /> +{activeModule.xp_points || 100} XP
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'library' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 32 }}>
                    {/* Main Content Area */}
                    <div>
                        {/* Search & Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: 16, marginBottom: 32 }}>
                            <div style={{ position: 'relative' }}>
                                <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                <input
                                    placeholder="Search sales techniques, projects, scripts..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ width: '100%', height: 48, background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '0 16px 0 48px', fontWeight: 500, outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', background: 'white', borderRadius: '14px', border: `1px solid ${COLORS.border}`, padding: '0 16px', alignItems: 'center', gap: 10 }}>
                                <Clock size={16} color={COLORS.purple} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>1h 30m Total Learning</span>
                            </div>
                            <button style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                                <Filter size={16} /> Filter
                            </button>
                        </div>

                        {/* Continue Learning */}
                        <div style={{ marginBottom: 40 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: COLORS.navy }}>Active Learning Paths</h2>
                                <button onClick={() => setActiveTab('library')} style={{ border: 'none', background: 'none', color: COLORS.blue, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>View Catalog <ArrowRight size={14} /></button>
                            </div>

                            {filteredModules.length === 0 ? (
                                <div style={{ padding: 80, textAlign: 'center', background: 'white', borderRadius: 32, border: `1px dashed ${COLORS.border}` }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <BookOpen size={32} color="#94a3b8" />
                                    </div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: COLORS.navy }}>No training found</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try adjusting your search or wait for new assignments.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                                    {filteredModules.map(module => (
                                        <div key={module.id} className="hover-lift" style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
                                            <div style={{ height: 160, position: 'relative', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {module.thumbnail_url || module.thumbnail ? (
                                                    <img src={module.thumbnail_url || module.thumbnail} alt={module.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ textAlign: 'center', color: COLORS.purple }}>
                                                        {module.type === 'Video' ? <Video size={40} /> : <FileText size={40} />}
                                                    </div>
                                                )}
                                                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>
                                                    {module.duration || '10m'}
                                                </div>
                                                {(module.completed || module.progress === 100) && (
                                                    <div style={{ position: 'absolute', top: 12, right: 12, background: COLORS.emerald, color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)' }}>
                                                        <CheckCircle2 size={14} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.purple, textTransform: 'uppercase' }}>{module.category || 'Zentrix Elite'}</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.amber }}>+{module.xp_points || 100} XP</span>
                                                </div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 850, color: COLORS.navy, marginBottom: 12, lineHeight: 1.4, height: '2.8em', overflow: 'hidden' }}>{module.title}</h3>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>{module.instructor?.charAt(0) || 'Z'}</div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{module.instructor || 'Academy'}</span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                        <div style={{ width: `${module.progress || 0}%`, height: '100%', background: COLORS.blue }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{module.progress || 0}%</span>
                                                </div>

                                                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                                                    <button 
                                                        onClick={() => setActiveModule(module)}
                                                        style={{ flex: 1, height: 42, border: 'none', borderRadius: '12px', background: (module.progress || 0) > 0 ? COLORS.blue : COLORS.navy, color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: (module.progress || 0) > 0 ? '0 8px 16px -4px rgba(59, 130, 246, 0.3)' : 'none' }}
                                                    >
                                                        {module.progress === 100 ? <RotateCw size={14} /> : <Play size={14} />} 
                                                        {module.progress === 100 ? 'Replay' : (module.progress || 0) > 0 ? 'Resume' : 'Start Module'}
                                                    </button>
                                                    
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                                                            className="hover-lift"
                                                            style={{ width: 42, height: 42, background: '#fee2e2', color: COLORS.rose, border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            title="Delete Module"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Battle Cards Section */}
                        <div style={{ background: '#fffbeb', border: `1px solid #fde68a`, borderRadius: '24px', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#92400e' }}>Project Battle Cards</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>Quick objection handling and project hooks for live calls.</p>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button 
                                        onClick={() => { setEditingCard(null); setCardForm({ project_name: '', usp: '', objections: [{q:'', a:''}], target_audience: '' }); setShowBattleCardModal(true); }}
                                        style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '10px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <Plus size={16} /> Add Card
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                                {(dbBattleCards || []).map(card => (
                                    <div key={card.id} style={{ background: 'white', borderRadius: '16px', padding: 20, border: '1px solid #fde68a', position: 'relative' }}>
                                        {isAdmin && (
                                            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                                                <button onClick={() => openEditBattleCard(card)} style={{ background: '#f8fafc', border: 'none', width: 28, height: 28, borderRadius: '6px', cursor: 'pointer', color: COLORS.blue }}><FileText size={14} /></button>
                                                <button onClick={() => handleDeleteBattleCard(card.id)} style={{ background: '#fee2e2', border: 'none', width: 28, height: 28, borderRadius: '6px', cursor: 'pointer', color: COLORS.rose }}><X size={14} /></button>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.navy, marginBottom: 12, paddingRight: 60 }}>{card.project_name}</div>
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', marginBottom: 8 }}>The Winning Hook</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {(card.usp || []).map((u, i) => (
                                                    <div key={i} style={{ background: '#fffbeb', color: '#b45309', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #fef3c7' }}>{u}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', marginBottom: 8 }}>Smart Objection Response</div>
                                            {(card.objections || []).map((obj, i) => (
                                                <div key={i} style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 10 }}>
                                                    <div style={{ fontWeight: 800, color: COLORS.navy }}>Q: {obj.q}</div>
                                                    <div style={{ color: 'var(--text-secondary)' }}>A: {obj.a}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Learning Profile */}
                        <div style={{ background: 'linear-gradient(135deg, var(--navy-900), #1e293b)', color: 'white', padding: 28, borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}><Trophy size={120} /></div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Closer Profile</h3>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Rank: #4 / 128 Agents</div>
                            
                            <div style={{ margin: '24px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 8 }}>
                                    <span>XP Progress</span>
                                    <span>85% to Level 13</span>
                                </div>
                                <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: '85%', height: '100%', background: COLORS.purple }} />
                                </div>
                            </div>

                            <button onClick={() => setActiveTab('leaderboard')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>View Achievements</button>
                        </div>

                        {/* Recent Badges */}
                        <div style={{ background: 'white', padding: 24, borderRadius: '24px', border: `1px solid ${COLORS.border}` }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800 }}>Earned Skills</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                <div title="Objection Handler" style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}><Flame size={20} /></div>
                                <div title="Project Expert" style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Star size={20} /></div>
                                <div title="AI Native" style={{ width: 44, height: 44, borderRadius: '50%', background: '#fdf4ff', border: '2px solid #d946ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d946ef' }}><Sparkles size={20} /></div>
                            </div>
                        </div>

                        {/* Daily Tips */}
                        <div style={{ background: 'white', padding: 24, borderRadius: '24px', border: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Target size={18} color={COLORS.purple} />
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Daily Tip</h4>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                "When a lead asks about the price, don't just state the number. Frame it as a <strong>Lifestyle Investment</strong> and mention the immediate neighborhood appreciation rate."
                            </p>
                            <button style={{ marginTop: 16, border: 'none', background: 'none', color: COLORS.blue, fontWeight: 700, fontSize: '0.75rem', padding: 0, cursor: 'pointer' }}>Next Tip →</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'simulator' && !isSimulatorActive && (
                <div style={{ 
                    minHeight: 'calc(100vh - 450px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(45deg, #0f172a, #1e293b)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative', overflow: 'hidden', padding: '20px 0'
                }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#8b5cf6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    
                    <div style={{ position: 'relative', textAlign: 'center', maxWidth: 960, width: '100%', padding: '0 40px' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid rgba(139, 92, 246, 0.3)' }}>
                            <Zap size={40} />
                        </div>
                        <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 950, marginBottom: 16, letterSpacing: '-0.03em' }}>ZenZone: AI Simulator</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 32 }}>
                            Hone your edge against high-fidelity AI personas. Real-time objection handling, sentiment analysis, and instant closing reports.
                        </p>

                        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px', marginBottom: 40, border: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['English', 'Hindi', 'Hinglish'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setSimLanguage(lang)}
                                    style={{
                                        padding: isMobile ? '8px 16px' : '8px 24px', borderRadius: '12px', border: 'none',
                                        background: simLanguage === lang ? COLORS.purple : 'transparent',
                                        color: 'white', fontWeight: 800, fontSize: isMobile ? '0.65rem' : '0.75rem', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 16, marginBottom: 40, width: '100%' }}>
                            {SCENARIOS.map(sc => (
                                <button 
                                    key={sc.id}
                                    onClick={() => startSimulation(sc)}
                                    className="hover-lift"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px 16px', borderRadius: '24px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.purple, textTransform: 'uppercase', marginBottom: 8 }}>{sc.difficulty}</div>
                                    <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>{sc.title}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Focus: {sc.focus}</div>
                                </button>
                            ))}
                            {/* Custom Card */}
                            <button 
                                onClick={() => setShowCustomSim(true)}
                                className="hover-lift"
                                style={{ 
                                    background: 'rgba(139, 92, 246, 0.05)', 
                                    border: `1px dashed ${COLORS.purple}`, 
                                    padding: '24px 16px', borderRadius: '24px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' 
                                }}
                            >
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.purple, textTransform: 'uppercase', marginBottom: 8 }}>Dynamic</div>
                                <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>Custom Scenario</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Define your own prospect...</div>
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                            <button onClick={() => startSimulation(SCENARIOS[0])} style={{ background: COLORS.purple, color: 'white', border: 'none', padding: '18px 48px', borderRadius: '20px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(139,92,246,0.3)' }}>Quick Start Simulation</button>
                        </div>
                    </div>
                </div>
            )}

            {isSimulatorActive && activeTab === 'simulator' && (
                <div style={{ minHeight: 'calc(100vh - 450px)', background: '#020617', borderRadius: '32px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {simStage === 'active' ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative' }}>
                            {/* Close/Back Button */}
                            <button 
                                onClick={resetSim}
                                style={{ position: 'absolute', top: 32, right: 32, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '14px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', zIndex: 10 }}
                                onMouseOver={e => e.currentTarget.style.color = 'white'}
                                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                            >
                                <X size={16} /> Exit Simulation
                            </button>

                            <div style={{ position: 'absolute', top: 32, left: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.rose, animation: 'pulse 1.5s infinite' }} />
                                <span style={{ color: 'white', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Simulation Live</span>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: 60 }}>
                                <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', border: `2px solid ${isAITalking ? COLORS.purple : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', transition: 'all 0.3s' }}>
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: COLORS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.purple }}>
                                        <Zap size={32} fill={isAITalking ? COLORS.purple : 'none'} />
                                    </div>
                                </div>
                                <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 950, margin: 0 }}>{selectedScenario.persona}</h3>
                                <p style={{ color: COLORS.purple, fontWeight: 700, marginTop: 4 }}>Skeptical Prospect</p>
                            </div>

                            {/* Waveform Visualization */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 60, marginBottom: 80 }}>
                                {[1,2,3,4,5,6,7,8,9,10,9,8,7,6,5,4,3,2,1].map((h, i) => (
                                    <div 
                                        key={i} 
                                        style={{ 
                                            width: 4, 
                                            height: isAITalking ? `${h * 6}px` : '4px', 
                                            background: isAITalking ? COLORS.purple : 'rgba(255,255,255,0.2)', 
                                            borderRadius: 2,
                                            transition: 'height 0.1s ease-in-out'
                                        }} 
                                    />
                                ))}
                            </div>

                            <div style={{ maxWidth: 640, width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Real-time Conversations</div>
                                <div id="sim-transcript-list" style={{ height: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 8 }} className="custom-scrollbar">
                                    {simTranscripts.map((t, i) => (
                                        <div key={i} style={{ 
                                            display: 'flex', gap: 12, 
                                            alignSelf: t.type === 'bot' ? 'flex-start' : 'flex-end',
                                            maxWidth: '85%'
                                        }}>
                                            {t.type === 'bot' && (
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>AI</div>
                                            )}
                                            <div style={{ 
                                                color: t.type === 'bot' ? 'white' : COLORS.purple, 
                                                fontSize: '0.9rem', lineHeight: 1.5, 
                                                fontWeight: t.type === 'bot' ? 500 : 700,
                                                background: t.type === 'bot' ? 'rgba(255,255,255,0.03)' : 'rgba(139, 92, 246, 0.1)',
                                                padding: '8px 16px', borderRadius: '14px',
                                                border: t.type === 'bot' ? '1px solid rgba(255,255,255,0.05)' : `1px solid rgba(139, 92, 246, 0.2)`
                                            }}>
                                                {t.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isAITalking && (
                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic', paddingLeft: 36 }}>{selectedScenario.persona} is replying...</div>
                                    )}
                                </div>
                            </div>

                            {/* Interaction Bar */}
                            <div style={{ maxWidth: 640, width: '100%', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input 
                                        type="text"
                                        placeholder={isListening ? "Listening to your response..." : "Type your professional response..."}
                                        value={agentInput}
                                        onChange={e => setAgentInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && processAgentInput(agentInput)}
                                        style={{ 
                                            width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', 
                                            border: isListening ? `1px solid ${COLORS.purple}` : '1px solid rgba(255,255,255,0.1)', 
                                            borderRadius: '16px', color: 'white', fontWeight: 500, outline: 'none',
                                            transition: 'all 0.3s'
                                        }}
                                    />
                                    {isListening && (
                                        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                                            {[1,2,3].map(i => (
                                                <div key={i} style={{ width: 3, height: 12, background: COLORS.purple, borderRadius: 2, animation: 'wave 0.6s infinite alternate', animationDelay: `${i*0.2}s` }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={toggleListening}
                                    style={{ 
                                        width: 52, height: 52, borderRadius: '16px', border: 'none', 
                                        background: isListening ? COLORS.rose : 'rgba(255,255,255,0.05)', 
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        transition: 'all 0.2s', boxShadow: isListening ? `0 0 20px ${COLORS.rose}44` : 'none'
                                    }}
                                >
                                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                                <button 
                                    onClick={() => processAgentInput(agentInput)}
                                    style={{ 
                                        width: 52, height: 52, borderRadius: '16px', border: 'none', 
                                        background: COLORS.purple, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        boxShadow: `0 8px 20px ${COLORS.purple}44`
                                    }}
                                >
                                    <Send size={20} />
                                </button>
                            </div>

                            <button 
                                onClick={handleSimComplete}
                                style={{ marginTop: 48, background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 32px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                                End Simulation & See Full Report
                            </button>
                        </div>
                    ) : (
                        <div style={{ flex: 1, padding: 60, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 950, margin: 0 }}>ZenZone Report</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Simulation analyzed by Zentrix AI Coach</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: COLORS.emerald, fontSize: '2.5rem', fontWeight: 950 }}>84%</div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Closing Probability</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
                                {[
                                    { label: 'Objection Handling', score: '92%', color: COLORS.purple, icon: ShieldCheck },
                                    { label: 'Tone & Sentiment', score: '78%', color: COLORS.blue, icon: Music },
                                    { label: 'Product Knowledge', score: '88%', color: COLORS.amber, icon: BookOpen }
                                ].map(m => (
                                    <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <m.icon size={20} color={m.color} style={{ marginBottom: 12 }} />
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
                                        <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>{m.score}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: 'rgba(139, 92, 246, 0.05)', borderRadius: 24, padding: 32, border: `1px solid rgba(139, 92, 246, 0.1)`, marginBottom: 40 }}>
                                <h4 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px 0' }}>
                                    <Sparkles size={20} color={COLORS.purple} /> Coach Recommendation
                                </h4>
                                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                                    Great work on addressing the price inflation objection! You correctly pivoted the value proposition toward the upcoming project infrastructure. 
                                    <strong> Gap:</strong> You missed offering a flexible payment plan when the HNI investor mentioned liquidity. 
                                    <strong> Tip:</strong> Next time, lead with the 'Subvention Scheme' to ease immediate cash-outflow concerns.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: 16 }}>
                                <button onClick={resetSim} style={{ flex: 1, padding: '16px', borderRadius: 16, border: 'none', background: 'white', color: COLORS.navy, fontWeight: 900, cursor: 'pointer' }}>Try New Scenario</button>
                                <button onClick={resetSim} style={{ flex: 1, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 900, cursor: 'pointer' }}>Download Call Report</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <div style={{ background: 'white', borderRadius: '32px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '32px 40px', background: '#fafafa', borderBottom: `1px solid ${COLORS.border}` }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: COLORS.navy, margin: 0 }}>Academy Leaderboard</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>Ranked by XP earned and module completion speed.</p>
                    </div>
                    <div style={{ padding: '20px 40px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                    <th style={{ padding: '16px 0', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Rank</th>
                                    <th style={{ padding: '16px 0', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Closer</th>
                                    <th style={{ padding: '16px 0', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Level</th>
                                    <th style={{ padding: '16px 0', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Modules</th>
                                    <th style={{ padding: '16px 0', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Total XP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(boardData && boardData.length > 0 ? boardData : [
                                    { rank: 1, name: 'Anjali Sharma', modules_completed: 45, total_xp: 18400, color: '#fbbf24' },
                                    { rank: 2, name: 'Rahul Varma', modules_completed: 38, total_xp: 12250, color: '#94a3b8' },
                                    { rank: 3, name: 'Priya Singh', modules_completed: 32, total_xp: 10800, color: '#b45309' },
                                    { rank: 4, name: (user?.name || 'Rohan Mishra') + ' (You)', modules_completed: 28, total_xp: 4500, isMe: true }
                                ]).map((row, idx) => (
                                    <tr key={row.id || idx} style={{ borderBottom: `1px solid ${COLORS.border}`, background: row.isMe || row.id === user?.id ? '#eff6ff' : 'transparent' }}>
                                        <td style={{ padding: '20px 0', fontWeight: 900 }}>
                                            {(idx + 1) <= 3 ? <span style={{ color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : '#b45309' }}>#{(idx + 1)}</span> : `#${(idx + 1)}`}
                                        </td>
                                        <td style={{ padding: '20px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                                                    {row.avatar ? <img src={row.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : row.name.charAt(0)}
                                                </div>
                                                <span style={{ fontWeight: 800, color: COLORS.navy }}>{row.name} {row.id === user?.id && '(You)'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 0', fontWeight: 700 }}>{Math.floor((parseInt(row.total_xp) || 0) / 1000) + 1}</td>
                                        <td style={{ padding: '20px 0', color: 'var(--text-muted)', fontWeight: 600 }}>{row.modules_completed} Completed</td>
                                        <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: 900, color: COLORS.navy }}>{(parseInt(row.total_xp) || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Battle Card Management Modal */}
            {showBattleCardModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div className="card animate-scaleUp" style={{ width: '100%', maxWidth: 720, background: 'white', borderRadius: 32, padding: 40, position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
                        <button onClick={() => setShowBattleCardModal(false)} style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        
                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: COLORS.navy }}>{editingCard ? 'Edit Battle Card' : 'Create New Battle Card'}</h2>
                            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Define quick project hooks and objection responses for agents.</p>
                        </div>

                        <form onSubmit={handleSaveBattleCard} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>Project Name</label>
                                <input className="input" placeholder="e.g. M3M Antalya Hills" value={cardForm.project_name} onChange={e => setCardForm({...cardForm, project_name: e.target.value})} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase', marginBottom: 8 }}>The Winning Hook (USPs - Comma Separated)</label>
                                <textarea className="input" style={{ height: 80, padding: 12 }} placeholder="e.g. High ROI, Strategic Location, Luxury Club..." value={cardForm.usp} onChange={e => setCardForm({...cardForm, usp: e.target.value})} />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.navy, textTransform: 'uppercase' }}>Objection & Reponse Scripts</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setCardForm({...cardForm, objections: [...cardForm.objections, {q:'', a:''}]})}
                                        style={{ background: 'none', border: 'none', color: COLORS.blue, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                    >+ Add Another</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {cardForm.objections.map((obj, i) => (
                                        <div key={i} style={{ padding: 16, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', position: 'relative' }}>
                                            <input 
                                                className="input" 
                                                style={{ marginBottom: 8, background: 'white' }} 
                                                placeholder="Potential Objection?" 
                                                value={obj.q} 
                                                onChange={e => {
                                                    const newObjs = [...cardForm.objections];
                                                    newObjs[i].q = e.target.value;
                                                    setCardForm({...cardForm, objections: newObjs});
                                                }} 
                                            />
                                            <textarea 
                                                className="input" 
                                                style={{ background: 'white', minHeight: 60 }} 
                                                placeholder="Suggested Response Script" 
                                                value={obj.a} 
                                                onChange={e => {
                                                    const newObjs = [...cardForm.objections];
                                                    newObjs[i].a = e.target.value;
                                                    setCardForm({...cardForm, objections: newObjs});
                                                }} 
                                            />
                                            {cardForm.objections.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCardForm({...cardForm, objections: cardForm.objections.filter((_, idx) => idx !== i)})}
                                                    style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: COLORS.rose, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                ><X size={12} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                style={{ width: '100%', marginTop: 12, padding: '16px', background: 'var(--navy-900)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}
                            >
                                {editingCard ? 'Update Battle Card' : 'Launch Battle Card'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Custom Simulation Modal */}
            {showCustomSim && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
                    <div className="animate-scaleUp" style={{ background: '#1e293b', width: '100%', maxWidth: 500, borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '32px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: 4 }}>Build Custom Persona</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Practice against your specific client</p>
                            </div>
                            <button onClick={() => setShowCustomSim(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Prospect Name/Persona</label>
                                <input 
                                    placeholder="e.g. Mr. Sharma (Aggressive Buyer)"
                                    value={customSimForm.persona}
                                    onChange={e => setCustomSimForm({...customSimForm, persona: e.target.value})}
                                    style={{ width: '100%', padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', fontWeight: 500 }}
                                />
                            </div>
                            
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Primary Objection / Goal</label>
                                <textarea 
                                    placeholder="e.g. Wants a 15% discount or will buy from a competitor."
                                    value={customSimForm.goal}
                                    onChange={e => setCustomSimForm({...customSimForm, goal: e.target.value})}
                                    style={{ width: '100%', padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', fontWeight: 500, minHeight: 100, resize: 'none' }}
                                />
                            </div>

                            <button 
                                onClick={() => {
                                    startSimulation({
                                        id: 'custom',
                                        title: 'Custom Practice',
                                        persona: customSimForm.persona,
                                        focus: customSimForm.goal,
                                        difficulty: 'Adaptive'
                                    });
                                    setShowCustomSim(false);
                                }}
                                style={{ background: COLORS.purple, color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}
                            >
                                <Sparkles size={20} /> Launch Custom Simulator
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
