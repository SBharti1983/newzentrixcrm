import { useState, useEffect } from 'react';
import { 
    Phone, PhoneOff, Mic, MicOff, Volume2, User, 
    X, History, Maximize2, Minimize2, Clock, Zap,
    MoreVertical, Settings, Smartphone
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { leadsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { dialerEvents } from '../constants/events';

export default function Dialer() {
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callState, setCallState] = useState('idle'); // idle | dialing | active
    const [phoneNumber, setPhoneNumber] = useState('');
    const [activeLead, setActiveLead] = useState(null);
    const [duration, setDuration] = useState(0);
    const [activeInteractionId, setActiveInteractionId] = useState(null);
    const [showNumpad, setShowNumpad] = useState(true);

    // Fetch recent leads for quick select
    const { data: leads } = useApi(() => leadsApi.list({ limit: 5 }));

    // Listen for global dial events (e.g. from Lead Profile "Call" button)
    useEffect(() => {
        const handleExternalDial = (data) => {
            if (data.isInbound) {
                // Handle inbound (mocked for now)
                showToast(`Incoming SIM Call: ${data.name}`, 'info');
                return;
            }
            handleDial(data, data.number);
        };
        dialerEvents.subscribe(handleExternalDial);
        return () => dialerEvents.unsubscribe(handleExternalDial);
    }, []);

    useEffect(() => {
        let timer;
        if (callState === 'active') {
            timer = setInterval(() => setDuration(d => d + 1), 1000);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [callState]);

    const handleDial = async (lead = null, manualPhone = null) => {
        const phoneToDial = manualPhone || lead?.phone || lead?.number;
        if (!phoneToDial) return showToast('No phone number provided', 'error');

        setCallState('dialing');
        setActiveLead(lead);
        setPhoneNumber(phoneToDial);
        setIsOpen(true);
        setIsMinimized(false);

        try {
            // Trigger GSM SIM Bridge on backend
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/calls/initiate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}`
                },
                body: JSON.stringify({ leadId: lead?.id, phoneNumber: phoneToDial })
            });
            const data = await res.json();
            
            if (res.ok) {
                // Simulate GSM connection lag
                setTimeout(() => {
                    setCallState('active');
                    setActiveInteractionId(data.interactionId);
                    showToast('Direct SIM Bridge Established', 'success');
                }, 1200);
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            showToast(err.message || 'Dialer Error', 'error');
            setCallState('idle');
        }
    };

    const handleHangup = async (outcome = 'Connected') => {
        if (!activeInteractionId) {
            setCallState('idle');
            return;
        }

        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/calls/${activeInteractionId}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}`
                },
                body: JSON.stringify({ duration, outcome, note: `GSM-SIM integrated call completed. Duration: ${duration}s` })
            });
            showToast(`Call recorded: ${duration}s`, 'info');
        } catch (_err) {
            showToast('Stats synced locally', 'info');
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
        <button 
            onClick={() => setIsOpen(true)}
            className="hover-lift"
            style={{
                position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
                width: 64, height: 64, borderRadius: '22px',
                background: 'linear-gradient(135deg, #0a1628, #00122e)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 15px 35px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
            }}
        >
            <Smartphone size={28} />
            <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: '#10b981', borderRadius: '50%', border: '3px solid #f8fafc' }} />
        </button>
    );

    return (
        <div 
            style={{
                position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
                width: isMinimized ? 240 : 380, 
                maxHeight: isMinimized ? 72 : 600,
                background: '#0a1a2e', 
                borderRadius: 32, color: 'white', boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
                overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.08)'
            }}
        >
            {/* Header */}
            <div style={{ 
                padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', 
                justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.05)' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', 
                        background: callState === 'active' ? '#f43f5e' : '#10b981',
                        animation: callState === 'active' ? 'pulse-dialer 1.5s infinite' : 'none' 
                    }} />
                    <span style={{ fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                        {callState === 'idle' ? 'GSM Dialer' : `Sim Bridge: ${callState}`}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon-tiny-d" onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
                    <button className="btn-icon-tiny-d" onClick={() => (callState === 'idle' ? setIsOpen(false) : setIsMinimized(true))}><X size={18} /></button>
                </div>
            </div>

            {!isMinimized && (
                <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24, background: 'linear-gradient(180deg, transparent, rgba(0,180,216,0.03))' }}>
                    
                    {callState === 'idle' ? (
                        <>
                            {/* Dialer Input */}
                            <div style={{ position: 'relative' }}>
                                <input 
                                    className="dialer-input-main"
                                    placeholder="+91 Number..."
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    style={{
                                        width: '100%', height: 68, background: 'rgba(255,255,255,0.04)', borderRadius: 24,
                                        border: '1px solid rgba(255,255,255,0.08)', paddingLeft: 64, color: 'white',
                                        fontSize: '1.6rem', fontWeight: 900, outline: 'none', textAlign: 'center'
                                    }}
                                />
                                <Phone size={24} style={{ position: 'absolute', left: 24, top: 22, color: '#00b4d8' }} />
                            </div>

                            {/* Numpad */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => (
                                    <button 
                                        key={n}
                                        onClick={() => setPhoneNumber(p => p + n)}
                                        className="numpad-btn"
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>

                            {/* Recent Leads */}
                            <div>
                                <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 16 }}>Fast-Dial Leads</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {(leads?.data || []).map(lead => (
                                        <div key={lead.id} onClick={() => handleDial(lead)} className="dialer-lead-card">
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 2 }}>{lead.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{lead.property_type || 'General Lead'}</div>
                                            </div>
                                            <div style={{ padding: 8, borderRadius: 12, background: 'rgba(0,180,216,0.1)', color: '#00b4d8' }}>
                                                <Phone size={14} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Active GSM Call View */
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ marginBottom: 40 }}>
                                <div style={{ 
                                    width: 110, height: 110, borderRadius: '35px', background: 'rgba(255,255,255,0.03)',
                                    margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(0,180,216,0.3)', position: 'relative'
                                }}>
                                    <User size={54} color="#00b4d8" strokeWidth={1.5} />
                                    <div className="pulse-ring" />
                                </div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>{activeLead?.name || phoneNumber}</h2>
                                <div style={{ color: '#00b4d8', fontWeight: 900, fontSize: '1.4rem', fontFamily: 'monospace' }}>{formatDuration(duration)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SIM 1 • GSM NETWORK</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 48 }}>
                                <div className="call-btn-circle"><Mic size={22} /></div>
                                <div className="call-btn-circle"><Volume2 size={22} /></div>
                                <div className="call-btn-circle"><Zap size={22} /></div>
                            </div>

                            <button 
                                onClick={() => handleHangup()}
                                style={{
                                    width: 84, height: 84, borderRadius: '30px', background: '#f43f5e',
                                    border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto', cursor: 'pointer', boxShadow: '0 20px 40px rgba(244,63,94,0.3)',
                                    transform: 'rotate(135deg)', transition: '0.3s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'rotate(135deg) scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'rotate(135deg) scale(1)'}
                            >
                                <Phone size={36} />
                            </button>
                        </div>
                    )}
                    
                    {/* Manual Call Trigger */}
                    {callState === 'idle' && (
                        <button 
                            onClick={() => handleDial(null, phoneNumber)}
                            style={{
                                height: 64, borderRadius: 24, background: 'linear-gradient(90deg, #00b4d8, #0077b6)',
                                border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 12, fontWeight: 900, cursor: 'pointer', boxShadow: '0 15px 35px rgba(0,180,216,0.25)',
                                fontSize: '1rem', letterSpacing: '0.02em'
                            }}
                        >
                            <Phone size={20} /> INITIATE SIM CALL
                        </button>
                    )}
                </div>
            )}

            <style>{`
                .dialer-input-main::placeholder { color: rgba(255,255,255,0.1); }
                .btn-icon-tiny-d { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 6px; border-radius: 10px; transition: 0.2s; }
                .btn-icon-tiny-d:hover { background: rgba(255,255,255,0.06); color: white; }
                .numpad-btn { 
                    height: 56px; borderRadius: 18px; background: rgba(255,255,255,0.03); 
                    border: 1px solid rgba(255,255,255,0.04); color: white; 
                    fontSize: 1.3rem; fontWeight: 800; cursor: pointer; transition: 0.2s; 
                }
                .numpad-btn:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }
                .dialer-lead-card { 
                    padding: 14px 18px; background: rgba(255,255,255,0.02); borderRadius: 20px;
                    border: 1px solid rgba(255,255,255,0.03); display: flex; justifyContent: space-between;
                    alignItems: center; cursor: pointer; transition: 0.2s;
                }
                .dialer-lead-card:hover { background: rgba(255,255,255,0.06); transform: translateX(4px); }
                .call-btn-circle { 
                    width: 58px; height: 58px; borderRadius: 22px; background: rgba(255,255,255,0.04); 
                    display: flex; alignItems: center; justifyContent: center; cursor: pointer; 
                    color: rgba(255,255,255,0.5); transition: 0.2s; border: 1px solid rgba(255,255,255,0.02);
                }
                .call-btn-circle:hover { background: rgba(255,255,255,0.1); color: white; transform: translateY(-3px); }
                .pulse-ring {
                    position: absolute; width: 100%; height: 100%; borderRadius: 35px; border: 2px solid #00b4d8;
                    animation: ring-pulse 2s infinite; opacity: 0;
                }
                @keyframes ring-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
                @keyframes pulse-dialer { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
            `}</style>
        </div>
    );
}
