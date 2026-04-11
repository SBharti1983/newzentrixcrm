import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Phone, PhoneOff, Mic, MicOff, Volume2, User, 
    X, History, Maximize2, Minimize2, Clock, Zap,
    MoreVertical, Settings, Smartphone, ShieldCheck, ShieldAlert,
    Signal, SignalLow, SignalHigh
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { leadsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { dialerEvents } from '../constants/events';

const firebaseConfig = {
    databaseURL: "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

export default function Dialer() {
    const { showToast } = useToast();
    const { user, refreshUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callState, setCallState] = useState('idle');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [activeLead, setActiveLead] = useState(null);
    const [duration, setDuration] = useState(0);
    const [activeInteractionId, setActiveInteractionId] = useState(null);
    const [isDeviceOnline, setIsDeviceOnline] = useState(false);
    
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
            const num = snapshot.val();
            if (num) {
                setPhoneNumber(num);
                setCallState(prev => {
                    if (prev === 'idle') {
                        setIsOpen(true);
                        setIsMinimized(false);
                        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/leads/search?q=${num}`, {
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
                    if (prev === 'ringing' || (prev === 'active' && !activeInteractionId)) return 'idle';
                    return prev;
                });
            }
        });

        const outCallRef = ref(database, `agents/${sid}/outgoing_call`);
        const unsubOut = onValue(outCallRef, (snapshot) => {
            console.log(`[DIALER] Handset node update: ${snapshot.exists() ? 'Exists' : 'Cleared'}`);
            if (!snapshot.exists()) {
                setCallState(prev => {
                    // Force idle if handset clears the dial node (Hangup)
                    if (prev !== 'idle') {
                        console.log('[DIALER] Handset signalled END OF CALL. Resetting to IDLE.');
                        setDuration(0);
                        return 'idle';
                    }
                    return prev;
                });
            }
        });

        return () => { unsubStatus(); unsubCall(); unsubOut(); };
    }, [isOpen, agentId]); // Removed callState to prevent listener thrashing

    const handleDial = useCallback(async (lead = null, manualPhone = null) => {
        const phoneToDial = manualPhone || lead?.phone || lead?.number;
        if (!phoneToDial) return showToast('No number', 'error');
        setCallState('dialing');
        setActiveLead(lead);
        setPhoneNumber(phoneToDial);
        setIsOpen(true);
        setIsMinimized(false);

        try {
            if (!agentId) return showToast('No Agent ID', 'error');
            const sid = agentId;
            const makeCallRef = ref(database, `agents/${sid}/outgoing_call`);
            const logRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/calls/initiate`, {
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
        if (activeInteractionId) {
            try {
                await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/calls/${activeInteractionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}` },
                    body: JSON.stringify({ duration, outcome, note: `GSM Call completed.` })
                });
            } catch (err) {}
        }
        setCallState('idle');
        setDuration(0);
        setActiveLead(null);
        setPhoneNumber('');
        setActiveInteractionId(null);
    };

    const formatDuration = (s) => {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return (
        <button onClick={() => setIsOpen(true)} style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, width: 56, height: 56, borderRadius: '18px', background: '#0a1628', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            <Smartphone size={28} />
        </button>
    );

    return (
        <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, width: isMinimized ? 240 : 'calc(100vw - 24px)', maxWidth: isMinimized ? 240 : 320, maxHeight: isMinimized ? 48 : 480, height: isMinimized ? 48 : 'auto', background: '#0a1a2e', borderRadius: 20, color: 'white', boxShadow: '0 30px 90px rgba(0,0,0,0.6)', overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', display: 'grid', gridTemplateRows: isMinimized ? '1fr' : '48px 1fr auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: !agentId ? '#94a3b8' : (isDeviceOnline ? '#10b981' : '#f43f5e'), animation: callState === 'active' ? 'pulse-dialer 1.5s infinite' : 'none' }} />
                    <span style={{ fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
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
                        <>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" inputMode="tel" placeholder="+91 Number..." value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} style={{ width: '100%', height: 38, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', paddingLeft: 36, paddingRight: 36, color: 'white', fontSize: '1rem', fontWeight: 900, textAlign: 'center', outline: 'none' }} />
                                    <Phone size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#00b4d8' }} />
                                    {phoneNumber.length > 0 && (
                                        <button type="button" onClick={() => setPhoneNumber(p => (p || '').slice(0, -1))} onDoubleClick={() => setPhoneNumber('')} style={{ position: 'absolute', right: 4, top: 1, width: 36, height: 36, borderRadius: '10px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map(n => (
                                        <button type="button" key={n} onClick={() => setPhoneNumber(p => (p || '') + n)} className="numpad-btn">{n}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                    <button type="button" onClick={() => setPhoneNumber(p => (p || '') + '+')} className="numpad-btn" style={{ fontSize: '1.2rem', height: '34px', borderRadius: '8px' }}>+</button>
                                    <button type="button" onClick={() => setPhoneNumber('')} className="numpad-btn" style={{ fontSize: '0.85rem', height: '34px', borderRadius: '8px', color: '#f43f5e' }}>Clear</button>
                                </div>
                                <div>
                                    {(leads?.data || []).map(lead => (
                                        <div key={lead.id} onClick={() => handleDial(lead)} className="dialer-lead-card" style={{ marginBottom: 6, padding: '8px 12px' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{lead.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{lead.property_type || 'Lead'}</div>
                                            </div>
                                            <Phone size={12} color="#00b4d8" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ padding: '10px 12px 10px', background: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                                <button type="button" onClick={() => handleDial(null, phoneNumber)} style={{ width: '100%', height: 40, borderRadius: 10, background: isDeviceOnline ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #334155, #000000)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>
                                    <Phone size={14} /> {isDeviceOnline ? 'INITIATE GSM CALL' : 'OFFLINE CALL'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <div style={{ position: 'relative', marginBottom: 32 }}>
                                <div style={{ width: 120, height: 120, borderRadius: '40%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${callState === 'ringing' ? '#f59e0b' : '#00b4d8'}` }}>
                                    <User size={60} color={callState === 'ringing' ? '#f59e0b' : '#00b4d8'} />
                                </div>
                                <div className="pulse-ring" style={{ borderColor: callState === 'ringing' ? '#f59e0b' : '#00b4d8' }} />
                            </div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8 }}>{activeLead?.name || phoneNumber}</h2>
                            <div style={{ color: callState === 'active' ? '#00b4d8' : '#f59e0b', fontWeight: 900, fontSize: '1.4rem' }}>{callState === 'active' ? formatDuration(duration) : 'RINGING...'}</div>
                            <div style={{ marginTop: 40, display: 'flex', gap: 24 }}>
                                <button type="button" onClick={() => handleHangup()} style={{ width: 72, height: 72, borderRadius: '24px', background: '#f43f5e', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><PhoneOff size={32} /></button>
                                {callState === 'ringing' && <button type="button" onClick={() => setCallState('active')} style={{ width: 72, height: 72, borderRadius: '24px', background: '#10b981', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Phone size={32} /></button>}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style>{`
                .btn-icon-tiny-d { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s; }
                .btn-icon-tiny-d:hover { background: rgba(255,255,255,0.06); color: white; }
                .numpad-btn { height: 34px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); color: white; font-size: 1rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
                .numpad-btn:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
                .dialer-lead-card { padding: 14px 18px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; }
                .dialer-lead-card:hover { background: rgba(255,255,255,0.06); transform: translateX(4px); }
                .pulse-ring { position: absolute; width: 100%; height: 100%; border-radius: 35px; border: 2px solid #00b4d8; animation: ring-pulse 2s infinite; opacity: 0; }
                @keyframes ring-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
                @keyframes pulse-dialer { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
            `}</style>
        </div>
    );
}
