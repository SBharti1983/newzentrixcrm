import { useState } from 'react';
import * as dateUtils from '../../utils/dateUtils';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { customersApi } from '../../api/client';
import { Phone, Mail, MapPin, Plus, X, Clock, MessageCircle } from 'lucide-react';
import { dialerEvents } from '../../constants/events';
import { useMobile } from '../../hooks/useMobile';

const SEGMENT_BADGE = {
    'Ultra Premium': 'badge-violet',
    Premium: 'badge-blue',
    Mid: 'badge-cyan',
    Standard: 'badge-slate',
};
const STATUS_BADGE = { Active: 'badge-green', Prospect: 'badge-amber', Warm: 'badge-cyan' };

const INTERACTION_ICONS = {
    Call: '📞', Email: '📧', 'Site Visit': '🏠', WhatsApp: '💬', 'Walk-in': '🚶',
};

export default function Customers() {
    const { data: rawCustomers, loading, error, refetch } = useApi(() => customersApi.list());
    const isMobile = useMobile();
    const customers = rawCustomers || [];
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('profile');

    const filtered = customers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.city || '').toLowerCase().includes(search.toLowerCase())
    );

    const customerInteractions = (selected?.interactions || []);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    return (
        <div className="animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 420px', gap: 24, height: isMobile ? 'auto' : 'calc(100vh - 120px)' }}>
            {/* Left: Customer Registry */}
            <div style={{ display: (isMobile && selected) ? 'none' : 'flex', flexDirection: 'column', gap: 20, overflowY: isMobile ? 'visible' : 'auto', paddingRight: isMobile ? 0 : 8 }}>
                <div className="glass-panel" style={{ 
                    padding: isMobile ? '20px' : '28px 32px', 
                    borderRadius: 24,
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                    border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 16 : 0,
                    textAlign: isMobile ? 'center' : 'left',
                    height: 0, overflow: 'hidden'
                }}>
                    <div>
                        <h1 className="text-gradient-premium" style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Client Registry</h1>
                        <p style={{ margin: '4px 0 0', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 600, color: 'var(--slate-500)' }}>{customers.length} verified executive profiles</p>
                    </div>
                    <button className="btn btn-primary" style={{ padding: isMobile ? '12px 20px' : '14px 28px', borderRadius: 16, boxShadow: '0 8px 20px rgba(10,22,40,0.15)', width: isMobile ? '100%' : 'auto' }}>
                        <Plus size={20} /> {isMobile ? 'ONBOARD' : 'ONBOARD CLIENT'}
                    </button>
                </div>

                {/* Search amp Filters */}
                <div className="glass-card" style={{ 
                    padding: '12px 16px', 
                    borderRadius: 16, 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center', 
                    gap: 12,
                    border: '1px solid var(--slate-200)',
                    background: 'rgba(255,255,255,0.6)'
                }}>
                    <div className="search-bar" style={{ flex: 1, background: 'white', border: '1px solid var(--slate-200)', borderRadius: 12 }}>
                        <input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            placeholder={isMobile ? "Search clients..." : "Identify customer by name, email or city..."} 
                            style={{ fontSize: '0.9rem' }}
                        />
                    </div>
                    {!isMobile && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['All', 'Ultra Premium', 'Premium'].map(s => (
                                <button key={s} className="btn btn-ghost btn-sm" style={{ borderRadius: 8, fontSize: '0.75rem', fontWeight: 700 }}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Customer Matrix */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(c => {
                        const isSelected = selected?.id === c.id;
                        return (
                            <div
                                key={c.id}
                                className="glass-interactive"
                                style={{
                                    padding: '24px',
                                    cursor: 'pointer',
                                    borderRadius: 24,
                                    border: isSelected ? '2px solid var(--accent-violet)' : '1px solid rgba(255,255,255,0.8)',
                                    background: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                                    position: 'relative',
                                    boxShadow: isSelected ? '0 15px 30px rgba(139, 92, 246, 0.12)' : '0 4px 12px rgba(0,0,0,0.02)'
                                }}
                                onClick={() => { setSelected(c); setTab('profile'); }}
                            >
                                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div className="avatar" style={{ 
                                            width: 72, height: 72, borderRadius: 24,
                                            background: `linear-gradient(135deg, hsl(${(c.id || 0) * 55 + 180}, 60%, 52%), hsl(${(c.id || 0) * 55 + 210}, 60%, 42%))`,
                                            fontSize: '1.8rem', fontWeight: 900, color: 'white',
                                            boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                        }}>
                                            {(c.name || '?')[0]}
                                        </div>
                                        <div className="ai-pulse" style={{ 
                                            position: 'absolute', bottom: -6, right: -6,
                                            width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-emerald)',
                                            border: '4px solid white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                        }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--navy-900)', letterSpacing: '-0.02em' }}>{c.name}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--navy-900)', color: 'white', padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {c.segment}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED · #CST-{1000 + (c.id || 0)}</span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: isMobile ? 12 : 40, flexDirection: isMobile ? 'column' : 'row' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIMARY CHANNEL</span>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Mail size={14} style={{ color: 'var(--navy-400)' }} /> {c.email}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate-700)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); dialerEvents.call(c.id, c.phone, c.name); }}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-emerald)', padding: 0, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 700 }}
                                                    >
                                                        <Phone size={14} /> {c.phone}
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PORTFOLIO VALUE</span>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--navy-900)' }}>
                                                    {c.total_purchased || c.totalPurchased || 'PENDING ASSETS'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: isMobile ? 0 : 'auto', textAlign: isMobile ? 'left' : 'right' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIFETIME STATUS</span>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span className={`badge ${STATUS_BADGE[c.status] || 'badge-slate'}`} style={{ padding: '4px 14px', borderRadius: 8, fontSize: '0.75rem' }}>{c.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Intel Profile Sidebar */}
            <div style={{ display: (isMobile && !selected) ? 'none' : 'block', overflowY: isMobile ? 'visible' : 'auto', paddingRight: isMobile ? 0 : 4 }}>
                {selected ? (
                    <div className="glass-card animate-fadeIn" style={{ 
                        position: 'sticky', top: 0, borderRadius: 28, 
                        border: '1px solid rgba(255,255,255,0.7)',
                        boxShadow: 'var(--shadow-xl)', overflow: 'hidden'
                    }}>
                        {/* Profile Header Block */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-700) 100%)',
                            padding: '32px 28px',
                            color: 'white',
                            position: 'relative'
                        }}>
                            <button 
                                className="btn btn-ghost btn-sm btn-icon" 
                                style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)' }} 
                                onClick={() => setSelected(null)}
                            >
                                <X size={18} />
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ 
                                    width: 84, height: 84, borderRadius: 28, 
                                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '2rem', fontWeight: 900, marginBottom: 16,
                                    border: '2px solid rgba(255,255,255,0.2)'
                                }}>
                                    {(selected.name || '?')[0]}
                                </div>
                                <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{selected.name}</h2>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 4 }}>{selected.segment} · Partner since {dateUtils.parseSafe(selected.join_date)?.getFullYear() || '2024'}</p>
                                
                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button className="btn btn-white btn-sm" style={{ borderRadius: 10, padding: '8px 16px', fontWeight: 700 }} onClick={() => dialerEvents.call(selected.id, selected.phone, selected.name)}><Phone size={14} /> Call Now</button>
                                    <button className="btn btn-white btn-sm" style={{ borderRadius: 10, padding: '8px 16px', fontWeight: 700 }}><MessageCircle size={14} /> WhatsApp</button>
                                </div>
                            </div>
                        </div>

                        {/* Detail Tabs */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ 
                                display: 'flex', background: 'var(--slate-50)', borderRadius: 14, padding: 4, marginBottom: 24,
                                border: '1px solid var(--slate-100)'
                            }}>
                                <button 
                                    className={`btn btn-sm ${tab === 'profile' ? 'btn-white shadow-sm' : 'btn-ghost'}`} 
                                    style={{ flex: 1, borderRadius: 10 }}
                                    onClick={() => setTab('profile')}
                                >Profile</button>
                                <button 
                                    className={`btn btn-sm ${tab === 'history' ? 'btn-white shadow-sm' : 'btn-ghost'}`} 
                                    style={{ flex: 1, borderRadius: 10 }}
                                    onClick={() => setTab('history')}
                                >History</button>
                            </div>

                            {tab === 'profile' && (
                                <div className="animate-fadeIn">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                                        {[
                                            { label: 'Contact', value: selected.phone, icon: <Phone size={12}/> },
                                            { label: 'Intelligence', value: selected.segment, icon: <Clock size={12}/> },
                                            { label: 'Asset Value', value: selected.total_purchased || '₹0', icon: '💰' },
                                            { label: 'Status', value: selected.status, icon: '⚡' },
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ 
                                                background: 'white', borderRadius: 16, padding: '14px',
                                                border: '1px solid var(--slate-100)', boxShadow: 'var(--shadow-xs)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                                    {item.icon} {item.label}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-900)' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div style={{ background: 'rgba(237,242,253,0.5)', borderRadius: 18, padding: '20px', border: '1px solid var(--navy-50)' }}>
                                        <h4 style={{ fontSize: '0.85rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--navy-600)' }} />
                                            Customer Health
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                            <div style={{ flex: 1, height: 8, background: 'var(--slate-200)', borderRadius: 10, overflow: 'hidden' }}>
                                                <div style={{ width: '85%', height: '100%', background: 'var(--navy-600)', borderRadius: 10 }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>85%</span>
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            High engagement probability. Recommending property upgrade pitch for "Marathon Monte South" project based on profile matching.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {tab === 'history' && (
                                <div className="animate-fadeIn">
                                    {customerInteractions.length === 0 ? (
                                        <div style={{ padding: '40px 10px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛸</div>
                                            <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>Discovery Phase</div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>No historical interactions recorded for this profile.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {customerInteractions.map((inter, idx) => (
                                                <div key={idx} style={{ 
                                                    display: 'flex', gap: 14, padding: '14px', 
                                                    background: 'white', borderRadius: 16,
                                                    border: '1px solid var(--slate-100)'
                                                }}>
                                                    <div style={{ 
                                                        width: 36, height: 36, borderRadius: 12, background: 'var(--slate-50)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                                                        flexShrink: 0
                                                    }}>
                                                        {INTERACTION_ICONS[inter.type] || '⚡'}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{inter.type}</span>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inter.date}</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{inter.note}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', borderRadius: 28, border: '1px dashed var(--slate-300)', background: 'transparent' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 24, background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: '2rem'
                        }}>👤</div>
                        <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--slate-900)' }}>Client Deep-Dive</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: 260 }}>
                            Select any profile from the registry to unleash predictive insights and interaction history.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
