import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Phone, PhoneOff, Mic, MicOff, Volume2, User, 
    X, History, Maximize2, Minimize2, Clock, Zap,
    MoreVertical, Settings, Smartphone, ShieldCheck, ShieldAlert,
    Signal, SignalLow, SignalHigh
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { leadsApi, usersApi, BASE_URL } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { dialerEvents } from '../../constants/events';
import { useMobile } from '../../hooks/useMobile';

const firebaseConfig = {
    databaseURL: "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

export default function Dialer() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user, refreshUser } = useAuth();
    const isMobile = useMobile(768);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callState, setCallState] = useState('idle');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [activeLead, setActiveLead] = useState(null);
    const [duration, setDuration] = useState(0);
    const [activeInteractionId, setActiveInteractionId] = useState(null);
    const [isDeviceOnline, setIsDeviceOnline] = useState(false);
    
    // Voice Assistant states
    const [dialerMode, setDialerMode] = useState<'keypad' | 'voice'>('keypad');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    
    const agentId = user?.telephony_agent_id || null; 
    const { data: leads } = useApi(() => leadsApi.list({ limit: 5 }));
    const handleDialRef = useRef(null);

    useEffect(() => {
        if (isOpen) refreshUser();
    }, [isOpen]);

    useEffect(() => {
        let timer;
        if (callState === 'active') {
            timer = setInterval(() => setDuration(d => d + 1), 1000);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [callState]);

    useEffect(() => {
        if (!isOpen || !agentId) return;
        const sid = agentId;
        const statusRef = ref(database, `agents/${sid}/connected`);
        const unsubStatus = onValue(statusRef, (snapshot) => setIsDeviceOnline(!!snapshot.val()));

        const callRef = ref(database, `agents/${sid}/incoming_call`);
        const unsubCall = onValue(callRef, async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const num = typeof data === 'string' ? data : data.number;
                const status = typeof data === 'string' ? 'ringing' : data.status;

                setPhoneNumber(num);
                setCallState(prev => {
                    // Update to active if the handset signals it's picked up
                    if (status === 'active' && (prev === 'ringing' || prev === 'idle')) {
                        return 'active';
                    }

                    if (prev === 'idle') {
                        setIsOpen(true);
                        setIsMinimized(false);
                        fetch(`${BASE_URL}/leads/search?q=${num}`, {
                            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` }
                        }).then(res => res.json()).then(leadData => {
                            if (leadData && leadData.length > 0) setActiveLead(leadData[0]);
                        }).catch(err => console.error('Lookup failed', err));
                        return 'ringing';
                    }
                    return prev;
                });
            } else {
                setCallState(prev => {
                    if (prev === 'ringing') return 'idle';
                    if (prev === 'active') {

                        return 'completed';
                    }
                    return prev;
                });
            }
        });

        const outCallRef = ref(database, `agents/${sid}/outgoing_call`);
        const unsubOut = onValue(outCallRef, (snapshot) => {
            const data = snapshot.val();

            
            if (data && data.status === 'ringing') {
                setCallState(prev => (prev === 'dialing' ? 'active' : prev));
            }

            if (!snapshot.exists()) {
                setCallState(prev => {
                    if (prev === 'active') {

                        return 'completed';
                    }
                    if (prev === 'dialing') {

                        return 'idle';
                    }
                    return prev;
                });
            }
        });

        const dispRef = ref(database, `agents/${sid}/last_disposition`);
        const unsubDisp = onValue(dispRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.timestamp > Date.now() - 30000) { // Within 30 secs

                // We use a ref for handleHangup to avoid dependency issues
                if (handleHangupRef.current) {
                    handleHangupRef.current(data.outcome);
                }
            }
        });

        return () => { 
            unsubStatus(); 
            unsubCall(); 
            unsubOut(); 
            unsubDisp();
        };
    }, [isOpen, agentId]); // Removed callState to prevent listener thrashing

    const handleDial = useCallback(async (lead = null, manualPhone = null) => {
        const phoneToDial = manualPhone || lead?.phone || lead?.number;
        if (!phoneToDial) {
            setIsOpen(true);
            setIsMinimized(false);
            return;
        }
        setCallState('dialing');
        setActiveLead(lead);
        setPhoneNumber(phoneToDial);
        setIsOpen(true);
        setIsMinimized(false);

        try {
            if (!agentId) return showToast('No Agent ID', 'error');
            const sid = agentId;
            const makeCallRef = ref(database, `agents/${sid}/outgoing_call`);
            const logRes = await fetch(`${BASE_URL}/calls/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` },
                body: JSON.stringify({ leadId: lead?.id, phoneNumber: phoneToDial, method: 'GSM' })
            });
            const logData = await logRes.json();
            if (logRes.ok) setActiveInteractionId(logData.interactionId);
            await set(makeCallRef, { number: phoneToDial, interaction_id: logData.interactionId || null, timestamp: Date.now() });
            showToast('GSM Call Initiated', 'success');
            
            // Do NOT force active here. The handset will trigger a state change.
            // If the handset never responds, user can manually hang up or clear.
        } catch (err) { 
            console.error(err);
            setCallState('idle'); 
        }
    }, [agentId, showToast]);

    useEffect(() => { handleDialRef.current = handleDial; }, [handleDial]);

    useEffect(() => {
        const handleExternalDial = (data) => handleDialRef.current(data, data.number);
        dialerEvents.subscribe(handleExternalDial);
        return () => dialerEvents.unsubscribe(handleExternalDial);
    }, []);

    const handleHangup = async (outcome = 'Connected') => {
        // Prevent double hangup if already idling or completing via another trigger
        if (callState === 'idle') return;

        const iid = activeInteractionId;
        const lid = activeLead?.id;
        const apiUrl = BASE_URL;

        if (iid) {
            try {
                const res = await fetch(`${apiUrl}/calls/${iid}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` 
                    },
                    body: JSON.stringify({ 
                        duration, 
                        outcome: outcome === 'No Disposition' ? 'Connected' : outcome, 
                        note: `Call completed. Disposition: ${outcome}` 
                    })
                });

                if (res.ok) {
                    showToast(`Call logged as ${outcome}`, 'success');
                    
                    if (lid) {
                        let leadUpdates = null;
                        if (outcome === 'Interested') leadUpdates = { stage: 'Interested' };
                        if (outcome === 'Not Interested' || outcome === 'Invalid / Wrong Number') leadUpdates = { stage: 'Lost' };
                        
                        if (leadUpdates) {
                            await fetch(`${apiUrl}/leads/${lid}`, {
                                method: 'PATCH',
                                headers: { 
                                    'Content-Type': 'application/json', 
                                    'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` 
                                },
                                body: JSON.stringify(leadUpdates)
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('[DIALER] Log error:', err);
            }
        }

        // Reset UI
        setCallState('idle');
        setDuration(0);
        setActiveLead(null);
        setPhoneNumber('');
        setActiveInteractionId(null);
    };

    const handleHangupRef = useRef(handleHangup);
    useEffect(() => { handleHangupRef.current = handleHangup; }, [handleHangup, callState, activeInteractionId, activeLead, duration]);

    const formatDuration = (s) => {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    // Voice Command Handler
    const handleVoiceCommand = async (command: string) => {
        const cleanCmd = command.toLowerCase().trim();

        // ── LOST LEADS ──────────────────────────────────────────────────
        if (cleanCmd.includes('lost')) {
            showToast('Showing Lost leads...', 'success');
            navigate('/leads?status=Lost');

        // ── WON LEADS ───────────────────────────────────────────────────
        } else if (cleanCmd.includes('won') || cleanCmd.includes('win') || cleanCmd.includes('closed')) {
            showToast('Showing Won leads...', 'success');
            navigate('/leads?status=Won');

        // ── NURTURE LEADS ────────────────────────────────────────────────
        } else if (cleanCmd.includes('nurture')) {
            showToast('Showing Nurture leads...', 'success');
            navigate('/leads?status=Nurture');

        // ── HOT / COLD / WARM / SCORE LEADS ─────────────────────────────
        } else if (cleanCmd.includes('hot lead') || (cleanCmd.includes('hot') && cleanCmd.includes('lead'))) {
            showToast('Showing Hot leads (score > 80)...', 'success');
            navigate('/leads?score=hot');

        } else if (cleanCmd.includes('cold lead') || (cleanCmd.includes('cold') && cleanCmd.includes('lead'))) {
            showToast('Showing Cold leads (score < 40)...', 'success');
            navigate('/leads?score=cold');

        // ── NEW LEADS ────────────────────────────────────────────────────
        } else if ((cleanCmd.includes('new') && cleanCmd.includes('lead')) || cleanCmd.includes('new lead')) {
            showToast('Showing New leads...', 'success');
            navigate('/leads?stage=New Lead');

        // ── ALL LEADS / GENERAL LEADS ────────────────────────────────────
        } else if (cleanCmd.includes('lead') || cleanCmd.includes('show lead') || cleanCmd.includes('all lead')) {
            showToast('Opening Leads...', 'success');
            navigate('/leads');

        // ── CALL / DIAL ──────────────────────────────────────────────────
        } else if (cleanCmd.includes('call') || cleanCmd.includes('dial') || cleanCmd.startsWith('priya')) {
            let searchName = cleanCmd;
            const callIdx = cleanCmd.indexOf('call');
            const dialIdx = cleanCmd.indexOf('dial');
            if (callIdx !== -1) {
                searchName = cleanCmd.substring(callIdx + 4);
            } else if (dialIdx !== -1) {
                searchName = cleanCmd.substring(dialIdx + 4);
            }
            searchName = searchName
                .replace(/\b(to|up|a|the|now|please|phone|contact)\b/g, '')
                .replace(/\./g, '')
                .trim();

            const isPhone = /^\+?[0-9\s\-()]+$/.test(searchName) && searchName.replace(/\D/g, '').length >= 5;
            if (isPhone) {
                showToast(`Dialing ${searchName}`, 'success');
                handleDial(null, searchName);
                return;
            }

            showToast(`Searching for "${searchName || 'contact'}"...`, 'success');
            let matchedLead: any = null;
            try {
                const localLeadsList = Array.isArray(leads) ? leads : (Array.isArray((leads as any)?.data) ? (leads as any).data : []);
                matchedLead = localLeadsList.find((l: any) => l.name?.toLowerCase().includes(searchName || 'amit'));
                if (!matchedLead) {
                    try {
                        const searchRes = await leadsApi.list({ q: searchName || 'amit', limit: 10 });
                        let listData: any[] = [];
                        if (searchRes && Array.isArray(searchRes)) { listData = searchRes; }
                        else if (searchRes && Array.isArray((searchRes as any).data)) { listData = (searchRes as any).data; }
                        matchedLead = listData.find((l: any) => l.name?.toLowerCase().includes(searchName || 'amit'));
                    } catch (leadsErr) { console.error('[Voice Command] Leads API list query failed:', leadsErr); }
                }
                if (!matchedLead) {
                    try {
                        const teamRes = await usersApi.list();
                        if (teamRes && Array.isArray(teamRes)) {
                            const matchedUser = teamRes.find((u: any) => u.name?.toLowerCase().includes(searchName || 'amit'));
                            if (matchedUser) { matchedLead = { name: matchedUser.name, phone: matchedUser.phone, id: null }; }
                        }
                    } catch (usersErr) { console.error('[Voice Command] Users API query failed:', usersErr); }
                }
                if (matchedLead && (matchedLead.phone || matchedLead.number)) {
                    const finalPhone = matchedLead.phone || matchedLead.number;
                    showToast(`Calling ${matchedLead.name} (${finalPhone})...`, 'success');
                    handleDial(matchedLead, finalPhone);
                } else {
                    showToast(`No contact found for "${searchName}". Try "Call [name]".`, 'warning');
                }
            } catch (err) {
                console.error('[Voice Command] Search overall failed:', err);
            }

        // ── SCHEDULE VISIT ───────────────────────────────────────────────
        } else if (cleanCmd.includes('visit') || cleanCmd.includes('schedule')) {
            showToast('Opening Site Visits...', 'success');
            navigate('/site-visits');

        // ── FOLLOW-UPS ───────────────────────────────────────────────────
        } else if (cleanCmd.includes('follow') || cleanCmd.includes('follow-up') || cleanCmd.includes('callback')) {
            showToast('Opening Follow-Ups...', 'success');
            navigate('/follow-ups');

        // ── DEALS / BOOKINGS ─────────────────────────────────────────────
        } else if (cleanCmd.includes('deal') || cleanCmd.includes('booking')) {
            showToast('Opening Deals...', 'success');
            navigate('/bookings');

        // ── PIPELINE ─────────────────────────────────────────────────────
        } else if (cleanCmd.includes('pipeline') || cleanCmd.includes('stage')) {
            showToast('Opening Pipeline...', 'success');
            navigate('/pipeline');

        // ── DASHBOARD ────────────────────────────────────────────────────
        } else if (cleanCmd.includes('dashboard') || cleanCmd.includes('home') || cleanCmd.includes('overview')) {
            showToast('Going to Dashboard...', 'success');
            navigate('/dashboard');

        // ── CALENDAR ────────────────────────────────────────────────────
        } else if (cleanCmd.includes('calendar') || cleanCmd.includes('meeting')) {
            showToast('Opening Calendar...', 'success');
            navigate('/calendar');

        // ── UNKNOWN ──────────────────────────────────────────────────────
        } else {
            showToast(`Try: "Show lost leads", "Call Priya", "Show hot leads"`, 'info');
        }
    };

    const startSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsListening(true);
            setTranscript('Listening...');
            setTimeout(() => {
                setIsListening(false);
                setTranscript('Show my hot leads.');
                handleVoiceCommand('Show my hot leads.');
            }, 2000);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-IN';

            recognition.onstart = () => {
                setIsListening(true);
                setTranscript('Listening...');
            };

            recognition.onerror = (e: any) => {
                console.error(e);
                setIsListening(false);
                showToast('Speech error. Try clicking the shortcuts.', 'error');
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const resultText = event.results[0][0].transcript;
                setTranscript(resultText);
                handleVoiceCommand(resultText);
            };

            recognition.start();
        } catch (err) {
            console.error(err);
            setIsListening(false);
        }
    };

    const hasCopilot = user && ['agent', 'sales_manager', 'admin', 'superadmin'].includes(user.role) && !isMobile;

    if (!isOpen) {
        // On mobile screens, hide the floating dialer button when idle to avoid covering lead details.
        // Tapping any "Call" action in the UI automatically triggers and opens the dialer when needed.
        if (isMobile && callState === 'idle') return null;

        return (
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: isMobile ? 68 : 12,
                    right: isMobile ? 12 : 70,
                    zIndex: 9999,
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: isMobile ? 12 : 14,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 30px rgba(99,102,241,0.55), 0 4px 12px rgba(15,23,42,0.25)',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 36px rgba(99,102,241,0.65), 0 6px 16px rgba(15,23,42,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 30px rgba(99,102,241,0.55), 0 4px 12px rgba(15,23,42,0.25)'; }}
            >
                <Smartphone size={isMobile ? 18 : 22} strokeWidth={2.5} />
            </button>
        );
    }

    return (
        <div style={{ 
            position: 'fixed', bottom: isMobile ? 80 : 20, right: 20, zIndex: 9999, 
            width: isMinimized ? 240 : 'calc(100vw - 40px)', 
            maxWidth: isMinimized ? 240 : 280, 
            maxHeight: isMinimized ? 48 : 420, 
            height: isMinimized ? 48 : 'auto', 
            background: 'rgba(10, 26, 46, 0.98)', 
            backdropFilter: 'blur(20px)',
            borderRadius: 24, color: 'white', 
            boxShadow: '0 40px 100px rgba(0,0,0,0.7)', 
            overflow: 'hidden', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)', 
            display: 'flex', flexDirection: 'column',
            border: '1px solid rgba(255,255,255,0.12)' 
        }}>
            <div style={{ padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, marginRight: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: !agentId ? '#94a3b8' : (isDeviceOnline ? '#10b981' : '#f43f5e'), animation: callState === 'active' ? 'pulse-dialer 1.5s infinite' : 'none', flexShrink: 0 }} />
                    <span style={{ 
                        fontWeight: 900, 
                        fontSize: '0.75rem', 
                        letterSpacing: '0.12em', 
                        textTransform: 'uppercase', 
                        color: 'rgba(255,255,255,0.6)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {agentId ? (isDeviceOnline ? `ONLINE: ${agentId}` : `OFFLINE`) : 'NO HANDSET'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-icon-tiny-d" onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
                    <button type="button" className="btn-icon-tiny-d" onClick={() => (callState === 'idle' ? setIsOpen(false) : setIsMinimized(true))}><X size={18} /></button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {callState === 'idle' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <button 
                                    type="button"
                                    onClick={() => setDialerMode('keypad')} 
                                    style={{ 
                                        flex: 1, padding: '10px', background: dialerMode === 'keypad' ? 'rgba(255,255,255,0.06)' : 'transparent', 
                                        border: 'none', color: dialerMode === 'keypad' ? '#00b4d8' : 'rgba(255,255,255,0.5)', 
                                        fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                        borderBottom: dialerMode === 'keypad' ? '2px solid #00b4d8' : 'none'
                                    }}
                                >
                                    KEYPAD
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setDialerMode('voice')} 
                                    style={{ 
                                        flex: 1, padding: '10px', background: dialerMode === 'voice' ? 'rgba(255,255,255,0.06)' : 'transparent', 
                                        border: 'none', color: dialerMode === 'voice' ? '#a855f7' : 'rgba(255,255,255,0.5)', 
                                        fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                        borderBottom: dialerMode === 'voice' ? '2px solid #a855f7' : 'none'
                                    }}
                                >
                                    AI VOICE
                                </button>
                            </div>
                            
                            {dialerMode === 'keypad' ? (
                                <div style={{ width: '100%', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" inputMode="tel" placeholder="+91 Number..." value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} style={{ width: '100%', height: 38, background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', paddingLeft: 40, color: 'white', fontSize: '1.05rem', fontWeight: 900, outline: 'none' }} />
                                        <Phone size={16} style={{ position: 'absolute', left: 14, top: 11, color: '#00b4d8' }} />
                                        {phoneNumber.length > 0 && (
                                            <button type="button" onClick={() => setPhoneNumber(p => (p || '').slice(0, -1))} style={{ position: 'absolute', right: 6, top: 3, width: 32, height: 32, borderRadius: '8px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                                        {['1','2','3','4','5','6','7','8','9','*','0','#'].map(n => (
                                            <button type="button" key={n} onClick={() => setPhoneNumber(p => (p || '') + n)} className="numpad-btn" style={{ height: 36 }}>{n}</button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                        <button type="button" onClick={() => setPhoneNumber(p => (p || '') + '+')} className="numpad-btn" style={{ fontSize: '1.1rem', height: '32px' }}>+</button>
                                        <button type="button" onClick={() => setPhoneNumber('')} className="numpad-btn" style={{ fontSize: '0.75rem', height: '32px', color: '#f43f5e' }}>Clear</button>
                                    </div>
                                    <button type="button" onClick={() => handleDial(null, phoneNumber)} style={{ width: '100%', height: 42, borderRadius: 14, background: isDeviceOnline ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #334155, #000000)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                                        <Phone size={14} /> {isDeviceOnline ? 'INITIATE CALL' : 'OFFLINE CALL'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ width: '100%', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center', minHeight: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
                                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voice Assistant</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'white', marginTop: -4 }}>What can I help with?</div>
                                    
                                    <button 
                                        type="button"
                                        onClick={startSpeechRecognition}
                                        style={{
                                            width: 52, height: 52, borderRadius: '50%',
                                            background: isListening ? 'linear-gradient(135deg, #ef4444, #f43f5e)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: isListening ? '0 0 20px rgba(239,68,68,0.6)' : '0 6px 16px rgba(99,102,241,0.3)',
                                            cursor: 'pointer', border: 'none', outline: 'none',
                                            transition: 'all 0.3s ease', transform: isListening ? 'scale(1.08)' : 'scale(1)',
                                            animation: isListening ? 'pulse-mic 1.5s infinite' : 'none'
                                        }}
                                        title={isListening ? 'Listening...' : 'Click to speak'}
                                    >
                                        {isListening ? <MicOff size={20} color="white" /> : <Mic size={20} color="white" />}
                                    </button>

                                    {transcript && (
                                        <div style={{ 
                                            background: 'rgba(255,255,255,0.06)', 
                                            padding: '6px 10px', 
                                            borderRadius: '8px', 
                                            fontSize: '0.7rem', 
                                            color: '#c4b5fd',
                                            fontFamily: 'monospace',
                                            maxWidth: '100%',
                                            wordBreak: 'break-word'
                                        }}>
                                            "{transcript}"
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', marginTop: 2, maxHeight: 155, overflowY: 'auto', paddingRight: 4 }}>
                                        {[
                                            'Show lost leads.',
                                            'Show won leads.',
                                            'Show hot leads.',
                                            'Show nurture leads.',
                                            'Call Amit.',
                                            'Show my pipeline.',
                                            'Show follow-ups.',
                                            'Schedule a visit.',
                                        ].map((cmd, i) => (
                                            <button 
                                                key={i} 
                                                type="button"
                                                onClick={() => {
                                                    setTranscript(cmd);
                                                    handleVoiceCommand(cmd);
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)', 
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    borderRadius: '8px', padding: '6px 10px',
                                                    fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                                                    cursor: 'pointer', textAlign: 'left',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)';
                                                    e.currentTarget.style.color = '#c4b5fd';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                                                }}
                                            >
                                                "{cmd}"
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, padding: '24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', overflowY: 'auto', minHeight: 0 }}>
                            <div style={{ position: 'relative', marginBottom: 32 }}>
                                <div style={{ width: 120, height: 120, borderRadius: '40%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${callState === 'ringing' ? '#f59e0b' : '#00b4d8'}` }}>
                                    <User size={60} color={callState === 'ringing' ? '#f59e0b' : '#00b4d8'} />
                                </div>
                                <div className="pulse-ring" style={{ borderColor: callState === 'ringing' ? '#f59e0b' : '#00b4d8' }} />
                            </div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, marginBottom: 4, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.3)', wordBreak: 'break-word' }}>
                                {activeLead?.name || phoneNumber}
                            </h2>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>{phoneNumber}</div>
                            
                            <div style={{ color: callState === 'active' ? '#00b4d8' : callState === 'completed' ? '#fbbf24' : '#f59e0b', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em' }}>
                                {callState === 'active' ? formatDuration(duration) : callState === 'completed' ? `COMPLETED: ${formatDuration(duration)}` : 'RINGING...'}
                            </div>
                            
                            {callState === 'completed' && (
                                <div style={{ width: '100%', marginTop: 16, textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        {[
                                            { id: 'Interested', label: 'Interested', color: '#10b981' },
                                            { id: 'Not Interested', label: 'Not Int.', color: '#f43f5e' },
                                            { id: 'Follow-up Required', label: 'Follow-up', color: '#fbbf24' },
                                            { id: 'Invalid / Wrong Number', label: 'Invalid', color: '#94a3b8' }
                                        ].map(opt => (
                                            <button 
                                                key={opt.id} 
                                                onClick={() => handleHangup(opt.id)}
                                                style={{ 
                                                    padding: '10px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', 
                                                    border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontWeight: 700, 
                                                    fontSize: '0.75rem', textAlign: 'center', cursor: 'pointer', transition: '0.2s',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            >
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color }} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: 'auto', width: '100%', padding: '0 16px 12px' }}>
                                {callState === 'completed' ? (
                                    <button 
                                        type="button" 
                                        onClick={() => handleHangup('No Disposition')} 
                                        style={{ width: '100%', height: 38, borderRadius: '12px', background: '#f43f5e', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(244,63,94,0.2)' }}
                                    >
                                        <X size={16} /> Close & Cancel
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', paddingBottom: 16 }}>
                                        <button type="button" onClick={() => handleHangup()} style={{ width: 72, height: 72, borderRadius: '24px', background: '#f43f5e', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 20px rgba(244,63,94,0.3)' }}>
                                            <PhoneOff size={32} />
                                        </button>
                                        {callState !== 'active' && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setCallState('active');
                                                    showToast('Call state synced to CONNECTED', 'info');
                                                }} 
                                                style={{ width: 72, height: 72, borderRadius: '24px', background: '#10b981', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16,185,129,0.3)' }}
                                            >
                                                <Phone size={32} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style>{`
                .btn-icon-tiny-d { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s; }
                .btn-icon-tiny-d:hover { background: rgba(255,255,255,0.06); color: white; }
                .numpad-btn { height: 30px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); color: white; font-size: 0.9rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
                .numpad-btn:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
                .dialer-lead-card { padding: 14px 18px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; }
                .dialer-lead-card:hover { background: rgba(255,255,255,0.06); transform: translateX(4px); }
                .pulse-ring { position: absolute; width: 100%; height: 100%; border-radius: 35px; border: 2px solid #00b4d8; animation: ring-pulse 2s infinite; opacity: 0; }
                @keyframes ring-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
                @keyframes pulse-dialer { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
                @keyframes pulse-mic {
                    0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
                }
            `}</style>
        </div>
    );
}
