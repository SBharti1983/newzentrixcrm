import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
    Play, BookOpen, Sparkles, GraduationCap, CheckCircle2, 
    ArrowRight, Search, Filter, Trophy, Star, Clock, 
    MessageSquare, Flame, Download, ExternalLink, Library, Layout, Target, Zap,
    Plus, X, FileText, Video, Image as ImageIcon, FileCode, Upload,
    ShieldCheck, Music, RotateCw, Mic, MicOff, Send, Mic2, TrendingUp,
    Volume2, VolumeX, CheckCircle, AlertCircle, Headphones, Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { academyApi, copilotApi, leadsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { usePresence } from '../context/PresenceContext';
import { PageLoader, PageError } from '../components/Feedback';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
    const isAdmin = ['admin', 'superadmin', 'sales_manager'].includes(user?.role);
    const { showToast, addToast } = useToast();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('library'); // library, simulator, voice_studio, leaderboard, management
    const [showUpload, setShowUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeModule, setActiveModule] = useState(null); // The module being viewed
    const [isSimulatorActive, setIsSimulatorActive] = useState(false);
    const [simStage, setSimStage] = useState('selection'); // selection, active, feedback
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [simLanguage, setSimLanguage] = useState('English');
    const [showLeadSim, setShowLeadSim] = useState(false);
    const [leadSearch, setLeadSearch] = useState('');
    const [leads, setLeads] = useState([]);
    const [isSearchingLeads, setIsSearchingLeads] = useState(false);
    const [isInitializingSim, setIsInitializingSim] = useState(false);
    const [simTranscripts, setSimTranscripts] = useState([]);
    const [isAITalking, setIsAITalking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [agentInput, setAgentInput] = useState('');
    const [showCustomSim, setShowCustomSim] = useState(false);
    const [customSimForm, setCustomSimForm] = useState({ persona: 'Mr. Khurana', focus: 'ROI', goal: 'Handle aggressive price negotiation.' });
    const [simReport, setSimReport] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isHandsFree, setIsHandsFree] = useState(false);
    const [isGeneratingCard, setIsGeneratingCard] = useState(null); // module ID being processed
    const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
    const [pitchDraft, setPitchDraft] = useState('');
    const [coachTip, setCoachTip] = useState(null);
    const [isGeneratingTip, setIsGeneratingTip] = useState(false);
    const [isRecordingSample, setIsRecordingSample] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const recorderRef = useRef(null);
    const timerRef = useRef(null);
    const isHandsFreeRef = useRef(false);
    const isListeningRef = useRef(false);
    const isSimulatorActiveRef = useRef(false);
    const isAITalkingRef = useRef(false);
    const recognitionRef = useRef(null);

    // Sync ref with state
    useEffect(() => {
        isHandsFreeRef.current = isHandsFree;
    }, [isHandsFree]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    useEffect(() => {
        isSimulatorActiveRef.current = isSimulatorActive;
    }, [isSimulatorActive]);

    useEffect(() => {
        isAITalkingRef.current = isAITalking;
    }, [isAITalking]);

    // Voice Heartbeat: Ensures mic stays alive in Hands-Free mode
    useEffect(() => {
        const interval = setInterval(() => {
            const isReallyTalking = isAITalkingRef.current || window.speechSynthesis.speaking;
            
            // Safety: if we think we are listening but haven't had a result in 10s, force reset
            // This handles cases where SpeechRecognition hangs
            if (isHandsFreeRef.current && isSimulatorActiveRef.current && !isReallyTalking && !isListeningRef.current) {
                console.log('[Voice] Heartbeat: Reviving mic...');
                startListening();
            }
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setRecordedBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            recorderRef.current = recorder;
            setIsRecordingSample(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 30) {
                        handleStopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);

            showToast('Speak naturally for 30 seconds...', 'info');
        } catch (err) {
            showToast('Microphone access denied', 'error');
        }
    };

    const handleStopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        clearInterval(timerRef.current);
        setIsRecordingSample(false);
    };

    const handleUploadSample = async () => {
        if (!recordedBlob) return;
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('audio', recordedBlob, 'sample.webm');
            formData.append('archetype', user?.persona_type || 'consultant');

            const res = await academyApi.calibrateVoice(formData);
            showToast('Persona calibration complete!', 'success');
            setSimReport(res); 
        } catch (err) {
            showToast('Calibration failed', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Battle State
    const { socket, onlineUsers } = usePresence();
    const [battleRoom, setBattleRoom] = useState(null);
    const [battleRole, setBattleRole] = useState(null); // 'seller' or 'buyer'
    const [battlePartner, setBattlePartner] = useState(null);
    const [pendingChallenge, setPendingChallenge] = useState(null);
    const [battleStage, setBattleStage] = useState('none'); // none, invited, active, judging
    const [battleMission, setBattleMission] = useState('');
    const [battleAdjudication, setBattleAdjudication] = useState(null);

    // Use a simple effect to catch window width for specific mobile overrides
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        
        // Socket Listeners for Battles
        if (socket) {
            socket.on('academy_battle_challenge', (data) => {
                setPendingChallenge(data);
                showToast(`Agent ${data.fromUser.name} has challenged you to a ZenZone Battle!`, 'info');
            });

            socket.on('academy_battle_join_room', (data) => {
                setBattleRoom(data.roomName);
                setBattleRole(data.role);
                setBattlePartner(data.partnerId);
                setSimStage('active');
                setIsSimulatorActive(true);
                setBattleStage('active');
            });

            socket.on('academy_battle_start', async ({ scenarioId }) => {
                const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];
                setSelectedScenario(scenario);
                setSimTranscripts([{ type: 'bot', text: `[System] Battle Room Active. Role: ${battleRole === 'seller' ? 'SELLER' : 'BUYER'}` }]);
                
                if (battleRole === 'buyer') {
                    // Fetch secret mission
                    try {
                        const { mission } = await academyApi.getBattleMission(scenarioId);
                        setBattleMission(mission);
                        setSimTranscripts(prev => [...prev, { type: 'bot', text: `[SECRET MISSION] ${mission}` }]);
                    } catch (err) { console.error('Mission failed'); }
                }
            });

            socket.on('academy_battle_sync', ({ message }) => {
                setSimTranscripts(prev => [...prev, { type: 'partner', text: message, senderName: 'Partner' }]);
            });

            socket.on('academy_battle_end', () => {
                handleEndBattle();
            });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (socket) {
                socket.off('academy_battle_challenge');
                socket.off('academy_battle_join_room');
                socket.off('academy_battle_start');
                socket.off('academy_battle_sync');
                socket.off('academy_battle_end');
            }
        };
    }, [socket, battleRole]);

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

    // Management Stats
    const { data: mgtStats } = useApi(
        useCallback(() => isAdmin ? academyApi.getManagementStats() : Promise.resolve(null), [isAdmin]),
        [isAdmin]
    );

    const SCENARIOS = [
        { 
            id: 'hni-investor', title: 'The Skeptical HNI', persona: 'Mr. Singhania', difficulty: 'Hard', 
            focus: 'ROI & Capital Appreciation', 
            goal: 'Handle aggressive price negotiation and tax-saving queries.', 
            avatar: '/assets/avatars/singhania.png',
            context: 'Mr. Singhania is a high-profile investor who has seen many projects fail. He is extremely guarded about his money and expects a minimum 12% yield. He will try to catch you on maintenance costs and location drawbacks.'
        },
        { 
            id: 'first-time', title: 'The Nervous First-timer', persona: 'Ankit Gupta', difficulty: 'Easy', 
            focus: 'Trust & Amenities', 
            goal: 'Build emotional connection and explain the home-buying process.', 
            avatar: '/assets/avatars/ankit.png',
            context: 'Ankit is buying his first home for his family. He is scared of hidden costs and possession delays. He needs reassurance about the developer profile and the school/hospital proximity.'
        },
        { 
            id: 'commercial', title: 'Commercial Portfolio Mgr', persona: 'Jessica Chen', difficulty: 'Medium', 
            focus: 'Leasing & Footfall', 
            goal: 'Explain the retail potential and brand-mix of the commercial project.', 
            avatar: '/assets/avatars/khurana.png',
            context: 'Jessica represents a Singapore-based fund. She is purely focused on data. She wants to know the anchor tenant strategy and the expected footfall based on the catchment area.'
        }
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
            // Speak the initial greeting too
            setTimeout(() => speakResponse(greetingText), 1500);
        }

        const initialMsg = { 
            type: 'bot', 
            text: greetingText 
        };
        setSimTranscripts([initialMsg]);
        
        // Start simulation interaction
        setTimeout(() => {
            speakResponse(greetingText);
        }, 1000);
    };

    const handleSimComplete = () => {
        setSimStage('feedback');
    };



    // Reset recognition when language changes so it picks up the new locale
    useEffect(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
            recognitionRef.current = null;
            setIsListening(false);
            isListeningRef.current = false;
        }
    }, [simLanguage]);

    // Cleanup recognition on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch(e) {}
                recognitionRef.current = null;
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    // Pre-warm speech synthesis voices
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const loadVoices = () => window.speechSynthesis.getVoices();
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);


    // Persist recognition across renders to avoid multiple instances
    const initRecognition = () => {
        if (recognitionRef.current) return recognitionRef.current;
        if (!SpeechRecognition) return null;
        
        try {
            const recognition = new SpeechRecognition();
            const langMap = { 'English': 'en-US', 'Hindi': 'hi-IN', 'Hinglish': 'hi-IN' };
            recognition.lang = langMap[simLanguage] || 'en-US';
            recognition.continuous = true; 
            recognition.interimResults = true;

            recognition.onstart = () => {
                console.log('[Voice] Recognition started in:', recognition.lang);
                setIsListening(true);
                isListeningRef.current = true;
            };

            recognition.onerror = (event) => {
                const error = event.error;
                console.error('[Voice] Recognition error:', error);
                
                if (error === 'no-speech' || error === 'aborted') return;

                if (error === 'not-allowed' || error === 'service-not-allowed') {
                    const advice = error === 'service-not-allowed' 
                        ? 'Mic blocked by system (possibly Screen Recording). Please stop other recording apps and tap the Mic button to retry.' 
                        : 'Microphone permission denied. Please allow access in browser settings.';
                    showToast(advice, 'error');
                    setIsHandsFree(false);
                    isHandsFreeRef.current = false;
                    setIsListening(false);
                    isListeningRef.current = false;
                    // Tag the state as 'emergency_stopped' to allow the toggle to act as a reset
                    recognitionRef.current = null;
                    return;
                }

                setIsListening(false);
                isListeningRef.current = false;
            };

            recognition.onend = () => {
                setIsListening(false);
                isListeningRef.current = false;
                
                // Aggressive restart for "Infinite Duplex" - NO DELAY
                if (isHandsFreeRef.current && isSimulatorActiveRef.current && !isAITalkingRef.current) {
                    console.log('[Voice] Autorestart triggered');
                    startListening();
                }
            };

            recognition.onresult = (event) => {
                // If agent starts talking while AI is speaking, interrupt the AI
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                    setIsAITalking(false);
                }

                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript.trim()) {
                    setAgentInput(finalTranscript); // Show what was heard in the input field
                    processAgentInput(finalTranscript);
                }
            };

            recognitionRef.current = recognition;
            return recognition;
        } catch (e) {
            console.error('[Voice] SpeechRecognition not supported:', e);
            showToast('Voice recognition not available in this browser.', 'error');
            return null;
        }
    };

    const startListening = async () => {
        if (!SpeechRecognition) {
            showToast('Voice recognition is not supported here.', 'error');
            return;
        }

        if (isListeningRef.current || isAITalkingRef.current) return;

        try {
            // Force browser to ask for mic permission if not already granted
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const recognition = initRecognition();
            if (recognition) {
                const langMap = { 'English': 'en-US', 'Hindi': 'hi-IN', 'Hinglish': 'hi-IN' };
                recognition.lang = langMap[simLanguage] || 'en-US';
                recognition.start();
            }
        } catch (e) {
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                showToast('Microphone access blocked in browser.', 'error');
                setIsHandsFree(false);
                isHandsFreeRef.current = false;
            } else if (e.name === 'InvalidStateError' || (e.message && e.message.includes('already started'))) {
                setIsListening(true);
                isListeningRef.current = true;
            } else {
                console.error('[Voice] Mic Start Error:', e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListeningRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
        setIsListening(false);
        isListeningRef.current = false;
    };

    const toggleListening = () => {
        // If we are in an error state or recognition is null, force a full reset
        if (!recognitionRef.current || (!isListening && isHandsFree)) {
            console.log('[Voice] Force Resetting Mic Engine...');
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch(e) {}
                recognitionRef.current = null;
            }
            startListening();
            return;
        }

        if (isListeningRef.current) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleEndBattle = async () => {
        setIsAnalyzing(true);
        setSimStage('report');
        setBattleStage('judging');

        try {
            const result = await academyApi.judgeBattle({
                transcript: simTranscripts.map(t => ({ 
                    sender: t.type === 'agent' ? user.name : (t.type === 'partner' ? 'Colleague' : 'System'),
                    text: t.text 
                })),
                scenarioId: selectedScenario?.id,
                sellerName: battleRole === 'seller' ? user.name : 'Colleague',
                buyerName: battleRole === 'buyer' ? user.name : 'Colleague'
            });
            setBattleAdjudication(result);
        } catch (err) {
            showToast('Failed to adjudicate battle', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper for general AI tasks (Whispers, Tips, etc.)
    const generateAIResponse = async (prompt) => {
        try {
            const res = await copilotApi.ask({ question: prompt, context: 'Real Estate Sales Simulation' });
            return res.answer || res.text;
        } catch (err) {
            console.error('AI Logic Bridge Error:', err);
            return 'Stay professional and focus on the client\'s ROI.';
        }
    };

    const processAgentInput = async (text) => {
        if (!text.trim()) return;
        
        // Add agent message to local transcript immediately
        const currentTranscripts = [...simTranscripts, { type: 'agent', text }];
        setSimTranscripts(currentTranscripts);
        setAgentInput('');

        // BATTLE MODE: If in a battle, sync via socket
        if (battleRoom) {
            socket.emit('academy_battle_sync', { roomName: battleRoom, message: text });
            return;
        }

        setIsAITalking(true);

        try {
            // Call the live AI simulation API
            const response = await academyApi.simulate({
                message: text,
                history: currentTranscripts,
                persona: selectedScenario?.persona,
                language: simLanguage,
                context: selectedScenario?.context || selectedScenario?.focus || 'General Real Estate Sales'
            });

            setIsAITalking(false);
            if (response && response.text) {
                const aiMsg = { type: 'bot', text: response.text };
                setSimTranscripts(prev => {
                    const next = [...prev, aiMsg];
                    // Generate whisper every exchange
                    if (next.length % 2 === 0) {
                        handleGenerateWhisper(next);
                    }
                    return next;
                });
                speakResponse(response.text);
            }
        } catch (err) {
            setIsAITalking(false);
            showToast('AI Simulation connection interrupted', 'warning');
            
            // Fallback to a static response if API fails
            setTimeout(() => {
                const fallback = simLanguage === 'Hindi' ? "माफ़ करें, अभी मेरा नेटवर्क थोड़ा स्लो है। क्या आप फिर से कह सकते हैं?" : "I'm having a bit of trouble connecting. Could you repeat that?";
                setSimTranscripts(prev => [...prev, { type: 'bot', text: fallback }]);
                speakResponse(fallback);
            }, 1000);
        }
    };
    const handleGenerateWhisper = async (currentTranscripts) => {
        if (currentTranscripts.length < 2) return;
        setIsGeneratingTip(true);
        try {
            const prompt = `
                Based on this sales simulation:
                ${currentTranscripts.slice(-4).map(t => `${t.type === 'bot' ? 'Prospect' : 'Agent'}: ${t.text}`).join('\n')}

                Give the AGENT a 1-sentence secret tip to "win" the next part of this specific conversation.
                Persona: ${selectedScenario?.persona}
                Goal: ${selectedScenario?.goal}

                Response style: Direct, tactical, under 15 words.
            `;
            const tip = await generateAIResponse(prompt, false);
            setCoachTip(tip);
        } catch (err) {
            console.error('Whisper failed:', err);
        } finally {
            setIsGeneratingTip(false);
        }
    };

    const handleEndSimulation = async () => {
        if (simTranscripts.length < 3) {
            setSimStage('library');
            setIsSimulatorActive(false);
            return;
        }

        setIsAnalyzing(true);
        setSimStage('report');

        try {
            const report = await academyApi.analyze({
                transcript: simTranscripts,
                persona: selectedScenario?.persona,
                scenario: selectedScenario?.title
            });
            setSimReport(report);

            // AUTO-CERTIFY: Find module with same name/context and certify if score >= 85
            if (report.score >= 85) {
                const relatedModule = dbModules?.find(m => 
                    m.title.toLowerCase().includes(selectedScenario?.title?.toLowerCase()) || 
                    selectedScenario?.focus?.toLowerCase().includes(m.title?.toLowerCase())
                );
                if (relatedModule) {
                    await academyApi.updateProgress({
                        module_id: relatedModule.id,
                        score: report.score,
                        completed: true,
                        progress: 100
                    });
                    addToast({ type: 'success', title: 'New Certification!', message: `You are now a Certified Expert in ${relatedModule.title}.` });
                    refetchModules();
                }
            }
        } catch (err) {
            console.error('Failed to analyze simulation:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGeneratePitch = async () => {
        setIsGeneratingPitch(true);
        try {
            const data = await academyApi.generatePitch({
                transcript: simTranscripts,
                persona: selectedScenario?.persona
            });
            setPitchDraft(data.draft);
            addToast({ type: 'success', title: 'Pitch Generated', message: 'A tailored follow-up is ready for you.' });
        } catch (err) {
            console.error('Failed to generate pitch:', err);
            addToast({ type: 'error', title: 'Error', message: 'Could not generate pitch draft.' });
        } finally {
            setIsGeneratingPitch(false);
        }
    };


    const speakResponse = (text) => {
        if (!isVoiceEnabled || !window.speechSynthesis) return;
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Stop listening while AI talks (prevents echo/feedback)
        stopListening();
        
        const utterance = new SpeechSynthesisUtterance(text);
        setIsAITalking(true);
        isAITalkingRef.current = true;

        // When AI finishes talking, restart mic immediately if hands-free
        utterance.onend = () => {
            setIsAITalking(false);
            isAITalkingRef.current = false;
            console.log('[Voice] AI finished talking');
            if (isHandsFreeRef.current && isSimulatorActiveRef.current) {
                startListening();
            }
        };

        utterance.onerror = (e) => {
            console.error('[Voice] Synthesis error:', e);
            setIsAITalking(false);
            isAITalkingRef.current = false;
            // Still try to restart mic on error
            if (isHandsFreeRef.current && isSimulatorActiveRef.current) {
                setTimeout(() => {
                    if (!isListeningRef.current && !isAITalkingRef.current) startListening();
                }, 500);
            }
        };
        
        // Intelligent voice selection - prioritize high-quality natural voices
        const voices = window.speechSynthesis.getVoices();
        const isHindi = text.match(/[\u0900-\u097F]/) || simLanguage === 'Hindi' || simLanguage === 'Hinglish';
        
        let selectedVoice = null;
        if (isHindi) {
            // Priority: Google Hindi, any Hindi, then generic Indian
            selectedVoice = voices.find(v => v.lang.startsWith('hi') && v.name.includes('Google')) ||
                            voices.find(v => v.lang.startsWith('hi')) ||
                            voices.find(v => v.lang.includes('hi')) ||
                            voices.find(v => v.lang.includes('IN'));
        } else {
            // Priority: Google Natural, English India, then US/UK
            selectedVoice = voices.find(v => v.name.includes('Google') && v.name.includes('Natural')) ||
                            voices.find(v => v.lang === 'en-IN') ||
                            voices.find(v => v.name.includes('Google US English')) ||
                            voices.find(v => v.lang.startsWith('en'));
        }
        
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Chrome bug workaround: long utterances get silently cancelled
        // Keep synthesis alive with a periodic resume
        const resumeInterval = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.resume();
            } else {
                clearInterval(resumeInterval);
            }
        }, 10000);

        window.speechSynthesis.speak(utterance);
    };

    const startLeadSimulation = async (leadId) => {
        setIsInitializingSim(true);
        try {
            const data = await academyApi.initializeLeadSimulation(leadId);
            const scenario = {
                id: `lead-${leadId}`,
                persona: data.persona,
                title: `Mock Test: ${data.leadName}`,
                focus: data.focus,
                difficulty: data.difficulty,
                avatar: data.avatar || '/assets/avatars/client_default.png',
                context: `User is practicing for a meeting with ${data.leadName}. The lead's current mission: ${data.goal}`
            };
            
            setSelectedScenario(scenario);
            setIsSimulatorActive(true);
            setSimStage('active');
            
            // Send initial bot greeting
            setSimTranscripts([{ type: 'bot', text: data.initialGreeting || `Hello, looking forward to our meeting.` }]);
            if (isVoiceEnabled) speakResponse(data.initialGreeting || `Hello, looking forward to our meeting.`);

        } catch (err) {
            showToast('Failed to initialize lead simulation', 'error');
        } finally {
            setIsInitializingSim(false);
            setShowLeadSim(false);
        }
    };

    const handleLeadSearch = async (val) => {
        setLeadSearch(val);
        if (val.length < 2) {
            setLeads([]);
            return;
        }
        setIsSearchingLeads(true);
        try {
            const res = await leadsApi.list({ q: val, limit: 5 });
            setLeads(res.data || []);
        } catch (err) {
            console.error('Lead search error:', err);
        } finally {
            setIsSearchingLeads(false);
        }
    };

    const resetSim = () => {
        setIsSimulatorActive(false);
        setSimStage('selection');
        setSelectedScenario(null);
        setSimTranscripts([]);
        setBattleRoom(null);
        setBattleRole(null);
        setBattlePartner(null);
        setBattleAdjudication(null);
        setBattleMission('');
        setBattleStage('none');
        window.speechSynthesis.cancel();
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
        { id: 'Voice Sample', icon: Headphones },
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

    const handleGenerateBattleCard = async (module) => {
        setIsGeneratingCard(module.id);
        try {
            const cardData = await academyApi.generateBattleCard({
                title: module.title,
                description: module.description
            });
            
            // Create the card in DB
            await academyApi.createBattleCard({
                ...cardData,
                tenant_id: user.tenant_id
            });
            
            addToast({ type: 'success', title: 'Battle Card Created', message: `Automatically generated hooks for ${module.title}.` });
            refetchBattleCards();
        } catch (err) {
            console.error('Failed to generate battle card:', err);
            addToast({ type: 'error', title: 'Generation Failed', message: 'AI could not distill this module into a battle card.' });
        } finally {
            setIsGeneratingCard(null);
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

    if (modulesLoading && !dbModules) return <PageLoader />;
    if (modulesError) return <PageError message={modulesError} onRetry={refetchModules} />;

    return (
        <div className="animate-fadeIn" style={{ padding: '24px 32px', minHeight: '100vh', background: COLORS.bg }}>
            {/* Zen Battle Challenge Modal */}
            {pendingChallenge && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="animate-scaleUp" style={{ background: '#0f172a', border: `1px solid ${COLORS.purple}`, borderRadius: '32px', padding: 40, maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: `0 0 100px ${COLORS.purple}22` }}>
                        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 24px' }}>
                            <div className="avatar-talking" style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `2px solid ${COLORS.purple}` }} />
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, position: 'relative', zIndex: 1, overflow: 'hidden', border: '4px solid #0f172a' }}>
                                {pendingChallenge.fromUser.avatar ? <img src={pendingChallenge.fromUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : pendingChallenge.fromUser.name.charAt(0)}
                            </div>
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 950, marginBottom: 8, letterSpacing: '-0.02em' }}>Agent Challenge!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32 }}>
                            Agent <strong style={{ color: 'white' }}>{pendingChallenge.fromUser.name}</strong> is challenging you to a real-time sales battle in the ZenZone. Are you ready?
                        </p>
                        
                        <div style={{ display: 'flex', gap: 16 }}>
                            <button 
                                onClick={() => {
                                    socket.emit('academy_battle_accept', { challengerId: pendingChallenge.fromUser.id, scenarioId: pendingChallenge.scenarioId });
                                    setPendingChallenge(null);
                                }}
                                style={{ flex: 1, padding: '16px', background: COLORS.purple, color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', boxShadow: `0 10px 30px ${COLORS.purple}44` }}
                            >Accept Battle</button>
                            <button 
                                onClick={() => setPendingChallenge(null)}
                                style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}
                            >Decline</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Enterprise Header */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                marginBottom: 40,
                gap: 24
            }}>
                <div style={{ flex: '1', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'nowrap' }}>
                        <div style={{ background: 'var(--navy-900)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <GraduationCap size={12} /> Zentrix Academy
                        </div>
                        <div style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: COLORS.emerald, fontSize: '0.65rem', fontWeight: 900 }}>
                            Level 12 • Diamond Closer
                        </div>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 950, color: COLORS.navy, letterSpacing: '-0.04em', margin: 0, lineHeight: 1 }}>Academy Intelligence</h1>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                    {isAdmin && (
                        <button 
                            onClick={() => setShowUpload(true)}
                            className="hover-lift"
                            style={{ background: 'var(--navy-900)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '14px', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 8px 20px -5px rgba(15, 23, 42, 0.3)', whiteSpace: 'nowrap' }}
                        >
                            <Plus size={18} /> Upload
                        </button>
                    )}

                    <div style={{ 
                        display: 'flex', 
                        background: 'white', 
                        padding: '4px', 
                        borderRadius: '14px', 
                        border: `1px solid ${COLORS.border}`, 
                        boxShadow: 'var(--shadow-sm)', 
                        overflowX: isMobile ? 'auto' : 'visible', 
                        width: isMobile ? '100%' : 'auto',
                        whiteSpace: 'nowrap'
                    }}>
                        {[
                            { id: 'library', label: 'Library', icon: Library },
                            { id: 'simulator', label: 'AI Simulator', icon: Zap },
                            { id: 'voice_studio', label: 'Voice Studio', icon: Mic2 },
                            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
                            ...(isAdmin ? [{ id: 'management', label: 'Management', icon: ShieldCheck }] : [])
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    padding: isMobile ? '10px 14px' : '10px 20px',
                                    background: activeTab === tab.id ? 'var(--navy-900)' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    fontWeight: 700, 
                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s', 
                                    flexShrink: 0
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
                        {/* Management Quick Stats (Admin Only) */}
                        {isAdmin && mgtStats && (
                            <div style={{ marginBottom: 40, background: 'white', borderRadius: '32px', padding: 32, border: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: COLORS.navy, margin: 0 }}>Team Readiness Intelligence</h2>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 24 }}>
                                    {(mgtStats.moduleReadiness || []).slice(0, 4).map((mod, i) => (
                                        <div key={i} style={{ background: '#f8fafc', padding: 20, borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.title}</div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                                                <div style={{ fontSize: '1.75rem', fontWeight: 950, color: COLORS.navy }}>{mod.certified_count}</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.emerald, marginBottom: 4 }}>Agents Certified</div>
                                            </div>
                                            <div style={{ marginTop: 12, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(mod.certified_count / Math.max(1, mod.total_attempts)) * 100}%`, background: COLORS.purple }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {mgtStats.topPerformers?.length > 0 && (
                                    <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                        <Trophy size={18} color={COLORS.amber} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                                            Current Training MVP: <strong style={{ fontWeight: 950 }}>{mgtStats.topPerformers[0].name}</strong> with {mgtStats.topPerformers[0].cert_count} Certifications.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

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
                                                        {module.type === 'Voice Sample' ? <Headphones size={40} /> : module.type === 'Video' ? <Video size={40} /> : <FileText size={40} />}
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
                                                        <div style={{ display: 'flex', gap: 10 }}>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleGenerateBattleCard(module); }}
                                                                className="hover-lift"
                                                                disabled={isGeneratingCard === module.id}
                                                                style={{ 
                                                                    flex: 1, height: 42, background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, border: `1px solid rgba(139, 92, 246, 0.2)`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800
                                                                }}
                                                            >
                                                                {isGeneratingCard === module.id ? (
                                                                    <RotateCw size={16} className="animate-spin" />
                                                                ) : (
                                                                    <><Sparkles size={16} /> Auto-Generate Battle Card</>
                                                                )}
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                                                                className="hover-lift"
                                                                style={{ width: 42, height: 42, background: '#fee2e2', color: COLORS.rose, border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                title="Delete Module"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
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

            {activeTab === 'voice_studio' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 32, minHeight: '600px' }}>
                    {/* Persona Calibration Engine */}
                    <div style={{ background: 'white', borderRadius: '32px', padding: 40, border: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Mic2 size={28} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: COLORS.navy, margin: 0, letterSpacing: '-0.02em' }}>Persona Calibration</h2>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sync your unique sales archetype with the Zen AI core.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                            {/* Archetype Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 950, color: COLORS.navy, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>1. Sales Archetype Mapping</label>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
                                    {[
                                        { id: 'challenger', title: 'The Challenger', desc: 'Assertive, insight-driven, price-confident.', icon: '🥊' },
                                        { id: 'consultant', title: 'The Consultant', desc: 'Detailed, helpful, trust-first approach.', icon: '📋' },
                                        { id: 'peer', title: 'The Peer', desc: 'High empathy, relatable, conversational.', icon: '🤝' }
                                    ].map(arc => (
                                        <button 
                                            key={arc.id}
                                            style={{
                                                padding: '20px 16px', borderRadius: '20px', textAlign: 'center', cursor: 'pointer',
                                                border: `2px solid ${user?.persona_type === arc.id ? COLORS.purple : '#f1f5f9'}`,
                                                background: user?.persona_type === arc.id ? 'rgba(139, 92, 246, 0.03)' : 'white',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => showToast(`Archetype set to ${arc.title}`, 'success')}
                                        >
                                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>{arc.icon}</div>
                                            <div style={{ fontWeight: 900, color: COLORS.navy, fontSize: '0.9rem', marginBottom: 4 }}>{arc.title}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{arc.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tone Modulation */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 950, color: COLORS.navy, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>2. Tone Modulation Profile</label>
                                <div style={{ background: '#f8fafc', padding: 28, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {[
                                        { label: 'Energy & Pitch', min: 'Steady', max: 'High Energy', val: 75 },
                                        { label: 'Speech Velocity', min: 'Measured', max: 'Bullet-speed', val: 60 },
                                        { label: 'Empathy Cushion', min: 'Direct', max: 'Warm', val: 85 }
                                    ].map(mod => (
                                        <div key={mod.label}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{mod.label}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.purple }}>{mod.val}%</span>
                                            </div>
                                            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${mod.val}%`, background: COLORS.purple, borderRadius: 3 }} />
                                                <div style={{ position: 'absolute', top: -5, left: `calc(${mod.val}% - 8px)`, width: 16, height: 16, borderRadius: '50%', background: 'white', border: `3px solid ${COLORS.purple}`, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                                                <span>{mod.min}</span>
                                                <span>{mod.max}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Voice Training */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 950, color: COLORS.navy, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>3. Reference Voice Sample</label>
                                <div style={{ 
                                    padding: 40, border: `2px dashed ${isRecordingSample ? COLORS.rose : COLORS.border}`, borderRadius: '24px', textAlign: 'center',
                                    background: isRecordingSample ? 'rgba(244, 63, 94, 0.02)' : 'rgba(248, 250, 252, 0.5)', cursor: 'default'
                                }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: isRecordingSample ? COLORS.rose : COLORS.navy, boxShadow: '0 10px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
                                        <Mic size={28} className={isRecordingSample ? 'animate-pulse' : ''} />
                                        {isRecordingSample && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${COLORS.rose}`, animation: 'ping 1s infinite' }} />}
                                    </div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 900 }}>
                                        {isRecordingSample ? `Recording... (${30 - recordingTime}s left)` : recordedBlob ? 'Sample Ready' : 'Record 30s Sales Pitch'}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {isRecordingSample ? 'Pitch your favourite project now.' : 'Let the AI analyze your natural inflection.'}
                                    </p>
                                    
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                                        {!isRecordingSample && !recordedBlob && (
                                            <button 
                                                onClick={handleStartRecording}
                                                style={{ padding: '12px 24px', borderRadius: '12px', background: COLORS.navy, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                                            >Start Recording</button>
                                        )}
                                        {isRecordingSample && (
                                            <button 
                                                onClick={handleStopRecording}
                                                style={{ padding: '12px 24px', borderRadius: '12px', background: COLORS.rose, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                                            >Stop Now</button>
                                        )}
                                        {recordedBlob && !isRecordingSample && (
                                            <>
                                                <button 
                                                    onClick={() => { setRecordedBlob(null); setRecordingTime(0); }}
                                                    style={{ padding: '12px 24px', borderRadius: '12px', background: '#f1f5f9', color: COLORS.navy, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                                                >Reset</button>
                                                <button 
                                                    onClick={handleUploadSample}
                                                    disabled={isAnalyzing}
                                                    style={{ padding: '12px 24px', borderRadius: '12px', background: COLORS.purple, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', opacity: isAnalyzing ? 0.7 : 1 }}
                                                >
                                                    {isAnalyzing ? 'Analyzing...' : 'Calibrate My Persona'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', padding: 32, borderRadius: '32px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Sparkles size={20} color={COLORS.purple} /> Archetype Insight
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                                Your current "Consultant" calibration suggests you perform best when the conversation is over 12 minutes long.
                            </p>
                            <div style={{ marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 8, color: COLORS.purple }}>Winning Streak Effect</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 950 }}>+12% Closing Edge</div>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: 24, borderRadius: '24px', border: `1px solid ${COLORS.border}` }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800 }}>Personality Heatmap</h4>
                            <div style={{ height: 200, background: '#f8fafc', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                                    <TrendingUp size={40} strokeWidth={1} />
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: 8 }}>Dynamic Matrix Active</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'simulator' && !isSimulatorActive && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 32, minHeight: 'calc(100vh - 450px)' }}>
                    {/* Main Simulation Selection */}
                    <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(45deg, #0f172a, #1e293b)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)',
                        position: 'relative', padding: '32px 24px'
                    }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#8b5cf6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    
                    <div style={{ position: 'relative', textAlign: 'center', maxWidth: 960, width: '100%', padding: '0 20px' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '20px', background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid rgba(139, 92, 246, 0.3)' }}>
                            <Zap size={30} />
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 950, marginBottom: 8, letterSpacing: '-0.02em' }}>ZenZone: AI Simulator</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 24, maxWidth: 600, margin: '0 auto 24px' }}>
                            Hone your edge against high-fidelity AI personas with real-time feedback.
                        </p>

                        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['English', 'Hindi', 'Hinglish'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setSimLanguage(lang)}
                                    style={{
                                        padding: isMobile ? '6px 12px' : '6px 18px', borderRadius: '10px', border: 'none',
                                        background: simLanguage === lang ? COLORS.purple : 'transparent',
                                        color: 'white', fontWeight: 800, fontSize: isMobile ? '0.6rem' : '0.7rem', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 20, width: '100%', justifyContent: 'center' }}>
                            {SCENARIOS.map(sc => (
                                <button 
                                    key={sc.id}
                                    onClick={() => startSimulation(sc)}
                                    className="hover-lift"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 12px', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.purple, textTransform: 'uppercase', marginBottom: 6 }}>{sc.difficulty}</div>
                                    <div style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem', marginBottom: 2, lineHeight: 1.2 }}>{sc.title}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Focus: {sc.focus}</div>
                                </button>
                            ))}
                            {/* Custom Card */}
                            <button 
                                onClick={() => setShowCustomSim(true)}
                                className="hover-lift"
                                style={{ 
                                    background: 'rgba(139, 92, 246, 0.05)', 
                                    border: `1px dashed ${COLORS.purple}`, 
                                    padding: '16px 12px', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' 
                                }}
                            >
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.purple, textTransform: 'uppercase', marginBottom: 6 }}>Dynamic</div>
                                <div style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem', marginBottom: 2 }}>Custom Scenario</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Define your own...</div>
                            </button>

                            {/* Lead-Based Mock Test Card */}
                            <button 
                                onClick={() => setShowLeadSim(true)}
                                className="hover-lift"
                                style={{ 
                                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1))', 
                                    border: `1px solid ${COLORS.rose}44`, 
                                    padding: '16px 12px', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                    position: 'relative', overflow: 'hidden'
                                }}
                            >
                                <div style={{ position: 'absolute', top: -5, right: -5, opacity: 0.1 }}><Users size={40} /></div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.rose, textTransform: 'uppercase', marginBottom: 6 }}>Real Data</div>
                                <div style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem', marginBottom: 2 }}>Practice with Lead</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Select CRM lead...</div>
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                            <button onClick={() => startSimulation(SCENARIOS[0])} style={{ background: COLORS.purple, color: 'white', border: 'none', padding: '14px 40px', borderRadius: '16px', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(139,92,246,0.25)' }}>Quick Start Simulation</button>
                        </div>
                    </div>
                    </div>

                    {/* Colleague Battle Sidebar */}
                    <div style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '32px', padding: 32, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', color: COLORS.rose, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Flame size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: COLORS.navy }}>Zen Battles</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Challenge a colleague to a roleplay.</p>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Available Opponents</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {onlineUsers.filter(u => u.id !== user?.id).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(0,0,0,0.4)', fontSize: '0.8rem', fontWeight: 600, border: '2px dashed #f1f5f9', borderRadius: 20 }}> No colleagues online for battle yet.</div>
                                ) : (
                                    onlineUsers.filter(u => u.id !== user?.id).map(onlineUser => (
                                        <div key={onlineUser.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                                {onlineUser.avatar ? <img src={onlineUser.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : onlineUser.name.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.navy }}>{onlineUser.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: COLORS.emerald, fontWeight: 700 }}>Online Now</div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    socket.emit('academy_battle_invite', { toUserId: onlineUser.id, scenarioId: SCENARIOS[0].id });
                                                    showToast(`Challenge sent to ${onlineUser.name}!`, 'info');
                                                }}
                                                style={{ background: COLORS.navy, color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                                            >Challenge</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: 24, padding: 20, background: 'rgba(139, 92, 246, 0.05)', borderRadius: 20, border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.purple, marginBottom: 8 }}>
                                <ShieldCheck size={16} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>AI Judge Active</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(15, 23, 42, 0.6)', lineHeight: 1.4, fontWeight: 600 }}>
                                The AI will analyze your peer battle and declare a winner based on empathy, hooks, and closing power.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isSimulatorActive && activeTab === 'simulator' && (
                <div style={{ minHeight: 'calc(100vh - 450px)', background: '#020617', borderRadius: '32px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {simStage === 'active' ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 40px 60px', position: 'relative', width: '100%' }}>
                            {/* Close/Back Button */}
                            <button 
                                onClick={resetSim}
                                style={{ position: 'absolute', top: 32, right: 32, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '14px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', zIndex: 10 }}
                            >
                                <X size={16} /> Exit Simulation
                            </button>

                            <div style={{ position: 'absolute', top: 32, left: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: battleRoom ? COLORS.purple : COLORS.rose, animation: 'pulse 1.5s infinite' }} />
                                <span style={{ color: 'white', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {battleRoom ? `Zen Battle: ${battleRole === 'seller' ? 'SELLING' : 'BUYING'}` : 'Simulation Live'}
                                </span>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: 60 }}>
                                <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 24px' }}>
                                    {/* Avatar Glow Ring */}
                                    <div className={isAITalking ? 'avatar-talking' : 'avatar-active'} style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${isAITalking ? COLORS.purple : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.5s', background: isAITalking ? 'rgba(139, 92, 246, 0.05)' : 'transparent' }} />
                                    
                                    {/* Main Avatar Image */}
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `4px solid ${isAITalking ? COLORS.purple : 'rgba(255,255,255,0.1)'}`, position: 'relative', zIndex: 1, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                        <img 
                                            src={selectedScenario?.avatar || '/assets/avatars/ankit.png'} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isAITalking ? 'grayscale(0) brightness(1.1)' : 'grayscale(0.1) brightness(0.9)' }} 
                                            alt="Prospect" 
                                        />
                                        {isAITalking && (
                                            <div style={{ position: 'absolute', bottom: 15, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                                                {[1,2,3,4].map(n => <div key={n} style={{ width: 4, height: 16, background: 'white', borderRadius: 2, animation: 'pulse 0.4s infinite', animationDelay: `${n*0.1}s` }} />)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10, background: isAITalking ? COLORS.emerald : COLORS.amber, width: 20, height: 20, borderRadius: '50%', border: '4px solid #020617', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} />
                                </div>

                                <h3 style={{ color: 'white', fontSize: '2rem', fontWeight: 950, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>{selectedScenario.persona}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.purple, textTransform: 'uppercase' }}>{selectedScenario.focus}</span>
                                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Difficulty: {selectedScenario.difficulty}</span>
                                </div>
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

                            {/* Interaction Bar with Whisperer Bubble */}
                            <div style={{ maxWidth: 640, width: '100%', position: 'relative' }}>
                                {coachTip && (
                                    <div className="animate-slideIn" style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 16 }}>
                                        <div style={{ 
                                            background: 'rgba(245, 158, 11, 0.15)', border: `1px solid ${COLORS.amber}44`, 
                                            padding: '12px 20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: 12,
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)'
                                        }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '10px', background: COLORS.amber, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Sparkles size={16} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.amber, textTransform: 'uppercase', marginBottom: 2 }}>AI Coach Whisper</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>"{coachTip}"</div>
                                            </div>
                                            <button onClick={() => setCoachTip(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={14} /></button>
                                        </div>
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
                                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                    style={{ background: isVoiceEnabled ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isVoiceEnabled ? COLORS.purple : 'rgba(255,255,255,0.1)'}`, color: isVoiceEnabled ? COLORS.purple : 'white', width: 42, height: 42, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    title={isVoiceEnabled ? "Mute AI Voice" : "Unmute AI Voice"}
                                >
                                    {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                </button>
                                <button 
                                    onClick={() => {
                                        const newState = !isHandsFree;
                                        setIsHandsFree(newState);
                                        if (newState) {
                                            setIsVoiceEnabled(true);
                                            showToast('Hands-Free Mode Enabled', 'info');
                                            if (!isListeningRef.current) startListening();
                                        }
                                    }}
                                    style={{ 
                                        background: isHandsFree ? COLORS.emerald : 'rgba(255,255,255,0.05)', 
                                        border: `1px solid ${isHandsFree ? COLORS.emerald : 'rgba(255,255,255,0.2)'}`, 
                                        color: isHandsFree ? 'white' : 'white', 
                                        width: 42, height: 42, borderRadius: '12px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: isHandsFree ? `0 0 20px ${COLORS.emerald}66` : 'none'
                                    }}
                                    title="Toggle Hands-Free Continuous Mode"
                                >
                                    <Zap size={20} />
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={toggleListening}
                                        style={{ 
                                            width: 52, height: 52, borderRadius: '16px', border: 'none', 
                                            background: isListening ? COLORS.rose : (isAITalking ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)'), 
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            transition: 'all 0.2s', 
                                            boxShadow: isListening ? `0 0 25px ${COLORS.rose}66` : (isHandsFree ? `0 0 15px ${COLORS.emerald}44` : 'none'),
                                            opacity: isAITalking ? 0.3 : 1,
                                            animation: isHandsFree && !isListening && !isAITalking ? 'breath 2s infinite ease-in-out' : 'none'
                                         }}
                                    >
                                        {isHandsFree && (
                                            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: COLORS.emerald, color: 'white', fontSize: '9px', fontWeight: 950, padding: '2px 8px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)', zIndex: 5, letterSpacing: '0.05em' }}>
                                                AUTO
                                            </div>
                                        )}
                                        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                                        {isListening && (
                                            <div style={{ position: 'absolute', bottom: 8, display: 'flex', gap: 2, alignItems: 'center' }}>
                                                {[1,2,3,4,5].map(i => (
                                                    <div key={i} style={{ width: 2, height: 8, background: 'white', borderRadius: 1, animation: 'wave 0.4s infinite alternate', animationDelay: `${i*0.1}s` }} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                </div>
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
                        </div>

                        <button 
                                onClick={battleRoom ? handleEndBattle : handleSimComplete}
                                style={{ marginTop: 48, background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 32px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                                {battleRoom ? 'End Battle & See AI Verdict' : 'End Simulation & See Full Report'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ flex: 1, padding: 60, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 950, margin: 0 }}>{battleStage === 'judging' ? 'Battle Adjudication' : 'ZenZone Report'}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Simulation analyzed by Zentrix AI Coach</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    {battleStage === 'judging' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <div style={{ color: COLORS.emerald, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>WINNER DECLARED</div>
                                            <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 950, background: 'rgba(139, 92, 246, 0.2)', padding: '4px 16px', borderRadius: '12px', border: `1px solid ${COLORS.purple}` }}>{battleAdjudication?.winner || 'Analyzing...'}</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ color: COLORS.emerald, fontSize: '2.5rem', fontWeight: 950 }}>84%</div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Closing Probability</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {battleStage === 'judging' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
                                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: 32, borderRadius: 24, border: `1px solid rgba(139, 92, 246, 0.1)` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.purple, marginBottom: 16 }}>
                                            <Target size={20} /> <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Seller Feedback</span>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                                            {battleAdjudication?.sellerFeedback || 'Seller demonstrated high emotional empathy but struggled with the final close timing.'}
                                        </p>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 32, borderRadius: 24, border: `1px solid rgba(255,255,255,0.05)` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.rose, marginBottom: 16 }}>
                                            <ShieldCheck size={20} /> <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Buyer Strategy</span>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                                            {battleAdjudication?.buyerFeedback || 'Buyer remained consistent with their secret motive, forcing the seller to pivot their USP.'}
                                        </p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.05)', padding: 24, borderRadius: 20, border: `1px solid rgba(16, 185, 129, 0.2)`, textAlign: 'center' }}>
                                        <div style={{ color: COLORS.emerald, fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 8 }}>Victory Rationale</div>
                                        <div style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>"{battleAdjudication?.victoryReason || 'The seller correctly identified the primary emotional hook.'}"</div>
                                    </div>
                                </div>
                            ) : (
                                <>
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
                                    <button onClick={() => { showToast('Growth Plan exported to your email!', 'success'); resetSim(); }} style={{ flex: 1, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(139, 92, 246, 0.2)', color: 'white', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Target size={18} /> Get Growth Plan
                                    </button>
                                    <button onClick={resetSim} style={{ flex: 1, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 900, cursor: 'pointer' }}>Return to Academy</button>
                                </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'voice_studio' && (
                <div className="animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 32 }}>
                    {/* Recording Suite */}
                    <div style={{ background: '#0f172a', borderRadius: '32px', padding: 48, border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, #8b5cf6 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                        
                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                <div style={{ width: 56, height: 56, borderRadius: '18px', background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                    <Mic2 size={28} />
                                </div>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 950, margin: 0, letterSpacing: '-0.02em' }}>Voice Persona Calibration</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600 }}>Record a 30-second sample to sync the AI to your unique sales style.</p>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: 32, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 40 }}>
                                <div style={{ color: COLORS.purple, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Calibration Script</div>
                                <div style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.6, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)' }}>
                                    "Hello! This is Rohan from Zentrix. I noticed you were exploring our newest luxury project's ROI projections. The reason I'm reaching out is that we've just unlocked a strategic subvention plan for our early investors. I'd love to walk you through how this fits into your current portfolio."
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', padding: 60, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                {isRecordingSample ? (
                                    <div className="animate-pulse">
                                        <div style={{ fontSize: '3.5rem', fontWeight: 950, color: COLORS.rose, marginBottom: 16 }}>
                                            0:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
                                            {[1,2,3,4,5,6,7,8].map(i => (
                                                <div key={i} style={{ width: 4, height: 40, background: COLORS.rose, borderRadius: 2, animation: 'wave 0.5s infinite alternate', animationDelay: `${i*0.1}s` }} />
                                            ))}
                                        </div>
                                        <button 
                                            onClick={handleStopRecording}
                                            style={{ background: COLORS.rose, color: 'white', border: 'none', padding: '16px 40px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, margin: '0 auto' }}
                                        >
                                            <X size={20} /> Stop Recording
                                        </button>
                                    </div>
                                ) : recordedBlob ? (
                                    <div>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: COLORS.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Sample Captured</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>Voice sample is ready for AI archetype analysis.</p>
                                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                                            <button onClick={handleStartRecording} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 32px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>Retake</button>
                                            <button 
                                                onClick={handleUploadSample}
                                                disabled={isAnalyzing}
                                                style={{ background: COLORS.purple, color: 'white', border: 'none', padding: '16px 48px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                                            >
                                                {isAnalyzing ? <RotateCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                                {isAnalyzing ? 'Analyzing Persona...' : 'Calibrate My Voice'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: COLORS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'breath 2s infinite ease-in-out' }}>
                                            <Mic2 size={40} />
                                        </div>
                                        <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Ready to start?</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32, maxWidth: 300, margin: '0 auto 32px' }}>Find a quiet place and read the script above clearly for the best results.</p>
                                        <button 
                                            onClick={handleStartRecording}
                                            style={{ background: 'white', color: COLORS.navy, border: 'none', padding: '18px 48px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, margin: '0 auto', boxShadow: '0 10px 25px rgba(255,255,255,0.1)' }}
                                        >
                                            <Play size={20} fill={COLORS.navy} /> Start Calibration
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results / Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ background: 'white', borderRadius: '32px', padding: 32, border: `1px solid ${COLORS.border}` }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 900, color: COLORS.navy }}>Current Archetype</h4>
                            {simReport ? (
                                <div className="animate-fadeIn">
                                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: 24, borderRadius: '24px', border: `1px solid rgba(139, 92, 246, 0.1)`, textAlign: 'center', marginBottom: 24 }}>
                                        <div style={{ color: COLORS.purple, fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Detected Persona</div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 950, color: COLORS.navy }}>{simReport.archetype || 'The Trusted Advisor'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {[
                                            { label: 'Tone Stability', val: '94%', color: COLORS.emerald },
                                            { label: 'Empathy Score', val: '88%', color: COLORS.purple },
                                            { label: 'Authority Index', val: '76%', color: COLORS.amber }
                                        ].map(stat => (
                                            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{stat.label}</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: stat.color }}>{stat.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #f1f5f9', borderRadius: 24 }}>
                                    <div style={{ color: 'rgba(0,0,0,0.2)', marginBottom: 12 }}><ShieldCheck size={40} strokeWidth={1} /></div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>No calibration data found. Complete your first sample to unlock insights.</p>
                                </div>
                            )}
                        </div>

                        <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', borderRadius: '32px', padding: 32, color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <Sparkles size={20} />
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>Why Calibrate?</h4>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, fontWeight: 500, opacity: 0.9 }}>
                                Calibrating your voice allows Zentrix AI to adjust its empathy filters, tailoring objection handling advice to match your natural cadence and authority.
                            </p>
                        </div>
                    </div>
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
            
            {activeTab === 'management' && isAdmin && (
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
                        <div style={{ background: 'white', padding: 32, borderRadius: '32px', border: `1px solid ${COLORS.border}` }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Certified Headcount</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color: COLORS.navy }}>{mgtStats?.topPerformers?.length || 0}</div>
                            <div style={{ fontSize: '0.8rem', color: COLORS.emerald, fontWeight: 700, marginTop: 8 }}>Agents with 85%+ score</div>
                        </div>
                        <div style={{ background: 'white', padding: 32, borderRadius: '32px', border: `1px solid ${COLORS.border}` }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Avg. Simulation Score</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color: COLORS.purple }}>
                                {mgtStats?.moduleReadiness?.length ? Math.round(mgtStats.moduleReadiness.reduce((acc,curr)=>acc+parseFloat(curr.avg_score||0),0)/mgtStats.moduleReadiness.length) : 0}%
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 8 }}>Across all active modules</div>
                        </div>
                        <div style={{ background: 'white', padding: 32, borderRadius: '32px', border: `1px solid ${COLORS.border}` }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Total Practices</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color: COLORS.rose }}>
                                {mgtStats?.moduleReadiness?.reduce((acc,curr)=>acc+parseInt(curr.total_attempts||0),0) || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 8 }}>Roleplay sessions this month</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 32 }}>
                        <div style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '32px', padding: 32 }}>
                            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <BookOpen size={20} color={COLORS.purple} /> Module Performance Matrix
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {mgtStats?.moduleReadiness?.map(module => (
                                    <div key={module.title} style={{ padding: 20, background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{module.title}</span>
                                            <span style={{ fontWeight: 900, color: COLORS.purple }}>{Math.round(module.avg_score || 0)}% Avg</span>
                                        </div>
                                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(module.certified_count / (module.total_attempts || 1)) * 100}%`, background: COLORS.emerald, borderRadius: 4 }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                            <span>{module.certified_count} Certified Agents</span>
                                            <span>{module.total_attempts} Total Attempts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                            <div style={{ background: COLORS.navy, borderRadius: '32px', padding: 32, color: 'white' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 900 }}>Top Certifiers</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {mgtStats?.topPerformers?.map((agent, idx) => (
                                        <div key={agent.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>{idx + 1}</div>
                                            <div style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem' }}>{agent.name}</div>
                                            <div style={{ background: COLORS.emerald, color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900 }}>{agent.cert_count}🏆</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '32px', padding: 32 }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900 }}>Skill Gaps</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 600 }}>Based on recent AI analysis, your team is strongest in **Discovery** but weakest in **Objection Handling**.</p>
                                <button style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.purple}`, background: 'transparent', color: COLORS.purple, fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}>Generate Training Plan</button>
                            </div>
                        </div>
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
            {/* Lead Selection Modal */}
            {showLeadSim && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ width: '100%', maxWidth: 500, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: 40, boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                            <div>
                                <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 950, margin: 0 }}>Select a Real Lead</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 4 }}>We'll synthesize an AI persona based on their CRM history.</p>
                            </div>
                            <button onClick={() => setShowLeadSim(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 8, borderRadius: 12, cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: 24 }}>
                            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} size={18} />
                            <input 
                                placeholder="Search lead by name or phone..."
                                value={leadSearch}
                                onChange={e => handleLeadSearch(e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: 52, borderRadius: 16, padding: '0 48px', color: 'white', fontWeight: 500, outline: 'none' }}
                            />
                        </div>

                        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }} className="custom-scrollbar">
                            {isSearchingLeads && (
                                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20 }}>Searching Zentrix Cloud...</div>
                            )}
                            {!isSearchingLeads && leads.length === 0 && leadSearch.length > 1 && (
                                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20 }}>No matching leads found.</div>
                            )}
                            {leads.map(l => (
                                <button 
                                    key={l.id}
                                    onClick={() => startLeadSimulation(l.id)}
                                    disabled={isInitializingSim}
                                    style={{ 
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'white'
                                    }}
                                    className="hover-lift"
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS.purple, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>{l.name.charAt(0)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{l.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{l.stage} • {l.project_name || 'No Project'}</div>
                                    </div>
                                    {isInitializingSim ? <RotateCw className="animate-spin" size={16} /> : <ArrowRight size={16} color="rgba(255,255,255,0.3)" />}
                                </button>
                            ))}
                        </div>

                        {isInitializingSim && (
                            <div style={{ marginTop: 24, padding: 20, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 16, border: `1px solid ${COLORS.purple}44`, textAlign: 'center' }}>
                                <div style={{ color: COLORS.purple, fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Sparkles size={16} /> Synthesizing Persona
                                </div>
                                <p style={{ color: 'white', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>Deep-scanning CRM history for pain points...</p>
                            </div>
                        )}
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
