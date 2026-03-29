import { useState, useEffect } from 'react';
import { 
    Phone, PhoneOff, Mic, MicOff, Volume2, User, 
    ChevronDown, X, History, GripVertical, Search,
    Maximize2, Minimize2, CheckCircle2, MessageSquare, Clock
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { leadsApi } from '../api/client';
import { useToast } from '../hooks/useToast';

export default function FloatingDialer() {
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callState, setCallState] = useState('idle'); // idle | dialing | active | finishing
    const [phoneNumber, setPhoneNumber] = useState('');
    const [activeLead, setActiveLead] = useState(null);
    const [duration, setDuration] = useState(0);
    const [activeInteractionId, setActiveInteractionId] = useState(null);
    const [showNumpad, setShowNumpad] = useState(true);

    // Fetch leads for quick selection
    const { data: leads } = useApi(() => leadsApi.list({ limit: 5 }));

    useEffect(() => {
        let timer;
        if (callState === 'active') {
            timer = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [callState]);

    const handleDial = async (lead = null, manualPhone = null) => {
        const phoneToDial = manualPhone || lead?.phone;
        if (!phoneToDial) return showToast('No phone number provided', 'error');

        setCallState('dialing');
        setActiveLead(lead);
        setPhoneNumber(phoneToDial);
        setIsOpen(true);
        setIsMinimized(false);

        try {
            // Initiate SIM-integrated calling logic (triggers socket command on server)
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
                // Mocking call pick-up after 1.5s
                setTimeout(() => {
                    setCallState('active');
                    setActiveInteractionId(data.interactionId);
                    showToast('Call connected via GSM SIM Bridge', 'success');
                }, 1500);
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            showToast(err.message, 'error');
            setCallState('idle');
        }
    };

    const handleHangup = async (outcome = 'Connected') => {
        setCallState('finishing');
        
        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/calls/${activeInteractionId}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('zentrix_token')}`
                },
                body: JSON.stringify({ duration, outcome, note: `Direct SIM-integrated call duration: ${duration}s` })
            });
            
            showToast(`Call logged: ${duration}s`, 'info');
        } catch (_err) {
            showToast('Failed to log call stats', 'error');
        }

        setTimeout(() => {
            setCallState('idle');
            setDuration(0);
            setActiveLead(null);
            setPhoneNumber('');
            setActiveInteractionId(null);
        }, 1000);
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
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--navy-800), var(--navy-900))',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(10,22,40,0.3)', border: 'none', cursor: 'pointer'
            }}
        >
            <Phone size={28} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: 'var(--accent-emerald)', borderRadius: '50%', border: '2.5px solid white' }} />
        </button>
    );

    return (
        <div 
            style={{
                position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
                width: isMinimized ? 240 : 380, 
                maxHeight: isMinimized ? 72 : 580,
                background: 'rgba(10, 22, 40, 0.95)', 
                backdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 32, color: 'white', boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
                overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                display: 'flex', flexDirection: 'column'
            }}
        >
            {/* Header */}
            <div style={{ padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', 
                        background: callState === 'active' ? '#ef4444' : 'var(--accent-emerald)',
                        animation: callState === 'active' ? 'pulse 1s infinite' : 'none' 
                    }} />
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {callState === 'idle' ? 'ZENTRIX DIALER' : `GSM: ${callState}`}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon-tiny" onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
                    <button className="btn-icon-tiny" onClick={() => (callState === 'idle' ? setIsOpen(false) : setIsMinimized(true))}><X size={18} /></button>
                </div>
            </div>

            {!isMinimized && (
                <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
                    
                    {callState === 'idle' ? (
                        <>
                            {/* Dialer Input */}
                            <div style={{ position: 'relative' }}>
                                <input 
                                    className="dialer-input"
                                    placeholder="+91 Phone Number..."
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    style={{
                                        width: '100%', height: 64, background: 'rgba(255,255,255,0.05)', borderRadius: 20,
                                        border: '1px solid rgba(255,255,255,0.1)', paddingLeft: 64, color: 'white',
                                        fontSize: '1.4rem', fontWeight: 900, outline: 'none'
                                    }}
                                />
                                <Phone size={24} style={{ position: 'absolute', left: 24, top: 20, color: 'var(--accent-cyan)' }} />
                            </div>

                            {showNumpad && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                    {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => (
                                        <button 
                                            key={n}
                                            onClick={() => setPhoneNumber(p => p + n)}
                                            style={{
                                                height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.05)', color: 'white',
                                                fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                                            }}
                                            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Recent Leads */}
                            <div>
                                <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 12 }}>Quick Select Leads</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(leads?.data || []).map(lead => (
                                        <div key={lead.id} onClick={() => handleDial(lead)} style={{ 
                                            padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                                            border: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', cursor: 'pointer', transition: '0.2s'
                                        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{lead.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{lead.property_type || 'General Inquiry'}</div>
                                            </div>
                                            <Phone size={16} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Active Call View */
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', opacity: 0.1 }}>
                                <Phone size={240} strokeWidth={1} />
                            </div>

                            <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
                                <div style={{ 
                                    width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                    margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid var(--accent-cyan)'
                                }}>
                                    <User size={48} color="var(--accent-cyan)" />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8 }}>{activeLead?.name || phoneNumber}</h2>
                                <div style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '1.2rem' }}>{formatDuration(duration)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Direct GSM Sim Bridge Active</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 40 }}>
                                <div className="call-action"><MicOff size={24} /></div>
                                <div className="call-action"><Volume2 size={24} /></div>
                                <div className="call-action"><Clock size={24} /></div>
                            </div>

                            <button 
                                onClick={() => handleHangup()}
                                style={{
                                    width: 80, height: 80, borderRadius: '50%', background: '#ef4444',
                                    border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto', cursor: 'pointer', boxShadow: '0 10px 24px rgba(239,68,68,0.3)'
                                }}
                            >
                                <PhoneOff size={32} />
                            </button>
                        </div>
                    )}
                    
                    {/* Manual Call Trigger */}
                    {callState === 'idle' && (
                        <button 
                            onClick={() => handleDial(null, phoneNumber)}
                            style={{
                                height: 60, borderRadius: 20, background: 'var(--accent-emerald)',
                                border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 12, fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 24px rgba(16,185,129,0.2)'
                            }}
                        >
                            <Phone size={20} /> START SIM CALL
                        </button>
                    )}
                </div>
            )}

            <style>{`
                .dialer-input::placeholder { color: rgba(255,255,255,0.2); }
                .btn-icon-tiny { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; border-radius: 8px; }
                .btn-icon-tiny:hover { background: rgba(255,255,255,0.05); color: white; }
                .call-action { width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }
                .call-action:hover { background: rgba(255,255,255,0.1); color: white; }
                @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
