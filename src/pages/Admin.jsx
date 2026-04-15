import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { PageLoader, PageError } from '../components/Feedback';
import { usersApi, projectsApi, settingsApi, telephonyApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { Plus, Edit2, Trash2, X, Shield, Users, Building2, Settings, Smartphone, Zap, Phone, Radio, Search, Palette } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';

const ROLE_LABELS = {
    superadmin: 'Super Administrator',
    admin: 'Administrator',
    sales_manager: 'Sales Manager',
    team_leader: 'Team Leader',
    agent: 'Sales Agent',
};
const ROLE_BADGE = {
    superadmin: 'badge-rose',
    admin: 'badge-violet',
    sales_manager: 'badge-blue',
    team_leader: 'badge-indigo',
    agent: 'badge-cyan',
};

const ROLE_PERMISSIONS = {
    superadmin: ['Full System Access', 'Manage Tenants', 'View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Manage Users', 'System Settings', 'Delete Records', 'Export Data', 'Billing Access'],
    admin: ['View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Manage Users', 'System Settings', 'Delete Records', 'Export Data'],
    sales_manager: ['View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Assign Agents', 'Export Data'],
    team_leader: ['View Team Dashboard', 'Manage Team Leads', 'View Analytics', 'Lead Distribution', 'Daily Tracking'],
    agent: ['View Dashboard', 'Manage Own Leads', 'View Projects', 'Schedule Visits', 'Update Bookings'],
};

const SETTINGS_MAP = {
    // Company
    'Company Name': 'company_name', 'Website': 'company_website', 'Support Email': 'support_email', 'Phone': 'company_phone',
    // CRM
    'Lead Expiry (days)': 'lead_expiry_days', 'Auto-assign Leads': 'auto_assign_leads', 'Default Currency': 'default_currency', 'Fiscal Year Start': 'fiscal_year_start',
    // Notifications
    'Follow-up Reminders': 'followup_reminders', 'Visit Reminders': 'visit_reminders', 'Booking Alerts': 'booking_alerts', 'Weekly Reports': 'weekly_reports',
    // Privacy
    'Data Retention': 'data_retention', 'Backup Frequency': 'backup_freq', 'Export Format': 'export_format', 'Audit Logs': 'audit_logs',
    // Communication
    'WhatsApp Phone ID': 'whatsapp_phone_id', 'WhatsApp API Key': 'whatsapp_api_key', 'SMTP Host': 'smtp_host', 'SMTP User': 'smtp_user', 'SMTP Password': 'smtp_pass',
    // System
    'Firebase Project': 'firebase_project_id', 'Firebase Database URL': 'firebase_database_url', 'Storage Server URL': 'android_storage_url', 'Webhook Secret': 'telephony_secret',
    'Gemini AI Key': 'gemini_api_key'
};

const DEFAULT_FORM = { name: '', email: '', role: 'agent', department: 'Sales', phone: '', password: 'Zentrix@123', telephony_agent_id: '' };

export default function Admin() {
    const { showToast } = useToast();
    const { data: usersRaw, loading, error, refetch: refetchUsers } = useApi(() => usersApi.list());
    const { data: projectsRaw, refetch: refetchProjects } = useApi(() => projectsApi.list());
    const { data: systemSettings, refetch: refetchSettings } = useApi(() => settingsApi.get());
    const usersRawList = usersRaw || [];
    const PROJECTS_DATA = projectsRaw || [];
    // derive current user from session storage
    const { user: currentUser, refreshUser } = useAuth();

    // White Label branding
    const { branding, updateBranding } = useBranding();




    const [tab, setTab] = useState('users');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    
    // Settings Edit State
    const [editingSetting, setEditingSetting] = useState(null);
    const [editingProject, setEditingProject] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [settingValue, setSettingValue] = useState("");

    // Filter users based on current user role and search term
    const users = usersRawList.filter(u => {
        const matchesSearch = !userSearch || 
            (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.role || '').toLowerCase().includes(userSearch.toLowerCase());
        
        if (!matchesSearch) return false;

        if (currentUser?.role === 'sales_manager') {
             return u.id === currentUser?.id || u.role === 'agent';
        }

        if (currentUser?.role === 'admin') {
            return u.role !== 'superadmin';
        }
        return true;
    });


    // ─── Recording / Bridge Policy Panel ───────────────────────────
    const RecordingPolicyPanel = () => {
        const [bridgeConfig, setBridgeConfig] = useState(null);
        const [configLoading, setConfigLoading] = useState(true);
        const [configSaving, setConfigSaving] = useState(false);
        const [localBridge, setLocalBridge] = useState('');
        const [localMode, setLocalMode] = useState('device_local');
        const [localRecEnabled, setLocalRecEnabled] = useState(true);

        useEffect(() => {
            telephonyApi.getBridgeConfig()
                .then(data => {
                    setBridgeConfig(data);
                    setLocalBridge(data.bridge_number || '');
                    setLocalMode(data.recording_mode || 'device_local');
                    setLocalRecEnabled(data.recording_enabled !== false);
                })
                .catch(() => {
                    setBridgeConfig({ bridge_number: '', recording_enabled: true, recording_mode: 'device_local', description: 'Could not fetch.' });
                })
                .finally(() => setConfigLoading(false));
        }, []);

        const handleSaveBridgeConfig = async () => {
            setConfigSaving(true);
            try {
                await telephonyApi.updateBridgeConfig({
                    bridge_number: localBridge.trim(),
                    recording_enabled: localRecEnabled,
                    recording_mode: localMode
                });
                showToast('Recording policy saved & pushed to all handsets!', 'success');
                setBridgeConfig(prev => ({ ...prev, bridge_number: localBridge.trim(), recording_enabled: localRecEnabled, recording_mode: localMode }));
            } catch (err) {
                showToast(err.error || 'Failed to save recording policy', 'error');
            } finally {
                setConfigSaving(false);
            }
        };

        if (configLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Loading recording configuration...</div>;

        const MODES = [
            {
                key: 'device_local',
                title: 'Device-Local Recording',
                subtitle: 'Android mic records the call. Audio uploads to CRM server via Wi-Fi.',
                icon: <Smartphone size={20} />,
                color: '#10b981',
                bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                pros: ['No telephony provider needed', 'Zero cost', 'Works with any SIM'],
                cons: ['Quality depends on speakerphone/mic', 'Requires RECORD_AUDIO permission']
            },
            {
                key: 'bridge_server',
                title: 'Bridge Server Recording',
                subtitle: 'Calls route through a telephony bridge for server-side HD recording.',
                icon: <Radio size={20} />,
                color: '#6366f1',
                bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                pros: ['HD dual-channel audio', 'No microphone dependency', 'Works silently'],
                cons: ['Requires a telephony bridge number', 'May have per-minute costs']
            }
        ];

        return (
            <div className="animate-fadeIn">
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    borderRadius: '24px', padding: '36px', color: 'white', marginBottom: '32px',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <Phone size={24} color="#818cf8" /> Call Recording & Bridge Management
                    </h3>
                    <p style={{ margin: '0 0 8px', color: '#94a3b8', fontWeight: 500, maxWidth: '600px', lineHeight: 1.6, position: 'relative' }}>
                        Configure how your sales team's calls are recorded. Choose between device-local recording (free, microphone-based) or server-side bridge recording (HD, requires a bridge number from your telephony provider).
                    </p>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '20px', position: 'relative' }}>
                        <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                            Current Mode: <span style={{ color: localMode === 'bridge_server' ? '#818cf8' : '#34d399' }}>
                                {localMode === 'bridge_server' ? '🔗 Bridge Server' : '📱 Device Local'}
                            </span>
                        </div>
                        <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                            Recording: <span style={{ color: localRecEnabled ? '#34d399' : '#f87171' }}>
                                {localRecEnabled ? '✅ Enabled' : '⛔ Disabled'}
                            </span>
                        </div>
                        {localBridge && (
                            <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                Bridge: <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{localBridge}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recording Toggle */}
                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)', marginBottom: '4px' }}>Enable Call Recording</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '500px' }}>
                                When disabled, calls are dialed directly with no recording. Agent ID is still used for cloud identity & log syncing.
                            </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={localRecEnabled}
                                onChange={e => setLocalRecEnabled(e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute', inset: 0, borderRadius: '99px',
                                background: localRecEnabled ? '#10b981' : '#cbd5e1',
                                transition: 'all 0.3s'
                            }}>
                                <span style={{
                                    position: 'absolute', width: '22px', height: '22px', borderRadius: '50%',
                                    background: 'white', top: '3px',
                                    left: localRecEnabled ? '27px' : '3px',
                                    transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                }} />
                            </span>
                        </label>
                    </div>
                </div>

                {/* Recording Mode Selection */}
                {localRecEnabled && (
                    <>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-900)', marginBottom: '16px' }}>Recording Mode</h3>
                        <div className="grid grid-2" style={{ marginBottom: '24px' }}>
                            {MODES.map(m => {
                                const isSelected = localMode === m.key;
                                return (
                                    <div
                                        key={m.key}
                                        onClick={() => setLocalMode(m.key)}
                                        className="card"
                                        style={{
                                            padding: '24px', cursor: 'pointer',
                                            border: isSelected ? `2px solid ${m.color}` : '2px solid transparent',
                                            background: isSelected ? m.bg : 'white',
                                            transition: 'all 0.3s',
                                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '12px',
                                                background: isSelected ? m.color : '#e2e8f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: isSelected ? 'white' : '#64748b', transition: 'all 0.3s'
                                            }}>
                                                {m.icon}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)' }}>{m.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{m.subtitle}</div>
                                            </div>
                                            {isSelected && (
                                                <div style={{
                                                    marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%',
                                                    background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontSize: '12px', fontWeight: 900
                                                }}>✓</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' }}>Advantages</div>
                                                {m.pros.map(p => <div key={p} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>✅ {p}</div>)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px' }}>Considerations</div>
                                                {m.cons.map(c => <div key={c} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ {c}</div>)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bridge Number Input (only visible when bridge_server mode is selected) */}
                        {localMode === 'bridge_server' && (
                            <div className="card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid #6366f1' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)', marginBottom: '4px' }}>
                                    🔗 Bridge Number (Telephony Gateway)
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '600px', lineHeight: 1.6 }}>
                                    Enter the number provided by your telephony provider. When an agent places a call, the app will first dial this bridge number.
                                    The bridge server then connects to the customer and records both sides in HD.
                                    <strong style={{ color: '#ef4444' }}> Do NOT use the agent's own number here</strong> — it will cause a busy loop.
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        className="form-control"
                                        value={localBridge}
                                        onChange={e => setLocalBridge(e.target.value)}
                                        placeholder="e.g. +91-22-4567-XXXX or 1800-XXX-XXXX"
                                        style={{ maxWidth: '400px', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em' }}
                                    />
                                    {localBridge && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setLocalBridge('')}
                                            style={{ color: '#ef4444', fontSize: '0.75rem' }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {!localBridge && (
                                    <div style={{ marginTop: '12px', padding: '12px 16px', background: '#fffbeb', borderRadius: '12px', fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                                        ⚠️ Bridge mode is selected but no number is configured. Calls will fall back to direct dialing until a bridge number is set.
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Save Button */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveBridgeConfig}
                        disabled={configSaving}
                        style={{ padding: '12px 32px', fontSize: '0.95rem', fontWeight: 800 }}
                    >
                        {configSaving ? 'Saving & Pushing to Fleet...' : '💾 Save & Push to All Handsets'}
                    </button>
                </div>

                {/* How It Works Explainer */}
                <div className="card" style={{ padding: '28px', marginTop: '32px', background: 'var(--navy-50)', border: '1px solid var(--border-light)' }}>
                    <h4 style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--navy-900)', marginBottom: '16px', marginTop: 0 }}>📖 How Call Recording Works</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#10b981', marginBottom: '8px' }}>📱 Device-Local Mode</div>
                            <ol style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                                <li>Agent dials customer's number <strong>directly</strong></li>
                                <li>Android mic records the conversation as MP4</li>
                                <li>After call ends, recording saves to local storage</li>
                                <li>SyncWorker uploads to CRM server over Wi-Fi</li>
                                <li>Gemini AI transcribes, analyzes sentiment, drafts follow-up</li>
                            </ol>
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#6366f1', marginBottom: '8px' }}>🔗 Bridge Server Mode</div>
                            <ol style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                                <li>Agent initiates call from CRM or Firebase remote trigger</li>
                                <li>App dials the <strong>bridge number</strong> instead of customer</li>
                                <li>Bridge connects the call and records both channels in HD</li>
                                <li>Recording auto-delivered to CRM via webhook callback</li>
                                <li>Gemini AI processes the HD audio for better accuracy</li>
                            </ol>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', padding: '14px 18px', background: 'white', borderRadius: '12px', border: '1px solid var(--border-medium)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--navy-900)' }}>💡 Recommendation:</strong> If you don't have a telephony bridge provider, use <strong>Device-Local</strong> mode.
                        The Android app will record via microphone and auto-upload. This is free and works with any carrier SIM.
                        Only switch to Bridge Server mode if your provider (e.g. Knowlarity, Ozonetel, Exotel) gives you a dedicated bridge/conference number.
                    </div>
                </div>
            </div>
        );
    };

    const AgentActivityPanel = () => {
        const [alertText, setAlertText] = useState('');
        const [sending, setSending] = useState(false);
        const { data: report, loading, error } = useApi(telephonyApi.getAgentActivity);
        const [searchTerm, setSearchTerm] = useState('');
        const [timeFilter, setTimeFilter] = useState('Today'); // 'Today' | 'Weekly' | 'Monthly'

        const filteredReport = (report || []).filter(r => {
            const name = r.name || '';
            const tid = r.telephonyId || '';
            const dept = r.department || '';
            const search = searchTerm.toLowerCase();
            return name.toLowerCase().includes(search) || 
                   tid.toLowerCase().includes(search) ||
                   dept.toLowerCase().includes(search);
        });

        const sendBlast = async () => {
            if (!alertText.trim()) return;
            setSending(true);
            try {
                await telephonyApi.broadcastAlert({ text: alertText });
                showToast('Flash Alert pushed to all Android devices!', 'success');
                setAlertText('');
            } catch (err) {
                showToast('Failed to broadcast alert', 'error');
            } finally { setSending(false); }
        };

        if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Syncing Fleet Status...</div>;
        if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>Error: {error}</div>;

        return (
            <div className="animate-fadeIn">
                {/* Advanced Broadcast Tool */}
                <div style={{ background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', borderRadius: '24px', padding: '32px', color: 'white', marginBottom: '32px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.15)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={24} color="#818cf8" /> MDM System Broadcast (Flash Alert)
                    </h3>
                    <p style={{ margin: '0 0 20px', color: '#c7d2fe', fontWeight: 500 }}>Push a critical pop-up to all connected Android sales handsets over Firebase RTDB.</p>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <input 
                            value={alertText} onChange={e => setAlertText(e.target.value)} 
                            placeholder="e.g. Mandatory Sales Floor Huddle in 5 Mins - Stop Dialing" 
                            style={{ flex: 1, padding: '16px 20px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontWeight: 600, outline: 'none' }} 
                        />
                        <button onClick={sendBlast} disabled={sending} style={{ padding: '0 32px', background: alertText ? '#10b981' : 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '1rem', cursor: alertText ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                            {sending ? 'Broadcasting...' : 'SEND ALERT'}
                        </button>
                    </div>
                </div>

                {/* Handset Sync Integrity Matrix */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h3 className="ent-section-title">Agent Device Integrity & Dial Analytics</h3>
                        <p className="ent-section-subtitle" style={{ marginBottom: 0 }}>Active fleet monitoring & periodic performance trackers</p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Periodic Toggle */}
                        <div style={{ display: 'flex', background: 'var(--slate-100)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-light)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
                            {['Today', 'Weekly', 'Monthly'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTimeFilter(f)}
                                    style={{
                                        padding: '8px 20px', borderRadius: '10px', border: 'none',
                                        background: timeFilter === f ? 'white' : 'transparent',
                                        color: timeFilter === f ? 'var(--navy-900)' : 'var(--slate-500)',
                                        fontSize: '0.75rem', fontWeight: timeFilter === f ? 900 : 700, cursor: 'pointer',
                                        boxShadow: timeFilter === f ? '0 4px 12px rgba(10,22,40,0.08)' : 'none',
                                        transition: 'all 0.2s', minWidth: '90px'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text"
                                placeholder="Search fleet..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ padding: '12px 16px 12px 38px', borderRadius: '14px', border: '1px solid var(--border-medium)', background: 'white', fontSize: '0.85rem', fontWeight: 600, width: '240px', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-wrapper box-shadow">
                    <table>
                        <thead>
                            <tr>
                                <th>Agent Identity</th>
                                <th>Team / Designation</th>
                                <th>Calls {timeFilter}</th>
                                <th>Success Ratio</th>
                                <th>Recording Sync</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReport.length === 0 ? (<tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No matching active users found.</td></tr>) : (
                                filteredReport.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, background: 'var(--navy-100)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: 'var(--navy-600)' }}>
                                                    {r.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {r.name}
                                                        {r.telephonyId !== 'Not Mapped' && <Shield size={10} color="#10b981" fill="#10b981" />}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: r.telephonyId === 'Not Mapped' ? '#ef4444' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                                        {r.telephonyId === 'Not Mapped' ? '⚠ No Handset Linked' : `Bridge ID: ${r.telephonyId}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-600)' }}>{ROLE_LABELS[r.role] || r.role}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{r.department}</div>
                                        </td>
                                        <td style={{ fontWeight: 800 }}>
                                            <div style={{ fontSize: '1.1rem', color: 'var(--navy-900)' }}>
                                                {timeFilter === 'Today' ? r.callsToday : timeFilter === 'Weekly' ? r.callsThisWeek : r.callsThisMonth}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                                                {timeFilter === 'Today' ? 'Since morning' : timeFilter === 'Weekly' ? 'Current Week' : 'Current Month'}
                                            </div>
                                        </td>
                                        <td>
                                            {(() => {
                                                const total = timeFilter === 'Today' ? r.callsToday : timeFilter === 'Weekly' ? r.callsThisWeek : r.callsThisMonth;
                                                const pct = total > 0 ? (r.successCount / total * 100) : 0;
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '70px', height: '8px', background: 'var(--slate-100)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '4px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--navy-900)' }}>{r.successCount} wins</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '20px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ 
                                                    width: 10, height: 10, borderRadius: '50%', 
                                                    background: r.isOnline ? '#10b981' : '#cbd5e1',
                                                    boxShadow: r.isOnline ? '0 0 8px #10b981' : 'none'
                                                }} />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: r.isOnline ? '#059669' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {r.isOnline ? 'Active Now' : 'Last seen: Offline'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 24px' }}>
                                            {r.syncStatus.includes('Up to Date') ? (
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', background: '#ecfdf5', color: '#10b981', borderRadius: '8px', textTransform: 'uppercase', border: '1px solid #b7ebc6' }}>✓ Fully Synced</span>
                                            ) : (
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', background: '#fffbeb', color: '#f59e0b', borderRadius: '8px', textTransform: 'uppercase', border: '1px solid #fde68a' }}>⚠ Sync Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const displaySetting = (key, fallback) => {
        const dbKey = SETTINGS_MAP[key] || key;
        const val = systemSettings?.[dbKey];
        if (key.includes('Password') || key.includes('API Key') || key === 'Webhook Secret' || key === 'Gemini AI Key') {
            return val ? '••••••••' : 'None';
        }
        return val !== undefined && val !== null ? val : fallback;
    };

    const handleSaveSetting = async () => {
        try {
            setSaving(true);
            const settingKey = SETTINGS_MAP[editingSetting] || editingSetting;
            
            // SECURITY FIX: Do not save masked values back to the DB
            if (settingValue === '••••••••') {
                setEditingSetting(null);
                setSaving(false);
                return;
            }

            await settingsApi.update({ [settingKey]: settingValue });
            showToast('Setting updated', 'success');
            setEditingSetting(null);
            refetchSettings();
        } catch (err) {
            showToast(err.error || 'Failed to update setting', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePushConfig = async () => {
        if (!systemSettings?.android_storage_url) {
            showToast('Storage URL is not configured yet', 'error');
            return;
        }
        try {
            setSaving(true);
            await telephonyApi.pushConfig({ 
                storageUrl: systemSettings.android_storage_url,
                firebaseDatabaseUrl: systemSettings.firebase_database_url,
                firebaseProjectId: systemSettings.firebase_project_id
            });
            showToast('Config pushed to all handsets successfully!', 'success');
        } catch (err) {
            showToast(err.error || 'Failed to push configuration', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePermissions = async (role, newPerms) => {
        try {
            setSaving(true);
            const currentPerms = systemSettings?.role_permissions || ROLE_PERMISSIONS;
            const updated = { ...currentPerms, [role]: newPerms };
            await settingsApi.update({ role_permissions: updated });
            showToast(`Permissions for ${ROLE_LABELS[role]} updated!`, 'success');
            refetchSettings();
        } catch (err) {
            showToast(err.error || 'Failed to update permissions', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openAdd = () => { setForm(DEFAULT_FORM); setEditingUser(null); setShowModal(true); };
    const openEdit = (u) => { setForm({ ...u, new_password: '' }); setEditingUser(u.id); setShowModal(true); };
    const save = async () => {
        if (!form.name || !form.email) { showToast('Name and email required', 'error'); return; }
        setSaving(true);
        try {
            // Enforce scaling naming convention for handset association: Tenant_Role_Name_Code
            const tenantPx = (currentUser.tenantSlug || 'ZN').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const rolePx = form.role === 'agent' ? 'AGT' : form.role === 'sales_manager' ? 'MGR' : 'ADM';
            const namePx = form.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
            const rndCode = Math.floor(100 + Math.random() * 900);
            
            // Only update if it's currently empty to prevent breaking existing phone hookups
            const agentIdFormatted = form.telephony_agent_id?.trim() || `${tenantPx}_${rolePx}_${namePx}_${rndCode}`;

            if (editingUser) {
                const payload = { name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone, telephony_agent_id: agentIdFormatted };
                if (form.new_password) payload.new_password = form.new_password;
                await usersApi.update(editingUser, payload);
                if (editingUser === currentUser.id) {
                    await refreshUser();
                }
            } else {
                await usersApi.create({ name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone, password: form.password || 'Zentrix@123', telephony_agent_id: agentIdFormatted });
            }
            showToast(editingUser ? 'User updated!' : 'User added!', 'success');
            setShowModal(false); refetchUsers();
        } catch (err) { showToast(err.error || 'Failed', 'error'); } finally { setSaving(false); }
    };
    const deleteUser = async (id) => {
        if (id === currentUser.id) { showToast('Cannot delete yourself', 'error'); return; }
        if (!window.confirm('Are you sure you want to disable this user?')) return;
        try {
            await usersApi.update(id, { is_active: false });
            showToast('User deactivated successfully', 'success');
            refetchUsers();
        } catch (err) {
            showToast(err?.error || err?.message || 'Failed to deactivate user', 'error');
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetchUsers} />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admin Controls</h1>
                    <p className="page-subtitle">Manage users, roles, permissions and system settings</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs mb-6" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
                {[['users', <Users size={14} />, 'Users & Roles'], ['projects', <Building2 size={14} />, 'Projects Config'], ['permissions', <Shield size={14} />, 'Permissions'], ['settings', <Settings size={14} />, 'Settings'], ['whitelabel', <Palette size={14} />, 'White Label'], ['recording', <Phone size={14} />, 'Recording & Bridge'], ['agent_activity', <Smartphone size={14} />, 'Agent Activity']].map(([key, icon, label]) => (
                    <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {tab === 'users' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Search by name, email or role..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                style={{ paddingLeft: 40, background: 'white', borderRadius: 12, border: '1px solid var(--border-medium)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--slate-100)', padding: '6px 12px', borderRadius: '8px' }}>
                                {users.length} Users
                            </span>
                            <button className="btn btn-primary" onClick={openAdd} style={{ padding: '8px 20px', fontWeight: 800 }}>
                                <Plus size={16} /> Add Team Member
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-2">
                        {users.map(u => (
                            <div key={u.id} className="card" style={{ padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div className="avatar avatar-lg" style={{
                                        background: `linear-gradient(135deg, hsl(${u.id * 60 + 180}, 60%, 50%), hsl(${u.id * 60 + 180}, 60%, 40%))`,
                                        width: 52, height: 52, fontSize: '1rem',
                                        borderRadius: '14px',
                                        fontWeight: 800,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        border: '2px solid white',
                                        position: 'relative'
                                    }}>
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)', borderRadius: '12px' }} />
                                        {u.avatar || u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#10b981', border: '3px solid white' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-900)', tracking: '-0.01em' }}>{u.name}</span>
                                            {u.id === currentUser.id && (
                                                <span className="badge badge-green" style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase' }}>You</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{u.email}</div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                                            <span className="badge badge-slate">{u.department || 'Sales'}</span>
                                            {u.telephony_agent_id && (
                                                <span className="badge badge-indigo" title={`Mobile ID: ${u.telephony_agent_id}`}>
                                                    <Smartphone size={10} style={{ marginRight: 4 }} />
                                                    {u.telephony_agent_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(u)}><Edit2 size={13} /></button>
                                        <button
                                            className="btn btn-ghost btn-sm btn-icon"
                                            style={{ color: u.id === currentUser.id ? 'var(--text-muted)' : 'var(--accent-rose)' }}
                                            onClick={() => deleteUser(u.id)}
                                            disabled={u.id === currentUser.id}
                                        ><Trash2 size={13} /></button>
                                    </div>
                                </div>

                                {/* Permissions mini */}
                                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Permissions</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {(ROLE_PERMISSIONS[u.role] || []).map(p => (
                                            <span key={p} className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{p}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Config Tab */}
            {tab === 'projects' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{PROJECTS_DATA.length} active projects</span>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                            setEditingProject({ id: 'new', name: 'New Project' });
                            setForm({
                                name: '',
                                location: '',
                                type: 'Residential',
                                units: 0,
                                available: 0,
                                status: 'Active',
                                completion: ''
                            });
                        }}>
                            <Plus size={14} /> Add Project
                        </button>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {['Project', 'Type', 'Location', 'Units', 'Available', 'Status', 'Completion'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {PROJECTS_DATA.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '1.2rem' }}>{p.image}</span>
                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-blue">{p.type}</span></td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.location}</td>
                                        <td style={{ fontWeight: 600 }}>{p.units}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{p.available}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'Active' ? 'badge-green' : p.status === 'Pre-launch' ? 'badge-violet' : 'badge-slate'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{p.completion}</td>
                                        <td>
                                            <button 
                                                className="btn btn-ghost btn-sm btn-icon" 
                                                onClick={() => {
                                                    setEditingProject(p);
                                                    setForm({
                                                        name: p.name,
                                                        location: p.location,
                                                        type: p.type || 'Residential',
                                                        units: p.total_units || 0,
                                                        available: p.available_units || 0,
                                                        status: p.status || 'Active',
                                                        completion: p.possession_date ? new Date(p.possession_date).toISOString().split('T')[0] : ''
                                                    });
                                                }}
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button 
                                                className="btn btn-ghost btn-sm btn-icon" 
                                                style={{ color: 'var(--accent-rose)', marginLeft: 8 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProjectToDelete(p);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Permissions Tab */}
            {tab === 'permissions' && (
                <div className="grid grid-3">
                    {Object.entries(systemSettings?.role_permissions || ROLE_PERMISSIONS)
                        .filter(([role]) => role !== 'superadmin' || currentUser?.role === 'superadmin')
                        .map(([role, perms]) => (

                        <div key={role} className="card" style={{ overflow: 'visible', display: 'flex', flexDirection: 'column' }}>

                            <div style={{
                                background: role === 'superadmin'
                                    ? 'linear-gradient(135deg, var(--accent-rose-dark), var(--accent-rose))'
                                    : role === 'admin'
                                        ? 'linear-gradient(135deg, var(--accent-violet-dark), var(--accent-violet))'
                                        : role === 'sales_manager'
                                            ? 'linear-gradient(135deg, #1e293b, #334155)'
                                            : role === 'team_leader' 
                                                ? 'linear-gradient(135deg, var(--accent-indigo-dark), var(--accent-indigo))'
                                                : 'linear-gradient(135deg, var(--accent-cyan-dark), var(--accent-cyan))',
                                padding: '20px 22px',
                                borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0',
                            }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>
                                    {role === 'admin' ? '👤' : role === 'sales_manager' ? '🎯' : role === 'team_leader' ? '🎖️' : '💼'}
                                </div>
                                <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', letterSpacing: '0.02em' }}>{ROLE_LABELS[role] || role}</div>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', marginTop: 2, fontWeight: 500 }}>
                                    {usersRawList.filter(u => u.role === role).length} users assigned
                                </div>

                            </div>
                            <div style={{ padding: '18px 20px', flex: 1 }}>
                                {Array.isArray(perms) && perms.map(p => (
                                    <div key={p} style={{

                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border-light)',
                                    }}>
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: 'rgba(16,185,129,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.65rem', color: 'var(--accent-emerald)',
                                            flexShrink: 0,
                                        }}>✅</div>
                                        <span style={{ fontSize: '0.85rem', flex: 1 }}>{p}</span>
                                        <button 
                                            className="btn btn-ghost btn-sm btn-icon" 
                                            style={{ width: 22, height: 22, color: 'var(--accent-rose)' }}
                                            onClick={() => handleUpdatePermissions(role, perms.filter(x => x !== p))}
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '12px 20px', background: 'var(--bg-light)', borderRadius: '0 0 var(--border-radius-lg) var(--border-radius-lg)', borderTop: '1px solid var(--border-light)' }}>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const val = e.target.perm.value.trim();
                                    if (val && !perms.includes(val)) {
                                        handleUpdatePermissions(role, [...perms, val]);
                                        e.target.reset();
                                    }
                                }} style={{ display: 'flex', gap: 8 }}>
                                    <input 
                                        name="perm" 
                                        placeholder="Add mission..." 
                                        className="form-control" 
                                        style={{ height: 32, fontSize: '0.75rem', padding: '0 12px' }} 
                                    />
                                    <button type="submit" className="btn btn-primary btn-sm" style={{ height: 32, width: 32, padding: 0 }}>
                                        <Plus size={14} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Agent Activity Tab */}
            {tab === 'agent_activity' && <AgentActivityPanel />}

            {/* Recording & Bridge Management Tab */}
            {tab === 'recording' && <RecordingPolicyPanel />}

            {/* Settings Tab */}
            {tab === 'settings' && (
                <div className="grid grid-2">
                    {[
                        { title: 'Company Information', fields: [['Company Name', 'Zentrix Realty Pvt. Ltd.'], ['Website', 'www.zentrixrealty.com'], ['Support Email', 'support@zentrixrealty.com'], ['Phone', '+91 22 4567 8900']] },
                        { title: 'CRM Configuration', fields: [['Lead Expiry (days)', '30'], ['Auto-assign Leads', 'Enabled'], ['Default Currency', 'INR (₹)'], ['Fiscal Year Start', 'April']] },
                        { title: 'Communication Gateways', fields: [['WhatsApp Phone ID', 'Not configured'], ['WhatsApp API Key', '••••••••'], ['SMTP Host', 'smtp.gmail.com'], ['SMTP User', 'Not configured'], ['SMTP Password', '••••••••']] },
                        { title: 'System Integrations (WTI App)', fields: [['Firebase Project', systemSettings?.firebase_project_id || 'Not configured'], ['Firebase Database URL', systemSettings?.firebase_database_url || 'N/A'], ['Storage Server URL', systemSettings?.android_storage_url || 'N/A'], ['Webhook Secret', systemSettings?.telephony_secret ? '••••••••' : 'None'], ['Gemini AI Key', systemSettings?.gemini_api_key ? '••••••••' : 'None']] },
                        { title: 'Notification Defaults', fields: [['Follow-up Reminders', 'Email + WhatsApp'], ['Visit Reminders', '24 hrs before'], ['Booking Alerts', 'Immediate'], ['Weekly Reports', 'Every Monday']] },
                        { title: 'Data & Privacy', fields: [['Data Retention', '3 Years'], ['Backup Frequency', 'Daily'], ['Export Format', 'CSV / Excel'], ['Audit Logs', 'Enabled (90 days)']] },
                    ].map(section => (
                        <div key={section.title} className="card" style={{ padding: '20px 22px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>{section.title}</div>
                            {section.fields.map(([k, v]) => (
                                <div key={k} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: '1px solid var(--border-light)',
                                }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{k}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {displaySetting(k, v)}
                                        </span>
                                        {k === 'Storage Server URL' && (
                                            <button 
                                                className="btn btn-primary btn-sm" 
                                                style={{ 
                                                    padding: '0 12px', 
                                                    fontSize: '0.75rem', 
                                                    height: 28, 
                                                    marginLeft: 12,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                                }} 
                                                onClick={handlePushConfig}
                                                disabled={saving}
                                                title="Push this configuration URL to all connected Android handsets via Firebase"
                                            >
                                                <Zap size={12} className={saving ? 'animate-pulse' : ''} />
                                                {saving ? 'Pushing...' : 'Push to Handsets'}
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
                                            setEditingSetting(k);
                                            const currentVal = displaySetting(k, v);
                                            const cleanVal = String(currentVal || '').toLowerCase();
                                            setSettingValue((cleanVal === 'n/a' || cleanVal === 'not configured' || cleanVal === 'none') ? "" : currentVal);
                                        }} style={{ width: 24, height: 24, padding: 0 }}>
                                            <Edit2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Setting Edit Modal */}
            {editingSetting && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Configuration</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingSetting(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">{editingSetting}</label>
                                <input 
                                    className="form-control" 
                                    type={editingSetting.includes('Password') || editingSetting.includes('API Key') ? 'password' : 'text'}
                                    value={settingValue} 
                                    onChange={e => setSettingValue(e.target.value)} 
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSaveSetting()}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingSetting(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveSetting} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Edit Modal */}
            {editingProject && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingProject.id === 'new' ? 'Register New Project' : `Edit Project: ${editingProject.name}`}</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingProject(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px' }}>
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Project Name</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Location</label>
                                    <input className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="Residential">Residential</option>
                                        <option value="Commercial">Commercial</option>
                                        <option value="Villa">Villa</option>
                                        <option value="Luxury">Luxury</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="Active">Active</option>
                                        <option value="Pre-launch">Pre-launch</option>
                                        <option value="Completed">Completed</option>
                                        <option value="On Hold">On Hold</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Total Units</label>
                                    <input className="form-control" type="number" value={form.units} onChange={e => setForm({ ...form, units: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Available Units</label>
                                    <input className="form-control" type="number" value={form.available} onChange={e => setForm({ ...form, available: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Possession Date</label>
                                    <input className="form-control" type="date" value={form.completion} onChange={e => setForm({ ...form, completion: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingProject(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={async () => {
                                setSaving(true);
                                try {
                                    const payload = {
                                        name: form.name,
                                        location: form.location,
                                        type: form.type,
                                        status: form.status,
                                        total_units: form.units,
                                        available_units: form.available,
                                        possession_date: form.completion || null
                                    };
                                    if (editingProject.id === 'new') {
                                        await projectsApi.create(payload);
                                        showToast('Project registered successfully!', 'success');
                                    } else {
                                        await projectsApi.update(editingProject.id, payload);
                                        showToast('Project updated successfully!', 'success');
                                    }
                                    setEditingProject(null);
                                    refetchProjects(); 
                                } catch (err) {
                                    showToast(err.error || 'Failed to save project', 'error');
                                } finally {
                                    setSaving(false);
                                }
                            }} disabled={saving}>
                                {saving ? 'Saving...' : (editingProject.id === 'new' ? 'Complete Registration' : 'Update Project')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add Team Member'}</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@zentrix.com" />
                                </div>
                                {!editingUser ? (
                                    <div className="form-group">
                                        <label className="form-label">Default Password *</label>
                                        <input className="form-control" type="text" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Default password" />
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label className="form-label">New Password</label>
                                        <input className="form-control" type="password" value={form.new_password || ''} onChange={e => setForm({ ...form, new_password: e.target.value })} placeholder="Leave blank to keep" />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                        <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                            {currentUser?.role === 'superadmin' && <option value="superadmin">Super Administrator</option>}
                                            {currentUser?.role !== 'sales_manager' && (

                                                <>
                                                    <option value="admin">Administrator</option>
                                                    <option value="sales_manager">Sales Manager</option>
                                                    <option value="team_leader">Team Leader</option>
                                                </>
                                            )}
                                            <option value="agent">Sales Agent</option>
                                        </select>

                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input className="form-control" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Sales" />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Telephony Agent ID (Handset Mapping)</label>
                                    <input 
                                        className="form-control" 
                                        value={form.telephony_agent_id || ''} 
                                        onChange={e => setForm({ ...form, telephony_agent_id: e.target.value })} 
                                        placeholder="e.g. Agent_001, TL_Rajesh" 
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        Must match the ID configured in the Android WTI mobile app.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : (editingUser ? 'Save Changes' : 'Add Member')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* White Label Tab */}
            {tab === 'whitelabel' && (
                <WhiteLabelPanel branding={branding} updateBranding={updateBranding} showToast={showToast} />
            )}

            {/* Deletion Confirmation Modal */}
            {projectToDelete && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: 'var(--accent-rose)' }}>Delete Project?</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setProjectToDelete(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Trash2 size={30} color="var(--accent-rose)" />
                            </div>
                            <p style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: '1.1rem', marginBottom: 8 }}>Are you sure?</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                You are about to delete <strong>"{projectToDelete.name}"</strong>. This will unlink all associated leads and site visits. This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setProjectToDelete(null)} disabled={saving}>Cancel</button>
                            <button 
                                className="btn btn-primary" 
                                style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        await projectsApi.delete(projectToDelete.id);
                                        showToast('Project deleted successfully', 'success');
                                        setProjectToDelete(null);
                                        refetchProjects();
                                    } catch (err) {
                                        console.error('Project delete error:', err);
                                        showToast(err.error || 'Failed to delete project', 'error');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                            >
                                {saving ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── White Label Panel Component ────────────────────────────────────
function WhiteLabelPanel({ branding, updateBranding, showToast }) {
    const [localBrand, setLocalBrand] = useState({
        company_name: branding?.company_name || '',
        logo_url: branding?.logo_url || '',
        logo_icon: branding?.logo_icon || '',
        primary_color: branding?.primary_color || '#6366f1',
        sidebar_color: branding?.sidebar_color || '#0a1628',
        accent_color: branding?.accent_color || '#06b6d4',
        favicon_url: branding?.favicon_url || '',
        tagline: branding?.tagline || '',
        powered_by: branding?.powered_by !== false,
        support_email: branding?.support_email || '',
        support_phone: branding?.support_phone || '',
        login_banner_text: branding?.login_banner_text || '',
        footer_text: branding?.footer_text || '',
    });
    const [wlSaving, setWlSaving] = useState(false);

    useEffect(() => {
        if (branding) {
            setLocalBrand(prev => ({
                ...prev,
                company_name: branding.company_name || prev.company_name,
                logo_url: branding.logo_url || prev.logo_url,
                logo_icon: branding.logo_icon || prev.logo_icon,
                primary_color: branding.primary_color || prev.primary_color,
                sidebar_color: branding.sidebar_color || prev.sidebar_color,
                accent_color: branding.accent_color || prev.accent_color,
                favicon_url: branding.favicon_url || prev.favicon_url,
                tagline: branding.tagline || prev.tagline,
                powered_by: branding.powered_by !== false,
                support_email: branding.support_email || prev.support_email,
                support_phone: branding.support_phone || prev.support_phone,
                login_banner_text: branding.login_banner_text || prev.login_banner_text,
                footer_text: branding.footer_text || prev.footer_text,
            }));
        }
    }, [branding]);

    const handleSaveWhiteLabel = async () => {
        setWlSaving(true);
        try {
            await updateBranding(localBrand);
            showToast('White label branding saved! Changes are live.', 'success');
        } catch (err) {
            showToast(err?.error || 'Failed to save branding', 'error');
        } finally {
            setWlSaving(false);
        }
    };

    const Field = ({ label, name, placeholder, type = 'text', span2, helper }) => (
        <div className="form-group" style={span2 ? { gridColumn: 'span 2' } : {}}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>{label}</label>
            {type === 'color' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="color" value={localBrand[name]} onChange={e => setLocalBrand({ ...localBrand, [name]: e.target.value })} style={{ width: 44, height: 38, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
                    <input className="form-control" value={localBrand[name]} onChange={e => setLocalBrand({ ...localBrand, [name]: e.target.value })} style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700 }} />
                </div>
            ) : type === 'textarea' ? (
                <textarea className="form-control" value={localBrand[name] || ''} onChange={e => setLocalBrand({ ...localBrand, [name]: e.target.value })} placeholder={placeholder} rows={3} style={{ resize: 'vertical', fontWeight: 600 }} />
            ) : (
                <input className="form-control" type={type} value={localBrand[name] || ''} onChange={e => setLocalBrand({ ...localBrand, [name]: e.target.value })} placeholder={placeholder} style={{ fontWeight: 600 }} />
            )}
            {helper && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{helper}</p>}
        </div>
    );

    return (
        <div className="animate-fadeIn">
            {/* Hero Header */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                borderRadius: '24px', padding: '36px', color: 'white', marginBottom: '32px',
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                    <Palette size={24} color="#a78bfa" /> White Label Configuration
                </h3>
                <p style={{ margin: '0 0 8px', color: '#94a3b8', fontWeight: 500, maxWidth: '600px', lineHeight: 1.6, position: 'relative' }}>
                    Customize your CRM's brand identity. Replace the default Zentrix branding with your own company name, logo, colors, and messaging. All changes take effect instantly across Sidebar, Header, Login, and exported documents.
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', position: 'relative', flexWrap: 'wrap' }}>
                    <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Brand: <span style={{ color: localBrand.primary_color }}>{localBrand.company_name || 'Zentrix CRM'}</span>
                    </div>
                    <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: localBrand.primary_color, border: '1px solid rgba(255,255,255,0.3)' }} />
                        {localBrand.primary_color}
                    </div>
                </div>
            </div>

            {/* Live Preview Card */}
            <div className="card" style={{ padding: '24px', marginBottom: '24px', borderLeft: `4px solid ${localBrand.primary_color}` }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>Live Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: localBrand.sidebar_color, borderRadius: '12px', color: 'white' }}>
                    {localBrand.logo_url ? (
                        <img src={localBrand.logo_url} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: 'white', padding: 2 }} />
                    ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: localBrand.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                            {localBrand.logo_icon || (localBrand.company_name?.[0] || 'Z')}
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{localBrand.company_name || 'Zentrix CRM'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{localBrand.tagline || 'Real Estate Intelligence Platform'}</div>
                    </div>
                </div>
            </div>

            {/* Brand Identity Section */}
            <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
                <h4 style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--navy-900)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>🏷️ Brand Identity</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <Field label="Company Name" name="company_name" placeholder="Your Company Name" />
                    <Field label="Logo Icon (Single Char)" name="logo_icon" placeholder="Z" helper="Shown in sidebar when collapsed. First letter of company name is auto-used." />
                    <Field label="Logo URL (Image)" name="logo_url" placeholder="https://yourdomain.com/logo.png" span2 helper="Full URL to your company logo (PNG/SVG). Replaces the icon letter in the sidebar." />
                    <Field label="Tagline / Subtitle" name="tagline" placeholder="Real Estate Intelligence Platform" />
                    <Field label="Favicon URL" name="favicon_url" placeholder="https://yourdomain.com/favicon.ico" helper="Updates the browser tab icon." />
                </div>
            </div>

            {/* Theme Colors Section */}
            <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
                <h4 style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--navy-900)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>🎨 Theme Colors</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <Field label="Primary / Accent Color" name="primary_color" type="color" />
                    <Field label="Sidebar Background" name="sidebar_color" type="color" />
                    <Field label="Secondary Accent" name="accent_color" type="color" />
                </div>
            </div>

            {/* Support & Communication */}
            <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
                <h4 style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--navy-900)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>📞 Support & Communication</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <Field label="Support Email" name="support_email" placeholder="support@yourcompany.com" />
                    <Field label="Support Phone" name="support_phone" placeholder="+91-XXXXX-XXXXX" />
                    <Field label="Login Page Banner Text" name="login_banner_text" placeholder="Welcome to Our CRM Platform" span2 helper="Custom message shown on the login page." />
                    <Field label="Footer Text" name="footer_text" placeholder="© 2026 Your Company. All rights reserved." span2 helper="Appears in exported PDFs and the login page footer." />
                </div>
            </div>

            {/* Powered By Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)', marginBottom: '4px' }}>Show "Powered by Zentrix CRM"</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '350px' }}>
                                When disabled, all references to Zentrix CRM are removed.
                            </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', cursor: 'pointer', flexShrink: 0 }}>
                            <input type="checkbox" checked={localBrand.powered_by} onChange={e => setLocalBrand({ ...localBrand, powered_by: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                            <span style={{ position: 'absolute', inset: 0, borderRadius: '99px', background: localBrand.powered_by ? '#10b981' : '#cbd5e1', transition: 'all 0.3s' }}>
                                <span style={{ position: 'absolute', width: '22px', height: '22px', borderRadius: '50%', background: 'white', top: '3px', left: localBrand.powered_by ? '27px' : '3px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                            </span>
                        </label>
                    </div>
                </div>


            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveWhiteLabel} disabled={wlSaving} style={{ padding: '14px 36px', fontSize: '1rem', fontWeight: 800 }}>
                    {wlSaving ? 'Applying Branding...' : '🎨 Save & Apply White Label'}
                </button>
            </div>
        </div>
    );
}
