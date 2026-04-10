import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { integrationsApi } from '../api/client';
import { PageLoader, PageError } from '../components/Feedback';
import {
    MessageCircle, Facebook, Instagram, Search,
    Link as LinkIcon, ExternalLink, Settings,
    Plus, CheckCircle2, AlertCircle, Copy, Clock, Filter, Zap, RefreshCw, Brain
} from 'lucide-react';
import { useToast } from '../hooks/useToast';

const PROVIDERS = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366', desc: 'Sync leads from WhatsApp Business messages via WhatAPI.' },
    { id: 'gemini', name: 'Google Gemini AI', icon: Brain, color: '#8b5cf6', desc: 'Power Voice Intelligence and content curation securely via the Gemini multimodal engine.' },
    { id: 'facebook', name: 'Meta Ads', icons: [Facebook, Instagram], color: '#0668E1', desc: 'Automate lead import from Facebook & Instagram Ads.' },
    { id: 'google_ads', name: 'Google Ads', icon: Search, color: '#4285F4', desc: 'Sync leads from Google Search and Display ads.' },
    { id: 'zapier', name: 'Zapier', icon: Zap, color: '#FF4A00', desc: 'Connect 5,000+ apps to ZentrixCRM using Zapier Webhooks.' },
];

export default function Integrations() {
    const { data: activeIntegrations, loading, error, refetch } = useApi(integrationsApi.getList);
    const { data: logs, refetch: logsRefetch } = useApi(integrationsApi.getIncomingLogs);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        showToast('URL copied to clipboard', 'success');
    };

    const handleSetup = async () => {
        try {
            await integrationsApi.setup({
                provider: selectedProvider.id,
                api_key: apiKey,
                config: { updated_at: new Date() }
            });
            showToast(`${selectedProvider.name} integration updated!`, 'success');
            setSelectedProvider(null);
            setApiKey('');
            refetch();
            logsRefetch();
        } catch (_err) {
            showToast('Failed to setup integration', 'error');
        }
    };

    const handleTestIntegration = async (provider) => {
        try {
            const integration = getIntegration(provider.id);
            if (!integration) return showToast('Setup integration first', 'warning');

            const testPayload = {
                whatsapp: { sender: '919876543210', message: 'Hi, testing WhatsApp integration!', name: 'Test User' },
                meta: { field_data: [{ name: 'full_name', values: ['Meta Test'] }, { name: 'phone_number', values: ['+123456789'] }] },
                facebook: { field_data: [{ name: 'full_name', values: ['FB Test'] }, { name: 'phone_number', values: ['+123456789'] }] },
                google_ads: { user_column_data: [{ column_name: 'Full Name', string_value: 'Google Test' }, { column_name: 'Phone Number', string_value: '555-0199' }] },
                zapier: { name: 'Zapier Bot', phone: '9000000000', notes: 'Simulated from dashboard' }
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/webhooks/${integration.webhook_url_key}/${provider.id === 'meta' ? 'facebook' : provider.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload[provider.id] || testPayload.zapier)
            });

            if (response.ok) {
                showToast(`Test ${provider.name} lead sent!`, 'success');
                setTimeout(logsRefetch, 1000); // Wait for logs to be written
            } else {
                throw new Error('Test failed');
            }
        } catch (_err) {
            showToast('Failed to send test lead', 'error');
        }
    };

    const handleSync = async (providerId) => {
        try {
            setSyncing(true);
            showToast('Syncing contacts...', 'info');
            const res = await integrationsApi.sync({ provider: providerId });
            showToast(`Sync complete! Imported ${res.imported} new leads.`, 'success');
            logsRefetch();
        } catch (err) {
            showToast(err.error || 'Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const getIntegration = (pid) => {
        return activeIntegrations?.find(i => i.provider === pid);
    };

    return (
        <div className="animate-fadeIn" style={{ padding: '0 32px 40px' }}>
            {/* --- Sophisticated Shell Header --- */}
            <div className="page-header" style={{
                marginBottom: 48,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                background: 'linear-gradient(to right, white, #f8fafc)',
                padding: '32px 0',
                margin: '0 -32px 48px',
                paddingLeft: 32,
                paddingRight: 32,
                borderBottom: '1px solid var(--border-light)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ padding: '6px 12px', background: 'var(--navy-900)', color: 'white', borderRadius: '8px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em' }}>V.2.0.4</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)', fontSize: '11px', fontWeight: 700 }}>
                            <div className="pulse" style={{ width: 8, height: 8, background: 'var(--accent-emerald)', borderRadius: '50%' }} />
                            SYSTEMS OPERATIONAL: 99.9% UPTIME
                        </div>
                    </div>
                    <h1 className="page-title" style={{ fontSize: '36px', fontWeight: 950, color: 'var(--navy-900)', marginBottom: 8, letterSpacing: '-0.04em' }}>
                        Connectivity Matrix
                    </h1>
                    <p className="page-subtitle" style={{ fontSize: '16px', color: 'var(--slate-500)', margin: 0, fontWeight: 500, maxWidth: 600 }}>
                        Architect your lead conversion pipeline by bridging ZentrixCRM with global marketing ecosystems.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 12, paddingRight: 24, borderRight: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Daily Sync Volume</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--navy-900)' }}>1,284 Leads</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 12 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-violet)', textTransform: 'uppercase' }}>AI Inferences</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--navy-900)' }}>4,092 / mth</div>
                    </div>
                    <button className="btn btn-secondary hover-lift" style={{ height: 48, padding: '0 24px', borderRadius: '14px', border: '1px solid var(--border-medium)', background: 'white' }}>
                        <LinkIcon size={18} /> API Explorer
                    </button>
                    <button className="btn btn-primary hover-lift" style={{ height: 48, padding: '0 24px', borderRadius: '14px', background: 'var(--navy-900)' }}>
                        <ExternalLink size={18} /> Marketplace
                    </button>
                </div>
            </div>

            {/* --- Integration Grid: The Performance Layer --- */}
            <div className="grid grid-4 mb-16" style={{ gap: 28 }}>
                {PROVIDERS.map(p => {
                    const active = getIntegration(p.id);
                    return (
                        <div key={p.id} className={`card hover-lift ${active ? 'ai-glow' : ''}`} style={{
                            position: 'relative',
                            border: active ? `2px solid ${p.color}40` : '1px solid var(--border-light)',
                            padding: '36px 28px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            borderRadius: '30px',
                            background: active ? 'white' : 'var(--slate-50)',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            overflow: 'hidden'
                        }} onClick={() => setSelectedProvider(p)}>
                            {/* Decorative Background Element */}
                            <div style={{
                                position: 'absolute', top: -20, right: -20, width: 100, height: 100,
                                background: `${p.color}08`, borderRadius: '50%', zIndex: 0
                            }} />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '22px',
                                    background: active ? p.color : 'var(--slate-200)',
                                    color: active ? 'white' : 'var(--slate-400)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: active ? `0 12px 24px ${p.color}40` : 'none'
                                }}>
                                    {p.icons ? (
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {p.icons.map((Icon, idx) => <Icon key={idx} size={22} strokeWidth={2.5} />)}
                                        </div>
                                    ) : (
                                        <p.icon size={30} strokeWidth={2.5} />
                                    )}
                                </div>
                                {active ? (
                                    <div style={{
                                        color: 'var(--accent-emerald)', fontSize: '10px',
                                        fontWeight: 900, background: 'rgba(16, 185, 129, 0.1)',
                                        padding: '6px 14px', borderRadius: '30px', letterSpacing: '0.08em',
                                        display: 'flex', alignItems: 'center', gap: 4
                                    }}>
                                        <Zap size={12} fill="currentColor" /> CONNECTED
                                    </div>
                                ) : (
                                    <div style={{
                                        color: 'var(--slate-400)', fontSize: '10px',
                                        fontWeight: 800, background: 'var(--slate-100)',
                                        padding: '6px 14px', borderRadius: '30px', letterSpacing: '0.08em'
                                    }}>
                                        INACTIVE
                                    </div>
                                )}
                            </div>

                            <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy-900)', marginBottom: 12, letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>{p.name}</h3>
                            <p style={{ fontSize: '14px', color: 'var(--slate-500)', lineHeight: 1.7, marginBottom: 40, position: 'relative', zIndex: 1 }}>{p.desc}</p>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: 10, alignItems: 'center', position: 'relative', zIndex: 1 }}>
                                {active ? (
                                    <>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, border: '1px solid var(--border-medium)' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (p.id === 'whatsapp') handleSync(p.id);
                                                else if (p.id === 'gemini') {
                                                    showToast('AI diagnostics initiated. Engine responsive.', 'success');
                                                    setTimeout(logsRefetch, 1000);
                                                }
                                                else handleTestIntegration(p);
                                            }}
                                        >
                                            <RefreshCw size={14} className={syncing && p.id === 'whatsapp' ? 'animate-spin' : ''} /> {p.id === 'whatsapp' ? 'Sync Contacts' : p.id === 'gemini' ? 'Diagnostics' : 'Send Test'}
                                        </button>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={(e) => { e.stopPropagation(); setSelectedProvider(p); }}
                                        >
                                            <Settings size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--navy-900)', fontWeight: 800, fontSize: '14px' }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedProvider(p); }}
                                    >
                                        Establish Link
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- The Traffic Command Center --- */}
            <div className="card glass-card" style={{
                borderRadius: '32px',
                border: '1px solid rgba(255,255,255,0.8)',
                overflow: 'hidden',
                padding: 0,
                boxShadow: '0 20px 50px rgba(10, 22, 40, 0.05)'
            }}>
                <div style={{ padding: '40px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--navy-400)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Real-Time Intelligence</div>
                        <h2 style={{ fontSize: '24px', fontWeight: 950, color: 'var(--navy-900)', margin: 0, letterSpacing: '-0.02em' }}>Live Traffic Stream</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="Filter stream..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    paddingLeft: 44, paddingRight: 20, height: 44,
                                    borderRadius: '14px', border: '1px solid var(--border-light)',
                                    background: 'white', fontSize: '14px', width: 220, outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Ingestion Rate</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--accent-emerald)' }}>4.2 leads/min</div>
                        </div>
                        <div style={{ width: 1, height: 32, background: 'var(--border-light)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-medium)' }}>
                            <Clock size={16} color="var(--slate-400)" />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy-900)' }}>Last 24 Hours</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0 40px 40px' }}>
                    <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: '0 12px', width: '100%', marginTop: 20 }}>
                        <thead>
                            <tr>
                                <th style={{ border: 'none', background: 'transparent', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--slate-400)', padding: '12px 24px' }}>Source Channel</th>
                                <th style={{ border: 'none', background: 'transparent', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--slate-400)', padding: '12px 24px' }}>Sync Horizon</th>
                                <th style={{ border: 'none', background: 'transparent', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--slate-400)', padding: '12px 24px' }}>Processing Unit</th>
                                <th style={{ border: 'none', background: 'transparent', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--slate-400)', padding: '12px 24px' }}>Lead Identity</th>
                                <th style={{ border: 'none', background: 'transparent', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--slate-400)', padding: '12px 24px' }}>Digital Footprint</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs?.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '120px 0' }}>
                                        <div style={{ width: 80, height: 80, background: 'var(--slate-50)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--slate-200)' }}>
                                            <Zap size={40} />
                                        </div>
                                        <h3 style={{ fontWeight: 900, color: 'var(--navy-900)', fontSize: '20px', margin: '0 0 8px' }}>Void Detected</h3>
                                        <p style={{ color: 'var(--slate-400)', fontSize: '15px', maxWidth: 300, margin: '0 auto' }}>Connect a digital channel to initiate lead flow synchronization.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs?.map(log => {
                                    const provider = PROVIDERS.find(p => p.id === (log.provider === 'facebook' ? 'facebook' : log.provider)) || PROVIDERS.find(p => p.id === 'meta');
                                    return (
                                        <tr key={log.id} className="hover-lift" style={{ background: 'white', borderRadius: '20px', transition: 'all 0.3s ease' }}>
                                            <td style={{ padding: '24px', borderRadius: '20px 0 0 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: '12px',
                                                        background: `${provider.color}15`,
                                                        color: provider.color,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: `inset 0 0 10px ${provider.color}10`
                                                    }}>
                                                        {log.provider === 'facebook' || log.provider === 'instagram' || log.provider === 'meta' ? (
                                                            <Facebook size={18} strokeWidth={2.5} />
                                                        ) : (
                                                            React.createElement(provider.icon || MessageCircle, { size: 20, strokeWidth: 2.5 })
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: 900, color: 'var(--navy-900)', fontSize: '14px', letterSpacing: '-0.01em' }}>{(log.provider || 'WEBHOOK').toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '24px', fontSize: '14px', color: 'var(--slate-500)', fontWeight: 600, borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                                {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '24px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{
                                                    display: 'inline-flex', padding: '6px 14px', borderRadius: '10px',
                                                    fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em',
                                                    background: log.status === 'processed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: log.status === 'processed' ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                                                }}>
                                                    {log.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '24px', fontWeight: 800, color: 'var(--navy-900)', fontSize: '15px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>{log.lead_name || 'Anonymous Object'}</td>
                                            <td style={{ padding: '24px', borderRadius: '0 20px 20px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                                                <div style={{
                                                    fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: 'var(--slate-400)',
                                                    background: 'var(--slate-50)', padding: '8px 14px', borderRadius: '10px',
                                                    maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    border: '1px solid var(--border-light)'
                                                }}>
                                                    {JSON.stringify(log.payload)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Ultra-Sleek Config Portal --- */}
            {selectedProvider && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(4, 13, 26, 0.7)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
                }} onClick={() => setSelectedProvider(null)}>
                    <div className="card animate-scaleUp" style={{ width: 580, padding: 0, borderRadius: '40px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'var(--navy-900)', padding: '48px 40px', color: 'white', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: `radial-gradient(circle at top right, ${selectedProvider.color}30, transparent)`, zIndex: 0 }} />
                            <button onClick={() => setSelectedProvider(null)} style={{ position: 'absolute', top: 32, right: 32, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: 10, borderRadius: '14px', cursor: 'pointer', zIndex: 1 }}>
                                <Plus size={22} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: '24px',
                                    background: 'white', color: selectedProvider.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                                }}>
                                    {selectedProvider.icons ? (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {selectedProvider.icons.map((Icon, idx) => <Icon key={idx} size={28} />)}
                                        </div>
                                    ) : (
                                        <selectedProvider.icon size={36} />
                                    )}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '28px', fontWeight: 950, margin: 0, letterSpacing: '-0.02em' }}>{selectedProvider.name}</h2>
                                    <div style={{ fontSize: '14px', opacity: 0.7, marginTop: 4, fontWeight: 600 }}>Secure Channel Provisioning</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: 32, background: 'white' }}>
                            {(selectedProvider.id === 'whatsapp' || selectedProvider.id === 'gemini') && (
                                <div className="animate-fadeIn">
                                    <label style={{ fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 12, letterSpacing: '0.1em' }}>Instance Authentication Key</label>
                                    <input
                                        type="password"
                                        placeholder={selectedProvider.id === 'gemini' ? "Paste your Google Gemini AI Key" : "Paste your WhatAPI access token"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border-medium)', fontSize: '16px', background: 'var(--slate-50)', fontWeight: 600 }}
                                    />
                                    <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: 14, lineHeight: 1.6, display: 'flex', gap: 8 }}>
                                        <AlertCircle size={16} color={selectedProvider.id === 'gemini' ? "var(--accent-violet)" : "var(--accent-amber)"} />
                                        {selectedProvider.id === 'gemini' ? "This API key powers all Voice and Text Intelligence in the CRM." : "Your key is encrypted and stored in our secure vault."}
                                    </div>
                                </div>
                            )}

                            {getIntegration(selectedProvider.id) && (
                                <div className="card animate-fadeIn" style={{ background: 'var(--slate-50)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 16, letterSpacing: '0.1em' }}>Data Intake Webhook</label>
                                    <div style={{ display: 'flex', gap: 14 }}>
                                        <div style={{
                                            flex: 1, padding: '16px', background: 'white',
                                            borderRadius: '14px', border: '1px solid var(--border-medium)',
                                            fontSize: '13px', fontFamily: '"JetBrains Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--navy-600)', fontWeight: 600
                                        }}>
                                            {`${window.location.protocol}//${window.location.host}/api/webhooks/${getIntegration(selectedProvider.id)?.webhook_url_key}/${selectedProvider.id === 'meta' ? 'facebook' : selectedProvider.id}`}
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleCopy(`${window.location.protocol}//${window.location.host}/api/webhooks/${getIntegration(selectedProvider.id)?.webhook_url_key}/${selectedProvider.id === 'meta' ? 'facebook' : selectedProvider.id}`)}
                                            style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--navy-900)' }}
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: 20, lineHeight: 1.6 }}>
                                        Map this unique endpoint in the <b>{selectedProvider.name} Developer Console</b> to enable zero-latency sync.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, padding: '18px', borderRadius: '16px', fontWeight: 800, color: 'var(--slate-500)' }} onClick={() => setSelectedProvider(null)}>Discard</button>
                                <button className="btn btn-primary hover-lift" style={{ flex: 1.8, padding: '18px', borderRadius: '16px', background: 'var(--navy-900)', fontWeight: 900, fontSize: '16px', boxShadow: '0 10px 25px rgba(10, 22, 40, 0.2)' }} onClick={handleSetup}>Activate Infrastructure</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
