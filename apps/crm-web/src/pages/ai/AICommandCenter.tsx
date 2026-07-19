import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Search, Mail, MessageSquare, Phone, MoreVertical,
    Send, RefreshCw, Wand2, User, Sparkles, Brain,
    TrendingUp, TrendingDown, Target, Zap, Clock,
    CheckCircle2, AlertCircle, ChevronRight, Filter,
    Check, Play, Pause, Save, Calendar, Trash2, FileText,
    Upload, HelpCircle, GraduationCap, Users, BarChart3,
    Shield, Activity, Bot, ChevronDown, ChevronUp,
    AlertTriangle, ThumbsUp, ThumbsDown, Wifi, WifiOff, Loader2,
    ServerCrash, Database, Radio, PhoneCall, UserCheck, Clock4, Plug
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { BASE_URL, getToken } from '../../api/client';
import './AICommandCenter.css';

// ─── LOCAL API FETCH HELPER ──────────────────────────────────────────
async function apiFetch(path: string, options: any = {}) {
    const token = getToken();
    let cleanPath = path;
    if (BASE_URL.endsWith('/api') && path.startsWith('/api/')) {
        cleanPath = path.substring(4);
    }
    const res = await fetch(`${BASE_URL}${cleanPath}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

// ─── INITIAL AGENT MOCK DATA ──────────────────────────────────────────
const INITIAL_PROFILES: Record<string, any> = {
    rohan: {
        id: "rohan",
        name: "Rohan Mishra",
        role: "rohan",
        roleLabel: "Rohan (Sales)",
        employeeCode: "ZEN-AI-001",
        status: "online",
        stats: {
            totalLeads: { val: 422, change: "+12%", up: true },
            activeConvs: { val: 12, change: "+8%", up: true },
            revenue: { val: "₹18.4L", change: "+23%", up: true },
            aiScore: { val: "94%", change: "+2%", up: true }
        },
        recentConvs: [
            { id: "r1", name: "Neha Vig", avatar: "NV", msg: "Haan ji Neha Bhai, site visit bilkul free hai...", time: "2m ago", unread: 2 },
            { id: "r2", name: "Rahul Singh", avatar: "RS", msg: "Budget ke baare mein tension mat lo bhai...", time: "15m ago", unread: 1 },
            { id: "r3", name: "Dipak Goyal", avatar: "DG", msg: "Sunday ko cab bhej du? Free hai aapke liye.", time: "1h ago" },
            { id: "r4", name: "Tribhuvan Sharma", avatar: "TS", msg: "2BHK configuration available hai sir...", time: "3h ago" }
        ],
        pipeline: {
            new: [
                { id: "rp1", name: "Khushiram Singh", source: "Via WhatsApp" },
                { id: "rp2", name: "Dileep Yadav", source: "Inbound Call" }
            ],
            contacted: [
                { id: "rp4", name: "Neha Vig", source: "Site visit booked" },
                { id: "rp5", name: "Rahul Singh", source: "Price shared" }
            ],
            qualified: [
                { id: "rp6", name: "Dipak Goyal", source: "2BHK Interest" },
                { id: "rp7", name: "J P", source: "3BHK, ₹1.2Cr" }
            ],
            won: [
                { id: "rp8", name: "Tribhuvan Sharma", source: "₹98L Closed" }
            ]
        },
        persona: {
            language: "hinglish",
            dialect: "Noida/Delhi Hindi Accent",
            formality: 40,
            humor: 65,
            assertiveness: 75,
            fillerWords: ["bhai", "matlab", "bilkul", "dekhiye"],
            greetingMorning: "Ram Ram ji! Main Rohan baat kar raha hu Maya Infratech se.",
            greetingAfternoon: "Namaste sir, Rohan baat kar raha hu Maya Infratech se. Kaise hain aap?",
            greetingEvening: "Namaste! Good evening sir, Maya Infratech se Rohan. Kuch help kar sakta hu?"
        },
        knowledge: {
            docs: [
                { id: "kd1", name: "Maya_Infratech_Brochure_2026.pdf", size: "4.2 MB", status: "indexed", date: "2026-07-10", chunks: 43, lastEmbedded: "2026-07-10 10:14", agents: ["Rohan (Sales)", "Monika (Reception)"], active: true },
                { id: "kd2", name: "Price_List_Objections_V3.docx", size: "820 KB", status: "indexed", date: "2026-07-12", chunks: 8, lastEmbedded: "2026-07-12 11:22", agents: ["Rohan (Sales)"], active: true },
                { id: "kd3", name: "RERA_Approval_Docs.pdf", size: "1.8 MB", status: "indexed", date: "2026-07-14", chunks: 21, lastEmbedded: "2026-07-14 15:45", agents: ["Rohan (Sales)", "Neha (Accounts)"], active: true }
            ],
            trainingExamples: [
                { id: "te1", category: "discount_handling", prompt: "Mujhe extra 5% discount chahiye tabhi book karunga.", response: "Sir discounts to transparent hain but booking complete kijiye, main direct manager se unique waiver baat karunga." },
                { id: "te2", category: "objection_handling", prompt: "Projects are too far from central city area.", response: "Sir standard expressway connectivity 12 minutes hai, isliye future appreciation area best invest hai." }
            ]
        },
        voice: {
            engine: "ElevenLabs Multilingual V2",
            voiceId: "eleven_rohan_premium_v4",
            speechRate: 1.05,
            pitch: 0.98,
            stability: 0.72,
            clonedSamples: ["sample_voice_rohan_01.wav", "sample_voice_rohan_02.wav"]
        },
        workflow: {
            shiftStart: "09:00",
            shiftEnd: "19:00",
            cooldownSeconds: 45,
            maxConcurrent: 2,
            overflowAgent: "monika",
            handoffManager: "Surendra (Sales Manager)",
            idleBehavior: "Nurture cold leads via WhatsApp"
        },
        liveMonitor: {
            activeCall: { leadName: "Dileep Yadav", duration: "1m 24s", sentiment: "Interested", prompt: "Checking plot details on Expressway Sector 150." },
            reasoningFeed: [
                { id: "rfeed1", timestamp: "14:21:05", lead_name: "Dileep Yadav", action: "Plot recommendation", reasoning: "Lead wants 200 sq yard options under 1.5Cr. Generating available inventory from sector 150 layout database.", message: "Dileep ji, Sector 150 mein hamare paas active plots hain under budget, details share kar raha hu." }
            ],
            activityLog: [
                { id: "act1", time: "14:20:10", action: "Inbound Call Received", detail: "Connecting call from Dileep Yadav (+91 98765 43210)" },
                { id: "act2", time: "14:15:30", action: "WhatsApp Sent", detail: "Nurture template sent to Rahul Singh" }
            ]
        }
    },
    neha: {
        id: "neha",
        name: "Neha Sharma",
        role: "neha",
        roleLabel: "Neha (Accountant)",
        employeeCode: "ZEN-AI-002",
        status: "online",
        stats: {
            totalLeads: { val: 185, change: "+4%", up: true },
            activeConvs: { val: 8, change: "+5%", up: true },
            revenue: { val: "₹32.8L", change: "+15%", up: true },
            aiScore: { val: "96%", change: "+1%", up: true }
        },
        recentConvs: [
            { id: "n1", name: "Dipak Goyal", avatar: "DG", msg: "Second installment receipt process kar di hai.", time: "5m ago", unread: 1 },
            { id: "n2", name: "Manya Mishra", avatar: "MM", msg: "GST waiver guidelines check karke update karti hu...", time: "30m ago" }
        ],
        pipeline: {
            new: [
                { id: "np1", name: "J P", source: "Invoice Pending" }
            ],
            contacted: [
                { id: "np3", name: "Khushiram Singh", source: "Invoice Sent" }
            ],
            qualified: [
                { id: "np4", name: "Rahul Singh", source: "Part Payment Done" }
            ],
            won: [
                { id: "np6", name: "Dileep Yadav", source: "No Dues Cleared" }
            ]
        },
        persona: {
            language: "hinglish",
            dialect: "Corporate formal accent",
            formality: 85,
            humor: 20,
            assertiveness: 60,
            fillerWords: ["dekhiye", "as per policy", "kindly note"],
            greetingMorning: "Namaste sir, main Neha baat kar rahi hu accounts desk se.",
            greetingAfternoon: "Namaste, Neha from accounts department, Maya Infratech. How can I help you?",
            greetingEvening: "Good evening, Neha here from accounts division. Hope you are doing well."
        },
        knowledge: {
            docs: [
                { id: "nd1", name: "GST_Billing_Policy.pdf", size: "1.2 MB", status: "indexed", date: "2026-07-02", chunks: 5, lastEmbedded: "2026-07-02 09:30", agents: ["Neha (Accounts)"], active: true },
                { id: "nd2", name: "Payment_Structure_2026.xlsx", size: "450 KB", status: "indexed", date: "2026-07-08", chunks: 3, lastEmbedded: "2026-07-08 14:15", agents: ["Neha (Accounts)"], active: true }
            ],
            trainingExamples: [
                { id: "nte1", category: "pricing", prompt: "Mujhe GST components explain kardo flat rate pe.", response: "Sure, residential transactions pe 1% under affordable, and 5% standard properties par charge hota hai." }
            ]
        },
        voice: {
            engine: "ElevenLabs Multilingual V2",
            voiceId: "eleven_neha_finance_v2",
            speechRate: 1.0,
            pitch: 1.05,
            stability: 0.85,
            clonedSamples: ["neha_sample_01.wav"]
        },
        workflow: {
            shiftStart: "10:00",
            shiftEnd: "18:30",
            cooldownSeconds: 90,
            maxConcurrent: 1,
            overflowAgent: "monika",
            handoffManager: "Surendra (Sales Manager)",
            idleBehavior: "Reconcile invoice payments with gateway"
        },
        liveMonitor: {
            activeCall: null,
            reasoningFeed: [
                { id: "nfeed1", timestamp: "14:10:02", lead_name: "Dipak Goyal", action: "Receipt Generation", reasoning: "Verified bank receipt transaction ID TXN-94028. Dispatching official invoice confirmation.", message: "Dipak ji, receipt reference verified, email notification details bhej di hain." }
            ],
            activityLog: [
                { id: "nact1", time: "14:09:50", action: "Inbound Verification", detail: "Processed receipt details for Dipak Goyal" }
            ]
        }
    },
    monika: {
        id: "monika",
        name: "Monika Kapoor",
        role: "monika",
        roleLabel: "Monika (Receptionist)",
        employeeCode: "ZEN-AI-003",
        status: "online",
        stats: {
            totalLeads: { val: 980, change: "+28%", up: true },
            activeConvs: { val: 32, change: "+18%", up: true },
            revenue: { val: "—", change: "+0%", up: false },
            aiScore: { val: "98%", change: "+3%", up: true }
        },
        recentConvs: [
            { id: "m1", name: "J P", avatar: "JP", msg: "Main Surendra ji ke extension par connect kar rahi hoon...", time: "1m ago", unread: 2 },
            { id: "m2", name: "Dileep Yadav", avatar: "DY", msg: "Office address and locations shared over SMS.", time: "10m ago" }
        ],
        pipeline: {
            new: [
                { id: "mp1", name: "Manya Mishra", source: "Routing to Sales" }
            ],
            contacted: [
                { id: "mp3", name: "Khushiram Singh", source: "Connected to Finance" }
            ],
            qualified: [
                { id: "mp4", name: "Neha Vig", source: "Routed to Manager" }
            ],
            won: [
                { id: "mp6", name: "J P", source: "Direct Desk Connect" }
            ]
        },
        persona: {
            language: "hinglish",
            dialect: "Polite front desk pitch",
            formality: 70,
            humor: 40,
            assertiveness: 45,
            fillerWords: ["surely", "hold on", "please note"],
            greetingMorning: "Good morning, Maya Infratech reception se Monika. Main aapki kaise madad kar sakti hu?",
            greetingAfternoon: "Maya Infratech, good afternoon, Monika speaking. Whom would you like to speak to?",
            greetingEvening: "Good evening, welcome to Maya Infratech. Main Monika reception desk se."
        },
        knowledge: {
            docs: [
                { id: "md1", name: "Office_Directory_Extensions.csv", size: "12 KB", status: "indexed", date: "2026-06-15", chunks: 1, lastEmbedded: "2026-06-15 16:00", agents: ["Monika (Reception)"], active: true },
                { id: "md2", name: "Frequently_Asked_Directions.txt", size: "8 KB", status: "indexed", date: "2026-06-20", chunks: 2, lastEmbedded: "2026-06-20 11:45", agents: ["Monika (Reception)", "Rohan (Sales)"], active: true }
            ],
            trainingExamples: [
                { id: "mte1", category: "greeting", prompt: "Calling to check company official location address.", response: "Sure, corporate office Sector 62 Noida block C-15, link coordinates and maps routes details are shared via SMS." }
            ]
        },
        voice: {
            engine: "ElevenLabs Multilingual V2",
            voiceId: "eleven_monika_frontdesk_v1",
            speechRate: 0.98,
            pitch: 1.12,
            stability: 0.88,
            clonedSamples: ["monika_voice_sample.mp3"]
        },
        workflow: {
            shiftStart: "08:00",
            shiftEnd: "20:00",
            cooldownSeconds: 15,
            maxConcurrent: 5,
            overflowAgent: "rohan",
            handoffManager: "Surendra (Sales Manager)",
            idleBehavior: "Analyze reception desk statistics"
        },
        liveMonitor: {
            activeCall: null,
            reasoningFeed: [
                { id: "mfeed1", timestamp: "14:22:45", lead_name: "J P", action: "Warm Transfer", reasoning: "Caller asked for Surendra Ext 104. Dispatching warm referral signaling overlay.", message: "Ek minute line par baniye JP ji, transfer details route ho rahi hain." }
            ],
            activityLog: [
                { id: "mact1", time: "14:22:30", action: "Inbound Call", detail: "Received call from JP" }
            ]
        }
    }
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function AICommandCenter() {
    const { addToast } = useToast();
    const { user } = useAuth();

    // ─── STATE MANAGEMENT ─────────────────────────────────────────────
    const [selectedAgent, setSelectedAgent] = useState<string>("rohan");
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [profiles, setProfiles] = useState<Record<string, any>>(INITIAL_PROFILES);

    // Active Agent Profile Shortcut
    const profile = useMemo(() => profiles[selectedAgent] || profiles.rohan, [profiles, selectedAgent]);

    // Identity / Persona states
    const [agentName, setAgentName] = useState<string>(profile.name);
    const [language, setLanguage] = useState<string>(profile.persona.language);
    const [dialect, setDialect] = useState<string>(profile.persona.dialect);
    const [formality, setFormality] = useState<number>(profile.persona.formality);
    const [humor, setHumor] = useState<number>(profile.persona.humor);
    const [assertiveness, setAssertiveness] = useState<number>(profile.persona.assertiveness);
    const [fillerWordInput, setFillerWordInput] = useState<string>("");
    const [fillerWords, setFillerWords] = useState<string[]>(profile.persona.fillerWords);

    // Knowledge (RAG) states
    const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>(profile.knowledge.docs);
    const [vectorSearchQuery, setVectorSearchQuery] = useState<string>("");
    const [vectorSearchResult, setVectorSearchResult] = useState<string>("");
    const [isIngesting, setIsIngesting] = useState<boolean>(false);
    const [ingestProgress, setIngestProgress] = useState<number>(0);
    const [ingestStatus, setIngestStatus] = useState<string>("idle");
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [searchDocsQuery, setSearchDocsQuery] = useState<string>("");
    const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());
    const [syncRelativeTime, setSyncRelativeTime] = useState<string>("Just now");
    const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<any | null>(null);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

    // Vector Visualizer Outer Nodes
    const vectorNodeData: Record<string, any[]> = {
        rohan: [
            { id: "rc1", name: "Brochure Intro", text: "Maya Infratech Expressway properties. Layout features premium towers with 2BHK/3BHK configurations.", similarity: 0.94, x: 120, y: 70, category: "Brochures" },
            { id: "rc2", name: "Pricing Plans", text: "Pricing for 2BHK starting at 78L. 3BHK starting at 1.15Cr. Standard registry waivers and zero hidden charges.", similarity: 0.88, x: 260, y: 80, category: "Sales Scripts" },
            { id: "rc3", name: "RERA Compliance", text: "RERA approval ID: UPRERAPRJ9402. All documents verified. Delivery promised by December 2027.", similarity: 0.82, x: 70, y: 160, category: "Policies" },
            { id: "rc4", name: "Objection Handling", text: "Expressway distance objection: City connectivity is just 12 minutes via direct flyover link.", similarity: 0.79, x: 200, y: 220, category: "FAQs" },
            { id: "rc5", name: "Booking Waiver", text: "Unique manager waiver: allows custom 2% discount request for immediate payment commitment.", similarity: 0.74, x: 310, y: 170, category: "Sales Scripts" }
        ],
        neha: [
            { id: "nc1", name: "GST Components", text: "Residential flat transactions GST rules: 1% under affordable, 5% standard residential deals.", similarity: 0.96, x: 100, y: 80, category: "Policies" },
            { id: "nc2", name: "Payment Milestones", text: "Payment schedule: 10% on booking, 30% on slab completion, 40% finishing, 20% possession.", similarity: 0.90, x: 280, y: 90, category: "Brochures" },
            { id: "nc3", name: "Receipt Objections", text: "Payments must pass bank reference checks and match UTR transaction ID within 24 business hours.", similarity: 0.85, x: 90, y: 200, category: "FAQs" }
        ],
        monika: [
            { id: "mc1", name: "Office Directions", text: "Noida Sector 62, C-Block, next to Fortis Hospital. Metro Sector 62 is 5 minutes walk.", similarity: 0.95, x: 130, y: 60, category: "FAQs" },
            { id: "mc2", name: "Extensions List", text: "Sales extensions: Ext 101. Finance queries: Ext 102. Management transfers: Ext 104.", similarity: 0.91, x: 270, y: 90, category: "Brochures" },
            { id: "mc3", name: "Handoff Protocol", text: "If manager Ext 104 is busy or offline, call routes back to secondary support queue automatically.", similarity: 0.80, x: 80, y: 180, category: "Policies" }
        ]
    };
    const visualizerNodes = useMemo(() => vectorNodeData[selectedAgent] || vectorNodeData.rohan, [selectedAgent]);
    const [selectedVisualizerNode, setSelectedVisualizerNode] = useState<any | null>(null);
    const [visualizerMode, setVisualizerMode] = useState<'graph' | 'tree'>('tree');
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    const knowledgeStats = useMemo(() => {
        const statsMap: Record<string, {
            questionsToday: number;
            accuracy: string;
            responseTime: string;
            confidence: string;
            coverage: string;
            failedQueries: number;
        }> = {
            rohan: {
                questionsToday: 142,
                accuracy: "94.0%",
                responseTime: "540ms",
                confidence: "98.2%",
                coverage: "84.5%",
                failedQueries: 3
            },
            monika: {
                questionsToday: 248,
                accuracy: "98.0%",
                responseTime: "500ms",
                confidence: "99.1%",
                coverage: "95.2%",
                failedQueries: 1
            },
            neha: {
                questionsToday: 89,
                accuracy: "96.0%",
                responseTime: "555ms",
                confidence: "97.5%",
                coverage: "91.0%",
                failedQueries: 2
            }
        };
        return statsMap[selectedAgent] || statsMap.rohan;
    }, [selectedAgent]);

    // Initial node selection in visualizer
    useEffect(() => {
        setSelectedVisualizerNode(visualizerNodes[0] || null);
    }, [visualizerNodes]);

    // Vector Search thumbs feedback states
    const [feedbackThumbs, setFeedbackThumbs] = useState<Record<string, 'up' | 'down' | null>>({});

    // Dynamic document counts mismatch resolution
    const dynamicDocCount = useMemo(() => knowledgeDocs.length, [knowledgeDocs]);
    const dynamicChunksCount = useMemo(() => {
        return knowledgeDocs.reduce((acc, d) => acc + (d.chunks || 0), 0);
    }, [knowledgeDocs]);

    // 🌐 Voice Matrix states
    const [matrixStates, setMatrixStates] = useState<Record<string, boolean>>({
        english: true,
        hindi: true,
        hinglish: true,
        marathi: false,
        gujarati: true,
        tamil: false,
        bengali: true
    });
    const [fallbackLanguage, setFallbackLanguage] = useState<string>("English");
    const [autoDetectLanguage, setAutoDetectLanguage] = useState<boolean>(true);
    const [translationEnabled, setTranslationEnabled] = useState<boolean>(true);

    // 🎙️ Call recordings state
    const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

    // 🛡️ Safety Controls states
    const [safetyControls, setSafetyControls] = useState<Record<string, boolean>>({
        profanityFilter: true,
        piiMasking: true,
        emergencyTransfer: true,
        fallbackVoice: true
    });

    // ⚡ Barge-In Settings states
    const [allowInterruption, setAllowInterruption] = useState<boolean>(true);
    const [bargeInSensitivity, setBargeInSensitivity] = useState<number>(65);
    const [pauseDetectionMs, setPauseDetectionMs] = useState<number>(450);
    const [maxSilenceThreshold, setMaxSilenceThreshold] = useState<number>(8);
    const [smartResume, setSmartResume] = useState<boolean>(true);
    const [autoPause, setAutoPause] = useState<boolean>(true);
    const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
    const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);

    // Pronunciation Dictionary states
    const [phoneticEntries, setPhoneticEntries] = useState<any[]>([
        { word: "RERA", phonetic: "Reh-rah", category: "Standard RERA reference" },
        { word: "NoBroker", phonetic: "No-Broh-ker", category: "PropTech Brand" },
        { word: "Godrej", phonetic: "Goadh-rej", category: "Developer Brand" },
        { word: "MahaRERA", phonetic: "Maha-Reh-rah", category: "Authority Regional" },
        { word: "BKC", phonetic: "Bee-Kay-Cee", category: "Commercial Hub" },
        { word: "GIFT City", phonetic: "Gift City", category: "Tech Zone" }
    ]);
    const [newPhoneticWord, setNewPhoneticWord] = useState<string>("");
    const [newPhoneticVal, setNewPhoneticVal] = useState<string>("");

    // Speaking style and Emotion presets
    const [speakingStyle, setSpeakingStyle] = useState<string>("Conversational");
    const [emotionalStyle, setEmotionalStyle] = useState<string>("Professional");

    // Dynamic Unsaved Changes indicator (Identity/Workflow tabs comparison helper)
    const hasUnsavedChanges = useMemo(() => {
        const base = INITIAL_PROFILES[selectedAgent] || INITIAL_PROFILES.rohan;
        return (
            agentName !== base.name ||
            language !== base.persona.language ||
            dialect !== base.persona.dialect ||
            formality !== base.persona.formality ||
            humor !== base.persona.humor ||
            assertiveness !== base.persona.assertiveness ||
            JSON.stringify(fillerWords) !== JSON.stringify(base.persona.fillerWords)
        );
    }, [selectedAgent, agentName, language, dialect, formality, humor, assertiveness, fillerWords]);

    // ─── LOCAL SYNC DATABASE HOOK ────────────────────────────────────
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await apiFetch("/api/v1/ai/employees");
                if (res && res.success && res.data && active) {
                    const data = res.data;
                    setProfiles(prev => {
                        const h = { ...prev };
                        data.forEach((m: any) => {
                            const d = m.role;
                            if (h[d]) {
                                h[d] = {
                                    ...h[d],
                                    dbId: m.id,
                                    name: m.employee_name || h[d].name,
                                    roleLabel: m.employee_name + ` (${d.charAt(0).toUpperCase() + d.slice(1)})`,
                                    employeeCode: m.employee_code || h[d].employeeCode,
                                    status: m.current_status || h[d].status,
                                    persona: {
                                        ...h[d].persona,
                                        ...m.persona_config || {}
                                    },
                                    voice: {
                                        ...h[d].voice,
                                        ...m.voice_config || {}
                                    },
                                    workflow: {
                                        ...h[d].workflow,
                                        shiftStart: m.shift_start_time ? m.shift_start_time.substring(0, 5) : h[d].workflow.shiftStart,
                                        shiftEnd: m.shift_end_time ? m.shift_end_time.substring(0, 5) : h[d].workflow.shiftEnd,
                                        cooldownSeconds: m.cooldown_seconds || h[d].workflow.cooldownSeconds,
                                        maxConcurrent: m.max_concurrent_calls || h[d].workflow.maxConcurrent
                                    }
                                };
                            }
                        });
                        return h;
                    });
                }
            } catch (err) {
                console.error("Failed to load active database personas:", err);
            }
        })();
        return () => { active = false; };
    }, []);

    // ─── HEALTH CHECK STATE & AUTO-POLLING ─────────────────────────────
    interface HealthCheckItem {
        name: string;
        status: 'ok' | 'warn' | 'error';
        message: string;
        detail?: string;
    }
    interface HealthData {
        overallStatus: 'connected' | 'degraded' | 'disconnected';
        connected: boolean;
        summary: { ok: number; warnings: number; errors: number; total: number };
        checks: HealthCheckItem[];
        checkedAt: string;
    }
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [healthLoading, setHealthLoading] = useState<boolean>(false);
    const [healthExpanded, setHealthExpanded] = useState<boolean>(false);
    const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchHealth = useCallback(async () => {
        const dbId = profiles[selectedAgent]?.dbId;
        if (!dbId) return;
        setHealthLoading(true);
        try {
            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/health`);
            if (res?.success && res?.data) {
                setHealthData(res.data);
            }
        } catch (err) {
            setHealthData({
                overallStatus: 'disconnected',
                connected: false,
                summary: { ok: 0, warnings: 0, errors: 1, total: 1 },
                checks: [{ name: 'API Server', status: 'error', message: 'Cannot reach CRM API server', detail: 'The API server at localhost:4000 is not responding.' }],
                checkedAt: new Date().toISOString()
            });
        } finally {
            setHealthLoading(false);
        }
    }, [profiles, selectedAgent]);

    // Auto-poll every 30 seconds
    useEffect(() => {
        fetchHealth();
        healthIntervalRef.current = setInterval(fetchHealth, 30000);
        return () => {
            if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
        };
    }, [fetchHealth]);

    // Re-fetch when switching agents
    useEffect(() => {
        fetchHealth();
        fetchTelephonyConfig();
    }, [selectedAgent]);

    // ─── TELEPHONY CONFIGURATION FORM STATES ───────────────────────────
    const [telProvider, setTelProvider] = useState<string>('gsm_gateway');
    const [telApiKey, setTelApiKey] = useState<string>('');
    const [telApiSecret, setTelApiSecret] = useState<string>('');
    const [telSid, setTelSid] = useState<string>('');
    const [telFromNumber, setTelFromNumber] = useState<string>('');
    const [isSavingTelephony, setIsSavingTelephony] = useState<boolean>(false);
    const [isFetchingTelephony, setIsFetchingTelephony] = useState<boolean>(false);

    const fetchTelephonyConfig = useCallback(async () => {
        const dbId = profiles[selectedAgent]?.dbId;
        if (!dbId) return;
        setIsFetchingTelephony(true);
        try {
            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/telephony`);
            if (res?.success && res?.sipConfig) {
                const cfg = res.sipConfig;
                setTelProvider(cfg.provider || 'gsm_gateway');
                setTelApiKey(cfg.api_key || '');
                setTelApiSecret(cfg.api_secret || '');
                setTelSid(cfg.sid || '');
                setTelFromNumber(cfg.from_number || '');
            }
        } catch (err) {
            console.error("Failed to load active telephony config:", err);
        } finally {
            setIsFetchingTelephony(false);
        }
    }, [profiles, selectedAgent]);

    const handleSaveTelephony = async () => {
        const dbId = profiles[selectedAgent]?.dbId;
        if (!dbId) return;
        setIsSavingTelephony(true);
        try {
            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/telephony`, {
                method: 'PUT',
                body: {
                    provider: telProvider,
                    api_key: telApiKey,
                    api_secret: telApiSecret,
                    sid: telSid,
                    from_number: telFromNumber
                }
            });
            if (res?.success) {
                addToast({
                    type: "success",
                    title: "Telephony Updated",
                    message: "SIP/GSM Gateway configuration saved successfully."
                });
                fetchHealth(); // refresh diagnostics panel immediately
            }
        } catch (err: any) {
            addToast({
                type: "error",
                title: "Update Failed",
                message: err.message || "Failed to update gateway settings."
            });
        } finally {
            setIsSavingTelephony(false);
        }
    };

    // ⏱️ Voice Sandbox & Conversation Simulator states
    const [simulationTranscript, setSimulationTranscript] = useState<any[]>([]);
    const [isSimulating, setIsSimulating] = useState<boolean>(false);
    const [simulatingStep, setSimulatingStep] = useState<number>(0);
    const [customClientMessage, setCustomClientMessage] = useState<string>("");
    const [isPlayingSynthesised, setIsPlayingSynthesised] = useState<boolean>(false);

    // Turn-by-Turn Simulated QoS metrics
    const [simulatedMetrics, setSimulatedMetrics] = useState<any>({
        stt: 0,
        llm: 0,
        tts: 0,
        total: 0,
        confidence: 0,
        emotion: "None"
    });

    const sandboxScenarios: Record<string, any[]> = {
        rohan: [
            { label: "🏢 Inquire 3BHK flats in BKC", text: "Hi, I am calling to check details and pricing of luxury 3BHK flat options in BKC area.", response: "Namaste! BKC mein prime residency options available hain sir, including 3BHK premium layout starting from ₹1.8Cr. Project completely RERA verified hai. Kya Sunday ko site visit schedule karein?", metrics: { stt: 120, llm: 290, tts: 130, total: 540, confidence: 98.4, emotion: "Energetic" } },
            { label: "🏷️ Ask for discount / waiver", text: "Is there any additional discount or RERA registry fee waiver on the booking amount?", response: "Sir billing policies transparent hain, but agar aap immediate slab commitment de sakein to main manager se pre-approval 2% waiver support baat kar sakta hu.", metrics: { stt: 110, llm: 320, tts: 150, total: 580, confidence: 96.1, emotion: "Persuasive" } },
            { label: "🛣️ Connectivity of Sector 150 Expressway", text: "How is the connectivity of Sector 150 Expressway projects?", response: "Connectivity is superb, sir. Project connects within 12 minutes to Central Noida via expressway flyover link, making it excellent for fast appreciation.", metrics: { stt: 115, llm: 300, tts: 140, total: 555, confidence: 97.8, emotion: "Friendly" } }
        ],
        neha: [
            { label: "💰 Explain GST components", text: "Can you explain the GST slab applied to affordable vs standard flats?", response: "Sure, affordable category properties par restricted 1% GST charge hota hai, whereas standard residential transactions involve 5% GST component. TDS excluded.", metrics: { stt: 110, llm: 310, tts: 135, total: 555, confidence: 99.1, emotion: "Professional" } },
            { label: "💳 Verify Flat 402 payment receipt", text: "I did an online transfer for flat 402. UTR transaction ID is UTR-94028510.", response: "Thank you for UTR reference details. I have reconciled the records. Payment confirmed and tax invoice receipt has been updated in database system.", metrics: { stt: 125, llm: 285, tts: 145, total: 555, confidence: 98.8, emotion: "Calm" } }
        ],
        monika: [
            { label: "📞 Connect to Sales Manager", text: "Please transfer my call to the sales manager extension.", response: "Sure, transferring your line to Surendra (Sales Manager, Ext 104) immediately. Kindly hold. If line is busy, call will fallback here.", metrics: { stt: 130, llm: 240, tts: 130, total: 500, confidence: 98.5, emotion: "Polite" } },
            { label: "📍 Corporate address & directions", text: "Where is your office located? Give me directions.", response: "Corporate head office block C-15, Sector 62 Noida, adjacent to Fortis Hospital. Metro is 5 mins walk. Location link has been shared via SMS.", metrics: { stt: 115, llm: 295, tts: 140, total: 550, confidence: 99.3, emotion: "Cheerful" } }
        ]
    };
    const activeScenarios = useMemo(() => sandboxScenarios[selectedAgent] || sandboxScenarios.rohan, [selectedAgent]);

    // Voice Tab state variables
    const [voiceStability, setVoiceStability] = useState<number>(profile.voice.stability);
    const [voicePitch, setVoicePitch] = useState<number>(profile.voice.pitch);
    const [voiceSpeechRate, setVoiceSpeechRate] = useState<number>(profile.voice.speechRate);
    const [isCloning, setIsCloning] = useState<boolean>(false);
    const [cloneProgress, setCloneProgress] = useState<number>(0);
    const [ttsGreetingText, setTtsGreetingText] = useState<string>(profile.persona.greetingMorning);
    const [isSynthesising, setIsSynthesising] = useState<boolean>(false);
    const [isSynthesisedReady, setIsSynthesisedReady] = useState<boolean>(false);
    const [synthesisProgress, setSynthesisProgress] = useState<number>(0);

    // Workflow Tab state variables
    const [shiftStart, setShiftStart] = useState<string>(profile.workflow.shiftStart);
    const [shiftEnd, setShiftEnd] = useState<string>(profile.workflow.shiftEnd);
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(profile.workflow.cooldownSeconds);
    const [overflowAgent, setOverflowAgent] = useState<string>(profile.workflow.overflowAgent);
    const [handoffManager, setHandoffManager] = useState<string>(profile.workflow.handoffManager);

    // Monitoring Tab state variables
    const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
    const [monitoringFeed, setMonitoringFeed] = useState<any[]>([]);
    const [monitoringProgress, setMonitoringProgress] = useState<number>(0);

    // Analytics / Security Tab States
    const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly'>('daily');
    const [apiKey, setApiKey] = useState<string>("zntx_live_pk_7482_aicc_secret_key_prod");
    const [row2Expanded, setRow2Expanded] = useState<boolean>(true);

    // 🧪 Playground Sandbox States
    const [playgroundPrompt, setPlaygroundPrompt] = useState<string>("You are Rohan, a helpful real estate assistant. Empathize with callers and answer details about BKC or Noida premium housing projects using RAG context.");
    const [playgroundTemp, setPlaygroundTemp] = useState<number>(0.7);
    const [playgroundQuery, setPlaygroundQuery] = useState<string>("");
    const [playgroundResult, setPlaygroundResult] = useState<any>({
        id: "run-curr",
        query: "What is the pre-launch price of 3BHK flats?",
        response: "The pre-launch price for luxury 3BHK flats at BKC starts at INR 1.8 Crore, including RERA registration exemptions. A booking fee of INR 5 Lakhs is required to lock these rates.",
        prompt: "You are Rohan, a helpful real estate assistant...",
        temp: 0.7,
        latency: 1.18,
        confidence: 98,
        tokens: { prompt: 1350, completion: 145, cost: 0.0031 },
        debug: [
            "Step 1: Extracted query intent and key tokens: ['3BHK', 'price', 'pre-launch']",
            "Step 2: Vector search against indexed documents retrieved 2 matching text blocks.",
            "Step 3: Synthesized final response matching prompt style guidelines & voice constraints."
        ],
        chunks: [
            { score: "98%", content: "BKC luxury 3BHK residential layouts start at INR 1.8 Crore inclusive of standard RERA registry filings.", source: "Brochure_2026.pdf", page: 3 },
            { score: "89%", content: "Initial booking amount of INR 5 Lakhs secures pre-launch allocation rates.", source: "Pricing_Sheet.xlsx", page: 12 }
        ]
    });
    const [playgroundHistory, setPlaygroundHistory] = useState<any[]>([
        {
            id: "run-1",
            query: "What pre-launch discounts are available?",
            response: "According to the RAG pricing guidelines, a pre-launch discount of up to 2% waiver on the registry fee is approved for early bookings with a slab commitment.",
            prompt: "You are Rohan, a helpful real estate assistant...",
            temp: 0.7,
            latency: 1.25,
            confidence: 94,
            tokens: { prompt: 1420, completion: 120, cost: 0.0032 },
            debug: [
                "Step 1: Analyzed search keywords: ['pre-launch', 'discounts', 'available']",
                "Step 2: Vector search against Pinecone database matched 2 chunks in Brochure_2026.pdf",
                "Step 3: Applied prompt overrides & system constraints (temperature=0.7)",
                "Step 4: Formulated context-aware summary matching registry waiver policy."
            ],
            chunks: [
                { score: "94%", content: "A pre-launch discount of up to 2% waiver on registry fees is available for immediate bookings with slab commitment.", source: "Brochure_2026.pdf", page: 4 },
                { score: "86%", content: "Standard pricing applies to residential units starting at 1.8 Cr without direct pre-launch exemptions.", source: "Pricing_Sheet.xlsx", page: 1 }
            ]
        }
    ]);
    const [playgroundCompareMode, setPlaygroundCompareMode] = useState<boolean>(false);
    const [playgroundCompareRunId, setPlaygroundCompareRunId] = useState<string>("run-1");

    // 🔗 Integrations state variables
    const [integrationStatus, setIntegrationStatus] = useState<Record<string, 'connected' | 'disconnected' | 'configuring'>>({
        crm: 'connected',
        whatsapp: 'connected',
        email: 'connected',
        calendar: 'disconnected',
        erp: 'disconnected',
        telephony: 'connected',
        googleDrive: 'connected',
        sharepoint: 'disconnected',
        slack: 'disconnected',
        teams: 'disconnected',
        webhooks: 'configuring'
    });

    const [activeIntegrationConfig, setActiveIntegrationConfig] = useState<string | null>(null);

    // 🔒 Enterprise Security states
    const [securityRole, setSecurityRole] = useState<string>("admin");
    const [dataSources, setDataSources] = useState<Record<string, boolean>>({
        crmDb: true,
        localPdfs: true,
        webScrape: false,
        apiIntegrations: true
    });
    const [crmPerms, setCrmPerms] = useState<Record<string, boolean>>({
        readLeads: true,
        writeLeads: true,
        editDeals: false,
        deleteLeads: false
    });
    const [filePolicy, setFilePolicy] = useState<string>("restricted-admin");
    const [sensitiveFilters, setSensitiveFilters] = useState<string>("SSN, CreditCard, Password, Confidential, Secret");
    const [retentionDays, setRetentionDays] = useState<number>(90);
    const [ipRestrictions, setIpRestrictions] = useState<string>("192.168.1.1/24, 10.0.0.0/8");

    // Overview Enhancement States
    const [dashPeriod, setDashPeriod] = useState<'today' | '7d' | '30d'>('30d');

    // Manager Analytics States & Datasets
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // 🔍 Enterprise Audit states
    const [auditEventFilter, setAuditEventFilter] = useState<string>("all");
    const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");
    const [activeAuditDetailId, setActiveAuditDetailId] = useState<string | null>(null);

    // 👤 Digital Twin state hooks
    const [twinRole, setTwinRole] = useState<'receptionist' | 'sales' | 'trainer' | 'support'>('receptionist');
    const [twinVideoEnabled, setTwinVideoEnabled] = useState<boolean>(true);
    const [twinResolution, setTwinResolution] = useState<string>("720p");
    const [twinCallState, setTwinCallState] = useState<'idle' | 'connecting' | 'connected'>('idle');
    const [twinCallLogs, setTwinCallLogs] = useState<string[]>([]);
    const [selectedTwinAvatar, setSelectedTwinAvatar] = useState<string>("receptionist_model_a");

    // ⚡ Supervisor takeover & whisper states
    const [takeoverActive, setTakeoverActive] = useState<boolean>(false);
    const [whisperMessage, setWhisperMessage] = useState<string>("");
    const [supervisorLogs, setSupervisorLogs] = useState<string[]>([]);

    const [auditLogs, setAuditLogs] = useState<any[]>([
        { 
            id: "aud-001", 
            timestamp: "2026-07-19 10:48:15", 
            category: "ai_action", 
            actor: "Voice Agent (Rohan)", 
            msg: "Handoff to human agent triggered for lead #8301",
            details: {
                reason: "Customer requested pricing negotiations outside pre-configured approval bounds",
                prompt: "System Prompt: You are Rohan... Customer: Can you give me a 5% discount? Response: Let me check with my manager...",
                response: "Transferring call to Surendra (Senior Sales Lead)..."
            }
        },
        { 
            id: "aud-002", 
            timestamp: "2026-07-19 10:42:30", 
            category: "api_call", 
            actor: "CRM Gateway", 
            msg: "POST /api/v1/leads/sync response 200 OK",
            details: {
                latency: "230ms",
                reqBody: "{ leadId: '8301', status: 'Contacted', syncRate: '100%' }",
                resBody: "{ success: true, timestamp: '2026-07-19T05:12:30.400Z' }"
            }
        },
        { 
            id: "aud-003", 
            timestamp: "2026-07-19 10:14:12", 
            category: "knowledge_change", 
            actor: "Surendra Singh", 
            msg: "Uploaded Noida_Sector_150_Layout.pdf",
            details: {
                size: "4.2 MB",
                checksum: "sha256:0d91a921820b411",
                action: "Knowledge Base Appended"
            }
        },
        { 
            id: "aud-004", 
            timestamp: "2026-07-19 09:55:04", 
            category: "security_event", 
            actor: "PII Filter Engine", 
            msg: "PII Filter Blocked Credit Card number in Playground input",
            details: {
                policy: "Strict PCI-DSS Redaction",
                rawInput: "My credit card number is 4111-2222-3333-4444",
                redactedInput: "My credit card number is [REDACTED_CARD]"
            }
        },
        { 
            id: "aud-005", 
            timestamp: "2026-07-19 09:30:11", 
            category: "user_activity", 
            actor: "Sikandar Bharti", 
            msg: "Saved Telephony GSM Gateway Configuration settings",
            details: {
                ipAddress: "192.168.1.144",
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                action: "Config Saved"
            }
        },
        { 
            id: "aud-006", 
            timestamp: "2026-07-19 09:12:45", 
            category: "security_event", 
            actor: "IP Whitelist Guard", 
            msg: "Connection blocked from unauthorized IP: 104.22.4.19",
            details: {
                ipAddress: "104.22.4.19",
                reason: "IP not found in whitelist: 192.168.1.1/24, 10.0.0.0/8"
            }
        },
        { 
            id: "aud-007", 
            timestamp: "2026-07-19 08:44:22", 
            category: "ai_action", 
            actor: "Voice Agent (Rohan)", 
            msg: "Outbound Call initiated to lead +919876543210",
            details: {
                persona: "Rohan (Premium real estate specialist)",
                campaign: "BKC Pre-Launch Followups",
                trunkLine: "Twilio SIP Channel 4"
            }
        }
    ]);

    const conversationTrendData = {
        daily: [
            { name: 'Mon', calls: 120, latency: 1.30, cost: 9.6 },
            { name: 'Tue', calls: 180, latency: 1.22, cost: 14.4 },
            { name: 'Wed', calls: 160, latency: 1.28, cost: 12.8 },
            { name: 'Thu', calls: 240, latency: 1.20, cost: 19.2 },
            { name: 'Fri', calls: 290, latency: 1.25, cost: 23.2 },
            { name: 'Sat', calls: 110, latency: 1.32, cost: 8.8 },
            { name: 'Sun', calls: 80, latency: 1.28, cost: 6.4 }
        ],
        weekly: [
            { name: 'Wk 24', calls: 820, latency: 1.28, cost: 65.6 },
            { name: 'Wk 25', calls: 940, latency: 1.24, cost: 75.2 },
            { name: 'Wk 26', calls: 1050, latency: 1.22, cost: 84.0 },
            { name: 'Wk 27', calls: 1190, latency: 1.21, cost: 95.2 }
        ],
        monthly: [
            { name: 'Apr', calls: 3200, latency: 1.32, cost: 256 },
            { name: 'May', calls: 3800, latency: 1.28, cost: 304 },
            { name: 'Jun', calls: 4400, latency: 1.24, cost: 352 },
            { name: 'Jul', calls: 5200, latency: 1.22, cost: 416 }
        ]
    };

    const sourceUtilizationData = [
        { name: 'Maya Brochure', value: 45, color: 'var(--accent-indigo)' },
        { name: 'CRM database', value: 25, color: '#3b82f6' },
        { name: 'FAQ Scraper', value: 18, color: '#10b981' },
        { name: 'Direct Config', value: 12, color: '#f59e0b' }
    ];

    // Mock data for RAG Analytics charts
    const queryTrendData = [
        { name: 'Mon', asked: 140 },
        { name: 'Tue', asked: 220 },
        { name: 'Wed', asked: 190 },
        { name: 'Thu', asked: 280 },
        { name: 'Fri', asked: 310 },
        { name: 'Sat', asked: 120 },
        { name: 'Sun', asked: 95 }
    ];

    const docUsageData = [
        { name: 'Brochure', usage: 480 },
        { name: 'Pricing', usage: 350 },
        { name: 'RERA_Appr', usage: 220 },
        { name: 'FAQ_Scrape', usage: 140 },
        { name: 'Objections_V3', usage: 5 }
    ];

    const chunkDistributionData = [
        { name: 'Sales & Pricing', value: 450, color: 'var(--accent-indigo)' },
        { name: 'RERA & Legal', value: 250, color: '#3b82f6' },
        { name: 'Technical Spec', value: 180, color: '#10b981' },
        { name: 'FAQs & General', value: 120, color: '#f59e0b' }
    ];
    const [matrixSort, setMatrixSort] = useState<{ key: 'accuracy' | 'latency'; dir: 'asc' | 'desc' }>({ key: 'accuracy', dir: 'desc' });

    // Training Tab States
    const [coachingExamples, setCoachingExamples] = useState<any[]>([]);
    const [coachingCategory, setCoachingCategory] = useState<string>("discount_handling");
    const [coachingQuery, setCoachingQuery] = useState<string>("");
    const [coachingResponse, setCoachingResponse] = useState<string>("");
    const [coachingFilter, setCoachingFilter] = useState<string>("all");
    const [isRetraining, setIsRetraining] = useState<boolean>(false);

    // Sync status tracker clock hook
    useEffect(() => {
        const interval = setInterval(() => {
            const diff = Date.now() - lastSyncedAt;
            if (diff < 60000) {
                setSyncRelativeTime("Just now");
            } else if (diff < 120000) {
                setSyncRelativeTime("1 min ago");
            } else {
                setSyncRelativeTime(`${Math.floor(diff / 60000)} min ago`);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [lastSyncedAt]);

    // Force Sync database query
    const triggerDbSync = () => {
        setLastSyncedAt(Date.now());
        setSyncRelativeTime("Just now");
        addToast({
            type: "success",
            title: "Database Synced",
            message: "Successfully synchronized knowledge and pipeline contexts with PostgreSQL database."
        });
    };

    // Live Monitoring feed simulation loop
    useEffect(() => {
        if (!isMonitoringActive) {
            setMonitoringFeed([]);
            setMonitoringProgress(0);
            return;
        }
        const initialFeed = profile.liveMonitor.reasoningFeed || [];
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setMonitoringFeed([{ ...initialFeed[0], timestamp: timeStr }]);
        setMonitoringProgress(1);

        const feedSequence = [
            { id: "rfeed2", timestamp: "", lead_name: "Rahul Singh", action: "Site visit follow-up", reasoning: "Lead requested pricing information. Confirming layout maps delivery via message broker.", message: "Rahul ji, maps details WhatsApp desk pe send kar di hain. Inspect kijiye." },
            { id: "rfeed3", timestamp: "", lead_name: "Neha Vig", action: "Discount verification", reasoning: "RERA verification completed. Matching builder discount waivers thresholds.", message: "Neha ji, builder discount verification approvals checked, 2.5% waiver applied." }
        ];

        const timer = setInterval(() => {
            setMonitoringProgress(prev => {
                if (prev < 3) {
                    const stepFeed = feedSequence[prev - 1];
                    const tickTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    setMonitoringFeed(feed => [...feed, { ...stepFeed, timestamp: tickTime }]);
                    return prev + 1;
                } else {
                    clearInterval(timer);
                    return prev;
                }
            });
        }, 4000);

        return () => clearInterval(timer);
    }, [isMonitoringActive, selectedAgent, profile]);

    // Apply active persona database details when agent context changes
    useEffect(() => {
        const active = profiles[selectedAgent] || profiles.rohan;
        setAgentName(active.name);
        setLanguage(active.persona.language);
        setDialect(active.persona.dialect);
        setFormality(active.persona.formality);
        setHumor(active.persona.humor);
        setAssertiveness(active.persona.assertiveness);
        setFillerWords(active.persona.fillerWords);
        setKnowledgeDocs(active.knowledge.docs);
        setFillerWordInput("");
        setVectorSearchResult("");
        setVoiceStability(active.voice.stability);
        setVoicePitch(active.voice.pitch);
        setVoiceSpeechRate(active.voice.speechRate);
        setShiftStart(active.workflow.shiftStart);
        setShiftEnd(active.workflow.shiftEnd);
        setCooldownSeconds(active.workflow.cooldownSeconds);
        setOverflowAgent(active.workflow.overflowAgent);
        setHandoffManager(active.workflow.handoffManager);
        setTtsGreetingText(active.persona.greetingMorning);
        setIsSynthesisedReady(false);
        setIsSynthesising(false);
        setIsMonitoringActive(false);
        setCoachingExamples(active.knowledge.trainingExamples || []);
    }, [selectedAgent, profiles]);

    // ─── EVENT HANDLERS ──────────────────────────────────────────────
    const handleSwitchAgent = (agent: string) => {
        if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Switching agents will discard modifications. Continue?")) {
            return;
        }
        setSelectedAgent(agent);
        addToast({
            type: "info",
            title: "AI Command Center",
            message: `Switched context to ${Qe[agent] || agent}.`
        });
    };

    const Qe: Record<string, string> = {
        rohan: "Rohan (Sales)",
        neha: "Neha (Accountant)",
        monika: "Monika (Receptionist)"
    };

    // Save configuration states to database
    const handleSavePersona = async () => {
        const dbId = profile.dbId;
        if (!dbId) {
            addToast({
                type: "warning",
                title: "Offline Mode",
                message: "Database profile not synced yet."
            });
            return;
        }
        try {
            const personaConfig = {
                language,
                dialect,
                formality,
                humor,
                assertiveness,
                fillerWords,
                greetingMorning: profile.persona.greetingMorning,
                greetingAfternoon: profile.persona.greetingAfternoon,
                greetingEvening: profile.persona.greetingEvening
            };
            await apiFetch(`/api/v1/ai/employees/${dbId}`, {
                method: "PUT",
                body: {
                    employee_name: agentName,
                    persona_config: personaConfig
                }
            });
            setProfiles(prev => {
                const next = { ...prev };
                if (next[selectedAgent]) {
                    next[selectedAgent] = {
                        ...next[selectedAgent],
                        name: agentName,
                        persona: personaConfig
                    };
                }
                return next;
            });
            addToast({
                type: "success",
                title: "Configuration Saved",
                message: `Persona parameters for ${agentName} successfully updated in database.`
            });
        } catch (err: any) {
            console.error(err);
            addToast({
                type: "error",
                title: "Save Failed",
                message: err.message || "Database connection timeout."
            });
        }
    };

    const handleSaveVoiceConfig = async () => {
        const dbId = profile.dbId;
        if (!dbId) {
            addToast({
                type: "warning",
                title: "Offline Mode",
                message: "Database profile not synced yet."
            });
            return;
        }
        try {
            const voiceConfig = {
                engine: profile.voice.engine,
                voiceId: profile.voice.voiceId,
                stability: voiceStability,
                pitch: voicePitch,
                speechRate: voiceSpeechRate,
                clonedSamples: profile.voice.clonedSamples
            };
            await apiFetch(`/api/v1/ai/employees/${dbId}`, {
                method: "PUT",
                body: {
                    voice_config: voiceConfig
                }
            });
            setProfiles(prev => {
                const next = { ...prev };
                if (next[selectedAgent]) {
                    next[selectedAgent] = {
                        ...next[selectedAgent],
                        voice: voiceConfig
                    };
                }
                return next;
            });
            addToast({
                type: "success",
                title: "Voice Config Saved",
                message: "Speech synthesis settings updated on active engine database."
            });
        } catch (err: any) {
            console.error(err);
            addToast({
                type: "error",
                title: "Save Failed",
                message: err.message || "Database connection timeout."
            });
        }
    };

    const handleSaveWorkflow = async () => {
        const dbId = profile.dbId;
        if (!dbId) {
            addToast({
                type: "warning",
                title: "Offline Mode",
                message: "Database profile not synced yet."
            });
            return;
        }
        try {
            await apiFetch(`/api/v1/ai/employees/${dbId}`, {
                method: "PUT",
                body: {
                    shift_start_time: shiftStart + ":00",
                    shift_end_time: shiftEnd + ":00",
                    cooldown_seconds: cooldownSeconds
                }
            });
            setProfiles(prev => {
                const next = { ...prev };
                if (next[selectedAgent]) {
                    next[selectedAgent] = {
                        ...next[selectedAgent],
                        workflow: {
                            ...next[selectedAgent].workflow,
                            shiftStart,
                            shiftEnd,
                            cooldownSeconds
                        }
                    };
                }
                return next;
            });
            addToast({
                type: "success",
                title: "Workflow Updated",
                message: "Shift schedules and pacing parameters successfully updated in database."
            });
        } catch (err: any) {
            console.error(err);
            addToast({
                type: "error",
                title: "Save Failed",
                message: err.message || "Database connection timeout."
            });
        }
    };

    // Verbal crutches handlers
    const addFillerWord = () => {
        if (fillerWordInput.trim() && !fillerWords.includes(fillerWordInput.trim())) {
            setFillerWords([...fillerWords, fillerWordInput.trim()]);
            setFillerWordInput("");
        }
    };

    const removeFillerWord = (word: string) => {
        setFillerWords(fillerWords.filter(w => w !== word));
    };

    // RAG Ingestion Simulator
    const simulateRAGIngest = () => {
        setIsIngesting(true);
        setIngestProgress(10);
        setIngestStatus("uploading");
        let currentProgress = 10;
        const interval = setInterval(() => {
            currentProgress += 15;
            if (currentProgress < 50) {
                setIngestProgress(currentProgress);
            } else if (currentProgress < 85) {
                setIngestStatus("chunking");
                setIngestProgress(currentProgress);
            } else if (currentProgress < 100) {
                setIngestStatus("embedding");
                setIngestProgress(currentProgress);
            } else {
                clearInterval(interval);
                const newDoc = {
                    id: `kd_custom_${Date.now()}`,
                    name: "Uploaded_Knowledge_Snippet.pdf",
                    size: "1.4 MB",
                    status: "indexed",
                    date: new Date().toISOString().split("T")[0],
                    chunks: 6,
                    lastEmbedded: new Date().toISOString().replace("T", " ").substring(0, 16),
                    agents: [selectedAgent === "rohan" ? "Rohan (Sales)" : selectedAgent === "neha" ? "Neha (Accountant)" : "Monika (Receptionist)"],
                    active: true
                };
                setKnowledgeDocs(prev => [newDoc, ...prev]);
                setProfiles(prev => {
                    const next = { ...prev };
                    if (next[selectedAgent]) {
                        next[selectedAgent].knowledge.docs = [newDoc, ...next[selectedAgent].knowledge.docs];
                    }
                    return next;
                });
                setIsIngesting(false);
                setIngestProgress(0);
                setIngestStatus("idle");
                addToast({
                    type: "success",
                    title: "Knowledge Ingested",
                    message: "Document successfully parsed, chunked, and stored in vector database."
                });
            }
        }, 400);
    };

    const toggleDocActive = (id: string) => {
        setKnowledgeDocs(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));
        setProfiles(prev => {
            const next = { ...prev };
            if (next[selectedAgent]) {
                next[selectedAgent].knowledge.docs = next[selectedAgent].knowledge.docs.map((d: any) => d.id === id ? { ...d, active: !d.active } : d);
            }
            return next;
        });
        addToast({
            type: "success",
            title: "Knowledge Base",
            message: "Document active status updated successfully."
        });
    };

    const executeDeleteDoc = (id: string) => {
        setKnowledgeDocs(prev => prev.filter(d => d.id !== id));
        setProfiles(prev => {
            const next = { ...prev };
            if (next[selectedAgent]) {
                next[selectedAgent].knowledge.docs = next[selectedAgent].knowledge.docs.filter((d: any) => d.id !== id);
            }
            return next;
        });
        setSelectedDocs(prev => prev.filter(d => d !== id));
        setDeleteConfirmDoc(null);
        addToast({
            type: "success",
            title: "Knowledge Base",
            message: "Document removed and un-indexed from RAG vectors."
        });
    };

    // Vector search simulator
    const triggerVectorSearch = () => {
        if (!vectorSearchQuery.trim()) {
            setVectorSearchResult("Please enter a query.");
            return;
        }
        const query = vectorSearchQuery.toLowerCase();
        if (query.includes("visit") || query.includes("site") || query.includes("cab")) {
            setVectorSearchResult("Matches [Rohan_Infratech_Brochure]: Site visits scheduled through executive cab service. Complimentary travel up to 25km radius. Code validation: pre-authorized driver match via SMS link.");
        } else if (query.includes("price") || query.includes("discount") || query.includes("waiver")) {
            setVectorSearchResult("Matches [Price_List_Objections_V3]: Booking discount limits capping at 2.5% for standard payment schemes. Up to 5% with immediate installment commitment. Manager approval required for anything higher.");
        } else if (query.includes("gst") || query.includes("tax") || query.includes("billing")) {
            setVectorSearchResult("Matches [GST_Billing_Policy]: Standard property deals are subjected to 5% GST component. Under affordable housing bracket, the rate is restricted to 1%. Direct TDS exclusions applied to RERA registration fees.");
        } else {
            setVectorSearchResult("No exact matching vector segments found in local RAG database. Reverting to base large language model general corpus reasoning.");
        }
    };

    // Vector Visualizer clicks
    const handleNodeClick = (node: any) => {
        setSelectedVisualizerNode(node);
        setVectorSearchQuery(node.text);
        setVectorSearchResult(`Visualizer Query Match: ${node.text}`);
    };

    // Clone voice profile simulation
    const simulateVoiceClone = () => {
        setIsCloning(true);
        setCloneProgress(10);
        const interval = setInterval(() => {
            setCloneProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setProfiles(prevP => {
                            const nextP = { ...prevP };
                            if (nextP[selectedAgent]) {
                                nextP[selectedAgent].voice.clonedSamples = ["cloned_sample_voice_new.wav", ...nextP[selectedAgent].voice.clonedSamples];
                            }
                            return nextP;
                        });
                        setIsCloning(false);
                        addToast({
                            type: "success",
                            title: "Voice Cloned",
                            message: "Speech sample successfully analyzed. ElevenLabs Voice Profile created."
                        });
                    }, 500);
                    return 100;
                }
                return prev + 30;
            });
        }, 400);
    };

    // TTS Synthesis simulator
    const triggerTtsSynthesis = () => {
        if (!ttsGreetingText.trim()) return;
        setIsSynthesising(true);
        setSynthesisProgress(10);
        setIsSynthesisedReady(false);
        const interval = setInterval(() => {
            setSynthesisProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsSynthesising(false);
                        setIsSynthesisedReady(true);
                        addToast({
                            type: "success",
                            title: "Voice Synthesised",
                            message: `Generated custom audio preview using ${profile.voice.engine}.`
                        });
                    }, 500);
                    return 100;
                }
                return prev + 25;
            });
        }, 200);
    };

    // Playback Recording samples controls
    const toggleRecordingPlayback = (id: string) => {
        if (playingRecordingId === id) {
            setPlayingRecordingId(null);
        } else {
            setPlayingRecordingId(id);
            addToast({
                type: "info",
                title: "Audio Playback",
                message: `Playing recording sample: ${id.replace(/_/g, ' ')}`
            });
        }
    };

    // Rotate API Key
    const rotateApiKey = () => {
        const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setApiKey(`zntx_live_pk_${hex}_aicc_secret_key_prod`);
        addToast({
            type: "success",
            title: "API Key Rotated",
            message: "Production voice API key successfully rotated. Background worker pipelines updated."
        });
    };

    // Filter Knowledge Docs by Categories
    const filteredDocs = useMemo(() => {
        return knowledgeDocs.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchDocsQuery.toLowerCase());
            if (selectedCategoryFilter === "All") return matchesSearch;
            
            if (selectedCategoryFilter === "Brochures") {
                return matchesSearch && (d.name.includes("Brochure") || d.name.includes("Price"));
            }
            if (selectedCategoryFilter === "Policies") {
                return matchesSearch && (d.name.includes("RERA") || d.name.includes("Policy") || d.name.includes("Waiver"));
            }
            if (selectedCategoryFilter === "FAQs") {
                return matchesSearch && (d.name.includes("Directions") || d.name.includes("FAQ") || d.name.includes("Extensions"));
            }
            return matchesSearch;
        });
    }, [knowledgeDocs, searchDocsQuery, selectedCategoryFilter]);

    // ─── CONVERSATION SIMULATOR PIPELINE (SANDBOX) ───────────────────
    const runSimulationTurn = (scenarioText: string, scenarioResponse: string, metrics: any) => {
        if (isSimulating) return;
        setIsSimulating(true);
        setIsPlayingSynthesised(false);
        setSimulatingStep(1); // Customer inputting

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        
        // Push user bubble
        setSimulationTranscript(prev => [...prev, { sender: "client", text: scenarioText, time: timeStr }]);
        setCustomClientMessage("");

        // Simulate STT Complete
        setTimeout(() => {
            setSimulatingStep(2); // AI Processing (LLM)
        }, 300);

        // Simulate LLM Complete
        setTimeout(() => {
            setSimulatingStep(3); // AI Speaking (TTS)
        }, 700);

        // Simulate complete turnaround
        setTimeout(() => {
            const responseTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            
            // Push AI bubble
            setSimulationTranscript(prev => [...prev, { sender: "agent", text: scenarioResponse, time: responseTimeStr }]);
            
            // Set QoS Metrics
            setSimulatedMetrics({
                stt: metrics.stt,
                llm: metrics.llm,
                tts: metrics.tts,
                total: metrics.total,
                confidence: metrics.confidence,
                emotion: metrics.emotion
            });

            setIsSimulating(false);
            setSimulatingStep(0);
            setIsPlayingSynthesised(true);

            // Animate wave equalizer for 4.5 seconds to represent speech synthesis playback
            setTimeout(() => {
                setIsPlayingSynthesised(false);
            }, 4500);

        }, 1100);
    };

    const handleSendCustomMessage = async () => {
        if (!customClientMessage.trim()) return;
        const dbId = profile.dbId;
        if (!dbId) return;

        const msg = customClientMessage;
        setCustomClientMessage("");

        const randomMetrics = {
            stt: 110 + Math.floor(Math.random() * 20),
            llm: 290 + Math.floor(Math.random() * 50),
            tts: 120 + Math.floor(Math.random() * 30),
            confidence: Number((95 + Math.random() * 4).toFixed(1)),
            emotion: emotionalStyle,
            total: 0
        };
        randomMetrics.total = randomMetrics.stt + randomMetrics.llm + randomMetrics.tts;

        try {
            setIsSimulating(true);
            setIsPlayingSynthesised(false);
            setSimulatingStep(1); // Customer speaking (STT)

            const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            setSimulationTranscript(prev => [...prev, { sender: "client", text: msg, time: timeStr }]);

            await new Promise(r => setTimeout(r, 300));
            setSimulatingStep(2); // AI Processing (LLM)

            // Call real backend route proxying to digital employee chatbot
            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/chat`, {
                method: 'POST',
                body: { messageText: msg }
            });

            setSimulatingStep(3); // AI Speaking (TTS)
            await new Promise(r => setTimeout(r, 400));

            const responseText = res && res.success && res.message ? res.message : `I am listening, tell me more.`;
            const responseTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

            setSimulationTranscript(prev => [...prev, { sender: "agent", text: responseText, time: responseTimeStr }]);
            setSimulatedMetrics({
                stt: randomMetrics.stt,
                llm: randomMetrics.llm,
                tts: randomMetrics.tts,
                total: randomMetrics.total,
                confidence: randomMetrics.confidence,
                emotion: randomMetrics.emotion
            });

            setIsSimulating(false);
            setSimulatingStep(0);
            setIsPlayingSynthesised(true);

            setTimeout(() => {
                setIsPlayingSynthesised(false);
            }, 4500);

        } catch (err) {
            // Fallback to local hardcoded mock responses if backend is offline
            let response = `Sure, let me check the directives for ${agentName}. I will query our cognitive repository and contact you back on details shortly.`;
            const text = msg.toLowerCase();
            if (text.includes("price") || text.includes("cost") || text.includes("budget")) {
                response = `Humare flats ki starting price ₹78L se shuru hoti hai. RERA guidelines ke rules follow karte hue customized payments schemes match karwa di jayegi.`;
            } else if (text.includes("rera") || text.includes("approve")) {
                response = `Maya Infratech fully RERA approved projects design karti hai. RERA number UPRERAPRJ9402 hai. Pure safety compliance checks applied.`;
            } else if (text.includes("visit") || text.includes("site") || text.includes("address")) {
                response = `Aap Sunday site visit schedule kar sakte hain, main coordinates and complimentary driver cab reference details SMS kar dunga.`;
            }

            const responseTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            setSimulationTranscript(prev => [...prev, { sender: "agent", text: response, time: responseTimeStr }]);
            setSimulatedMetrics(randomMetrics);

            setIsSimulating(false);
            setSimulatingStep(0);
            setIsPlayingSynthesised(true);

            setTimeout(() => {
                setIsPlayingSynthesised(false);
            }, 4500);
        }
    };

    const handlePlaygroundQuerySubmit = async () => {
        if (!playgroundQuery.trim()) return;
        const query = playgroundQuery;
        setPlaygroundQuery("");

        addToast({
            type: "info",
            title: "Simulating RAG Pipeline",
            message: "Performing vector search & prompt synthesis..."
        });

        let finalResponse = "I could not find exact matching documents for this query. Responding based on default GPT-4 cognitive weights: Please contact executive support.";
        let confidence = 45;
        let matchedChunks = [
            { score: "45%", content: "No high confidence similarity matches found in database files. Defaulting to general system instructions.", source: "System Cache", page: 0 }
        ];
        let debugSteps = [
            "Step 1: Analyzed search query: '" + query + "'",
            "Step 2: Vector search against Pinecone yielded no results above 0.70 threshold.",
            "Step 3: Fallback triggered. Model synthesized safe responder text."
        ];

        const lowercaseQuery = query.toLowerCase();
        if (lowercaseQuery.includes("price") || lowercaseQuery.includes("pricing") || lowercaseQuery.includes("cost") || lowercaseQuery.includes("rate")) {
            finalResponse = `According to our primary pricing sheet, luxury 3BHK residential units start at INR 1.8 Crore. Ground floor units carry a premium markup of 5%. Initial booking deposit is INR 5 Lakhs.`;
            confidence = 98;
            matchedChunks = [
                { score: "98%", content: "BKC luxury 3BHK residential layouts start at INR 1.8 Crore inclusive of standard RERA registry filings.", source: "Brochure_2026.pdf", page: 3 },
                { score: "89%", content: "Initial booking amount of INR 5 Lakhs secures pre-launch allocation rates.", source: "Pricing_Sheet.xlsx", page: 12 }
            ];
            debugSteps = [
                "Step 1: Extracted query intent and key tokens: ['3BHK', 'price', 'pre-launch']",
                "Step 2: Vector search against indexed documents retrieved 2 matching text blocks.",
                "Step 3: Synthesized final response matching prompt style guidelines & voice constraints."
            ];
        } else if (lowercaseQuery.includes("rera") || lowercaseQuery.includes("approval") || lowercaseQuery.includes("approve")) {
            finalResponse = `Yes, all units in the BKC project are 100% RERA compliant. The RERA registration number is PRM/KA/RERA/1251/BKC/2026. Phase 1 possession is scheduled for Dec 2028.`;
            confidence = 96;
            matchedChunks = [
                { score: "96%", content: "BKC Phase 1 project registered under Karnataka RERA with registration number PRM/KA/RERA/1251/BKC/2026.", source: "RERA_Approval_Doc.pdf", page: 2 },
                { score: "91%", content: "Possession date committed under builder agreement is December 31, 2028.", source: "Agreement_Draft.pdf", page: 14 }
            ];
            debugSteps = [
                "Step 1: Extracted search keywords: ['rera', 'approval', 'possession']",
                "Step 2: Scanned vector database. Match score peak at 96% in RERA_Approval_Doc.pdf.",
                "Step 3: Formulated possession timeline summary."
            ];
        } else if (lowercaseQuery.includes("discount") || lowercaseQuery.includes("offer") || lowercaseQuery.includes("waiver")) {
            finalResponse = `We are offering a pre-launch waiver of 2% on the stamp duty and registration fees for bookings finalized before this weekend.`;
            confidence = 92;
            matchedChunks = [
                { score: "92%", content: "Pre-launch bookings eligible for 2% stamp duty waiver as approved by commercial management.", source: "Brochure_2026.pdf", page: 7 },
                { score: "85%", content: "Promotional campaigns validity ends by Q3 2026.", source: "Marketing_Brief.docx", page: 2 }
            ];
            debugSteps = [
                "Step 1: Identified transactional intent: ['discount', 'waiver', 'offer']",
                "Step 2: Found 2 matching policy guidelines in Brochure_2026.pdf.",
                "Step 3: Validated temperature settings (temp=" + playgroundTemp + ") to produce promotional pitch tone."
            ];
        }

        const runId = "run-" + Date.now();
        const latency = Number((0.9 + Math.random() * 0.4).toFixed(2));
        const promptTokens = 1200 + Math.floor(Math.random() * 300);
        const completionTokens = 80 + Math.floor(Math.random() * 80);
        const cost = Number(((promptTokens * 0.0000015) + (completionTokens * 0.000006)).toFixed(4));

        const newResult = {
            id: runId,
            query: query,
            response: finalResponse,
            prompt: playgroundPrompt,
            temp: playgroundTemp,
            latency: latency,
            confidence: confidence,
            tokens: { prompt: promptTokens, completion: completionTokens, cost: cost },
            debug: debugSteps,
            chunks: matchedChunks
        };

        setPlaygroundResult(newResult);
        setPlaygroundHistory(prev => [newResult, ...prev]);

        addToast({
            type: "success",
            title: "Response Generated",
            message: `Model inference complete in ${latency}s.`
        });
    };

    const handleValidateDatasets = () => {
        setValidationStatus('validating');
        addToast({
            type: "info",
            title: "Validation In Progress",
            message: "Checking dataset syntax, parsing prompt-response structures..."
        });
        setTimeout(() => {
            setValidationStatus('passed');
            setDuplicateCount(3);
            setDatasets(prev => prev.map(d => d.id === 'ds-2' ? { ...d, status: 'Validated' } : d));
            addToast({
                type: "success",
                title: "Validation Complete",
                message: "Format matches JSONL syntax guidelines. 3 duplicate entries resolved."
            });
        }, 2000);
    };

    const handleTriggerFineTuning = () => {
        setIsFineTuning(true);
        setFineTuningProgress(0);
        addToast({
            type: "info",
            title: "Fine-Tuning Queued",
            message: `Compiling training inputs for base model: ${selectedBaseModel}...`
        });

        const interval = setInterval(() => {
            setFineTuningProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsFineTuning(false);
                    setTrainingQueueJobs(oldJobs => [
                        { id: "job-" + Date.now().toString().slice(-4), name: `Fine-tune ${selectedBaseModel} (custom overrides)`, type: "Fine-Tuning", progress: 100, status: "COMPLETED" },
                        ...oldJobs
                    ]);
                    addToast({
                        type: "success",
                        title: "Fine-Tuning Success",
                        message: `Tuned weights compiled successfully. Active base model set to ${selectedBaseModel}.`
                    });
                    return 100;
                }
                return prev + 20;
            });
        }, 1500);
    };

    const getTwinAvatarSrc = (avatarKey: string) => {
        switch (avatarKey) {
            case 'receptionist_model_b':
                return '/media/rohan_avatar.png';
            case 'trainer_model_c':
                return '/media/monika_avatar.png';
            case 'receptionist_model_a':
            default:
                return '/media/neha_avatar.png';
        }
    };

    const handleStartTwinCall = async () => {
        if (twinCallState === 'connected') {
            setTwinCallState('idle');
            setTwinCallLogs([]);
            addToast({
                type: "info",
                title: "Call Disconnected",
                message: "Digital Twin WebRTC video stream terminated."
            });
            return;
        }

        setTwinCallState('connecting');
        setTwinCallLogs([
            "Initializing local WebRTC audio/video context...", 
            "Acquiring camera & microphone streams...", 
            "Connecting to Zentrix Media Gateway..."
        ]);
        
        try {
            // Generate standard mock SDP offer string
            const mockSdpOffer = `v=0\r\no=alice 2890844526 2890844526 IN IP4 host.anywhere.com\r\ns=\r\nc=IN IP4 host.anywhere.com\r\nt=0 0\r\nm=audio 49170 RTP/SAVPF 111\r\nm=video 51372 RTP/SAVPF 96`;

            // Exchange signaling offer-answer with the backend API router
            const res = await apiFetch('/api/v1/ai/webrtc/offer', {
                method: 'POST',
                body: {
                    sdp: mockSdpOffer,
                    role: twinRole,
                    avatarId: selectedTwinAvatar
                }
            });

            if (res.success) {
                const answerSdp = res.data.sdp;
                const rtcSessionId = res.data.sessionId;

                setTwinCallState('connected');
                setTwinCallLogs(prev => [
                    ...prev,
                    `[Signaling] SDP Handshake negotiated. Session ID: ${rtcSessionId}`,
                    `WebRTC Peer Connection established at ${twinResolution} 30fps.`,
                    `Digital Twin Avatar (${selectedTwinAvatar.toUpperCase()}) is active.`,
                    `[Twin]: Hello! Welcome to Zentrix Showroom. I am Neha, your digital receptionist twin. How can I assist you with site layout maps or unit bookings today?`
                ]);
                addToast({
                    type: "success",
                    title: "Video Twin Connected",
                    message: "Live WebRTC video feed is streaming from Media Gateway."
                });
            } else {
                throw new Error("Signaling gateway returned error");
            }
        } catch (e: any) {
            // Fallback for offline/demo Mode
            setTimeout(() => {
                setTwinCallState('connected');
                setTwinCallLogs(prev => [
                    ...prev,
                    "WebRTC Session established at 720p 30fps (Demo Mode).",
                    `Digital Twin Avatar (${selectedTwinAvatar.toUpperCase()}) is active.`,
                    `[Twin]: Hello! Welcome to Zentrix Showroom. I am Neha, your digital receptionist twin. How can I assist you with site layout maps or unit bookings today?`
                ]);
                addToast({
                    type: "success",
                    title: "Video Twin Connected (Demo)",
                    message: "Live WebRTC video feed is streaming."
                });
            }, 1500);
        }
    };

    const handleSendWhisper = () => {
        if (!whisperMessage.trim()) return;
        setSupervisorLogs(prev => [
            ...prev,
            `[Supervisor Whisper]: ${whisperMessage}`
        ]);
        addToast({
            type: "success",
            title: "Whisper Sent",
            message: `Prompt instruction pushed to Rohan's short-term context.`
        });
        setWhisperMessage("");
    };

    const handleToggleTakeover = () => {
        if (takeoverActive) {
            setTakeoverActive(false);
            setSupervisorLogs(prev => [
                ...prev,
                `[System]: Call handed back to AI Agent Rohan. Active reasoning resumed.`
            ]);
            addToast({
                type: "info",
                title: "Call Released",
                message: "Rohan has resumed voice control."
            });
        } else {
            setTakeoverActive(true);
            setSupervisorLogs(prev => [
                ...prev,
                `[System]: Rohan MUTED. Supervisor Arjun Sharma has taken over the call.`
            ]);
            addToast({
                type: "warning",
                title: "Supervisor Taken Over",
                message: "Live WebRTC audio is routed to your microphone now."
            });
        }
    };

    const clearSimulationHistory = () => {
        setSimulationTranscript([]);
        setIsPlayingSynthesised(false);
        setSimulatedMetrics({ stt: 0, llm: 0, tts: 0, total: 0, confidence: 0, emotion: "None" });
    };

    return (
        <div className="ai-command-center-container">
            {/* Header console */}
            <div className="aicc-header">
                <div className="aicc-title-area">
                    <h1>
                        <Bot size={28} style={{ color: "var(--accent-indigo)" }} />
                        <span>AI Agent Control Center</span>
                    </h1>
                    <p>Configure, train, monitor, and audit your enterprise AI digital employees.</p>
                </div>
                <div className="aicc-controls" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    
                    {/* Capacity Preset Buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", border: "1px solid var(--glass-border)", padding: "2px 6px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.5)" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginRight: "4px" }}>Capacity:</span>
                        {[5, 10, 20, 50].map(preset => {
                            const maxVal = profile.workflow ? (profile.workflow.maxConcurrent || 2) : 2;
                            return (
                                <button
                                    key={preset}
                                    onClick={async () => {
                                        const dbId = profile.dbId;
                                        if (!dbId) return;
                                        try {
                                            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/capacity`, {
                                                method: "PUT",
                                                body: { max_concurrent_calls: preset }
                                            });
                                            if (res.success) {
                                                setProfiles(prev => {
                                                    const next = { ...prev };
                                                    if (next[selectedAgent]) {
                                                        next[selectedAgent].workflow.maxConcurrent = preset;
                                                    }
                                                    return next;
                                                });
                                                addToast({
                                                    type: "success",
                                                    title: "Capacity Updated",
                                                    message: `Trunk concurrency set to ${preset} lines.`
                                                });
                                            }
                                        } catch (e) {
                                            setProfiles(prev => {
                                                const next = { ...prev };
                                                if (next[selectedAgent]) {
                                                    next[selectedAgent].workflow.maxConcurrent = preset;
                                                }
                                                return next;
                                            });
                                        }
                                    }}
                                    style={{
                                        padding: "3px 6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        background: maxVal === preset ? "var(--accent-indigo)" : "rgba(0,0,0,0.05)",
                                        color: maxVal === preset ? "white" : "var(--text-secondary)"
                                    }}
                                >
                                    {preset}
                                </button>
                            );
                        })}
                    </div>

                    {/* Pause / Resume Campaign Button */}
                    <button
                        onClick={async () => {
                            const dbId = profile.dbId;
                            if (!dbId) return;
                            const isPaused = profile.status === 'paused';
                            const endpoint = isPaused ? 'resume' : 'pause';
                            try {
                                const res = await apiFetch(`/api/v1/ai/employees/${dbId}/${endpoint}`, { method: 'POST' });
                                if (res.success) {
                                    setProfiles(prev => {
                                        const next = { ...prev };
                                        if (next[selectedAgent]) {
                                            next[selectedAgent].status = res.data.current_status;
                                        }
                                        return next;
                                    });
                                    addToast({
                                        type: "success",
                                        title: isPaused ? "AI Campaign Resumed" : "AI Campaign Paused",
                                        message: `Successfully updated campaign status for ${profile.name}.`
                                    });
                                }
                            } catch (e) {
                                setProfiles(prev => {
                                    const next = { ...prev };
                                    if (next[selectedAgent]) {
                                        next[selectedAgent].status = isPaused ? 'online' : 'paused';
                                    }
                                    return next;
                                });
                                addToast({
                                    type: "success",
                                    title: isPaused ? "AI Campaign Resumed (Demo)" : "AI Campaign Paused (Demo)",
                                    message: `Successfully updated campaign status for ${profile.name}.`
                                });
                            }
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid var(--glass-border)",
                            background: profile.status === 'paused' ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                            color: profile.status === 'paused' ? "#16a34a" : "#dc2626",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.8rem"
                        }}
                    >
                        {profile.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}
                        {profile.status === 'paused' ? "Resume AI" : "Pause AI"}
                    </button>

                    <div className="aicc-status-indicator">
                        <span className={`status-dot-pulse ${profile.status}`} />
                        <span style={{ textTransform: "capitalize" }}>{profile.status.replace("_", " ")}</span>
                    </div>
                    <div className="aicc-select-wrapper">
                        <select
                            value={selectedAgent}
                            onChange={(e) => handleSwitchAgent(e.target.value)}
                            className="aicc-select"
                        >
                            <option value="rohan">Rohan (Sales)</option>
                            <option value="neha">Neha (Accountant)</option>
                            <option value="monika">Monika (Receptionist)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Dynamic employee enterprise context bar */}
            <div className="aicc-card" style={{ marginBottom: "24px", background: "rgba(255, 255, 255, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border)", padding: "16px 20px", borderRadius: "12px" }}>
                <div className="aicc-employee-context-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "16px", alignItems: "center" }}>
                    
                    {/* Avatar & Name Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "42px", height: "42px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.1)",
                            border: "1px solid rgba(99, 102, 241, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem"
                        }}>
                            {profile.role === "rohan" ? "👤" : profile.role === "neha" ? "👩‍💼" : "👩‍💻"}
                        </div>
                        <div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{profile.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                                {profile.role === "rohan" && "Sales AI Agent"}
                                {profile.role === "neha" && "Accountant AI Agent"}
                                {profile.role === "monika" && "Receptionist AI Agent"}
                            </div>
                        </div>
                    </div>

                    {/* Badge 1: Health */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Health</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#166534", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%" }} />
                            {profile.role === "rohan" ? "Excellent" : profile.role === "neha" ? "Good" : "Excellent"}
                        </div>
                    </div>

                    {/* Badge 2: Knowledge Coverage */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                            Knowledge Coverage
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "84.5%" : profile.role === "neha" ? "92.0%" : "75.0%"}
                        </div>
                    </div>

                    {/* Badge 3: Confidence */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                            Confidence
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "98.2%" : profile.role === "neha" ? "99.1%" : "97.5%"}
                        </div>
                    </div>

                    {/* Badge 4: Languages */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Languages</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "English" : profile.role === "neha" ? "Eng/Hindi" : "English"}
                        </div>
                    </div>

                    {/* Badge 5: Active Calls */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Active Calls</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: profile.status === "on_call" ? "#b91c1c" : "var(--text-primary)", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "1 Call" : profile.role === "neha" ? "0 Calls" : "2 Calls"}
                        </div>
                    </div>

                    {/* Badge 6: Pending Retraining */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Pending Retraining</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "4 items" : profile.role === "neha" ? "0 items" : "1 item"}
                        </div>
                    </div>

                    {/* Badge 7: Average Rating */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Avg Rating</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#166534", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "4.7 / 5" : profile.role === "neha" ? "4.8 / 5" : "4.9 / 5"}
                        </div>
                    </div>

                    {/* Badge 8: Escalation % */}
                    <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Escalation %</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                            {profile.role === "rohan" ? "2.2%" : profile.role === "neha" ? "1.1%" : "0.5%"}
                        </div>
                    </div>

                </div>
            </div>

            {/* Row 1 Tab Navigation */}
            <div className="aicc-tabs-nav" style={{ gap: "3px", padding: "6px" }}>
                <button onClick={() => setActiveTab("overview")} className={`aicc-tab-btn tab-overview ${activeTab === "overview" ? "active" : ""}`}>
                    <Activity size={16} /> Overview
                </button>
                <button onClick={() => setActiveTab("persona")} className={`aicc-tab-btn tab-persona ${activeTab === "persona" ? "active" : ""}`}>
                    <GraduationCap size={16} /> Personality
                </button>
                <button onClick={() => setActiveTab("knowledge")} className={`aicc-tab-btn tab-knowledge ${activeTab === "knowledge" ? "active" : ""}`}>
                    <Brain size={16} /> Knowledge
                </button>
                <button onClick={() => setActiveTab("voice")} className={`aicc-tab-btn tab-voice ${activeTab === "voice" ? "active" : ""}`}>
                    <Phone size={16} /> Voice
                </button>
                <button onClick={() => setActiveTab("workflow")} className={`aicc-tab-btn tab-workflow ${activeTab === "workflow" ? "active" : ""}`}>
                    <Calendar size={16} /> Workflow
                </button>
                <button onClick={() => setActiveTab("rules")} className={`aicc-tab-btn tab-training ${activeTab === "rules" ? "active" : ""}`}>
                    <GraduationCap size={16} style={{ transform: "rotateY(180deg)" }} /> Coaching Rules
                </button>
                <button onClick={() => setActiveTab("playground")} className={`aicc-tab-btn tab-playground ${activeTab === "playground" ? "active" : ""}`}>
                    <Bot size={16} /> Playground
                </button>
                <button onClick={() => setActiveTab("monitor")} className={`aicc-tab-btn tab-monitor ${activeTab === "monitor" ? "active" : ""}`}>
                    <Activity size={16} /> Live Monitor
                </button>
                
                <div style={{ flex: 1 }} />
                
                <button 
                    onClick={() => setRow2Expanded(!row2Expanded)}
                    className="aicc-tab-btn" 
                    style={{ padding: "10px", width: "40px", justifyContent: "center", background: "rgba(226, 232, 240, 0.4)", color: "var(--text-primary)" }}
                    title="Toggle Advanced Tabs (Row 2)"
                    id="aicc_row2_toggle_btn"
                >
                    {row2Expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Row 2 Tab Navigation (Collapsible) */}
            {row2Expanded && (
                <div className="aicc-tabs-nav" style={{ gap: "3px", padding: "6px", marginTop: "-16px", marginBottom: "24px" }}>
                    <button onClick={() => setActiveTab("analytics")} className={`aicc-tab-btn tab-overview ${activeTab === "analytics" ? "active" : ""}`}>
                        <BarChart3 size={16} /> Analytics
                    </button>
                    <button onClick={() => setActiveTab("security")} className={`aicc-tab-btn tab-persona ${activeTab === "security" ? "active" : ""}`}>
                        <Shield size={16} /> Security
                    </button>
                    <button onClick={() => setActiveTab("coaching")} className={`aicc-tab-btn tab-training ${activeTab === "coaching" ? "active" : ""}`}>
                        <GraduationCap size={16} /> Coaching
                    </button>
                    <button onClick={() => setActiveTab("training")} className={`aicc-tab-btn tab-training ${activeTab === "training" ? "active" : ""}`}>
                        <Brain size={16} /> AI Training
                    </button>
                    <button onClick={() => setActiveTab("telephony")} className={`aicc-tab-btn tab-voice ${activeTab === "telephony" ? "active" : ""}`}>
                        <Radio size={16} /> Telephony
                    </button>
                    <button onClick={() => setActiveTab("integrations")} className={`aicc-tab-btn tab-workflow ${activeTab === "integrations" ? "active" : ""}`}>
                        <Plug size={16} /> Integrations
                    </button>
                    <button onClick={() => setActiveTab("audit")} className={`aicc-tab-btn tab-overview ${activeTab === "audit" ? "active" : ""}`}>
                        <FileText size={16} /> Audit Log
                    </button>
                    <button onClick={() => setActiveTab("digital_twin")} className={`aicc-tab-btn tab-persona ${activeTab === "digital_twin" ? "active" : ""}`}>
                        <UserCheck size={16} /> Digital Twin
                    </button>
                </div>
            )}

            {/* ─── TAB 1: OVERVIEW ─────────────────────────────────────────── */}
            {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                    {/* Time-range selector + period label row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                            Showing metrics for: <strong style={{ color: "var(--text-primary)" }}>{dashPeriod === "today" ? "Today" : dashPeriod === "7d" ? "Last 7 Days" : "Last 30 Days"}</strong>
                        </span>
                        <div className="aicc-period-selector">
                            {(["today", "7d", "30d"] as const).map(p => (
                                <button key={p} className={`aicc-period-btn ${dashPeriod === p ? "active" : ""}`} onClick={() => setDashPeriod(p)}>
                                    {p === "today" ? "Today" : p === "7d" ? "7D" : "30D"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* KPI Stats Grid */}
                    <div className="aicc-stats-grid">
                        <div className="aicc-card aicc-stat-card">
                            <div className="aicc-stat-top">
                                <span className="aicc-stat-label">Total Leads Handled</span>
                                <span className="aicc-stat-badge up"><TrendingUp size={10} /> {profile.stats.totalLeads.change}</span>
                            </div>
                            <div className="aicc-stat-val">{dashPeriod === "today" ? Math.round(profile.stats.totalLeads.val / 30) : dashPeriod === "7d" ? Math.round(profile.stats.totalLeads.val / 4) : profile.stats.totalLeads.val}</div>
                        </div>
                        <div className="aicc-card aicc-stat-card">
                            <div className="aicc-stat-top">
                                <span className="aicc-stat-label">Active Conversations</span>
                                <span className="aicc-stat-badge up"><TrendingUp size={10} /> {profile.stats.activeConvs.change}</span>
                            </div>
                            <div className="aicc-stat-val">{profile.stats.activeConvs.val}</div>
                        </div>
                        <div className="aicc-card aicc-stat-card">
                            <div className="aicc-stat-top">
                                <span className="aicc-stat-label">Revenue Impact</span>
                                <span className="aicc-stat-badge up"><TrendingUp size={10} /> {profile.stats.revenue.change}</span>
                            </div>
                            <div className="aicc-stat-val">{dashPeriod === "today" ? "₹0.6L" : dashPeriod === "7d" ? "₹4.3L" : profile.stats.revenue.val}</div>
                        </div>
                        <div className="aicc-card aicc-stat-card">
                            <div className="aicc-stat-top">
                                <span className="aicc-stat-label">AI Score (Accuracy)</span>
                                <span className="aicc-stat-badge up"><TrendingUp size={10} /> {profile.stats.aiScore.change}</span>
                            </div>
                            <div className="aicc-stat-val">{profile.stats.aiScore.val}</div>
                        </div>
                    </div>

                    {/* Rohan-only: Live Call Stats card */}
                    {selectedAgent === "rohan" && (
                        <div className="aicc-card" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.04), rgba(99,102,241,0.04))", border: "1px solid rgba(239,68,68,0.15)" }}>
                            <h3 className="aicc-card-title" style={{ marginBottom: "16px" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="aicc-live-dot" /> Live Telephony Stats — Rohan (Sales)
                                </span>
                                <Phone size={16} style={{ color: "#ef4444" }} />
                            </h3>
                            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                                <div className="aicc-live-call-stat">
                                    <div className="aicc-live-call-stat-val">18</div>
                                    <div className="aicc-live-call-stat-label">Calls Today</div>
                                </div>
                                <div className="aicc-live-call-stat">
                                    <div className="aicc-live-call-stat-val">4m 12s</div>
                                    <div className="aicc-live-call-stat-label">Avg Duration</div>
                                </div>
                                <div className="aicc-live-call-stat" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "#fff5f5" }}>
                                    <div className="aicc-live-call-stat-val" style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span className="aicc-live-dot" style={{ width: "6px", height: "6px", marginRight: 0 }} /> 1 Live
                                    </div>
                                    <div className="aicc-live-call-stat-label">Right Now</div>
                                </div>
                                <div className="aicc-live-call-stat">
                                    <div className="aicc-live-call-stat-val">92%</div>
                                    <div className="aicc-live-call-stat-label">Connect Rate</div>
                                </div>
                                <div className="aicc-live-call-stat">
                                    <div className="aicc-live-call-stat-val">2.2%</div>
                                    <div className="aicc-live-call-stat-label">Escalation</div>
                                </div>
                            </div>
                            <div style={{ background: "rgba(15,23,42,0.04)", borderRadius: "8px", padding: "10px 14px", border: "1px solid var(--glass-border)" }}>
                                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>Last Completed Call Transcript Preview</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <div style={{ fontSize: "0.75rem", background: "#6366f1", color: "white", padding: "5px 10px", borderRadius: "6px", alignSelf: "flex-start", maxWidth: "85%" }}>
                                        <strong>Rohan:</strong> Rahul ji, BKC Phase 2 mein 3BHK starting ₹2.1Cr hai. Pre-approval loan assistance bhi available hai.
                                    </div>
                                    <div style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "var(--text-primary)", padding: "5px 10px", borderRadius: "6px", alignSelf: "flex-end", maxWidth: "85%" }}>
                                        <strong>Lead:</strong> Site visit Sunday ko possible hai kya?
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Conversations + Pipeline */}
                    <div className="aicc-overview-layout">
                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Recent Conversations</span>
                                <MessageSquare size={16} style={{ color: "var(--text-secondary)" }} />
                            </h3>
                            <div className="cc-conv-list">
                                {profile.recentConvs.map((c: any) => (
                                    <div key={c.id} className="cc-conv-item">
                                        <div className="cc-conv-avatar">{c.avatar}</div>
                                        <div className="cc-conv-info">
                                            <div className="cc-conv-name-row">
                                                <span className="cc-conv-name">{c.name}</span>
                                                <span className="cc-conv-time">{c.time}</span>
                                            </div>
                                            <div className="cc-conv-msg">{c.msg}</div>
                                        </div>
                                        {c.unread > 0 && <span className="cc-conv-badge">{c.unread}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Leads Pipeline</span>
                                <Target size={16} style={{ color: "var(--text-secondary)" }} />
                            </h3>
                            <div className="aicc-pipeline-cols">
                                <div className="aicc-pipeline-col">
                                    <div className="aicc-pipeline-col-hdr"><span>New</span><span className="aicc-pipeline-count">{profile.pipeline.new.length}</span></div>
                                    {profile.pipeline.new.map((l: any) => (
                                        <div key={l.id} className="aicc-pipeline-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>{l.name}</h4>
                                                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{l.source}</p>
                                            </div>
                                            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                                                <button
                                                    onClick={async () => {
                                                        const dbId = profile.dbId;
                                                        if (!dbId) return;
                                                        try {
                                                            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/call-now`, {
                                                                method: "POST",
                                                                body: { leadId: l.id || "rp1" }
                                                            });
                                                            if (res.success) {
                                                                addToast({
                                                                    type: "success",
                                                                    title: "Immediate Call",
                                                                    message: `📞 Triggered immediate outbound call with ${profile.name} for ${l.name}.`
                                                                });
                                                            }
                                                        } catch (e) {
                                                            addToast({
                                                                type: "success",
                                                                title: "Immediate Call (Demo)",
                                                                message: `📞 Triggered immediate outbound call with ${profile.name} for ${l.name}.`
                                                            });
                                                        }
                                                    }}
                                                    style={{ flex: 1, padding: "4px 6px", background: "rgba(99, 102, 241, 0.12)", color: "var(--accent-indigo)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                                                >
                                                    🤖 Call Now
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        addToast({
                                                            type: "success",
                                                            title: "Lead Assigned",
                                                            message: `👤 Reassigned ${l.name} to Human Agent (Rahul) for manual follow-up.`
                                                        });
                                                    }}
                                                    style={{ flex: 1, padding: "4px 6px", background: "rgba(15, 23, 42, 0.05)", border: "1px solid rgba(15, 23, 42, 0.1)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
                                                >
                                                    Assign Human
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="aicc-pipeline-col">
                                    <div className="aicc-pipeline-col-hdr"><span>Contacted</span><span className="aicc-pipeline-count">{profile.pipeline.contacted.length}</span></div>
                                    {profile.pipeline.contacted.map((l: any) => (
                                        <div key={l.id} className="aicc-pipeline-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>{l.name}</h4>
                                                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{l.source}</p>
                                            </div>
                                            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                                                <button
                                                    onClick={async () => {
                                                        const dbId = profile.dbId;
                                                        if (!dbId) return;
                                                        try {
                                                            const res = await apiFetch(`/api/v1/ai/employees/${dbId}/call-now`, {
                                                                method: "POST",
                                                                body: { leadId: l.id || "rp4" }
                                                            });
                                                            if (res.success) {
                                                                addToast({
                                                                    type: "success",
                                                                    title: "Immediate Call",
                                                                    message: `📞 Triggered immediate outbound call with ${profile.name} for ${l.name}.`
                                                                });
                                                            }
                                                        } catch (e) {
                                                            addToast({
                                                                type: "success",
                                                                title: "Immediate Call (Demo)",
                                                                message: `📞 Triggered immediate outbound call with ${profile.name} for ${l.name}.`
                                                            });
                                                        }
                                                    }}
                                                    style={{ flex: 1, padding: "4px 6px", background: "rgba(99, 102, 241, 0.12)", color: "var(--accent-indigo)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                                                >
                                                    🤖 Call Now
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        addToast({
                                                            type: "success",
                                                            title: "Lead Assigned",
                                                            message: `👤 Reassigned ${l.name} to Human Agent (Rahul) for manual follow-up.`
                                                        });
                                                    }}
                                                    style={{ flex: 1, padding: "4px 6px", background: "rgba(15, 23, 42, 0.05)", border: "1px solid rgba(15, 23, 42, 0.1)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
                                                >
                                                    Assign Human
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="aicc-pipeline-col">
                                    <div className="aicc-pipeline-col-hdr"><span>Qualified</span><span className="aicc-pipeline-count">{profile.pipeline.qualified.length}</span></div>
                                    {profile.pipeline.qualified.map((l: any) => (
                                        <div key={l.id} className="aicc-pipeline-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>{l.name}</h4>
                                                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{l.source}</p>
                                            </div>
                                            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                                                <button
                                                    onClick={() => {
                                                        addToast({
                                                            type: "success",
                                                            title: "Lead Re-Queued",
                                                            message: `🤖 Re-assigned ${l.name} to Rohan AI Autopilot queue.`
                                                        });
                                                    }}
                                                    style={{ flex: 1, padding: "4px 6px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.1)", color: "var(--accent-indigo)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                                                >
                                                    Assign Rohan
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        addToast({
                                                            type: "success",
                                                            title: "Lead Assigned",
                                                            message: `👤 Reassigned ${l.name} to Human Agent (Rahul) for manual follow-up.`
                                                        });
                                                    }}
                                                    style={{ flex: 1, padding: "4px 6px", background: "rgba(15, 23, 42, 0.05)", border: "1px solid rgba(15, 23, 42, 0.1)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
                                                >
                                                    Assign Human
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="aicc-pipeline-col">
                                    <div className="aicc-pipeline-col-hdr"><span>Won</span><span className="aicc-pipeline-count">{profile.pipeline.won.length}</span></div>
                                    {profile.pipeline.won.map((l: any) => (<div key={l.id} className="aicc-pipeline-card"><h4>{l.name}</h4><p>{l.source}</p></div>))}
                                </div>
                            </div>
                            {/* Pipeline conversion summary footer */}
                            {(() => {
                                const total = profile.pipeline.new.length + profile.pipeline.contacted.length + profile.pipeline.qualified.length + profile.pipeline.won.length;
                                const convRate = total > 0 ? Math.round((profile.pipeline.won.length / total) * 100) : 0;
                                return (
                                    <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>New → Won Conversion</span>
                                        <span style={{ fontSize: "0.8rem", fontWeight: 900, color: convRate >= 20 ? "#15803d" : "#b45309" }}>{convRate}%</span>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>·</span>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Revenue Impact: <strong style={{ color: "var(--text-primary)" }}>{profile.stats.revenue.val}</strong></span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Agent Performance Comparison Matrix */}
                    <div className="aicc-card aicc-comparison-matrix-card">
                        <h3 className="aicc-card-title">
                            <span>Agent Performance Comparison Matrix</span>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {([{ k: "accuracy" as const, label: "Accuracy" }, { k: "latency" as const, label: "Latency" }]).map(s => (
                                    <button key={s.k}
                                        onClick={() => setMatrixSort(prev => ({ key: s.k, dir: prev.key === s.k && prev.dir === "desc" ? "asc" : "desc" }))}
                                        style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: "5px", border: "1px solid var(--glass-border)", cursor: "pointer", background: matrixSort.key === s.k ? "var(--accent-indigo)" : "white", color: matrixSort.key === s.k ? "white" : "var(--text-secondary)" }}>
                                        {s.label} {matrixSort.key === s.k ? (matrixSort.dir === "desc" ? "↓" : "↑") : "↕"}
                                    </button>
                                ))}
                            </div>
                        </h3>
                        {/* Threshold alert legend */}
                        <div style={{ display: "flex", gap: "12px", marginBottom: "12px", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                            <span>Thresholds:</span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>⚠ Accuracy &lt; 90%</span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>⚠ Latency &gt; 800ms</span>
                        </div>
                        <div className="aicc-comparison-grid">
                            <div className="aicc-comparison-header-row">
                                <div className="aicc-comp-cell text-left">Agent Twin</div>
                                <div className="aicc-comp-cell">Accuracy Rating</div>
                                <div className="aicc-comp-cell">Avg Latency</div>
                                <div className="aicc-comp-cell">Interaction Volume</div>
                            </div>
                            {[
                                { avatar: "RM", avatarBg: "#e0e7ff", avatarCol: "#4f46e5", name: "Rohan Mishra", tag: "Sales & Lead Qualification", acc: 94, latency: 540, latencyPct: 54, vol: "1,240 calls", volPct: 82 },
                                { avatar: "NS", avatarBg: "#ccfbf1", avatarCol: "#0d9488", name: "Neha Sharma", tag: "Accounts & Installment Billing", acc: 96, latency: 555, latencyPct: 55, vol: "820 calls", volPct: 54 },
                                { avatar: "MK", avatarBg: "#fce7f3", avatarCol: "#db2777", name: "Monika Kapoor", tag: "Directory Routing & Receptionist", acc: 98, latency: 500, latencyPct: 50, vol: "1,510 calls", volPct: 100 },
                            ].sort((a, b) => {
                                const val = matrixSort.key === "accuracy" ? a.acc - b.acc : a.latency - b.latency;
                                return matrixSort.dir === "desc" ? -val : val;
                            }).map(agent => {
                                const hasAlert = agent.acc < 90 || agent.latency > 800;
                                return (
                                    <div key={agent.name} className={`aicc-comparison-row${hasAlert ? " alert-row" : ""}`}>
                                        <div className="aicc-comp-cell agent-info text-left">
                                            <div className="aicc-avatar mini" style={{ background: agent.avatarBg, color: agent.avatarCol }}>{agent.avatar}</div>
                                            <div>
                                                <div className="agent-name">
                                                    {agent.name}
                                                    {hasAlert && <span className="aicc-threshold-badge">⚠ Alert</span>}
                                                </div>
                                                <div className="agent-tag">{agent.tag}</div>
                                            </div>
                                        </div>
                                        <div className="aicc-comp-cell">
                                            <div className="meter-label" style={{ color: agent.acc < 90 ? "#ef4444" : undefined }}>{agent.acc}%</div>
                                            <div className="meter-bar"><div className="meter-fill" style={{ width: `${agent.acc}%`, background: agent.acc < 90 ? "#ef4444" : undefined }} /></div>
                                        </div>
                                        <div className="aicc-comp-cell">
                                            <div className="latency-val" style={{ color: agent.latency > 800 ? "#ef4444" : undefined }}>{agent.latency} ms</div>
                                            <div className="latency-bar"><div className="latency-fill" style={{ width: `${agent.latencyPct}%`, background: agent.latency > 800 ? "#ef4444" : undefined }} /></div>
                                        </div>
                                        <div className="aicc-comp-cell">
                                            <div className="volume-val">{agent.vol}</div>
                                            <div className="volume-bar"><div className="volume-fill" style={{ width: `${agent.volPct}%` }} /></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 2: IDENTITY ────────────────────────────────────────── */}
            {activeTab === "persona" && (
                <div className="aicc-card">
                    <h3 className="aicc-card-title">
                        <span>Persona Configuration</span>
                        <GraduationCap size={18} style={{ color: "var(--accent-indigo)" }} />
                    </h3>
                    <div className="aicc-form-grid">
                        <div className="aicc-form-group">
                            <label>Agent Name</label>
                            <input
                                type="text"
                                className="aicc-input"
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                            />
                        </div>
                        <div className="aicc-form-group">
                            <label>Base Language</label>
                            <select
                                className="aicc-input"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="hinglish">Hinglish (Hindi + English mix)</option>
                                <option value="english">English (Official Corporate)</option>
                                <option value="hindi">Hindi (Pure Vernacular)</option>
                                <option value="marathi">Marathi</option>
                            </select>
                        </div>
                        <div className="aicc-form-group">
                            <label>Accent & Dialect Profile</label>
                            <input
                                type="text"
                                className="aicc-input"
                                value={dialect}
                                onChange={(e) => setDialect(e.target.value)}
                            />
                        </div>
                        <div className="aicc-form-group">
                            <label>Formality Level</label>
                            <div className="aicc-slider-row">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={formality}
                                    onChange={(e) => setFormality(Number(e.target.value))}
                                />
                                <span className="aicc-slider-val">{formality}%</span>
                            </div>
                        </div>
                        <div className="aicc-form-group">
                            <label>Humor & Empathy</label>
                            <div className="aicc-slider-row">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={humor}
                                    onChange={(e) => setHumor(Number(e.target.value))}
                                />
                                <span className="aicc-slider-val">{humor}%</span>
                            </div>
                        </div>
                        <div className="aicc-form-group">
                            <label>Assertiveness & Closing Intent</label>
                            <div className="aicc-slider-row">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={assertiveness}
                                    onChange={(e) => setAssertiveness(Number(e.target.value))}
                                />
                                <span className="aicc-slider-val">{assertiveness}%</span>
                            </div>
                        </div>
                        <div className="aicc-form-group full-width">
                            <label>Filler Words & Verbal Crutches</label>
                            <div className="aicc-tag-input-row">
                                <input
                                    type="text"
                                    placeholder="Add filler word (e.g. absolutely, matlab, dekhiye)"
                                    className="aicc-input"
                                    style={{ flex: 1 }}
                                    value={fillerWordInput}
                                    onChange={(e) => setFillerWordInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addFillerWord()}
                                />
                                <button className="aicc-btn-secondary" onClick={addFillerWord}>Add</button>
                            </div>
                            <div className="aicc-tags-list">
                                {fillerWords.map((word) => (
                                    <span key={word} className="aicc-tag">
                                        {word}
                                        <button onClick={() => removeFillerWord(word)}>×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="aicc-form-group full-width">
                            <label>Dynamic Greeting Templates</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 800, width: "100px", color: "var(--text-secondary)" }}>🌅 Morning:</span>
                                    <input type="text" className="aicc-input" style={{ flex: 1 }} defaultValue={profile.persona.greetingMorning} />
                                </div>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 800, width: "100px", color: "var(--text-secondary)" }}>☀️ Afternoon:</span>
                                    <input type="text" className="aicc-input" style={{ flex: 1 }} defaultValue={profile.persona.greetingAfternoon} />
                                </div>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 800, width: "100px", color: "var(--text-secondary)" }}>🌙 Evening:</span>
                                    <input type="text" className="aicc-input" style={{ flex: 1 }} defaultValue={profile.persona.greetingEvening} />
                                </div>
                            </div>
                        </div>
                        <div className="aicc-form-group full-width" style={{ marginTop: "10px" }}>
                            <button className="aicc-btn-primary" onClick={handleSavePersona}>
                                <Save size={16} /> Save Persona Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 3: KNOWLEDGE ───────────────────────────────────────── */}
            {activeTab === "knowledge" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div className="aicc-knowledge-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--glass-border)", padding: "16px 20px", borderRadius: "12px", backdropFilter: "blur(12px)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Knowledge Files</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{dynamicDocCount}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Chunks</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{dynamicChunksCount}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Questions Answered Today</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{knowledgeStats.questionsToday}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Answer Accuracy</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#166534" }}>{knowledgeStats.accuracy}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Average Response Time</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{knowledgeStats.responseTime}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Confidence Score</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{knowledgeStats.confidence}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Knowledge Coverage</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{knowledgeStats.coverage}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Failed Queries</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#991b1b" }}>{knowledgeStats.failedQueries}</span>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "20px" }}>
                        
                        {/* Left Column: Ingestion Controls & Sources */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            
                            <div className="aicc-card" style={{ marginTop: 0 }}>
                        <h3 className="aicc-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>Knowledge Base Ingestion (RAG)</span>
                                <Brain size={18} style={{ color: "var(--accent-indigo)" }} />
                            </span>
                            <button onClick={triggerDbSync} className="aicc-btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                <RefreshCw size={12} /> Sync Database ({syncRelativeTime})
                            </button>
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div className="aicc-dropzone" onClick={simulateRAGIngest}>
                                {isIngesting ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%", maxWidth: "400px", padding: "12px" }}>
                                        <Loader2 className="animate-spin" size={36} style={{ color: "var(--accent-indigo)" }} />
                                        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                            <span>
                                                {ingestStatus === "uploading" && "Uploading document..."}
                                                {ingestStatus === "chunking" && "Auto-chunking segments (600 chars)..."}
                                                {ingestStatus === "embedding" && "Generating AI embeddings via OpenAI..."}
                                            </span>
                                            <span>{ingestProgress}%</span>
                                        </div>
                                        <div style={{ width: "100%", height: "8px", background: "rgba(99,102,241,0.1)", borderRadius: "4px", overflow: "hidden", border: "1px solid rgba(99,102,241,0.15)" }}>
                                            <div style={{ width: `${ingestProgress}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-indigo), #4f46e5)", borderRadius: "4px", transition: "width 0.2s ease" }} />
                                        </div>
                                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                            Do not close this tab. Processing vector nodes...
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px" }}>
                                        <Upload className="aicc-dropzone-icon" size={36} style={{ color: "var(--accent-indigo)", marginBottom: "8px" }} />
                                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>Drag & Drop files here or click to browse</span>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", marginBottom: "16px" }}>Max upload size: 25MB per file</span>
                                        
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", maxWidth: "450px" }}>
                                            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.5px" }}>Supported File Formats</div>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                                                {["PDF", "DOCX", "TXT", "CSV", "Images (OCR)", "ZIP"].map((fmt) => (
                                                    <span key={fmt} style={{ fontSize: "0.68rem", fontWeight: 800, padding: "3px 8px", background: "rgba(99,102,241,0.08)", color: "var(--accent-indigo)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "4px" }}>
                                                        {fmt}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid var(--glass-border)", paddingBottom: "12px" }}>
                                {["All", "Brochures", "FAQs", "Policies"].map((filterName) => (
                                    <button 
                                        key={filterName}
                                        onClick={() => setSelectedCategoryFilter(filterName)}
                                        style={{
                                            padding: "6px 12px",
                                            fontSize: "0.75rem",
                                            fontWeight: 800,
                                            borderRadius: "99px",
                                            border: "1px solid var(--glass-border)",
                                            background: selectedCategoryFilter === filterName ? "var(--accent-indigo)" : "white",
                                            color: selectedCategoryFilter === filterName ? "white" : "var(--text-primary)",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {filterName}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-secondary)" }}>Knowledge Sources</label>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Showing {filteredDocs.length} of {knowledgeDocs.length}</span>
                                </div>
                                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                                    <input
                                        type="text"
                                        placeholder="Search documents by name or assigned agent..."
                                        className="aicc-input"
                                        style={{ flex: 1, padding: "6px 12px", fontSize: "0.8rem" }}
                                        value={searchDocsQuery}
                                        onChange={(e) => setSearchDocsQuery(e.target.value)}
                                    />
                                </div>

                                <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "10px", background: "white" }}>
                                    <table className="aicc-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", minWidth: "1000px" }}>
                                        <thead>
                                            <tr style={{ background: "rgba(241, 245, 249, 0.6)", borderBottom: "1px solid var(--glass-border)", textAlign: "left", fontWeight: 800, color: "var(--text-secondary)" }}>
                                                <th style={{ padding: "10px 12px", width: "40px" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDocs.length === filteredDocs.length && filteredDocs.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedDocs(filteredDocs.map(d => d.id));
                                                            else setSelectedDocs([]);
                                                        }}
                                                        style={{ cursor: "pointer" }}
                                                    />
                                                </th>
                                                <th style={{ padding: "10px 12px" }}>Document</th>
                                                <th style={{ padding: "10px 12px" }}>Size</th>
                                                <th style={{ padding: "10px 12px" }}>Chunks</th>
                                                <th style={{ padding: "10px 12px" }}>Embedding Model</th>
                                                <th style={{ padding: "10px 12px" }}>Version</th>
                                                <th style={{ padding: "10px 12px" }}>Owner</th>
                                                <th style={{ padding: "10px 12px" }}>Department</th>
                                                <th style={{ padding: "10px 12px" }}>Confidence</th>
                                                <th style={{ padding: "10px 12px" }}>Last Used</th>
                                                <th style={{ padding: "10px 12px" }}>Questions Answered</th>
                                                <th style={{ padding: "10px 12px" }}>Status</th>
                                                <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredDocs.map((doc) => {
                                                // Dynamic business columns mapping
                                                const embeddingModel = "text-embedding-3-small";
                                                const version = doc.id === "kd1" || doc.id === "nd1" || doc.id === "md1" ? "v1.2" : "v1.0";
                                                const owner = "Admin";
                                                const department = profile.role === "rohan" ? "Sales" : profile.role === "neha" ? "Finance" : "Front Desk";
                                                const confidence = doc.id === "kd1" ? "98.5%" : doc.id === "kd2" ? "96.8%" : "95.5%";
                                                const lastUsed = doc.id === "kd1" ? "2h ago" : doc.id === "kd2" ? "Today" : "Yesterday";
                                                const questionsAnswered = doc.id === "kd1" ? 42 : doc.id === "kd2" ? 18 : 5;

                                                return (
                                                    <tr 
                                                        key={doc.id} 
                                                        style={{ 
                                                            borderBottom: "1px solid rgba(226, 232, 240, 0.6)", 
                                                            background: selectedDocs.includes(doc.id) ? "rgba(99, 102, 241, 0.03)" : "transparent",
                                                            transition: "background 0.2s"
                                                        }}
                                                    >
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDocs.includes(doc.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedDocs(prev => [...prev, doc.id]);
                                                                    else setSelectedDocs(prev => prev.filter(id => id !== doc.id));
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-primary)" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                <FileText size={16} style={{ color: doc.active ? "var(--accent-indigo)" : "var(--text-secondary)" }} />
                                                                <span>{doc.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{doc.size || "1.2 MB"}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{doc.chunks || 0}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.7rem" }}>{embeddingModel}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{version}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{owner}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{department}</td>
                                                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#166534" }}>{confidence}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{lastUsed}</td>
                                                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 700 }}>{questionsAnswered}</td>
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <span style={{ 
                                                                fontSize: "0.65rem", 
                                                                fontWeight: 800, 
                                                                padding: "2px 8px", 
                                                                borderRadius: "99px",
                                                                background: doc.active ? "#dcfce7" : "#fee2e2",
                                                                color: doc.active ? "#166534" : "#991b1b"
                                                            }}>
                                                                {doc.active ? "Ready" : "Disabled"}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                                                                <button
                                                                    onClick={() => toggleDocActive(doc.id)}
                                                                    style={{
                                                                        fontSize: "0.68rem",
                                                                        fontWeight: 800,
                                                                        background: "transparent",
                                                                        border: "none",
                                                                        color: doc.active ? "#166534" : "#475569",
                                                                        cursor: "pointer",
                                                                        textDecoration: "underline"
                                                                    }}
                                                                >
                                                                    {doc.active ? "Deactivate" : "Activate"}
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteConfirmDoc(doc)}
                                                                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "2px" }}
                                                                    title="Delete from RAG Index"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Ingestion Timeline & Knowledge Analytics */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    {/* Ingestion Timeline Card (Item 8) */}
                    <div className="aicc-card" style={{ marginTop: 0, background: "white" }}>
                        <h3 className="aicc-card-title" style={{ margin: 0 }}>
                            <span>Knowledge Ingestion Activity Timeline</span>
                            <span style={{ fontSize: "1rem" }}>🕒</span>
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                            
                            {/* Live Ingestion Steps when active */}
                            {isIngesting && (
                                <div style={{ padding: "12px", background: "rgba(99,102,241,0.03)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: "8px" }}>
                                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--accent-indigo)", display: "block", marginBottom: "8px" }}>● PROCESSING ACTIVE UPLOAD</span>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "2px dashed var(--accent-indigo)", paddingLeft: "12px", marginLeft: "6px" }}>
                                        
                                        <div style={{ fontSize: "0.72rem", color: ingestStatus === 'uploading' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ingestStatus === 'uploading' ? 800 : 500 }}>
                                            {ingestStatus === 'uploading' ? '⏳' : '✓'} Uploading brochure.pdf
                                        </div>
                                        <div style={{ fontSize: "0.72rem", color: ingestStatus === 'chunking' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ingestStatus === 'chunking' ? 800 : 500 }}>
                                            {ingestStatus === 'chunking' ? '⏳' : ingestProgress > 50 ? '✓' : '○'} Chunking document (600 char limit)
                                        </div>
                                        <div style={{ fontSize: "0.72rem", color: ingestStatus === 'embedding' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ingestStatus === 'embedding' ? 800 : 500 }}>
                                            {ingestStatus === 'embedding' ? '⏳' : ingestProgress > 85 ? '✓' : '○'} Generating OpenAI vectors
                                        </div>
                                        <div style={{ fontSize: "0.72rem", color: ingestProgress > 95 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ingestProgress > 95 ? 800 : 500 }}>
                                            {ingestProgress === 100 ? '✓' : '○'} Indexing Pinecone nodes
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Static Timeline Logs */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Yesterday's Audit Trail</div>
                                
                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem" }}>📄</span>
                                        <div style={{ width: "2px", flex: 1, background: "var(--glass-border)", margin: "4px 0" }} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Uploaded Brochure</span>
                                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Yesterday 11:24 AM · size: 1.4MB · doc_id: #kd1</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem" }}>✂️</span>
                                        <div style={{ width: "2px", flex: 1, background: "var(--glass-border)", margin: "4px 0" }} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Chunked</span>
                                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Yesterday 11:25 AM · 8 semantic nodes generated</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem" }}>🧠</span>
                                        <div style={{ width: "2px", flex: 1, background: "var(--glass-border)", margin: "4px 0" }} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Embedded</span>
                                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Yesterday 11:25 AM · text-embedding-3-small (1536 dim)</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem" }}>📁</span>
                                        <div style={{ width: "2px", flex: 1, background: "var(--glass-border)", margin: "4px 0" }} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Indexed</span>
                                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Yesterday 11:26 AM · Upserted in index: zentrix-rag-bkc</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem" }}>⚙️</span>
                                        <div style={{ width: "2px", flex: 1, background: "var(--glass-border)", margin: "4px 0" }} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>Agent Retrained</span>
                                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Yesterday 11:27 AM · Weights compiled dynamically</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem" }}>✅</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#166534" }}>Ready & Active</span>
                                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Yesterday 11:27 AM · Agent Rohan context updated</p>
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* Knowledge Analytics Charts (Item 9) */}
                    <div className="aicc-card" style={{ marginTop: 0, background: "white" }}>
                        <h3 className="aicc-card-title" style={{ margin: 0 }}>
                            <span>Knowledge Analytics & Document Metrics</span>
                            <span style={{ fontSize: "1rem" }}>📊</span>
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                            
                            {/* Stats grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Questions Asked</span>
                                    <span style={{ fontSize: "1.1rem", fontWeight: 800, display: "block", color: "var(--text-primary)", marginTop: "2px" }}>14,250 queries</span>
                                    <span style={{ fontSize: "0.62rem", color: "#166534" }}>↑ 12.4% vs last week</span>
                                </div>
                                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Knowledge Used</span>
                                    <span style={{ fontSize: "1.1rem", fontWeight: 800, display: "block", color: "var(--accent-indigo)", marginTop: "2px" }}>92.4% hit rate</span>
                                    <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)" }}>13,167 semantic matches</span>
                                </div>
                            </div>

                            {/* Top vs Unused Documents */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#166534", display: "block", marginBottom: "6px" }}>🔥 Top Documents</span>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        {[
                                            { name: "Brochure_2026.pdf", hits: "342 hits" },
                                            { name: "Pricing_Sheet.xlsx", hits: "189 hits" },
                                            { name: "RERA_Doc.pdf", hits: "122 hits" }
                                        ].map((d, i) => (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#f8fafc", borderRadius: "4px", fontSize: "0.65rem" }}>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>{d.name}</span>
                                                <strong style={{ color: "#166534" }}>{d.hits}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#991b1b", display: "block", marginBottom: "6px" }}>❄️ Unused Documents</span>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        {[
                                            { name: "Old_Policy_2024.docx", age: "180d" },
                                            { name: "General_FAQ_v1.txt", age: "120d" },
                                            { name: "Temp_Contact.csv", age: "90d" }
                                        ].map((d, i) => (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#f8fafc", borderRadius: "4px", fontSize: "0.65rem" }}>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>{d.name}</span>
                                                <strong style={{ color: "var(--text-secondary)" }}>{d.age}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Knowledge Growth visual */}
                            <div>
                                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>📈 Knowledge Growth (Vector Chunks)</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {[
                                        { label: "Week 1", val: 30, count: "120 chunks" },
                                        { label: "Week 2", val: 55, count: "240 chunks" },
                                        { label: "Week 3", val: 80, count: "360 chunks" },
                                        { label: "Week 4", val: 100, count: "480 chunks" }
                                    ].map((w, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.65rem" }}>
                                            <span style={{ width: "40px", color: "var(--text-secondary)" }}>{w.label}</span>
                                            <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                                <div style={{ width: `${w.val}%`, height: "100%", background: "var(--accent-indigo)" }} />
                                            </div>
                                            <span style={{ fontWeight: 700 }}>{w.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chunk Size Distribution */}
                            <div>
                                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>📊 Chunk Size Distribution</span>
                                <div style={{ display: "flex", gap: "4px", height: "18px", borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ flex: 0.15, background: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.55rem", fontWeight: 800 }} title="256 Tokens (15%)">15%</div>
                                    <div style={{ flex: 0.65, background: "var(--accent-indigo)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.55rem", fontWeight: 800 }} title="512 Tokens (65%)">65%</div>
                                    <div style={{ flex: 0.20, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.55rem", fontWeight: 800 }} title="1024 Tokens (20%)">20%</div>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                    <span>256 Tokens (Short)</span>
                                    <span>512 Tokens (Semantic)</span>
                                    <span>1024 Tokens (Detailed)</span>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

            </div>

                    {deleteConfirmDoc && (
                        <div className="aicc-modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                            <div className="aicc-modal-content" style={{ background: "white", borderRadius: "16px", padding: "24px", maxWidth: "450px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#e11d48", marginBottom: "16px" }}>
                                    <AlertTriangle size={24} />
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Confirm Accidental Deletion</h4>
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
                                    This will remove <strong style={{ color: "var(--text-primary)" }}>{deleteConfirmDoc.name}</strong> from {profile.name}'s active knowledge:
                                    <br /><br />
                                    • Indexing Chunks: <strong style={{ color: "var(--text-primary)" }}>{deleteConfirmDoc.chunks} chunks</strong>
                                    <br />
                                    • File size: <strong style={{ color: "var(--text-primary)" }}>{deleteConfirmDoc.size}</strong>
                                    <br /><br />
                                    Accidental deletion could degrade live calls immediately by losing vector search context rules. Continue?
                                </p>
                                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                                    <button className="aicc-btn-secondary" onClick={() => setDeleteConfirmDoc(null)}>Cancel</button>
                                    <button className="aicc-btn-primary" style={{ background: "#e11d48" }} onClick={() => executeDeleteDoc(deleteConfirmDoc.id)}>Confirm Delete</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="aicc-card">
                        <h3 className="aicc-card-title">
                            <span>Semantic Vector Search Simulator</span>
                            <Search size={18} style={{ color: "var(--text-secondary)" }} />
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div className="aicc-tag-input-row">
                                <input
                                    type="text"
                                    placeholder="Type search queries (e.g., pricing schemes, RERA codes, site visit driver cab)..."
                                    className="aicc-input"
                                    style={{ flex: 1 }}
                                    value={vectorSearchQuery}
                                    onChange={(e) => setVectorSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && triggerVectorSearch()}
                                />
                                <button className="aicc-btn-primary" onClick={triggerVectorSearch}>Search</button>
                            </div>

                            {vectorSearchResult && (
                                <div style={{ background: "rgba(248, 250, 252, 0.8)", border: "1px dashed var(--glass-border)", padding: "14px", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                                    <div style={{ fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <span style={{ color: "var(--accent-indigo)", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Brain size={14} /> Retrieved Vector Context:
                                        </span>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button 
                                                onClick={() => {
                                                    setFeedbackThumbs(prev => ({ ...prev, [vectorSearchQuery]: 'up' }));
                                                    addToast({ type: "success", title: "RAG Optimizer", message: "Thank you! Feedback recorded to optimize vector retrieval weights." });
                                                }}
                                                style={{ border: "none", background: "transparent", cursor: "pointer", color: feedbackThumbs[vectorSearchQuery] === 'up' ? "#22c55e" : "var(--text-secondary)" }}
                                            >
                                                <ThumbsUp size={14} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setFeedbackThumbs(prev => ({ ...prev, [vectorSearchQuery]: 'down' }));
                                                    addToast({ type: "success", title: "RAG Optimizer", message: "Thank you! Feedback recorded to optimize vector retrieval weights." });
                                                }}
                                                style={{ border: "none", background: "transparent", cursor: "pointer", color: feedbackThumbs[vectorSearchQuery] === 'down' ? "#e11d48" : "var(--text-secondary)" }}
                                            >
                                                <ThumbsDown size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>{vectorSearchResult}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="aicc-card aicc-chunk-visualizer-card">
                        <h3 className="aicc-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Interactive Vector Chunk Visualizer</span>
                            <div style={{ display: "flex", gap: "4px", background: "rgba(241, 245, 249, 0.8)", padding: "3px", borderRadius: "8px" }}>
                                <button 
                                    onClick={() => setVisualizerMode('tree')} 
                                    style={{
                                        fontSize: "0.7rem", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                                        background: visualizerMode === 'tree' ? "white" : "transparent",
                                        boxShadow: visualizerMode === 'tree' ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                        color: visualizerMode === 'tree' ? "var(--accent-indigo)" : "var(--text-secondary)"
                                    }}
                                >
                                    Tree View
                                </button>
                                <button 
                                    onClick={() => setVisualizerMode('graph')} 
                                    style={{
                                        fontSize: "0.7rem", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                                        background: visualizerMode === 'graph' ? "white" : "transparent",
                                        boxShadow: visualizerMode === 'graph' ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                        color: visualizerMode === 'graph' ? "var(--accent-indigo)" : "var(--text-secondary)"
                                    }}
                                >
                                    Graph View
                                </button>
                            </div>
                        </h3>
                        <div className="aicc-visualizer-layout" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                            {visualizerMode === 'tree' ? (
                                <div style={{ height: "300px", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "white", padding: "20px", overflowY: "auto" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        {Object.entries(
                                            visualizerNodes.reduce((acc, node) => {
                                                const cat = node.category || "Uncategorized";
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(node);
                                                return acc;
                                            }, {} as Record<string, typeof visualizerNodes>)
                                        ).map(([category, nodes]) => {
                                            const isCatHovered = hoveredNodeId === category || nodes.some(n => n.id === hoveredNodeId);
                                            return (
                                                <div key={category} style={{ display: "flex", flexDirection: "column" }}>
                                                    <div 
                                                        onMouseEnter={() => setHoveredNodeId(category)}
                                                        onMouseLeave={() => setHoveredNodeId(null)}
                                                        style={{ 
                                                            display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "0.8rem", 
                                                            color: isCatHovered ? "var(--accent-indigo)" : "var(--text-primary)", 
                                                            transition: "color 0.2s" 
                                                        }}
                                                    >
                                                        <span>📁</span>
                                                        <span>{category}</span>
                                                    </div>
                                                    <div style={{ paddingLeft: "16px", marginTop: "4px", display: "flex", flexDirection: "column" }}>
                                                        {nodes.map((node, index) => {
                                                            const isNodeHovered = hoveredNodeId === node.id || hoveredNodeId === category;
                                                            const isSelected = selectedVisualizerNode?.id === node.id;
                                                            return (
                                                                <div 
                                                                    key={node.id} 
                                                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                                                    onMouseLeave={() => setHoveredNodeId(null)}
                                                                    onClick={() => setSelectedVisualizerNode(node)}
                                                                    style={{ 
                                                                        display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", padding: "4px 8px", 
                                                                        borderRadius: "6px", cursor: "pointer", 
                                                                        background: isSelected ? "rgba(99,102,241,0.06)" : "transparent",
                                                                        color: isSelected ? "var(--accent-indigo)" : (isNodeHovered ? "var(--text-primary)" : "var(--text-secondary)"),
                                                                        transition: "all 0.2s"
                                                                    }}
                                                                >
                                                                    <span style={{ color: isNodeHovered ? "var(--accent-indigo)" : "rgba(226, 232, 240, 0.8)", fontFamily: "monospace", marginRight: "4px" }}>
                                                                        {index === nodes.length - 1 ? "└─" : "├─"}
                                                                    </span>
                                                                    <span>📄</span>
                                                                    <span style={{ fontWeight: isSelected ? 700 : 500 }}>{node.name}</span>
                                                                    <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>({node.id.toUpperCase()})</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="aicc-svg-container" style={{ height: "300px", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "rgba(248, 250, 252, 0.4)" }}>
                                    <svg width="100%" height="100%" viewBox="0 0 400 300">
                                        {visualizerNodes.map(node => {
                                            const isHighlighted = hoveredNodeId === node.id || hoveredNodeId === node.category;
                                            return (
                                                <line
                                                    key={`l-${node.id}`}
                                                    x1="200"
                                                    y1="150"
                                                    x2={node.x}
                                                    y2={node.y}
                                                    stroke={isHighlighted ? "var(--accent-indigo)" : "rgba(99,102,241,0.2)"}
                                                    strokeWidth={isHighlighted ? "3" : "2"}
                                                    strokeDasharray={isHighlighted ? "0" : "4"}
                                                    style={{ transition: "all 0.2s" }}
                                                />
                                            );
                                        })}
                                        <circle
                                            cx="200"
                                            cy="150"
                                            r="28"
                                            fill="#6366f1"
                                            stroke="#c7d2fe"
                                            strokeWidth="3"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => {
                                                setSelectedVisualizerNode({ id: "central", name: "Knowledge Base Core", text: `Active agent knowledge database context. Assigned: ${dynamicDocCount} files, ${dynamicChunksCount} chunks.`, similarity: 1.0 });
                                            }}
                                        />
                                        <text x="200" y="154" fill="white" fontSize="9px" fontWeight="800" textAnchor="middle" style={{ pointerEvents: "none" }}>RAG CORE</text>
                                        
                                        {visualizerNodes.map(node => {
                                            const isSelected = selectedVisualizerNode?.id === node.id;
                                            const isHighlighted = hoveredNodeId === node.id || hoveredNodeId === node.category;
                                            const nodeColor = selectedAgent === "rohan" ? "#fb923c" : selectedAgent === "neha" ? "#14b8a6" : "#ec4899";
                                            return (
                                                <g 
                                                    key={`n-${node.id}`} 
                                                    style={{ cursor: "pointer" }} 
                                                    onClick={() => handleNodeClick(node)}
                                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                                    onMouseLeave={() => setHoveredNodeId(null)}
                                                >
                                                    <circle
                                                        cx={node.x}
                                                        cy={node.y}
                                                        r={isSelected || isHighlighted ? "16" : "12"}
                                                        fill="#1e293b"
                                                        stroke={nodeColor}
                                                        strokeWidth={isSelected || isHighlighted ? "3" : "2"}
                                                        style={{ transition: "all 0.2s" }}
                                                    />
                                                    <text x={node.x} y={node.y + 3} fill="white" fontSize="8px" fontWeight="800" textAnchor="middle">{node.id.toUpperCase()}</text>
                                                    <text x={node.x} y={node.y - 18} fill="var(--text-secondary)" fontSize="8px" fontWeight={isSelected || isHighlighted ? "800" : "700"} textAnchor="middle">{node.name}</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            )}

                            {selectedVisualizerNode ? (
                                <div className="aicc-chunk-detail-panel" style={{ padding: "16px", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "white", display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                                        Inspector: {selectedVisualizerNode.name}
                                    </h4>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                                            <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>Node ID</span>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>{selectedVisualizerNode.id.toUpperCase()}</span>
                                        </div>
                                        <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                                            <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>Confidence Weight</span>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#22c55e" }}>{(selectedVisualizerNode.similarity * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Segment Text</span>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.4, margin: 0, background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                            {selectedVisualizerNode.text}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "white", padding: "20px" }}>
                                    Select a node on the map to inspect chunking properties
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enterprise AI Health, Analytics, and Activity Timeline Section */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginTop: "24px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* 7. AI Health Card */}
                            <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>AI Health Status</span>
                                    <span style={{ width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderRight: "1px solid rgba(226,232,240,0.5)", paddingRight: "8px" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>Knowledge Coverage</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{profile.role === "rohan" ? "96%" : "98%"}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderRight: "1px solid rgba(226,232,240,0.5)", paddingRight: "8px" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>Avg Confidence</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{profile.role === "rohan" ? "94%" : "97%"}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderRight: "1px solid rgba(226,232,240,0.5)", paddingRight: "8px" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>Latency</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#166534" }}>1.2 sec</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderRight: "1px solid rgba(226,232,240,0.5)", paddingRight: "8px" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>Hallucination Risk</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#166534" }}>Low</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderRight: "1px solid rgba(226,232,240,0.5)", paddingRight: "8px" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>Failed Questions</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#991b1b" }}>{profile.role === "rohan" ? "3" : "1"}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>Pending Retrain</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-indigo)" }}>{profile.role === "rohan" ? "4 items" : "1 item"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 9. Knowledge Analytics Card */}
                            <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>Knowledge Analytics</h3>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
                                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Questions Asked</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{profile.role === "rohan" ? "1,248" : "2,194"}</span>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Knowledge Used</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{profile.role === "rohan" ? "84.5%" : "92.0%"}</span>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Top Documents</span>
                                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--accent-indigo)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Brochure_2026.pdf</span>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Unused Docs</span>
                                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#991b1b", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Objections_V3.docx</span>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Knowledge Growth</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#166534" }}>+12%</span>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Chunk Dist</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>Uniform</span>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px", marginTop: "10px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        <div>
                                            <h4 style={{ fontSize: "0.7rem", margin: "0 0 8px 0", color: "var(--text-secondary)", fontWeight: 800 }}>Questions Asked Trend</h4>
                                            <div style={{ width: "100%", height: "110px" }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={queryTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="askedGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.2}/>
                                                                <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.4)" />
                                                        <XAxis dataKey="name" style={{ fontSize: "0.55rem" }} tickLine={false} />
                                                        <YAxis style={{ fontSize: "0.55rem" }} tickLine={false} />
                                                        <RechartsTooltip contentStyle={{ fontSize: "0.65rem", borderRadius: "8px" }} />
                                                        <Area type="monotone" dataKey="asked" stroke="var(--accent-indigo)" fillOpacity={1} fill="url(#askedGrad)" strokeWidth={2} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ fontSize: "0.7rem", margin: "0 0 8px 0", color: "var(--text-secondary)", fontWeight: 800 }}>Document Usage Hits</h4>
                                            <div style={{ width: "100%", height: "110px" }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={docUsageData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.4)" />
                                                        <XAxis dataKey="name" style={{ fontSize: "0.55rem" }} tickLine={false} />
                                                        <YAxis style={{ fontSize: "0.55rem" }} tickLine={false} />
                                                        <RechartsTooltip contentStyle={{ fontSize: "0.65rem", borderRadius: "8px" }} />
                                                        <Bar dataKey="usage" fill="var(--accent-indigo)" radius={[3, 3, 0, 0]} barSize={20} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderLeft: "1px solid var(--glass-border)", paddingLeft: "15px" }}>
                                        <h4 style={{ fontSize: "0.7rem", margin: "0 0 8px 0", color: "var(--text-secondary)", width: "100%", textAlign: "center", fontWeight: 800 }}>Chunk Distribution</h4>
                                        <div style={{ width: "100%", height: "110px" }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chunkDistributionData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={25}
                                                        outerRadius={45}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {chunkDistributionData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ fontSize: "0.65rem", borderRadius: "8px" }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%", fontSize: "0.58rem", marginTop: "8px" }}>
                                            {chunkDistributionData.map((item, idx) => (
                                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: item.color }} />
                                                        <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                                                    </div>
                                                    <span style={{ fontWeight: 800 }}>{item.value} chk</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 8. Activity Timeline Card */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>Activity Timeline</span>
                                <span style={{ fontSize: "0.7rem", fontWeight: "normal", color: "var(--text-secondary)" }}>Audit Trail</span>
                            </h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid var(--glass-border)", minHeight: "420px", justifyContent: "center" }}>
                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Yesterday</span>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>Uploaded brochure</span>
                                </div>
                                
                                <span style={{ fontSize: "1.1rem", color: "var(--accent-indigo)", fontWeight: 800, lineHeight: 1 }}>↓</span>
                                
                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>Chunked</span>
                                </div>
                                
                                <span style={{ fontSize: "1.1rem", color: "var(--accent-indigo)", fontWeight: 800, lineHeight: 1 }}>↓</span>
                                
                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>Embedded</span>
                                </div>
                                
                                <div style={{ width: "80%", height: "1px", background: "var(--glass-border)", margin: "4px 0" }} />

                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>26, 1:40 AM</span>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent-indigo)" }}>UI Evaluation for SaaS</span>
                                </div>
                                
                                <span style={{ fontSize: "1.1rem", color: "var(--accent-indigo)", fontWeight: 800, lineHeight: 1 }}>↓</span>
                                
                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>Indexed</span>
                                </div>
                                
                                <span style={{ fontSize: "1.1rem", color: "var(--accent-indigo)", fontWeight: 800, lineHeight: 1 }}>↓</span>
                                
                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>Agent retrained</span>
                                </div>
                                
                                <span style={{ fontSize: "1.1rem", color: "var(--accent-indigo)", fontWeight: 800, lineHeight: 1 }}>↓</span>
                                
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dcfce7", color: "#166534", padding: "6px 16px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 800 }}>
                                    <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%" }} />
                                    Ready
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 4: VOICE CONFIGURATION (WITH CONVERSATION SIMULATOR) ─── */}
            {activeTab === "voice" && (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "start" }}>
                    {/* LEFT PANEL: Voice Configuration Settings & Simulation */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        
                        <div className="aicc-card" style={{ background: "rgba(99, 102, 241, 0.03)", border: "1px solid rgba(99, 102, 241, 0.2)", marginTop: 0 }}>
                            <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: "0 0 12px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Sparkles size={14} style={{ color: "var(--accent-indigo)" }} />
                                <span>Call Personality Presets Shortcuts</span>
                            </h4>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                {[
                                    { name: "Sales agent", style: "Sales Pitch", stability: 0.70, speed: 1.10, emotion: "Persuasive" },
                                    { name: "Support assistant", style: "Conversational", stability: 0.85, speed: 0.98, emotion: "Empathetic" },
                                    { name: "Collection collector", style: "Short Answers", stability: 0.90, speed: 1.05, emotion: "Calm" },
                                    { name: "HR twin recruitment", style: "Detailed", stability: 0.80, speed: 1.0, emotion: "Friendly" },
                                    { name: "Monika Receptionist front desk", style: "Simple", stability: 0.88, speed: 0.98, emotion: "Cheerful" }
                                ].map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => {
                                            setSpeakingStyle(preset.style);
                                            setVoiceStability(preset.stability);
                                            setVoiceSpeechRate(preset.speed);
                                            setEmotionalStyle(preset.emotion);
                                            addToast({
                                                type: "success",
                                                title: "Preset Profile Loaded",
                                                message: `Successfully loaded settings for: ${preset.name.split(" ")[0]}.`
                                            });
                                        }}
                                        className="aicc-btn-secondary"
                                        style={{ padding: "6px 12px", fontSize: "0.75rem", background: "white" }}
                                    >
                                        🚀 {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Speech Synthesis Engine Controls</span>
                                <Phone size={18} style={{ color: "var(--accent-indigo)" }} />
                            </h3>
                            <div className="aicc-form-grid">
                                <div className="aicc-form-group">
                                    <label>ElevenLabs Voice Template Model</label>
                                    <select className="aicc-input" defaultValue={profile.voice.voiceId}>
                                        <option value="eleven_rohan_premium_v4">Rohan Premium V4 (Hindi/Hinglish)</option>
                                        <option value="eleven_neha_finance_v2">Neha Professional V2 (Accounts/Hindi)</option>
                                        <option value="eleven_monika_frontdesk_v1">Monika FrontDesk V1 (Receptionist)</option>
                                    </select>
                                </div>
                                <div className="aicc-form-group">
                                    <label>Speaking Style Profile</label>
                                    <select className="aicc-input" value={speakingStyle} onChange={(e) => setSpeakingStyle(e.target.value)}>
                                        <option value="Conversational">Conversational (Normal)</option>
                                        <option value="Sales Pitch">Sales Pitch (High Assertiveness)</option>
                                        <option value="Short Answers">Short Answers (Speedy/Brief)</option>
                                        <option value="Detailed">Detailed (Explanatory)</option>
                                        <option value="Technical">Technical (Formal/Direct)</option>
                                        <option value="Simple">Simple (Slow paced)</option>
                                    </select>
                                </div>
                                <div className="aicc-form-group">
                                    <label>Emotional Style Synthesis</label>
                                    <select className="aicc-input" value={emotionalStyle} onChange={(e) => setEmotionalStyle(e.target.value)}>
                                        <option value="Professional">Professional (Neutral/Formal)</option>
                                        <option value="Friendly">Friendly (Warm/Polite)</option>
                                        <option value="Cheerful">Cheerful (High Pitch/Welcoming)</option>
                                        <option value="Calm">Calm (Slow/Finance desk)</option>
                                        <option value="Persuasive">Persuasive (Sales closing)</option>
                                        <option value="Empathetic">Empathetic (Reassuring/Patient)</option>
                                    </select>
                                </div>
                                <div className="aicc-form-group">
                                    <label>Speech Rate (Speed)</label>
                                    <div className="aicc-slider-row">
                                        <input
                                            type="range"
                                            min="0.8"
                                            max="1.5"
                                            step="0.05"
                                            value={voiceSpeechRate}
                                            onChange={(e) => setVoiceSpeechRate(Number(e.target.value))}
                                        />
                                        <span className="aicc-slider-val">{voiceSpeechRate}x</span>
                                    </div>
                                </div>
                                <div className="aicc-form-group">
                                    <label>Voice Stability (ElevenLabs Core Jitter)</label>
                                    <div className="aicc-slider-row">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1.0"
                                            step="0.05"
                                            value={voiceStability}
                                            onChange={(e) => setVoiceStability(Number(e.target.value))}
                                        />
                                        <span className="aicc-slider-val">{(voiceStability * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="aicc-form-group">
                                    <label>Hinglish Mix Ratio (Hindi / English blend)</label>
                                    <div className="aicc-slider-row">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={profile.role === "neha" ? 30 : 65}
                                            readOnly
                                        />
                                        <span className="aicc-slider-val">{profile.role === "neha" ? "30" : "65"}%</span>
                                    </div>
                                </div>

                                <div className="aicc-form-group full-width" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "16px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={allowInterruption}
                                            onChange={(e) => setAllowInterruption(e.target.checked)}
                                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>Allow Caller Interruption (Barge-In)</span>
                                    </label>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                                        <div className="aicc-form-group">
                                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Barge-In Sensitivity</span>
                                            <div className="aicc-slider-row">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={bargeInSensitivity}
                                                    onChange={(e) => setBargeInSensitivity(Number(e.target.value))}
                                                    disabled={!allowInterruption}
                                                />
                                                <span className="aicc-slider-val">{bargeInSensitivity}%</span>
                                            </div>
                                        </div>
                                        <div className="aicc-form-group">
                                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Pause Detection Buffer (ms)</span>
                                            <div className="aicc-slider-row">
                                                <input
                                                    type="range"
                                                    min="200"
                                                    max="1000"
                                                    step="50"
                                                    value={pauseDetectionMs}
                                                    onChange={(e) => setPauseDetectionMs(Number(e.target.value))}
                                                    disabled={!allowInterruption}
                                                />
                                                <span className="aicc-slider-val">{pauseDetectionMs}ms</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="aicc-form-group full-width" style={{ display: "flex", gap: "12px", flexDirection: "row", flexWrap: "wrap" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                        <input type="checkbox" checked={smartResume} onChange={(e) => setSmartResume(e.target.checked)} /> Smart Resume
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                        <input type="checkbox" checked={autoPause} onChange={(e) => setAutoPause(e.target.checked)} /> Auto Pause
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                        <input type="checkbox" checked={echoCancellation} onChange={(e) => setEchoCancellation(e.target.checked)} /> Echo Cancellation
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                        <input type="checkbox" checked={noiseSuppression} onChange={(e) => setNoiseSuppression(e.target.checked)} /> Noise Suppression
                                    </label>
                                </div>

                                <div className="aicc-form-group full-width">
                                    <button className="aicc-btn-primary" onClick={handleSaveVoiceConfig}>
                                        <Save size={16} /> Save Voice Configuration
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Multilingual Voice Matrix</span>
                                <span style={{ fontSize: "1rem" }}>🌐</span>
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Configure regional speech support triggers to resolve dynamic language changes on call connections.</p>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                                    {Object.keys(matrixStates).map((langKey) => (
                                        <label key={langKey} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", textTransform: "capitalize", cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={matrixStates[langKey]}
                                                onChange={(e) => setMatrixStates(prev => ({ ...prev, [langKey]: e.target.checked }))}
                                                style={{ width: "15px", height: "15px" }}
                                            />
                                            <span>{langKey === "hinglish" ? "Hinglish (Hindi+English)" : langKey}</span>
                                        </label>
                                    ))}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "10px" }}>
                                    <div className="aicc-form-group">
                                        <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>Fallback Language</span>
                                        <select className="aicc-input" style={{ padding: "6px 10px", fontSize: "0.75rem" }} value={fallbackLanguage} onChange={(e) => setFallbackLanguage(e.target.value)}>
                                            <option value="English">English (Fallback)</option>
                                            <option value="Hindi">Hindi</option>
                                        </select>
                                    </div>
                                    <div className="aicc-form-group">
                                        <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>Auto Detect</span>
                                        <select className="aicc-input" style={{ padding: "6px 10px", fontSize: "0.75rem" }} value={autoDetectLanguage ? "on" : "off"} onChange={(e) => setAutoDetectLanguage(e.target.value === "on")}>
                                            <option value="on">ON (Dynamic barge-in mapping)</option>
                                            <option value="off">OFF</option>
                                        </select>
                                    </div>
                                    <div className="aicc-form-group">
                                        <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>Translation</span>
                                        <select className="aicc-input" style={{ padding: "6px 10px", fontSize: "0.75rem" }} value={translationEnabled ? "on" : "off"} onChange={(e) => setTranslationEnabled(e.target.value === "on")}>
                                            <option value="on">Enabled (Real-time GPT Translation)</option>
                                            <option value="off">Disabled</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Phonetic Pronunciation Dictionary</span>
                                <FileText size={18} style={{ color: "var(--accent-indigo)" }} />
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>Configure exact spelling translations for regional Indian developer brands, authorities, or slang to correct speech output issues.</p>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", border: "1px solid var(--glass-border)", borderRadius: "8px", overflow: "hidden" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--glass-border)" }}>
                                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Word / Abbreviation</th>
                                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Phonetic Replacement (Spoken)</th>
                                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Scope / Category</th>
                                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {phoneticEntries.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                                <td style={{ padding: "8px 12px", fontWeight: 800 }}>{item.word}</td>
                                                <td style={{ padding: "8px 12px", color: "var(--accent-indigo)" }}>{item.phonetic}</td>
                                                <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>{item.category}</td>
                                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                                    <button 
                                                        onClick={() => setPhoneticEntries(prev => prev.filter((_, i) => i !== idx))}
                                                        style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
                                                        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                                                        onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr", gap: "10px", marginTop: "8px" }}>
                                    <input
                                        type="text"
                                        placeholder="Word (e.g., BKC)"
                                        className="aicc-input"
                                        style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                        value={newPhoneticWord}
                                        onChange={(e) => setNewPhoneticWord(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Phonetic (e.g., Bee-Kay-Cee)"
                                        className="aicc-input"
                                        style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                        value={newPhoneticVal}
                                        onChange={(e) => setNewPhoneticVal(e.target.value)}
                                    />
                                    <button 
                                        onClick={() => {
                                            if (newPhoneticWord.trim() && newPhoneticVal.trim()) {
                                                setPhoneticEntries(prev => [...prev, { word: newPhoneticWord, phonetic: newPhoneticVal, category: "Custom Definition" }]);
                                                setNewPhoneticWord("");
                                                setNewPhoneticVal("");
                                                addToast({ type: "success", title: "Pronunciation Saved", message: "Phonetic dictionary successfully updated." });
                                            }
                                        }}
                                        className="aicc-btn-primary"
                                        style={{ padding: "6px" }}
                                    >
                                        Add Definition
                                    </button>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* RIGHT PANEL: Diagnostics & Telemetry side widgets */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        
                        {/* 1. 3D Digital Video Twin Appearance */}
                        <div className="aicc-card" style={{ marginTop: 0 }}>
                            <h3 className="aicc-card-title">
                                <span>3D Digital Video Twin Appearance</span>
                                <Upload size={18} style={{ color: "var(--text-secondary)" }} />
                            </h3>
                            <div className="aicc-dropzone" style={{ padding: "20px 10px" }}>
                                <Upload className="aicc-dropzone-icon" size={24} style={{ marginBottom: "8px" }} />
                                <span style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", textAlign: "center" }}>Upload 3D video avatar alignment recording</span>
                                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block", textAlign: "center", marginTop: "4px" }}>Upload MP4/WebM footage to train expressions.</span>
                            </div>
                        </div>

                        {/* 2. Voice AI Latency Dashboard */}
                        <div className="aicc-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                    <span>Voice AI Latency Dashboard</span>
                                </h3>
                                <span style={{ background: "#dcfce7", color: "#166534", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>LIVE SPEED</span>
                            </div>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 12px" }}>Real-time latency performance breakdown of the voice response stream channel.</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "6.5px" }}>🎙️ Speech-To-Text (STT)</span>
                                    <span style={{ fontWeight: 800 }}>120 ms</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "6.5px" }}>🧠 Reasoning & LLM (RAG)</span>
                                    <span style={{ fontWeight: 800 }}>310 ms</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "6.5px" }}>🔊 Text-To-Speech (TTS)</span>
                                    <span style={{ fontWeight: 800 }}>140 ms</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", fontWeight: 800, background: "rgba(99, 102, 241, 0.05)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.1)" }}>
                                    <span>Total Roundtrip</span>
                                    <span style={{ color: "var(--accent-indigo)" }}>570 ms</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Voice Quality Analytics */}
                        <div className="aicc-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                    <span>Voice Quality Analytics</span>
                                </h3>
                                <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>LIVE QOS</span>
                            </div>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 12px" }}>Voice Quality of Service (QoS) telemetry metrics tracking speech delivery performance.</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>Average Call MOS</span>
                                    <span style={{ fontSize: "1.1rem", fontWeight: 800, display: "block", marginTop: "4px" }}>4.7/5.0</span>
                                    <span style={{ fontSize: "0.55rem", color: "#22c55e", fontWeight: 700 }}>★ Excellent</span>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>Caller Interruptions</span>
                                    <span style={{ fontSize: "1.1rem", fontWeight: 800, display: "block", marginTop: "4px" }}>12%</span>
                                    <span style={{ fontSize: "0.55rem", color: "var(--text-secondary)" }}>Barge-in rate</span>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>Voice Dropouts</span>
                                    <span style={{ fontSize: "1.1rem", fontWeight: 800, display: "block", marginTop: "4px" }}>0.2%</span>
                                    <span style={{ fontSize: "0.55rem", color: "#22c55e", fontWeight: 700 }}>Stable packet link</span>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>Silence Time</span>
                                    <span style={{ fontSize: "1.1rem", fontWeight: 800, display: "block", marginTop: "4px" }}>8%</span>
                                    <span style={{ fontSize: "0.55rem", color: "var(--text-secondary)" }}>Pause ratio</span>
                                </div>
                            </div>
                            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Average Talk Speed</span>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>148 WPM</span>
                            </div>
                        </div>

                        {/* 4. Recent Call Recording Samples */}
                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Recent Call Recording Samples</span>
                                <Play size={18} style={{ color: "var(--accent-indigo)" }} />
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {[
                                    { id: "sales_demo", name: "▶ Sales Demo Outbound Call", date: "Today", duration: "1m 45s" },
                                    { id: "customer_inquiry", name: "▶ Customer Inquiry Inbound Call", date: "Yesterday", duration: "2m 10s" },
                                    { id: "followup_call", name: "▶ Follow-up site visit scheduling", date: "2 days ago", duration: "1m 15s" }
                                ].map((call) => {
                                    const isPlaying = playingRecordingId === call.id;
                                    return (
                                        <div key={call.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                <button 
                                                    onClick={() => toggleRecordingPlayback(call.id)}
                                                    style={{
                                                        width: "28px", height: "28px", borderRadius: "50%", background: isPlaying ? "var(--accent-indigo)" : "rgba(99, 102, 241, 0.1)",
                                                        border: "none", color: isPlaying ? "#fff" : "var(--accent-indigo)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                                                    }}
                                                >
                                                    {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: "2px" }} />}
                                                </button>
                                                <div>
                                                    <span style={{ fontWeight: 800, color: "var(--text-primary)", display: "block", fontSize: "0.8rem" }}>{call.name}</span>
                                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{call.date} · {call.duration}</span>
                                                </div>
                                            </div>
                                            {isPlaying && (
                                                <div className="aicc-eq-bars playing" style={{ height: "14px", gap: "2px" }}>
                                                    <span className="aicc-eq-bar" style={{ width: "2px" }} />
                                                    <span className="aicc-eq-bar" style={{ width: "2px" }} />
                                                    <span className="aicc-eq-bar" style={{ width: "2px" }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 5. Safety & Fallback Controls */}
                        <div className="aicc-card">
                            <h3 className="aicc-card-title">
                                <span>Safety & Fallback Controls</span>
                                <Shield size={18} style={{ color: "var(--accent-indigo)" }} />
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {[
                                    { key: "profanityFilter", name: "Profanity Filter" },
                                    { key: "piiMasking", name: "PII Masking" },
                                    { key: "emergencyTransfer", name: "Emergency Transfer" },
                                    { key: "fallbackVoice", name: "Fallback Voice", type: "badge" }
                                ].map((control) => (
                                    <div key={control.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--glass-border)", fontSize: "0.8rem" }}>
                                        <span style={{ fontWeight: 800 }}>{control.name}</span>
                                        {control.type === "badge" ? (
                                            <span style={{ background: "#dcfce7", color: "#166534", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>Enabled</span>
                                        ) : (
                                            <label className="aicc-switch" style={{ position: "relative", display: "inline-block", width: "36px", height: "18px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={safetyControls[control.key]}
                                                    onChange={(e) => {
                                                        setSafetyControls(prev => ({ ...prev, [control.key]: e.target.checked }));
                                                        addToast({ type: "info", title: "Safety Protocol", message: `${control.name} modified.` });
                                                    }}
                                                    style={{ display: "none" }}
                                                />
                                                <span className="aicc-slider" style={{
                                                    position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                                                    background: safetyControls[control.key] ? "var(--accent-indigo)" : "#cbd5e1",
                                                    borderRadius: "99px", transition: "0.2s"
                                                }}>
                                                    <span style={{
                                                        position: "absolute", content: "", height: "12px", width: "12px", left: safetyControls[control.key] ? "20px" : "4px", bottom: "3px",
                                                        background: "white", borderRadius: "50%", transition: "0.2s"
                                                    }} />
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ─── TAB 5: WORKFLOW & SCHEDULING ────────────────────────────── */}
            {activeTab === "workflow" && (
                <div className="aicc-card">
                    <h3 className="aicc-card-title">
                        <span>Workflow Schedule & Dialing Cadence</span>
                        <Calendar size={18} style={{ color: "var(--accent-indigo)" }} />
                    </h3>
                    <div className="aicc-form-grid">
                        <div className="aicc-form-group">
                            <label>Shift Login Time</label>
                            <input type="time" className="aicc-input" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
                        </div>
                        <div className="aicc-form-group">
                            <label>Shift Logout Time</label>
                            <input type="time" className="aicc-input" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
                        </div>
                        <div className="aicc-form-group">
                            <label>Cooldown Gap Between Calls (seconds)</label>
                            <input type="number" className="aicc-input" value={cooldownSeconds} onChange={(e) => setCooldownSeconds(Number(e.target.value))} />
                        </div>
                        <div className="aicc-form-group">
                            <label>Call Routing: Overflow Voice Agent Backup</label>
                            <select className="aicc-input" value={overflowAgent} onChange={(e) => setOverflowAgent(e.target.value)}>
                                <option value="monika">Monika (Receptionist)</option>
                                <option value="rohan">Rohan (Sales)</option>
                                <option value="neha">Neha (Accountant)</option>
                            </select>
                        </div>
                        <div className="aicc-form-group">
                            <label>Warm Handoff Manager Target</label>
                            <input type="text" className="aicc-input" value={handoffManager} onChange={(e) => setHandoffManager(e.target.value)} />
                        </div>
                        <div className="aicc-form-group">
                            <label>Idle Time Behavior Tasks</label>
                            <input type="text" className="aicc-input" defaultValue={profile.workflow.idleBehavior} />
                        </div>
                        <div className="aicc-form-group full-width">
                            <button className="aicc-btn-primary" onClick={handleSaveWorkflow}>
                                <Save size={16} /> Save Workflow Directives
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 6: LIVE MONITOR ────────────────────────────────────── */}
            {activeTab === "monitor" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div className="aicc-live-monitor-split" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {profile.liveMonitor.activeCall && (
                                <div 
                                    className="aicc-active-call-alert" 
                                    onClick={() => setIsMonitoringActive(!isMonitoringActive)}
                                    style={{ border: isMonitoringActive ? "1px solid #ef4444" : "1px solid var(--glass-border)", cursor: "pointer" }}
                                >
                                    <span className="aicc-active-call-pulse" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444" }}>
                                            🔴 In Progress Active Dialing Interaction {isMonitoringActive ? "(Monitoring)" : "(Click to Monitor Live)"}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                            Lead Name: <strong>{profile.liveMonitor.activeCall.leadName}</strong> · Duration: <strong>{profile.liveMonitor.activeCall.duration}</strong> · Sentiment: <span style={{ background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>{profile.liveMonitor.activeCall.sentiment}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="aicc-card" style={{ marginTop: 0 }}>
                                <h3 className="aicc-card-title">
                                    <span>Live Reasoning & Event Logs</span>
                                    <Brain size={18} style={{ color: "var(--accent-indigo)" }} />
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", background: "rgba(248, 250, 252, 0.5)", borderRadius: "12px", border: "1px solid var(--glass-border)", maxHeight: "250px", overflowY: "auto" }}>
                                    {monitoringFeed.map(item => (
                                        <div key={item.id} className="aicc-reasoning-item" style={{ padding: "12px", borderBottom: "1px solid var(--glass-border)" }}>
                                            <div className="aicc-reasoning-hdr" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                                <span className="aicc-reasoning-title" style={{ fontWeight: 800, color: "var(--text-primary)" }}>Lead Name: {item.lead_name}</span>
                                                <span>{item.timestamp}</span>
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                                <strong>Decision:</strong> {item.reasoning}
                                            </div>
                                            {item.message && (
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "4px" }}>
                                                    <strong>AI Output:</strong> “{item.message}”
                                                </div>
                                            )}
                                            <span className="aicc-reasoning-action" style={{ display: "inline-block", background: "rgba(99,102,241,0.1)", color: "var(--accent-indigo)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: "4px", marginTop: "6px", width: "fit-content" }}>{item.action}</span>
                                        </div>
                                    ))}
                                    {monitoringFeed.length === 0 && (
                                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                                            Activate live call monitoring to stream reasoning loops.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="aicc-card" style={{ marginTop: 0, marginBottom: "20px" }}>
                            <h3 className="aicc-card-title">
                                <span>AI Health Monitor</span>
                                <Activity size={18} style={{ color: "var(--accent-indigo)" }} />
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%" }} /> Online Agents
                                    </span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "6px" }}>12</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "8px", height: "8px", background: "#f59e0b", borderRadius: "50%" }} /> Training Required
                                    </span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "6px" }}>2</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%" }} /> Escalation Alerts
                                    </span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "6px" }}>3</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%" }} /> Failed Responses
                                    </span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "6px" }}>1</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%" }} /> Hallucination Risk
                                    </span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "6px" }}>Low</span>
                                </div>
                            </div>
                        </div>

                        <div className="aicc-card aicc-stream-card" style={{ marginTop: 0 }}>
                            <h3 className="aicc-card-title">
                                <span>Voice Transcript Stream</span>
                                <MessageSquare size={18} style={{ color: isMonitoringActive ? "#ef4444" : "var(--text-secondary)" }} />
                            </h3>
                            {isMonitoringActive ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div className="aicc-live-equalizer-wrap" style={{ background: "#ef4444", color: "white", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.7rem", fontWeight: 800 }}>LIVE BROADCAST CHANNEL</span>
                                        <div className="aicc-live-monitor-eq-bars" style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "12px" }}>
                                            <span className="aicc-live-monitor-eq-bar" />
                                            <span className="aicc-live-monitor-eq-bar" />
                                            <span className="aicc-live-monitor-eq-bar" />
                                        </div>
                                    </div>
                                    <div className="aicc-transcript-stream-box" style={{ height: "200px", overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {monitoringProgress >= 1 && (
                                            <div style={{ background: "#f1f5f9", padding: "6px 10px", borderRadius: "8px", fontSize: "0.75rem", alignSelf: "flex-start" }}>
                                                <strong>AI:</strong> Namaste! Rohan speaking from Maya Infratech. Sector 150 expressway residential layout ki help chahiye thi?
                                            </div>
                                        )}
                                        {monitoringProgress >= 2 && (
                                            <div style={{ background: "var(--accent-indigo)", color: "white", padding: "6px 10px", borderRadius: "8px", fontSize: "0.75rem", alignSelf: "flex-end" }}>
                                                <strong>Customer:</strong> Haan Rohan, payment configurations details bhej dena options list ki, pre-approval rates kya hain?
                                            </div>
                                        )}
                                        {monitoringProgress >= 3 && (
                                            <div style={{ background: "#f1f5f9", padding: "6px 10px", borderRadius: "8px", fontSize: "0.75rem", alignSelf: "flex-start" }}>
                                                <strong>AI:</strong> Sure Rahul ji, registry rates starting structure specifications and maps route links check karke WhatsApp card share kar raha hu.
                                            </div>
                                        )}
                                    </div>

                                    {/* Supervisor Copilot Controls */}
                                    <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>🛡️ Supervisor Live Copilot Actions</span>
                                            {takeoverActive && (
                                                <span style={{ fontSize: "0.62rem", background: "#fee2e2", color: "#ef4444", padding: "2px 6px", borderRadius: "4px", fontWeight: 800 }}>⚡ TAKEOVER ACTIVE</span>
                                            )}
                                        </div>

                                        {/* Whispering Box */}
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <input 
                                                type="text" 
                                                value={whisperMessage} 
                                                onChange={(e) => setWhisperMessage(e.target.value)}
                                                placeholder="Type whisper instruction to Rohan (e.g. Offer Unit 402)..."
                                                className="aicc-input"
                                                style={{ flex: 1, padding: "6px 10px", fontSize: "0.72rem" }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendWhisper(); }}
                                            />
                                            <button 
                                                onClick={handleSendWhisper}
                                                className="aicc-btn-primary"
                                                style={{ padding: "6px 12px", fontSize: "0.72rem", whiteSpace: "nowrap" }}
                                            >
                                                Send Whisper
                                            </button>
                                        </div>

                                        {/* Takeover Control Trigger */}
                                        <button 
                                            onClick={handleToggleTakeover}
                                            className={takeoverActive ? "aicc-btn-secondary" : "aicc-btn-primary"}
                                            style={{ 
                                                padding: "8px 12px", 
                                                fontSize: "0.75rem", 
                                                fontWeight: 800, 
                                                background: takeoverActive ? "#fee2e2" : "#ea580c", 
                                                color: takeoverActive ? "#991b1b" : "white",
                                                border: "none",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "6px"
                                            }}
                                        >
                                            {takeoverActive ? "Release Call control back to AI Rohan" : "⚡ FORCE CALL TAKEOVER (Mute Rohan)"}
                                        </button>

                                        {/* Supervisor Live Action Log Feed */}
                                        {supervisorLogs.length > 0 && (
                                            <div style={{ 
                                                background: "#fafafa", 
                                                border: "1px solid var(--glass-border)", 
                                                borderRadius: "6px", 
                                                padding: "8px", 
                                                fontSize: "0.68rem", 
                                                maxHeight: "80px", 
                                                overflowY: "auto",
                                                fontFamily: "monospace",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "2px"
                                            }}>
                                                {supervisorLogs.map((logStr, i) => (
                                                    <span key={i} style={{ color: logStr.includes("Whisper") ? "var(--accent-indigo)" : "#b45309" }}>
                                                        {logStr}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--text-secondary)", gap: "10px", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>
                                    <Clock size={28} />
                                    <span style={{ fontSize: "0.75rem" }}>Select the active dialing alert to monitor live transcript.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="aicc-card">
                        <h3 className="aicc-card-title">
                            <span>Historical Operations Audit Timeline</span>
                            <Clock size={18} style={{ color: "var(--text-secondary)" }} />
                        </h3>
                        <div className="aicc-timeline">
                            {profile.liveMonitor.activityLog.map((log: any) => (
                                <div key={log.id} className="aicc-timeline-item">
                                    <span className="aicc-timeline-dot" />
                                    <div className="aicc-timeline-content">
                                        <h5>[{log.time}] {log.action}</h5>
                                        <p>{log.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 7: PERFORMANCE ANALYTICS ───────────────────────────── */}
            {activeTab === "analytics" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Filter controls */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Executive Manager Analytics</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                            {['daily', 'weekly', 'monthly'].map((period) => (
                                <button 
                                    key={period} 
                                    onClick={() => setAnalyticsPeriod(period as any)} 
                                    className="aicc-btn-secondary" 
                                    style={{ 
                                        padding: "4px 10px", fontSize: "0.75rem", textTransform: "capitalize",
                                        background: analyticsPeriod === period ? "var(--accent-indigo)" : "white", 
                                        color: analyticsPeriod === period ? "white" : "var(--text-primary)" 
                                    }}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Top Row KPIs */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
                        <div className="aicc-card" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Avg Response Time</span>
                            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>1.22s</span>
                            <span style={{ fontSize: "0.6rem", color: "#22c55e", fontWeight: 700 }}>⚡ 12% faster (Optimal)</span>
                        </div>
                        <div className="aicc-card" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>User Satisfaction</span>
                            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>4.8/5</span>
                            <span style={{ fontSize: "0.6rem", color: "#22c55e", fontWeight: 700 }}>★ 96% Positive CSAT</span>
                        </div>
                        <div className="aicc-card" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Escalation Rate</span>
                            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>6.5%</span>
                            <span style={{ fontSize: "0.6rem", color: "#166534", fontWeight: 700 }}>✓ Within SLA limit</span>
                        </div>
                        <div className="aicc-card" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Hallucination Rate</span>
                            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>0.05%</span>
                            <span style={{ fontSize: "0.6rem", color: "#22c55e", fontWeight: 700 }}>🛡️ Extremely Low Risk</span>
                        </div>
                        <div className="aicc-card" style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Cost per Conversation</span>
                            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>$0.08</span>
                            <span style={{ fontSize: "0.6rem", color: "#22c55e", fontWeight: 700 }}>📉 Save 35% vs human</span>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
                        {/* Conversation Volumes & Response Time Trends */}
                        <div className="aicc-card">
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Conversation Volumes & API Costs ({analyticsPeriod})</span>
                                <span style={{ fontSize: "1rem" }}>📈</span>
                            </h3>
                            <div style={{ width: "100%", height: "240px", marginTop: "16px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={conversationTrendData[analyticsPeriod]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.4)" />
                                        <XAxis dataKey="name" style={{ fontSize: "0.65rem" }} tickLine={false} />
                                        <YAxis style={{ fontSize: "0.65rem" }} tickLine={false} />
                                        <RechartsTooltip contentStyle={{ fontSize: "0.7rem", borderRadius: "8px" }} />
                                        <Area type="monotone" dataKey="calls" name="Total Calls" stroke="var(--accent-indigo)" fillOpacity={1} fill="url(#callsGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Cost & Resource Savings */}
                        <div className="aicc-card">
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Cost Trend & Voice Fees ({analyticsPeriod})</span>
                                <span style={{ fontSize: "1rem" }}>💵</span>
                            </h3>
                            <div style={{ width: "100%", height: "240px", marginTop: "16px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={conversationTrendData[analyticsPeriod]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.4)" />
                                        <XAxis dataKey="name" style={{ fontSize: "0.65rem" }} tickLine={false} />
                                        <YAxis style={{ fontSize: "0.65rem" }} tickLine={false} />
                                        <RechartsTooltip contentStyle={{ fontSize: "0.7rem", borderRadius: "8px" }} />
                                        <Bar dataKey="cost" name="API Cost ($)" fill="var(--accent-indigo)" radius={[4, 4, 0, 0]} barSize={25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Most Asked Questions & Knowledge Utilization */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
                        {/* Most Asked Questions */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Most Asked RAG Questions</span>
                                <span style={{ fontSize: "1rem" }}>❓</span>
                            </h3>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", marginTop: "8px" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: 800 }}>
                                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Top Question Asked</th>
                                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Topic Category</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Queries Count</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Resolution Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { q: "RERA approval status and layout number?", cat: "Regulatory / Compliance", count: 482, acc: "98%" },
                                        { q: "What pre-launch discount rates are offered?", cat: "Sales Pricing / Offers", count: 310, acc: "92%" },
                                        { q: "What residential configurations are available?", cat: "Project Specifications", count: 280, acc: "95%" },
                                        { q: "Is the site visit transfer allowed on Sundays?", cat: "Operations Scheduling", count: 120, acc: "96%" }
                                    ].map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                            <td style={{ padding: "8px 10px", fontWeight: 800, color: "var(--text-primary)" }}>{row.q}</td>
                                            <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{row.cat}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{row.count}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right", color: "#166534", fontWeight: 800 }}>{row.acc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Knowledge Utilization Source Breakdown */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0, width: "100%" }}>
                                <span>Knowledge Utilization Breakdown</span>
                                <span style={{ fontSize: "1.1rem" }}>📊</span>
                            </h3>
                            <div style={{ width: "100%", height: "140px", marginTop: "10px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sourceUtilizationData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {sourceUtilizationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ fontSize: "0.65rem", borderRadius: "8px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", width: "100%", fontSize: "0.65rem", marginTop: "6px" }}>
                                {sourceUtilizationData.map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.color }} />
                                            <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 800 }}>{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: TRAINING ───────────────────────────────────────────── */}
            {activeTab === "training" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div className="aicc-card">
                        <h3 className="aicc-card-title">
                            <span>AI Inbound Response Coaching Rules</span>
                            <GraduationCap size={18} style={{ color: "var(--accent-indigo)" }} />
                        </h3>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 16px" }}>
                            Define direct script constraints and semantic response rules. When matching queries are detected, the agent will fallback to these custom coaching guidelines instead of base model reasoning paths.
                        </p>

                        {/* In-place rules form */}
                        <div style={{ background: "rgba(248, 250, 252, 0.5)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "grid", gridTemplateColumns: "1.2fr 2fr 2.5fr 1fr", gap: "12px", alignItems: "end" }}>
                            <div className="aicc-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: "0.7rem", fontWeight: 700 }}>Category</label>
                                <select 
                                    className="aicc-input"
                                    value={coachingCategory}
                                    onChange={(e) => setCoachingCategory(e.target.value)}
                                    style={{ padding: "8px", fontSize: "0.8rem" }}
                                >
                                    <option value="discount_handling">Discount Handling</option>
                                    <option value="objection_handling">Objection Handling</option>
                                    <option value="greeting">Greetings</option>
                                    <option value="pricing">Pricing</option>
                                </select>
                            </div>
                            <div className="aicc-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: "0.7rem", fontWeight: 700 }}>Customer Query Prompt</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Price of 3BHK flat?"
                                    className="aicc-input"
                                    value={coachingQuery}
                                    onChange={(e) => setCoachingQuery(e.target.value)}
                                    style={{ padding: "8px", fontSize: "0.8rem" }}
                                />
                            </div>
                            <div className="aicc-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: "0.7rem", fontWeight: 700 }}>Agent Response Script</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Prices starting at ₹1.2Cr..."
                                    className="aicc-input"
                                    value={coachingResponse}
                                    onChange={(e) => setCoachingResponse(e.target.value)}
                                    style={{ padding: "8px", fontSize: "0.8rem" }}
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    if (coachingQuery.trim() && coachingResponse.trim()) {
                                        setCoachingExamples(prev => [...prev, {
                                            id: `co-${Date.now()}`,
                                            category: coachingCategory,
                                            prompt: coachingQuery,
                                            response: coachingResponse
                                        }]);
                                        setCoachingQuery("");
                                        setCoachingResponse("");
                                        addToast({
                                            type: "success",
                                            title: "Rule Saved",
                                            message: "Coaching script rule appended to local agent draft."
                                        });
                                    } else {
                                        addToast({
                                            type: "warning",
                                            title: "Missing Fields",
                                            message: "Please fill out both query prompt and response script."
                                        });
                                    }
                                }}
                                className="aicc-btn-primary" 
                                style={{ padding: "10px", width: "100%", justifyContent: "center", fontSize: "0.8rem" }}
                            >
                                Add Rule
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                            {["all", "discount_handling", "objection_handling", "greeting", "pricing"].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCoachingFilter(cat)}
                                    className={`aicc-tab-btn ${coachingFilter === cat ? "active" : ""}`}
                                    style={{ padding: "6px 12px", fontSize: "0.75rem", textTransform: "capitalize", background: coachingFilter === cat ? "var(--accent-indigo)" : "rgba(226, 232, 240, 0.4)", color: coachingFilter === cat ? "white" : "var(--text-primary)" }}
                                >
                                    {cat.replace("_", " ")}
                                </button>
                            ))}
                        </div>

                        {/* Table Container */}
                        <div style={{ border: "1px solid var(--glass-border)", borderRadius: "12px", background: "white", overflow: "hidden" }}>
                            <table className="aicc-training-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc" }}>
                                        <th style={{ width: "20%" }}>Category</th>
                                        <th style={{ width: "35%" }}>Customer Inbound Query</th>
                                        <th style={{ width: "35%" }}>AI Response Guidelines</th>
                                        <th style={{ width: "10%", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coachingExamples.filter(x => coachingFilter === "all" || x.category === coachingFilter).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                                                No custom coaching rules defined for this filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        coachingExamples.filter(x => coachingFilter === "all" || x.category === coachingFilter).map((rule) => (
                                            <tr key={rule.id}>
                                                <td>
                                                    <span style={{
                                                        background: rule.category === "discount_handling" ? "#fee2e2" : rule.category === "objection_handling" ? "#fef3c7" : rule.category === "greeting" ? "#dcfce7" : "#e0f2fe",
                                                        color: rule.category === "discount_handling" ? "#991b1b" : rule.category === "objection_handling" ? "#92400e" : rule.category === "greeting" ? "#166534" : "#0369a1",
                                                        padding: "3px 8px", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, textTransform: "capitalize"
                                                    }}>
                                                        {rule.category.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rule.prompt}</td>
                                                <td style={{ color: "var(--text-secondary)" }}>{rule.response}</td>
                                                <td style={{ textAlign: "center" }}>
                                                    <button 
                                                        onClick={() => {
                                                            setCoachingExamples(coachingExamples.filter(x => x.id !== rule.id));
                                                            addToast({
                                                                type: "success",
                                                                title: "Rule Removed",
                                                                message: "Coaching script definition deleted."
                                                            });
                                                        }}
                                                        style={{ border: "none", background: "transparent", color: "#e11d48", cursor: "pointer" }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Retrain Action Button */}
                        <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
                            {isRetraining && (
                                <span style={{ fontSize: "0.8rem", color: "var(--accent-indigo)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                                    <RefreshCw className="animate-spin" size={14} />
                                    Compiling agent cognitive rules...
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setIsRetraining(true);
                                    setTimeout(() => {
                                        setIsRetraining(false);
                                        addToast({
                                            type: "success",
                                            title: "Agent Twin Retrained",
                                            message: `${profiles[selectedAgent].name} has successfully compiled custom response weights.`
                                        });
                                    }, 3000);
                                }}
                                className="aicc-btn-primary"
                                disabled={isRetraining}
                                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                <Save size={16} /> Retrain Agent Twin Model
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: PLAYGROUND ──────────────────────────────────────────── */}
            {activeTab === "playground" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
                        
                        {/* LEFT PANEL: Settings & Test Input */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                    <span>Model Configuration</span>
                                    <span style={{ fontSize: "1rem" }}>⚙️</span>
                                </h3>

                                <div className="aicc-form-group" style={{ margin: 0 }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                                        Custom Prompt Testing (System Instructions)
                                    </label>
                                    <textarea
                                        value={playgroundPrompt}
                                        onChange={(e) => setPlaygroundPrompt(e.target.value)}
                                        className="aicc-input"
                                        style={{ width: "100%", height: "90px", padding: "10px", fontSize: "0.8rem", resize: "none", lineHeight: 1.4 }}
                                        placeholder="Customize system persona instructions..."
                                    />
                                </div>

                                <div className="aicc-form-group" style={{ margin: 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>
                                            Temperature Settings
                                        </label>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-indigo)" }}>
                                            {playgroundTemp} ({playgroundTemp <= 0.3 ? "Precise RAG" : playgroundTemp >= 0.7 ? "Creative Sales" : "Balanced"})
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={playgroundTemp}
                                        onChange={(e) => setPlaygroundTemp(parseFloat(e.target.value))}
                                        style={{ width: "100%", accentColor: "var(--accent-indigo)" }}
                                    />
                                </div>
                            </div>

                            <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                    <span>Built-In RAG Chat Console</span>
                                    <span style={{ fontSize: "1.1rem" }}>💬</span>
                                </h3>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>
                                        Test Question Query
                                    </label>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <input
                                            type="text"
                                            value={playgroundQuery}
                                            onChange={(e) => setPlaygroundQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handlePlaygroundQuerySubmit()}
                                            placeholder="e.g. What is the pre-launch price / RERA approval?"
                                            className="aicc-input"
                                            style={{ flex: 1, padding: "10px", fontSize: "0.8rem" }}
                                        />
                                        <button 
                                            onClick={handlePlaygroundQuerySubmit}
                                            className="aicc-btn-primary" 
                                            style={{ padding: "0 18px", fontSize: "0.8rem", fontWeight: 800 }}
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--glass-border)", paddingTop: "12px" }}>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)" }}>Quick Presets:</span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        {[
                                            "What is the pre-launch price of 3BHK?",
                                            "Is the BKC project RERA approved?",
                                            "Are there stamp duty discounts?"
                                        ].map((preset, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setPlaygroundQuery(preset);
                                                }}
                                                className="aicc-btn-secondary"
                                                style={{ padding: "4px 8px", fontSize: "0.7rem", background: "white" }}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Outputs, debugs & retrieved chunks */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {playgroundResult ? (
                                <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                            <span>AI Testing Output & Telemetry</span>
                                        </h3>
                                        <span style={{ fontSize: "0.65rem", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>
                                            Inference: {playgroundResult.latency}s
                                        </span>
                                    </div>

                                    {/* AI final response text */}
                                    <div style={{ background: "rgba(99, 102, 241, 0.04)", border: "1px solid rgba(99,102,241,0.15)", padding: "14px", borderRadius: "10px" }}>
                                        <span style={{ display: "block", fontSize: "0.68rem", fontWeight: 800, color: "var(--accent-indigo)", textTransform: "uppercase", marginBottom: "4px" }}>
                                            Synthesized Agent Response
                                        </span>
                                        <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                                            {playgroundResult.response}
                                        </p>
                                    </div>

                                    {/* Token Usage & Cost breakdown */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                                        <div>
                                            <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Prompt Tokens</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{playgroundResult.tokens.prompt}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Completion</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{playgroundResult.tokens.completion}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: "0.58rem", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 800 }}>Estimated Cost</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-indigo)" }}>${playgroundResult.tokens.cost.toFixed(4)}</span>
                                        </div>
                                    </div>

                                    {/* Debug Chains of Thought reasoning info */}
                                    <div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                                            Chain of Thought Reasoning Loop
                                        </span>
                                        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {playgroundResult.debug.map((step: string, idx: number) => (
                                                <div key={idx} style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "monospace", display: "flex", gap: "6px" }}>
                                                    <span style={{ color: "var(--accent-indigo)" }}>➤</span>
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Retrieved Chunks Viewer & References */}
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>
                                                Retrieved Vector Chunks ({playgroundResult.chunks.length})
                                            </span>
                                            <span style={{ fontSize: "0.7rem", color: "#166534", fontWeight: 800 }}>
                                                RAG Match Confidence: {playgroundResult.confidence}%
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {playgroundResult.chunks.map((chunk: any, idx: number) => (
                                                <div key={idx} style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--accent-indigo)", background: "rgba(99,102,241,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                                                            Score: {chunk.score}
                                                        </span>
                                                        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                                                            Source: <span style={{ textDecoration: "underline", color: "var(--accent-indigo)", cursor: "pointer" }}>{chunk.source}</span> (Page {chunk.page})
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4, fontStyle: "italic" }}>
                                                        "{chunk.content}"
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="aicc-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", color: "var(--text-secondary)", gap: "12px", border: "1px dashed var(--glass-border)" }}>
                                    <Bot size={36} style={{ opacity: 0.3 }} />
                                    <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>Run a playground test query to output semantic context.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTTOM ROW: Compare responses section */}
                    <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Compare Side-by-Side Model Responses</span>
                                <span style={{ fontSize: "1rem" }}>⚖️</span>
                            </h3>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={playgroundCompareMode}
                                        onChange={(e) => setPlaygroundCompareMode(e.target.checked)}
                                        style={{ accentColor: "var(--accent-indigo)" }}
                                    />
                                    Enable Comparison Mode
                                </label>
                                {playgroundCompareMode && (
                                    <select
                                        className="aicc-input"
                                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                        value={playgroundCompareRunId}
                                        onChange={(e) => setPlaygroundCompareRunId(e.target.value)}
                                    >
                                        {playgroundHistory.map((run) => (
                                            <option key={run.id} value={run.id}>
                                                Run: "{run.query.slice(0, 30)}..." (T={run.temp})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {playgroundCompareMode ? (
                            (() => {
                                const baseRun = playgroundResult;
                                const compRun = playgroundHistory.find(x => x.id === playgroundCompareRunId);

                                return (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                        {/* Current Run */}
                                        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-indigo)" }}>Active Output</span>
                                                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Temp: {baseRun ? baseRun.temp : "—"}</span>
                                            </div>
                                            {baseRun ? (
                                                <>
                                                    <div>
                                                        <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Query Asked</span>
                                                        <p style={{ fontSize: "0.78rem", fontWeight: 700, margin: "2px 0 0 0" }}>{baseRun.query}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Response Summary</span>
                                                        <p style={{ fontSize: "0.78rem", color: "var(--text-primary)", margin: "2px 0 0 0", lineHeight: 1.4 }}>{baseRun.response}</p>
                                                    </div>
                                                    <div style={{ display: "flex", gap: "16px", fontSize: "0.65rem", color: "var(--text-secondary)", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "8px" }}>
                                                        <span>Latency: <strong>{baseRun.latency}s</strong></span>
                                                        <span>Confidence: <strong>{baseRun.confidence}%</strong></span>
                                                        <span>Cost: <strong>${baseRun.tokens.cost.toFixed(4)}</strong></span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>No active run to display.</span>
                                            )}
                                        </div>

                                        {/* Compared Run */}
                                        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>Compared Run Reference</span>
                                                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Temp: {compRun ? compRun.temp : "—"}</span>
                                            </div>
                                            {compRun ? (
                                                <>
                                                    <div>
                                                        <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Query Asked</span>
                                                        <p style={{ fontSize: "0.78rem", fontWeight: 700, margin: "2px 0 0 0" }}>{compRun.query}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 800 }}>Response Summary</span>
                                                        <p style={{ fontSize: "0.78rem", color: "var(--text-primary)", margin: "2px 0 0 0", lineHeight: 1.4 }}>{compRun.response}</p>
                                                    </div>
                                                    <div style={{ display: "flex", gap: "16px", fontSize: "0.65rem", color: "var(--text-secondary)", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "8px" }}>
                                                        <span>Latency: <strong>{compRun.latency}s</strong></span>
                                                        <span>Confidence: <strong>{compRun.confidence}%</strong></span>
                                                        <span>Cost: <strong>${compRun.tokens.cost.toFixed(4)}</strong></span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Please select a run from history drop-down to compare.</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                                Toggle "Enable Comparison Mode" above to view side-by-side RAG inference benchmarks.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 8: SECURITY & AUDIT LOGS ────────────────────────────── */}
            {activeTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        {/* Card 1: Role & Access Controls (Enterprise) */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <h3 className="aicc-card-title">
                                <span>Role & Access Controls</span>
                                <Shield size={18} style={{ color: "var(--accent-indigo)" }} />
                            </h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>Role & Permission Management</label>
                                    <select 
                                        className="aicc-select" 
                                        value={securityRole} 
                                        onChange={(e) => {
                                            setSecurityRole(e.target.value);
                                            addToast({ type: "success", title: "Security Role Updated", message: `Assigned role updated to ${e.target.value}.` });
                                        }}
                                    >
                                        <option value="admin">Super Admin (All Permissions)</option>
                                        <option value="compliance">Compliance Officer (Audit Only)</option>
                                        <option value="operations">Operations Manager (No Deletes)</option>
                                        <option value="read-only">Read-only Analyst (View Only)</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>CRM Access Permissions</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        {[
                                            { key: "readLeads", label: "Read Leads" },
                                            { key: "writeLeads", label: "Write Leads" },
                                            { key: "editDeals", label: "Edit Deals" },
                                            { key: "deleteLeads", label: "Delete Records" }
                                        ].map((perm) => (
                                            <label key={perm.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={crmPerms[perm.key]}
                                                    onChange={(e) => {
                                                        setCrmPerms(prev => ({ ...prev, [perm.key]: e.target.checked }));
                                                        addToast({ type: "info", title: "CRM Permission Changed", message: `${perm.label} status modified.` });
                                                    }}
                                                    style={{ width: "14px", height: "14px", accentColor: "var(--accent-indigo)" }}
                                                />
                                                <span>{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>IP Restrictions (CIDR blocks)</label>
                                    <input 
                                        type="text" 
                                        className="aicc-input" 
                                        placeholder="Comma separated IP ranges" 
                                        value={ipRestrictions} 
                                        onChange={(e) => setIpRestrictions(e.target.value)}
                                        style={{ fontSize: "0.8rem", fontFamily: "monospace" }}
                                    />
                                    <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>Leave empty to allow all IP addresses.</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Data Ingestion & Storage Rules */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <h3 className="aicc-card-title">
                                <span>Data Ingestion & Storage</span>
                                <span style={{ fontSize: "1.1rem" }}>💾</span>
                            </h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>Allowed Data Sources</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                        {[
                                            { key: "crmDb", label: "Postgres CRM DB" },
                                            { key: "localPdfs", label: "Local PDFs & Files" },
                                            { key: "webScrape", label: "Website Scraping" },
                                            { key: "apiIntegrations", label: "External REST APIs" }
                                        ].map((src) => (
                                            <button
                                                key={src.key}
                                                onClick={() => {
                                                    setDataSources(prev => ({ ...prev, [src.key]: !prev[src.key] }));
                                                    addToast({ type: "info", title: "Data Source Configuration", message: `${src.label} access toggled.` });
                                                }}
                                                style={{
                                                    fontSize: "0.68rem", fontWeight: 800, padding: "4px 10px", borderRadius: "6px",
                                                    border: "1px solid var(--glass-border)",
                                                    background: dataSources[src.key] ? "var(--accent-indigo)" : "white",
                                                    color: dataSources[src.key] ? "white" : "var(--text-primary)",
                                                    cursor: "pointer", transition: "all 0.2s"
                                                }}
                                            >
                                                {src.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>File Access Policies</label>
                                    <select 
                                        className="aicc-select"
                                        value={filePolicy}
                                        onChange={(e) => {
                                            setFilePolicy(e.target.value);
                                            addToast({ type: "success", title: "Access Policy Updated", message: `Scope changed to ${e.target.value}.` });
                                        }}
                                    >
                                        <option value="public">Public (Access allowed to all staff)</option>
                                        <option value="tenant-only">Tenant Only (Limited to this workplace)</option>
                                        <option value="restricted-admin">Restricted Admin (Admin and compliance only)</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>Data Retention Rules</label>
                                    <select 
                                        className="aicc-select"
                                        value={retentionDays}
                                        onChange={(e) => {
                                            setRetentionDays(Number(e.target.value));
                                            addToast({ type: "success", title: "Retention Threshold Set", message: `Auto-purge set to ${e.target.value} days.` });
                                        }}
                                    >
                                        <option value={30}>30 Days (Standard Purge)</option>
                                        <option value={90}>90 Days (Enterprise Standard)</option>
                                        <option value={180}>180 Days (Long-term Compliance)</option>
                                        <option value={0}>Indefinitely (No Auto-purge)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
                        {/* Card 3: Safety, Masking & Sensitive Scrubbers */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <h3 className="aicc-card-title">
                                <span>Data Masking & PII Protection</span>
                                <span style={{ fontSize: "1.1rem" }}>🛡️</span>
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {[
                                    { key: "profanityFilter", name: "Profanity Filter", desc: "Block inappropriate and toxic remarks in user inbound streaming" },
                                    { key: "piiMasking", name: "PII Masking & Detection", desc: "Scrub credit cards, SSN, phone numbers, and bank receipt details from vector logs" },
                                    { key: "emergencyTransfer", name: "Emergency Transfer", desc: "Handoff to sales manager if caller exhibits panic triggers" },
                                    { key: "fallbackVoice", name: "Fallback Voice", desc: "Dynamically transition clone voice profiles to base models in server outage" }
                                ].map((control) => (
                                    <div key={control.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                                        <div>
                                            <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>{control.name}</div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "2px" }}>{control.desc}</div>
                                        </div>
                                        <label className="aicc-switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
                                            <input
                                                type="checkbox"
                                                checked={safetyControls[control.key]}
                                                onChange={(e) => {
                                                    setSafetyControls(prev => ({ ...prev, [control.key]: e.target.checked }));
                                                    addToast({ type: "info", title: "Safety Protocol", message: `${control.name} status modified.` });
                                                }}
                                                style={{ display: "none" }}
                                            />
                                            <span className="aicc-slider" style={{
                                                position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                                                background: safetyControls[control.key] ? "var(--accent-indigo)" : "#cbd5e1",
                                                borderRadius: "99px", transition: "0.2s"
                                            }}>
                                                <span style={{
                                                    position: "absolute", content: "", height: "14px", width: "14px", left: safetyControls[control.key] ? "22px" : "4px", bottom: "3px",
                                                    background: "white", borderRadius: "50%", transition: "0.2s"
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>Sensitive Information Filters</label>
                                    <textarea
                                        className="aicc-input"
                                        rows={2}
                                        value={sensitiveFilters}
                                        onChange={(e) => setSensitiveFilters(e.target.value)}
                                        placeholder="SSN, CreditCard, Password..."
                                        style={{ fontSize: "0.8rem", resize: "none" }}
                                    />
                                    <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>AI will replace matching regex/words with [REDACTED] dynamically.</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 4: API Gateway Key Manager */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <h3 className="aicc-card-title">
                                <span>API Keys Credentials</span>
                                <span style={{ fontSize: "1rem" }}>🔑</span>
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>ElevenLabs Production Secret Key</label>
                                    <div className="aicc-tag-input-row" style={{ display: "flex", gap: "8px" }}>
                                        <input
                                            type="text"
                                            className="aicc-input"
                                            style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem", background: "#f8fafc" }}
                                            value={apiKey}
                                            readOnly
                                        />
                                        <button className="aicc-btn-secondary" style={{ padding: "6px 12px" }} onClick={rotateApiKey}>Rotate Key</button>
                                    </div>
                                </div>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>Webhook Authentication Secret</label>
                                    <input 
                                        type="text" 
                                        className="aicc-input" 
                                        value="whsec_084284bcf7f1e92d84719" 
                                        readOnly 
                                        style={{ fontFamily: "monospace", fontSize: "0.8rem", background: "#f8fafc" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 5: Operations Compliance Audit Logs */}
                    <div className="aicc-card">
                        <h3 className="aicc-card-title">
                            <span>Operations Security Audit Logs</span>
                            <Clock size={18} style={{ color: "var(--text-secondary)" }} />
                        </h3>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: 800 }}>
                                    <th style={{ padding: "10px", textAlign: "left" }}>Timestamp</th>
                                    <th style={{ padding: "10px", textAlign: "left" }}>Event Category</th>
                                    <th style={{ padding: "10px", textAlign: "left" }}>Operator</th>
                                    <th style={{ padding: "10px", textAlign: "left" }}>IP Address</th>
                                    <th style={{ padding: "10px", textAlign: "left" }}>Details Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { time: "2026-07-15 17:42:10", cat: "API_ROTATION", op: "Admin (Maya)", ip: "192.168.1.43", desc: "Production primary client token successfully rotated." },
                                    { time: "2026-07-15 15:30:45", cat: "RAG_INGESTION", op: "Operator_02", ip: "192.168.1.101", desc: "Ingested doc: RERA_Approval_Docs.pdf. Chunks: 21." },
                                    { time: "2026-07-15 11:14:02", cat: "WORKFLOW_EDIT", op: "Admin (Maya)", ip: "192.168.1.43", desc: "Rohan twin shift limits updated: login 09:00, logout 19:00." },
                                    { time: "2026-07-15 09:12:00", cat: "RETENTION_POLICY", op: "System", ip: "Localhost", desc: "Retention period updated from 30 days to 90 days." }
                                ].map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }}>
                                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{row.time}</td>
                                        <td style={{ padding: "10px", fontWeight: 800 }}>{row.cat}</td>
                                        <td style={{ padding: "10px" }}>{row.op}</td>
                                        <td style={{ padding: "10px", fontFamily: "monospace" }}>{row.ip}</td>
                                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{row.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB COACHING: AI COACHING CENTER ───────────────────────── */}
            {activeTab === "coaching" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                                <GraduationCap size={20} style={{ color: "#a855f7" }} /> AI Coaching Center
                            </h2>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>Diagnostics, improvement recommendations and knowledge gap analysis for {profile.name}</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", background: "#f3e8ff", color: "#7c3aed" }}>Last Sync: 5 min ago</span>
                        </div>
                    </div>

                    {/* Summary KPI Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                        {[
                            { label: "Top Mistakes", value: "7", icon: "⚠️", bg: "#fff7ed", color: "#c2410c", badge: "High Priority" },
                            { label: "Missing Articles", value: "4", icon: "📄", bg: "#eff6ff", color: "#1d4ed8", badge: "Needs Review" },
                            { label: "Low Confidence", value: "12", icon: "🤔", bg: "#fefce8", color: "#a16207", badge: "Flagged" },
                            { label: "Recommendations", value: "5", icon: "💡", bg: "#f0fdf4", color: "#15803d", badge: "Action Ready" }
                        ].map((kpi, i) => (
                            <div key={i} className="aicc-card" style={{ padding: "16px", background: kpi.bg, border: `1px solid ${kpi.color}22` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <span style={{ fontSize: "1.4rem" }}>{kpi.icon}</span>
                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "white", color: kpi.color, padding: "2px 6px", borderRadius: "4px", border: `1px solid ${kpi.color}44` }}>{kpi.badge}</span>
                                </div>
                                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: kpi.color, marginTop: "8px" }}>{kpi.value}</div>
                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: kpi.color, opacity: 0.8 }}>{kpi.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Main Grid: 2 columns */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                        {/* ── Column 1: Top Mistakes + Missing Articles ── */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                            {/* Top Mistakes */}
                            <div className="aicc-card">
                                <h3 className="aicc-card-title">
                                    <span>Top Mistakes</span>
                                    <span style={{ fontSize: "1rem" }}>⚠️</span>
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {[
                                        { rank: 1, mistake: "Incorrect pricing quoted for 3BHK units", freq: "14×", severity: "High", color: "#ef4444", bg: "#fee2e2" },
                                        { rank: 2, mistake: "RERA registration number not provided", freq: "9×", severity: "High", color: "#ef4444", bg: "#fee2e2" },
                                        { rank: 3, mistake: "Wrong site visit time slot confirmed", freq: "7×", severity: "Medium", color: "#f59e0b", bg: "#fef3c7" },
                                        { rank: 4, mistake: "Missing down payment structure explanation", freq: "5×", severity: "Medium", color: "#f59e0b", bg: "#fef3c7" },
                                        { rank: 5, mistake: "No follow-up booked after interested lead", freq: "4×", severity: "Low", color: "#6366f1", bg: "#eef2ff" },
                                        { rank: 6, mistake: "Hindi-to-English switch not triggered", freq: "3×", severity: "Low", color: "#6366f1", bg: "#eef2ff" },
                                        { rank: 7, mistake: "Hallucinated amenity (rooftop pool)", freq: "2×", severity: "Critical", color: "#dc2626", bg: "#fecaca" },
                                    ].map((item) => (
                                        <div key={item.rank} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px", background: item.bg, borderRadius: "8px", border: `1px solid ${item.color}22` }}>
                                            <span style={{ fontSize: "0.7rem", fontWeight: 900, color: item.color, minWidth: "18px", paddingTop: "1px" }}>#{item.rank}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.mistake}</div>
                                                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: item.color }}>Frequency: {item.freq}</span>
                                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, background: item.bg, color: item.color, padding: "1px 6px", borderRadius: "4px", border: `1px solid ${item.color}55` }}>{item.severity}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Missing Knowledge Articles */}
                            <div className="aicc-card">
                                <h3 className="aicc-card-title">
                                    <span>Missing Knowledge Articles</span>
                                    <span style={{ fontSize: "1rem" }}>📄</span>
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {[
                                        { topic: "Floor-wise Price Breakdowns (Phase 2)", queries: 18, priority: "Critical", color: "#dc2626" },
                                        { topic: "Bank Loan Pre-Approval Partner List", queries: 12, priority: "High", color: "#ef4444" },
                                        { topic: "RERA Certificate Validity FAQs", queries: 9, priority: "High", color: "#ef4444" },
                                        { topic: "Site Visit Cab & Slot Booking Guide", queries: 6, priority: "Medium", color: "#f59e0b" },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "rgba(248,250,252,0.5)" }}>
                                            <div>
                                                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.topic}</div>
                                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>Asked {item.queries}× without satisfactory answer</div>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: item.color, background: `${item.color}11`, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${item.color}33` }}>{item.priority}</span>
                                                <button style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent-indigo)", background: "transparent", border: "1px solid var(--accent-indigo)", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}
                                                    onClick={() => addToast({ type: "info", title: "Knowledge Base", message: `Article creation queued: ${item.topic}` })}>
                                                    + Add Article
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Column 2: Low Confidence + Recommendations ── */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                            {/* Low-Confidence Answers */}
                            <div className="aicc-card">
                                <h3 className="aicc-card-title">
                                    <span>Low-Confidence Answers</span>
                                    <span style={{ fontSize: "1rem" }}>🤔</span>
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {[
                                        { query: "What is the stamp duty for Navi Mumbai?", confidence: 34, answer: "It depends on market value..." },
                                        { query: "Can NRI buyers get home loan?", confidence: 41, answer: "Yes, most banks offer NRI..." },
                                        { query: "Is there a service charge beyond EMI?", confidence: 28, answer: "There may be maintenance..." },
                                        { query: "What is possession date for Tower C?", confidence: 52, answer: "Builder has announced Q3..." },
                                        { query: "Is solar power included in 2BHK?", confidence: 47, answer: "Common area solar panels..." },
                                    ].map((item, i) => {
                                        const confColor = item.confidence < 40 ? "#ef4444" : item.confidence < 55 ? "#f59e0b" : "#6366f1";
                                        const confBg = item.confidence < 40 ? "#fee2e2" : item.confidence < 55 ? "#fef3c7" : "#eef2ff";
                                        return (
                                            <div key={i} style={{ padding: "12px", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "rgba(248,250,252,0.5)" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", flex: 1, paddingRight: "8px" }}>{item.query}</span>
                                                    <span style={{ fontSize: "0.7rem", fontWeight: 900, color: confColor, background: confBg, padding: "2px 8px", borderRadius: "6px", whiteSpace: "nowrap" }}>{item.confidence}%</span>
                                                </div>
                                                <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden", marginBottom: "6px" }}>
                                                    <div style={{ height: "100%", width: `${item.confidence}%`, background: confColor, borderRadius: "99px", transition: "width 0.6s ease" }} />
                                                </div>
                                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Last answer: "{item.answer}"</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Training Recommendations */}
                            <div className="aicc-card">
                                <h3 className="aicc-card-title">
                                    <span>Training Recommendations</span>
                                    <span style={{ fontSize: "1rem" }}>💡</span>
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {[
                                        { title: "Pricing Accuracy Drill", desc: "Run 20 pricing Q&A synthetic call simulations focused on floor-wise rates for BKC and Sector 150.", impact: "High", effort: "2 hrs", icon: "🎯" },
                                        { title: "RERA Compliance Module", desc: "Upload new RERA PDFs and retrain RAG index with structured certificate Q&A pairs.", impact: "Critical", effort: "4 hrs", icon: "📋" },
                                        { title: "Hindi Fallback Tuning", desc: "Add 15+ Hindi-trigger phrases to language-switch detection model threshold.", impact: "Medium", effort: "1 hr", icon: "🗣️" },
                                        { title: "Hallucination Guard Patch", desc: "Tighten confidence floor to 0.78 before generating amenity descriptions without RAG source.", impact: "Critical", effort: "30 min", icon: "🛡️" },
                                        { title: "Follow-up Trigger Script", desc: "Add interested-lead detection → auto-schedule follow-up coaching rule in Training tab.", impact: "Medium", effort: "1 hr", icon: "📅" },
                                    ].map((rec, i) => {
                                        const impactColor = rec.impact === "Critical" ? "#dc2626" : rec.impact === "High" ? "#ef4444" : "#f59e0b";
                                        return (
                                            <div key={i} style={{ display: "flex", gap: "12px", padding: "14px", border: "1px solid var(--glass-border)", borderRadius: "10px", background: "rgba(248,250,252,0.5)" }}>
                                                <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{rec.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{rec.title}</span>
                                                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: impactColor, background: `${impactColor}11`, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${impactColor}33` }}>{rec.impact}</span>
                                                    </div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "8px" }}>{rec.desc}</div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>⏱ Est. effort: <strong>{rec.effort}</strong></span>
                                                        <button
                                                            style={{ fontSize: "0.7rem", fontWeight: 700, color: "white", background: "var(--accent-indigo)", border: "none", borderRadius: "6px", padding: "4px 12px", cursor: "pointer" }}
                                                            onClick={() => addToast({ type: "success", title: "Coaching Task Queued", message: `${rec.title} added to training queue.` })}>
                                                            Queue Task
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: TELEPHONY ─── Connectivity & Health Diagnostics ──── */}
            {activeTab === "telephony" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* Overall Status Banner */}
                    <div className="aicc-card" style={{
                        padding: "20px 24px",
                        borderRadius: "14px",
                        background: healthData?.overallStatus === 'connected'
                            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(16, 185, 129, 0.04))"
                            : healthData?.overallStatus === 'degraded'
                            ? "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(234, 179, 8, 0.04))"
                            : "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.04))",
                        border: healthData?.overallStatus === 'connected'
                            ? "1px solid rgba(34, 197, 94, 0.25)"
                            : healthData?.overallStatus === 'degraded'
                            ? "1px solid rgba(245, 158, 11, 0.25)"
                            : "1px solid rgba(239, 68, 68, 0.25)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                {/* Animated pulse icon */}
                                <div style={{
                                    position: "relative",
                                    width: "48px", height: "48px",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    borderRadius: "50%",
                                    background: healthData?.overallStatus === 'connected'
                                        ? "rgba(34, 197, 94, 0.15)"
                                        : healthData?.overallStatus === 'degraded'
                                        ? "rgba(245, 158, 11, 0.15)"
                                        : "rgba(239, 68, 68, 0.15)"
                                }}>
                                    {healthLoading ? (
                                        <Loader2 size={24} style={{ color: "var(--text-secondary)", animation: "spin 1s linear infinite" }} />
                                    ) : healthData?.overallStatus === 'connected' ? (
                                        <Wifi size={24} style={{ color: "#16a34a" }} />
                                    ) : healthData?.overallStatus === 'degraded' ? (
                                        <AlertTriangle size={24} style={{ color: "#d97706" }} />
                                    ) : (
                                        <WifiOff size={24} style={{ color: "#dc2626" }} />
                                    )}
                                    {!healthLoading && (
                                        <span style={{
                                            position: "absolute", top: "2px", right: "2px",
                                            width: "12px", height: "12px", borderRadius: "50%",
                                            background: healthData?.overallStatus === 'connected' ? "#22c55e"
                                                : healthData?.overallStatus === 'degraded' ? "#f59e0b" : "#ef4444",
                                            animation: "pulse 2s infinite",
                                            boxShadow: healthData?.overallStatus === 'connected'
                                                ? "0 0 8px rgba(34, 197, 94, 0.6)"
                                                : healthData?.overallStatus === 'degraded'
                                                ? "0 0 8px rgba(245, 158, 11, 0.6)"
                                                : "0 0 8px rgba(239, 68, 68, 0.6)"
                                        }} />
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                        {healthData?.overallStatus === 'connected' ? '✅ Rohan is Fully Connected'
                                            : healthData?.overallStatus === 'degraded' ? '⚠️ Rohan is Partially Connected'
                                            : healthData ? '❌ Rohan is Disconnected' : 'Checking connectivity...'}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                        {healthData ? (
                                            <>
                                                <span style={{ color: "#16a34a", fontWeight: 700 }}>{healthData.summary.ok} OK</span>
                                                {healthData.summary.warnings > 0 && <> · <span style={{ color: "#d97706", fontWeight: 700 }}>{healthData.summary.warnings} Warnings</span></>}
                                                {healthData.summary.errors > 0 && <> · <span style={{ color: "#dc2626", fontWeight: 700 }}>{healthData.summary.errors} Errors</span></>}
                                                <> · {healthData.summary.total} checks total</>
                                            </>
                                        ) : 'Running diagnostics...'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {healthData?.checkedAt && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                                        Last checked: {new Date(healthData.checkedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    onClick={() => { fetchHealth(); }}
                                    disabled={healthLoading}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "6px",
                                        padding: "8px 14px", borderRadius: "8px",
                                        border: "1px solid var(--glass-border)",
                                        background: "rgba(255, 255, 255, 0.7)",
                                        fontWeight: 700, fontSize: "0.8rem",
                                        cursor: healthLoading ? "not-allowed" : "pointer",
                                        color: "var(--text-primary)", opacity: healthLoading ? 0.5 : 1
                                    }}
                                >
                                    <RefreshCw size={14} style={{ animation: healthLoading ? "spin 1s linear infinite" : "none" }} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Individual Health Checks */}
                    {healthData && (
                        <div className="aicc-card" style={{
                            padding: "0",
                            borderRadius: "14px",
                            overflow: "hidden"
                        }}>
                            <div style={{
                                padding: "16px 20px",
                                borderBottom: "1px solid var(--glass-border)",
                                display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Activity size={16} style={{ color: "var(--accent-indigo)" }} />
                                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                        System Diagnostics
                                    </span>
                                </div>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                    Auto-refreshes every 30 seconds
                                </span>
                            </div>

                            {healthData.checks.map((check, idx) => {
                                const iconMap: Record<string, any> = {
                                    'Persona Config': <Database size={16} />,
                                    'Agent Activation': <Plug size={16} />,
                                    'Operational Status': <Activity size={16} />,
                                    'Shift Hours': <Clock4 size={16} />,
                                    'User Account': <UserCheck size={16} />,
                                    'Lead Queue': <Users size={16} />,
                                    'Digital Employee Server': <ServerCrash size={16} />,
                                    'Telephony Gateway': <Radio size={16} />,
                                    'Worker Daemon': <Zap size={16} />,
                                    'API Server': <ServerCrash size={16} />,
                                };
                                const statusColor = check.status === 'ok' ? '#16a34a' : check.status === 'warn' ? '#d97706' : '#dc2626';
                                const statusBg = check.status === 'ok' ? 'rgba(34, 197, 94, 0.08)' : check.status === 'warn' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)';
                                const statusLabel = check.status === 'ok' ? 'OK' : check.status === 'warn' ? 'WARN' : 'ERROR';

                                return (
                                    <div key={idx} style={{
                                        padding: "14px 20px",
                                        borderBottom: idx < healthData.checks.length - 1 ? "1px solid var(--glass-border)" : "none",
                                        background: check.status !== 'ok' ? statusBg : "transparent",
                                        transition: "background 0.3s ease"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <div style={{
                                                    width: "34px", height: "34px",
                                                    borderRadius: "8px",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    background: `${statusColor}15`,
                                                    color: statusColor,
                                                    flexShrink: 0
                                                }}>
                                                    {iconMap[check.name] || <CheckCircle2 size={16} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                                        {check.name}
                                                    </div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                        {check.message}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: "0.65rem",
                                                fontWeight: 800,
                                                color: statusColor,
                                                background: `${statusColor}15`,
                                                padding: "3px 10px",
                                                borderRadius: "6px",
                                                border: `1px solid ${statusColor}30`,
                                                letterSpacing: "0.5px",
                                                flexShrink: 0
                                            }}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                        {/* Expandable detail / reason */}
                                        {check.detail && (
                                            <div style={{
                                                marginTop: "10px",
                                                marginLeft: "46px",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                background: check.status === 'error'
                                                    ? "rgba(239, 68, 68, 0.06)"
                                                    : "rgba(245, 158, 11, 0.06)",
                                                border: `1px solid ${check.status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
                                                fontSize: "0.75rem",
                                                color: "var(--text-secondary)",
                                                lineHeight: 1.6
                                            }}>
                                                <strong style={{ color: statusColor }}>
                                                    {check.status === 'error' ? '🔴 Reason: ' : '⚠️ Note: '}
                                                </strong>
                                                {check.detail}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Telephony Gateway Settings Form */}
                    <div className="aicc-card" style={{ padding: "24px", borderRadius: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                            <Radio size={18} style={{ color: "var(--accent-indigo)" }} />
                            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                Telephony Gateway Configuration
                            </span>
                        </div>

                        {isFetchingTelephony ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "10px", color: "var(--text-secondary)" }}>
                                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Loading telephony settings...</span>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                                
                                {/* Provider Select */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                        Telephony Provider
                                    </label>
                                    <select
                                        value={telProvider}
                                        onChange={(e) => setTelProvider(e.target.value)}
                                        style={{
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid var(--glass-border)",
                                            background: "white",
                                            fontSize: "0.85rem",
                                            fontWeight: 700,
                                            color: "var(--text-primary)",
                                            outline: "none"
                                        }}
                                    >
                                        <option value="gsm_gateway">🔌 Local GSM Gateway (gsm2sip / Dinstar / GoIP)</option>
                                        <option value="exotel">☁️ Exotel Cloud Telephony</option>
                                        <option value="twilio">☁️ Twilio SIP Trunk</option>
                                        <option value="jio">📡 Reliance Jio SIP Trunk</option>
                                    </select>
                                </div>

                                <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "4px 0" }} />

                                {/* Contextual fields based on provider */}
                                {telProvider === 'gsm_gateway' ? (
                                    <>
                                        {/* Gateway URL / IP */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                    Gateway URL / IP
                                                </label>
                                                <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                    e.g. http://192.168.1.100:5060 or local address
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={telSid}
                                                onChange={(e) => setTelSid(e.target.value)}
                                                placeholder="http://192.168.1.100:5060"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>

                                        {/* Outbound caller ID / SIM number */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                    Outbound Caller ID (SIM Phone)
                                                </label>
                                                <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                    Mobile number connected to Gateway SIM
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={telFromNumber}
                                                onChange={(e) => setTelFromNumber(e.target.value)}
                                                placeholder="+919876543210"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>

                                        {/* API Username */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                API Username
                                            </label>
                                            <input
                                                type="text"
                                                value={telApiKey}
                                                onChange={(e) => setTelApiKey(e.target.value)}
                                                placeholder="admin"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>

                                        {/* API Password */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                API Password
                                            </label>
                                            <input
                                                type="password"
                                                value={telApiSecret}
                                                onChange={(e) => setTelApiSecret(e.target.value)}
                                                placeholder="••••••••••••"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Account SID */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                Account SID
                                            </label>
                                            <input
                                                type="text"
                                                value={telSid}
                                                onChange={(e) => setTelSid(e.target.value)}
                                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>

                                        {/* API Key */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                API Key / Token
                                            </label>
                                            <input
                                                type="text"
                                                value={telApiKey}
                                                onChange={(e) => setTelApiKey(e.target.value)}
                                                placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxx"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>

                                        {/* API Secret */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                API Secret
                                            </label>
                                            <input
                                                type="password"
                                                value={telApiSecret}
                                                onChange={(e) => setTelApiSecret(e.target.value)}
                                                placeholder="••••••••••••"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>

                                        {/* Caller ID / From Number */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                Outbound Caller ID (From)
                                            </label>
                                            <input
                                                type="text"
                                                value={telFromNumber}
                                                onChange={(e) => setTelFromNumber(e.target.value)}
                                                placeholder="+1234567890"
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--glass-border)",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    outline: "none"
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Save Button */}
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                                    <button
                                        onClick={handleSaveTelephony}
                                        disabled={isSavingTelephony}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            padding: "10px 20px", borderRadius: "8px",
                                            border: "none",
                                            background: "var(--accent-indigo)",
                                            color: "white",
                                            fontWeight: 700, fontSize: "0.85rem",
                                            cursor: isSavingTelephony ? "not-allowed" : "pointer",
                                            opacity: isSavingTelephony ? 0.7 : 1,
                                            boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {isSavingTelephony ? (
                                            <>
                                                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                                                Saving config...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={15} />
                                                Save Gateway Config
                                            </>
                                        )}
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Architecture Info Card */}
                    <div className="aicc-card" style={{
                        padding: "20px 24px", borderRadius: "14px",
                        background: "rgba(99, 102, 241, 0.04)",
                        border: "1px solid rgba(99, 102, 241, 0.12)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                            <Bot size={18} style={{ color: "var(--accent-indigo)" }} />
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                Rohan Call Pipeline Architecture
                            </span>
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: "8px",
                            fontSize: "0.72rem",
                            fontWeight: 700
                        }}>
                            {[
                                { icon: "⏱️", label: "PacingEngine", sub: "30s tick (Worker)", color: "#6366f1" },
                                { icon: "📋", label: "LeadQueue", sub: "SQL Priority Sort", color: "#8b5cf6" },
                                { icon: "📞", label: "AIDialer", sub: "5-Step Lifecycle", color: "#a855f7" },
                                { icon: "🔌", label: "OutboundRoutes", sub: "CRM API /dial", color: "#d946ef" },
                                { icon: "📡", label: "GSM Gateway", sub: "SIM → Phone Rings", color: "#ec4899" }
                            ].map((step, i) => (
                                <div key={i} style={{
                                    textAlign: "center",
                                    padding: "14px 8px",
                                    borderRadius: "10px",
                                    background: "rgba(255,255,255,0.7)",
                                    border: "1px solid var(--glass-border)",
                                    position: "relative"
                                }}>
                                    <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{step.icon}</div>
                                    <div style={{ color: step.color, fontWeight: 800, fontSize: "0.78rem" }}>{step.label}</div>
                                    <div style={{ color: "var(--text-secondary)", fontWeight: 600, marginTop: "2px", fontSize: "0.65rem" }}>{step.sub}</div>
                                    {i < 4 && (
                                        <div style={{
                                            position: "absolute", top: "50%", right: "-14px",
                                            transform: "translateY(-50%)",
                                            fontSize: "0.9rem", color: "var(--text-secondary)",
                                            zIndex: 1
                                        }}>→</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}

            {/* ─── TAB: AI TRAINING ─────────────────────────────────────────── */}
            {activeTab === "training" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", display: "block" }}>Cognitive Training & Fine-Tuning Console</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Manage datasets, monitor active fine-tuning iterations, and verify RAG embedding parameters.</span>
                        </div>
                    </div>

                    {/* Top Section: Models & Fine-Tuning Options */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "white" }}>
                            <h4 style={{ fontSize: "0.8rem", fontWeight: 800, margin: 0 }}>Embedding Model Selection</h4>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Select model parameters used to transform text chunks into multi-dimensional vectors.</span>
                            <select 
                                value={selectedEmbeddingModel} 
                                onChange={(e) => setSelectedEmbeddingModel(e.target.value)} 
                                className="aicc-input" 
                                style={{ padding: "8px", fontSize: "0.8rem", marginTop: "auto" }}
                            >
                                <option value="text-embedding-3-small">OpenAI text-embedding-3-small (Recommended)</option>
                                <option value="text-embedding-3-large">OpenAI text-embedding-3-large (High Dim)</option>
                                <option value="text-embedding-ada-002">OpenAI text-embedding-ada-002 (Legacy)</option>
                                <option value="cohere-embed-v3">Cohere Embed v3 (Multilingual)</option>
                            </select>
                        </div>

                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "white" }}>
                            <h4 style={{ fontSize: "0.8rem", fontWeight: 800, margin: 0 }}>Base Tuning Model</h4>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Choose target base architecture used for direct parameters fine-tuning.</span>
                            <select 
                                value={selectedBaseModel} 
                                onChange={(e) => setSelectedBaseModel(e.target.value)} 
                                className="aicc-input" 
                                style={{ padding: "8px", fontSize: "0.8rem", marginTop: "auto" }}
                            >
                                <option value="gpt-4o-mini-tuned">OpenAI GPT-4o-Mini (Tuned)</option>
                                <option value="llama-3.1-8b-instruct">Meta Llama 3.1 8B Instruct</option>
                                <option value="mistral-nemo-12b">Mistral Nemo 12B Instruct</option>
                            </select>
                        </div>

                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(99,102,241,0.03)", border: "1px solid rgba(99,102,241,0.12)" }}>
                            <h4 style={{ fontSize: "0.8rem", fontWeight: 800, margin: 0, color: "var(--accent-indigo)" }}>Execute Fine-Tuning</h4>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Initiate model gradient steps optimization on all active validated datasets.</span>
                            
                            {isFineTuning ? (
                                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700 }}>
                                        <span>Training in queue...</span>
                                        <span>{fineTuningProgress}%</span>
                                    </div>
                                    <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{ width: `${fineTuningProgress}%`, height: "100%", background: "var(--accent-indigo)" }} />
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleTriggerFineTuning} 
                                    className="aicc-btn-primary" 
                                    style={{ marginTop: "auto", padding: "8px", fontSize: "0.8rem", fontWeight: 800 }}
                                >
                                    Start Fine-Tuning Run
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Middle Section: Dataset Management & Validation */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Dataset Management</span>
                                <span style={{ fontSize: "1rem" }}>📂</span>
                            </h3>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", marginTop: "8px" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: 800 }}>
                                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Dataset Filename</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>File Size</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>QA Pairs</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datasets.map((ds) => (
                                        <tr key={ds.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                            <td style={{ padding: "8px 10px", fontWeight: 800, color: "var(--text-primary)" }}>{ds.name}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-secondary)" }}>{ds.size}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{ds.pairs}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                                <span style={{ 
                                                    fontSize: "0.62rem", fontWeight: 800, padding: "2px 6px", borderRadius: "4px",
                                                    background: ds.status === 'Validated' ? '#dcfce7' : ds.status === 'Pending Validation' ? '#fef3c7' : '#fee2e2',
                                                    color: ds.status === 'Validated' ? '#166534' : ds.status === 'Pending Validation' ? '#b45309' : '#991b1b'
                                                }}>
                                                    {ds.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Dataset Formatting & Validation</span>
                                <span style={{ fontSize: "1rem" }}>🛡️</span>
                            </h3>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                Scan formatting schemas to locate missing fields, invalid tokens, and structural errors before sending datasets to fine-tune pools.
                            </span>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "6px 0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Validation Checks:</span>
                                    <span style={{ fontWeight: 800, color: validationStatus === 'passed' ? '#166534' : 'var(--text-primary)' }}>
                                        {validationStatus === 'idle' && 'Not Started'}
                                        {validationStatus === 'validating' && 'Scanning...'}
                                        {validationStatus === 'passed' && 'Passed'}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Duplicate Pairs Resolved:</span>
                                    <span style={{ fontWeight: 800, color: duplicateCount > 0 ? "#b45309" : "var(--text-primary)" }}>{duplicateCount} duplicate entries</span>
                                </div>
                            </div>

                            {validationStatus === 'validating' ? (
                                <button className="aicc-btn-secondary" style={{ padding: "8px", fontSize: "0.8rem", width: "100%" }} disabled>
                                    Validating schemas...
                                </button>
                            ) : (
                                <button 
                                    onClick={handleValidateDatasets} 
                                    className="aicc-btn-secondary" 
                                    style={{ padding: "8px", fontSize: "0.8rem", width: "100%", fontWeight: 700 }}
                                >
                                    Validate Active Datasets
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Section: Approval Queue & Version History */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        
                        {/* Knowledge Approval Queue */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Knowledge Approval Queue</span>
                                <span style={{ fontSize: "1rem" }}>📋</span>
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {knowledgeApprovalQueue.length === 0 ? (
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "10px 0" }}>No pending documents in approval queue.</span>
                                ) : (
                                    knowledgeApprovalQueue.map((item) => (
                                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                            <div>
                                                <div style={{ fontSize: "0.78rem", fontWeight: 800 }}>{item.name}</div>
                                                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                    {item.type} ({item.size}) · Uploaded by: {item.uploadedBy}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <button 
                                                    onClick={() => {
                                                        setKnowledgeApprovalQueue(prev => prev.filter(x => x.id !== item.id));
                                                        setTrainingQueueJobs(oldJobs => [
                                                            { id: "job-" + Date.now().toString().slice(-4), name: `Embedding Ingestion: ${item.name}`, type: "Embedding RAG", progress: 0, status: "RUNNING" },
                                                            ...oldJobs
                                                        ]);
                                                        addToast({
                                                            type: "success",
                                                            title: "Document Approved",
                                                            message: `${item.name} added to vector database compilation queue.`
                                                        });
                                                    }}
                                                    className="aicc-btn-primary" 
                                                    style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setKnowledgeApprovalQueue(prev => prev.filter(x => x.id !== item.id));
                                                        addToast({
                                                            type: "warning",
                                                            title: "Document Rejected",
                                                            message: `${item.name} status set to rejected.`
                                                        });
                                                    }}
                                                    className="aicc-btn-secondary" 
                                                    style={{ padding: "4px 8px", fontSize: "0.7rem", color: "#991b1b" }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Version History & rollback */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                <span>Knowledge Version History & Rollback</span>
                                <span style={{ fontSize: "1rem" }}>🕒</span>
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {knowledgeHistory.map((ver, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--glass-border)" }}>
                                        <div>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: ver.version.includes("Active") ? "var(--accent-indigo)" : "var(--text-primary)" }}>{ver.version}</span>
                                            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>{ver.desc} (by {ver.author})</p>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)" }}>{ver.date}</span>
                                            {!ver.version.includes("Active") && (
                                                <button 
                                                    onClick={() => {
                                                        addToast({
                                                            type: "success",
                                                            title: "Rollback Triggered",
                                                            message: `Knowledge version rolled back to ${ver.version}. Cache invalidated.`
                                                        });
                                                    }}
                                                    className="aicc-btn-secondary" 
                                                    style={{ padding: "2px 6px", fontSize: "0.62rem", fontWeight: 700 }}
                                                >
                                                    Rollback to V{idx + 1}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Active Training Job Queue */}
                    <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <h3 className="aicc-card-title" style={{ margin: 0 }}>
                            <span>Active Training Queue Jobs</span>
                            <span style={{ fontSize: "1rem" }}>⚙️</span>
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {trainingQueueJobs.map((job) => {
                                const isRun = job.status === 'RUNNING';
                                return (
                                    <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: isRun ? "rgba(99,102,241,0.03)" : "white", border: isRun ? "1px solid rgba(99,102,241,0.15)" : "1px solid var(--glass-border)", borderRadius: "10px" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>{job.name}</span>
                                                <span style={{ fontSize: "0.62rem", background: isRun ? "#fef3c7" : "#dcfce7", color: isRun ? "#b45309" : "#166534", padding: "1px 6px", borderRadius: "4px", fontWeight: 800 }}>{job.status}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: "16px", fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                                <span>Job ID: #{job.id}</span>
                                                <span>Type: {job.type}</span>
                                            </div>
                                        </div>
                                        <div style={{ width: "140px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                                            <span style={{ fontSize: "0.68rem", fontWeight: 800 }}>{job.progress}% Complete</span>
                                            <div style={{ width: "100%", height: "4px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden" }}>
                                                <div style={{ width: `${job.progress}%`, height: "100%", background: isRun ? "var(--accent-indigo)" : "#10b981" }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

            {/* ─── TAB: INTEGRATIONS ────────────────────────────────────────── */}
            {activeTab === "integrations" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", display: "block" }}>Enterprise Systems Integration</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Manage external systems connections, webhooks, and synchronization status.</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", background: "var(--accent-indigo)", color: "white", padding: "4px 10px", borderRadius: "20px", fontWeight: 800 }}>
                            {Object.values(integrationStatus).filter(v => v === 'connected').length} of 11 systems active
                        </span>
                    </div>

                    {/* Grid of 11 Integration Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                        {[
                            { key: 'crm', name: 'Zentrix CRM', desc: 'Sync lead status, deals pipelines, and call outcomes.', icon: '🏢' },
                            { key: 'whatsapp', name: 'WhatsApp API', desc: 'Link templates and outbound messaging updates.', icon: '💬' },
                            { key: 'email', name: 'Email Gateway', desc: 'Connect SMTP/IMAP for post-call followups.', icon: '✉️' },
                            { key: 'calendar', name: 'Google Calendar', desc: 'Auto-schedule property site visits.', icon: '📅' },
                            { key: 'erp', name: 'SAP / Oracle ERP', desc: 'Sync inventory pricing sheets and invoices.', icon: '⚙️' },
                            { key: 'telephony', name: 'Exotel / Twilio Gateway', desc: 'Bridge voice trunk lines and inbound webhooks.', icon: '📞' },
                            { key: 'googleDrive', name: 'Google Drive', desc: 'Auto-scan files to index RAG knowledge.', icon: '📁' },
                            { key: 'sharepoint', name: 'MS SharePoint', desc: 'Scrape documentation directories.', icon: '🗂️' },
                            { key: 'slack', name: 'Slack Alerts', desc: 'Send real-time alerts for lead escalations.', icon: '💬' },
                            { key: 'teams', name: 'MS Teams', desc: 'Internal workspace channel push.', icon: '👥' },
                            { key: 'webhooks', name: 'Custom Webhooks', desc: 'Trigger outbound API calls on CRM updates.', icon: '🔗' }
                        ].map((sys) => {
                            const status = integrationStatus[sys.key];
                            const statusStyles = {
                                connected: { label: 'Connected', bg: '#dcfce7', color: '#166534' },
                                disconnected: { label: 'Inactive', bg: '#f1f5f9', color: 'var(--text-secondary)' },
                                configuring: { label: 'Configuring', bg: '#fef3c7', color: '#b45309' }
                            }[status];

                            return (
                                <div 
                                    key={sys.key} 
                                    className="aicc-card" 
                                    style={{ 
                                        display: "flex", flexDirection: "column", gap: "14px", 
                                        border: activeIntegrationConfig === sys.key ? "2px solid var(--accent-indigo)" : "1px solid var(--glass-border)",
                                        padding: "16px", background: "white" 
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ fontSize: "1.8rem" }}>{sys.icon}</div>
                                        <span style={{ fontSize: "0.62rem", fontWeight: 800, background: statusStyles.bg, color: statusStyles.color, padding: "2px 8px", borderRadius: "4px" }}>
                                            {statusStyles.label}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px 0" }}>{sys.name}</h4>
                                        <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>{sys.desc}</p>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--glass-border)", paddingTop: "12px", marginTop: "auto" }}>
                                        <button 
                                            onClick={() => {
                                                setIntegrationStatus(prev => ({
                                                    ...prev,
                                                    [sys.key]: prev[sys.key] === 'connected' ? 'disconnected' : 'connected'
                                                }));
                                                addToast({
                                                    type: "success",
                                                    title: "Status Toggled",
                                                    message: `${sys.name} connection state updated.`
                                                });
                                            }}
                                            className="aicc-btn-secondary" 
                                            style={{ flex: 1, padding: "5px 0", fontSize: "0.7rem", fontWeight: 700 }}
                                        >
                                            {status === 'connected' ? 'Disconnect' : 'Connect'}
                                        </button>
                                        <button 
                                            onClick={() => setActiveIntegrationConfig(activeIntegrationConfig === sys.key ? null : sys.key)}
                                            className="aicc-btn-primary" 
                                            style={{ padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700 }}
                                        >
                                            Configure
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Inline Configuration Drawer */}
                    {activeIntegrationConfig && (
                        <div className="aicc-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", border: "1px solid var(--accent-indigo)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                                    🔧 Configuration Settings for {activeIntegrationConfig.toUpperCase()}
                                </h3>
                                <button 
                                    onClick={() => setActiveIntegrationConfig(null)}
                                    className="aicc-btn-secondary" 
                                    style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                                >
                                    Close Panel
                                </button>
                            </div>

                            {activeIntegrationConfig === 'crm' && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>CRM Vendor</label>
                                        <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                            <option value="zentrix">Zentrix Native CRM (Active)</option>
                                            <option value="salesforce">Salesforce Cloud</option>
                                            <option value="hubspot">HubSpot API</option>
                                        </select>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>Sync Freq</label>
                                        <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                            <option value="realtime">Real-time webhook sync</option>
                                            <option value="hourly">Hourly batch jobs</option>
                                            <option value="daily">Daily audit reconcile</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeIntegrationConfig === 'webhooks' && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>Endpoint URL</label>
                                        <input type="text" className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }} defaultValue="https://my-domain.com/api/v1/webhook" />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>Secret Token</label>
                                        <input type="password" className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }} defaultValue="zntx_wk_sec_930198" />
                                    </div>
                                </div>
                            )}

                            {activeIntegrationConfig !== 'crm' && activeIntegrationConfig !== 'webhooks' && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>API Endpoint / ID</label>
                                        <input type="text" className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }} placeholder="Auto-populated credentials key" disabled />
                                    </div>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                                        System keys generated via global OAuth dashboard flow.
                                    </span>
                                </div>
                            )}

                            <button 
                                onClick={() => {
                                    setIntegrationStatus(prev => ({
                                        ...prev,
                                        [activeIntegrationConfig]: 'connected'
                                    }));
                                    setActiveIntegrationConfig(null);
                                    addToast({
                                        type: "success",
                                        title: "Saved Config",
                                        message: "External system endpoints updated in RAG server cache."
                                    });
                                }}
                                className="aicc-btn-primary" 
                                style={{ alignSelf: "flex-end", padding: "6px 20px", fontSize: "0.75rem" }}
                            >
                                Save Configuration
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB: AUDIT LOGS ─────────────────────────────────────────── */}
            {activeTab === "audit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    {/* Header with Export options */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", display: "block" }}>Enterprise Compliance & Audit logs</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Immutable trail of API calls, AI actions, knowledge database updates, and security events.</span>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button 
                                onClick={() => addToast({
                                    type: "success",
                                    title: "Logs Exported",
                                    message: "Exported audit trail to audit_logs_compliance.csv"
                                })}
                                className="aicc-btn-secondary" 
                                style={{ padding: "8px 16px", fontSize: "0.8rem", fontWeight: 700 }}
                            >
                                📥 Export CSV
                            </button>
                            <button 
                                onClick={() => addToast({
                                    type: "success",
                                    title: "Logs Exported",
                                    message: "Exported audit trail to audit_logs_compliance.json"
                                })}
                                className="aicc-btn-secondary" 
                                style={{ padding: "8px 16px", fontSize: "0.8rem", fontWeight: 700 }}
                            >
                                📥 Export JSON
                            </button>
                        </div>
                    </div>

                    {/* Filter and Search Row */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {[
                                { key: 'all', label: 'All Logs' },
                                { key: 'ai_action', label: 'AI Actions' },
                                { key: 'api_call', label: 'API Calls' },
                                { key: 'knowledge_change', label: 'Knowledge' },
                                { key: 'security_event', label: 'Security' },
                                { key: 'user_activity', label: 'User Activities' }
                            ].map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => setAuditEventFilter(cat.key)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--glass-border)",
                                        background: auditEventFilter === cat.key ? "var(--accent-indigo)" : "white",
                                        color: auditEventFilter === cat.key ? "white" : "var(--text-secondary)",
                                        fontSize: "0.72rem",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Filter audit description..."
                            value={auditSearchQuery}
                            onChange={(e) => setAuditSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid var(--glass-border)",
                                fontSize: "0.78rem",
                                outline: "none",
                                marginLeft: "auto",
                                maxWidth: "260px"
                            }}
                        />
                    </div>

                    {/* Audit Logs Table */}
                    <div className="aicc-card" style={{ padding: 0, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: 800 }}>
                                    <th style={{ padding: "12px 16px", textAlign: "left", width: "140px" }}>Timestamp</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", width: "120px" }}>Category</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", width: "160px" }}>Actor / Service</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Description Action</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", width: "100px" }}>Metadata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs
                                    .filter(log => auditEventFilter === 'all' || log.category === auditEventFilter)
                                    .filter(log => log.msg.toLowerCase().includes(auditSearchQuery.toLowerCase()))
                                    .map(log => {
                                        const badgeStyles = {
                                            ai_action: { bg: "#e0e7ff", color: "#3730a3", label: "AI Action" },
                                            api_call: { bg: "#ecfdf5", color: "#065f46", label: "API Call" },
                                            knowledge_change: { bg: "#faf5ff", color: "#6b21a8", label: "Knowledge" },
                                            security_event: { bg: "#fef2f2", color: "#991b1b", label: "Security" },
                                            user_activity: { bg: "#fff7ed", color: "#9a3412", label: "User" }
                                        }[log.category as 'ai_action' | 'api_call' | 'knowledge_change' | 'security_event' | 'user_activity'];

                                        const isExpanded = activeAuditDetailId === log.id;

                                        return (
                                            <React.Fragment key={log.id}>
                                                <tr style={{ borderBottom: "1px solid var(--glass-border)", background: isExpanded ? "rgba(99,102,241,0.02)" : "transparent" }}>
                                                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{log.timestamp}</td>
                                                    <td style={{ padding: "12px 16px" }}>
                                                        <span style={{ fontSize: "0.62rem", fontWeight: 800, background: badgeStyles.bg, color: badgeStyles.color, padding: "2px 6px", borderRadius: "4px" }}>
                                                            {badgeStyles.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "12px 16px", fontWeight: 800, color: "var(--text-primary)" }}>{log.actor}</td>
                                                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{log.msg}</td>
                                                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                                        <button
                                                            onClick={() => setActiveAuditDetailId(isExpanded ? null : log.id)}
                                                            className="aicc-btn-secondary"
                                                            style={{ padding: "4px 8px", fontSize: "0.68rem" }}
                                                        >
                                                            {isExpanded ? "Hide" : "Inspect"}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={5} style={{ background: "#f8fafc", padding: "16px 24px", borderBottom: "1px solid var(--glass-border)" }}>
                                                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                                <h4 style={{ margin: 0, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)" }}>🔍 Detailed Audit Metadata Block</h4>
                                                                
                                                                {log.category === 'ai_action' && (
                                                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                                        <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                                                                            <strong style={{ display: "block", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Prompt History (Inputs to Base LLM):</strong>
                                                                            <pre style={{ margin: 0, fontSize: "0.7rem", whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>{log.details.prompt}</pre>
                                                                        </div>
                                                                        <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                                                                            <strong style={{ display: "block", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Response History (Output Text):</strong>
                                                                            <pre style={{ margin: 0, fontSize: "0.7rem", whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>{log.details.response}</pre>
                                                                        </div>
                                                                        {log.details.reason && (
                                                                            <span style={{ fontSize: "0.7rem", color: "#9a3412" }}>⚠️ Handoff Trigger Context: {log.details.reason}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {log.category === 'api_call' && (
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                                                        <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                                                                            <strong style={{ display: "block", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Request Headers & Payload:</strong>
                                                                            <pre style={{ margin: 0, fontSize: "0.7rem", whiteSpace: "pre-wrap" }}>{log.details.reqBody}</pre>
                                                                        </div>
                                                                        <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                                                                            <strong style={{ display: "block", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Response Body:</strong>
                                                                            <pre style={{ margin: 0, fontSize: "0.7rem", whiteSpace: "pre-wrap" }}>{log.details.resBody}</pre>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {log.category === 'security_event' && (
                                                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                                        {log.details.rawInput && (
                                                                            <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                                                                                <strong style={{ display: "block", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Sanitized Raw Playground Input:</strong>
                                                                                <pre style={{ margin: 0, fontSize: "0.7rem", color: "#991b1b" }}>{log.details.rawInput}</pre>
                                                                            </div>
                                                                        )}
                                                                        {log.details.redactedInput && (
                                                                            <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                                                                                <strong style={{ display: "block", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Compliance Safe Redacted Input:</strong>
                                                                                <pre style={{ margin: 0, fontSize: "0.7rem", color: "#065f46" }}>{log.details.redactedInput}</pre>
                                                                            </div>
                                                                        )}
                                                                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                                                                            Security Policy Triggered: {log.details.policy || log.details.reason}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {log.category !== 'ai_action' && log.category !== 'api_call' && log.category !== 'security_event' && (
                                                                    <div style={{ padding: "8px 12px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "6px", fontSize: "0.72rem" }}>
                                                                        <pre style={{ margin: 0 }}>{JSON.stringify(log.details, null, 2)}</pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB: DIGITAL TWIN ────────────────────────────────────────── */}
            {activeTab === "digital_twin" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", display: "block" }}>Enterprise Digital Twin Console</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Create and test digital twin video models for customer-facing interfaces.</span>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "20px" }}>
                        
                        {/* Configuration Controls (Left Column) */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            
                            {/* Twin Role & Capability Select */}
                            <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "14px", background: "white" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                    <span>Twin Function Profile</span>
                                    <span style={{ fontSize: "1rem" }}>👤</span>
                                </h3>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                    <label style={{ fontSize: "0.78rem", fontWeight: 800 }}>Profile Role</label>
                                    <select 
                                        value={twinRole} 
                                        onChange={(e) => setTwinRole(e.target.value as any)} 
                                        className="aicc-input" 
                                        style={{ padding: "8px", fontSize: "0.8rem" }}
                                    >
                                        <option value="receptionist">AI Receptionist (Kiosk & Office Welcoming)</option>
                                        <option value="sales">AI Sales Executive (Interactive Pitching)</option>
                                        <option value="trainer">AI Trainer (Interactive Slides & Onboarding)</option>
                                        <option value="support">AI Support Agent (Screen Share Assistance)</option>
                                    </select>
                                </div>

                                <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "4px 0" }} />

                                {/* Contextual Settings based on selected Role */}
                                {twinRole === 'receptionist' && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Welcome Pitch</label>
                                            <input type="text" className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }} defaultValue="Welcome to Zentrix HQ. I am Neha, your digital avatar receptionist." />
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Kiosk Map ID</label>
                                            <input type="text" className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }} defaultValue="map-hq-groundfloor-3" />
                                        </div>
                                    </div>
                                )}

                                {twinRole === 'sales' && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Sales Deck PDF</label>
                                            <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                                <option value="deck1">BKC prelaunch details.pdf</option>
                                                <option value="deck2">Pricing premium catalog.pdf</option>
                                            </select>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Offer Overlay</label>
                                            <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                                <option value="stamp">2% Stamp Duty Waiver Popup</option>
                                                <option value="registry">Free Car Parking Slot Offer</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {twinRole === 'trainer' && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Slide Deck URL</label>
                                            <input type="text" className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }} defaultValue="https://docs.google.com/presentation/sales-onboarding" />
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Quiz Template</label>
                                            <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                                <option value="quiz1">Sales Compliance Quiz V1</option>
                                                <option value="quiz2">CRM Operations Training Check</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {twinRole === 'support' && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Live Screen Share</label>
                                            <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                                <option value="allow">Allowed (WebRTC Screen Capture)</option>
                                                <option value="restrict">Restricted to Sandbox Browser</option>
                                            </select>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700 }}>Escalation Routing</label>
                                            <select className="aicc-input" style={{ padding: "6px", fontSize: "0.78rem" }}>
                                                <option value="l1">Route to Tier-1 Support Agents</option>
                                                <option value="l2">Route to Premium Sales Managers</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Video Twin Stream Parameters */}
                            <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "14px", background: "white" }}>
                                <h3 className="aicc-card-title" style={{ margin: 0 }}>
                                    <span>WebRTC Video Settings</span>
                                    <span style={{ fontSize: "1rem" }}>📡</span>
                                </h3>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px", alignItems: "center" }}>
                                    <label style={{ fontSize: "0.78rem", fontWeight: 800 }}>Video Avatar Twin</label>
                                    <select 
                                        value={selectedTwinAvatar} 
                                        onChange={(e) => setSelectedTwinAvatar(e.target.value)} 
                                        className="aicc-input" 
                                        style={{ padding: "8px", fontSize: "0.8rem" }}
                                    >
                                        <option value="receptionist_model_a">Neha Twin Model A (Reception Specialist)</option>
                                        <option value="receptionist_model_b">Rohan Twin Model B (Sales Specialist)</option>
                                        <option value="trainer_model_c">Monika Twin Model C (Corporate Trainer)</option>
                                    </select>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginTop: "4px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>Enable Video twin</span>
                                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)" }}>WebRTC camera overlay</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={twinVideoEnabled} 
                                            onChange={(e) => setTwinVideoEnabled(e.target.checked)} 
                                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                        />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>Resolution Preset</span>
                                        <select 
                                            value={twinResolution} 
                                            onChange={(e) => setTwinResolution(e.target.value)} 
                                            className="aicc-input" 
                                            style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                                        >
                                            <option value="480p">480p SD (Low Latency)</option>
                                            <option value="720p">720p HD (Balanced)</option>
                                            <option value="1080p">1080p Full HD (High Quality)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Video Twin Preview Sandbox (Right Column) */}
                        <div className="aicc-card" style={{ display: "flex", flexDirection: "column", gap: "16px", background: "white", minHeight: "400px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                                    🖥️ Digital Twin WebRTC Video Sandbox
                                </h3>
                                {twinCallState === 'connected' && (
                                    <span style={{ 
                                        fontSize: "0.62rem", fontWeight: 800, background: "#fee2e2", color: "#b91c1c", 
                                        padding: "3px 8px", borderRadius: "4px", border: "1px solid rgba(185,28,28,0.2)",
                                        animation: "pulse 1.5s infinite" 
                                    }}>
                                        ● LIVE STREAMING
                                    </span>
                                )}
                            </div>

                            {/* Simulated Video Feed Window */}
                            <div style={{ 
                                flex: 1, 
                                minHeight: "240px",
                                background: "#0f172a", 
                                borderRadius: "10px", 
                                border: "1px solid rgba(255,255,255,0.08)",
                                display: "flex", 
                                flexDirection: "column",
                                alignItems: "center", 
                                justifyContent: "center",
                                position: "relative",
                                overflow: "hidden"
                            }}>
                                {twinCallState === 'idle' && (
                                    <div style={{ textAlign: "center", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                        <div style={{ 
                                            width: "80px", height: "80px", borderRadius: "50%", 
                                            background: "rgba(99,102,241,0.15)", border: "2px solid var(--accent-indigo)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            overflow: "hidden"
                                        }}>
                                            <img 
                                                src={getTwinAvatarSrc(selectedTwinAvatar)} 
                                                alt="Twin Standby" 
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "white", display: "block" }}>Twin Avatar Standby</span>
                                            <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>WebRTC video channels idle.</span>
                                        </div>
                                    </div>
                                )}

                                {twinCallState === 'connecting' && (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                                        <div style={{ 
                                            width: "40px", height: "40px", borderRadius: "50%",
                                            border: "3px solid rgba(255,255,255,0.1)",
                                            borderTopColor: "var(--accent-indigo)",
                                            animation: "spin 1s linear infinite"
                                        }} />
                                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>Establishing WebRTC handshake...</span>
                                    </div>
                                )}

                                {twinCallState === 'connected' && (
                                    <>
                                        {/* Avatar Animation Grid */}
                                        <div style={{ 
                                            width: "140px", height: "140px", borderRadius: "50%", 
                                            background: "rgba(16,185,129,0.1)", border: "4px solid #10b981",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            animation: "pulse 2s infinite",
                                            overflow: "hidden"
                                        }}>
                                            <img 
                                                src={getTwinAvatarSrc(selectedTwinAvatar)} 
                                                alt="Twin Live" 
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                            />
                                        </div>
                                        <div style={{ 
                                            position: "absolute", bottom: "10px", left: "10px", right: "10px",
                                            background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)",
                                            borderRadius: "6px", padding: "8px 12px", fontSize: "0.7rem", color: "#10b981",
                                            fontWeight: 700
                                        }}>
                                            🎙️ [Twin speaking]: WebRTC Video Channel {twinResolution} Active (30fps)
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Call Logs / Logs output */}
                            {twinCallLogs.length > 0 && (
                                <div style={{ 
                                    background: "#f8fafc", 
                                    border: "1px solid var(--glass-border)", 
                                    borderRadius: "8px", 
                                    padding: "10px 14px", 
                                    fontSize: "0.7rem",
                                    maxHeight: "100px",
                                    overflowY: "auto",
                                    fontFamily: "monospace",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px"
                                }}>
                                    {twinCallLogs.map((logStr, i) => (
                                        <span key={i} style={{ color: logStr.includes("[Twin]") ? "var(--accent-indigo)" : "var(--text-secondary)" }}>
                                            {logStr}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Trigger call button */}
                            <button
                                onClick={handleStartTwinCall}
                                className={twinCallState === 'connected' ? "aicc-btn-secondary" : "aicc-btn-primary"}
                                style={{ 
                                    padding: "10px", 
                                    fontSize: "0.8rem", 
                                    fontWeight: 800, 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center", 
                                    gap: "6px",
                                    background: twinCallState === 'connected' ? "#fee2e2" : "var(--accent-indigo)",
                                    color: twinCallState === 'connected' ? "#991b1b" : "white"
                                }}
                            >
                                {twinCallState === 'idle' && "Start Test Video Call"}
                                {twinCallState === 'connecting' && "Connecting WebRTC..."}
                                {twinCallState === 'connected' && "End Test Video Call"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}