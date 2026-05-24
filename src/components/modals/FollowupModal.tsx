import { useState } from 'react';
import { followupsApi, usersApi } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { X, Calendar, Clock, AlertCircle, Plus } from 'lucide-react';
import * as dateUtils from '../../utils/dateUtils';

interface FollowupModalProps {
    onClose: () => void;
    onScheduled?: () => void;
    leadId: string;
    leadName: string;
    initialAgentId?: string;
}

export default function FollowupModal({ onClose, onScheduled, leadId, leadName, initialAgentId }: FollowupModalProps) {
    const { showToast } = useToast();
    const { data: usersRes } = useApi(() => usersApi.list());
    const agents = (usersRes || []).filter(u => ['agent', 'sales_manager', 'team_leader', 'admin'].includes(u.role));

    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        lead_id: leadId,
        type: 'Call',
        scheduled_at: '',
        priority: 'High',
        notes: '',
        assigned_to: initialAgentId || ''
    });

    const handleSave = async () => {
        if (!form.scheduled_at) {
            showToast('Date and time are required', 'error');
            return;
        }
        setSaving(true);
        try {
            await followupsApi.create({
                ...form,
                scheduled_at: dateUtils.parseSafe(form.scheduled_at)?.toISOString() || dateUtils.getNow().toISOString()
            });
            showToast('Next follow-up scheduled successfully!', 'success');
            if (onScheduled) onScheduled();
            onClose();
        } catch (err) {
            showToast(err.error || 'Failed to schedule follow-up', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal animate-scaleIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '90vw', borderRadius: '24px' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={20} color="#3b82f6" />
                        </div>
                        <div>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--navy-900)' }}>Schedule Follow-Up</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontWeight: 600 }}>For: {leadName}</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                
                <div className="modal-body" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6 }}>Type</label>
                                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ borderRadius: '12px' }}>
                                    {['Call', 'Email', 'WhatsApp', 'Site Visit', 'Meeting'].map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6 }}>Priority</label>
                                <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ borderRadius: '12px' }}>
                                    {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6 }}>Date & Time</label>
                            <input 
                                type="datetime-local" 
                                className="form-control" 
                                value={form.scheduled_at} 
                                onChange={e => setForm({ ...form, scheduled_at: e.target.value })} 
                                style={{ borderRadius: '12px' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6 }}>Assign Agent</label>
                            <select className="form-control" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={{ borderRadius: '12px' }}>
                                <option value="">Select agent...</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 6 }}>Notes</label>
                            <textarea 
                                className="form-control" 
                                rows={3} 
                                value={form.notes} 
                                onChange={e => setForm({ ...form, notes: e.target.value })} 
                                placeholder="What's the goal of this follow-up?" 
                                style={{ borderRadius: '16px', resize: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#fcfdfe', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '14px', fontWeight: 800 }}>Cancel</button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSave} 
                        disabled={saving}
                        style={{ background: 'var(--navy-900)', borderRadius: '14px', fontWeight: 900, padding: '0 24px' }}
                    >
                        {saving ? 'Scheduling...' : 'Schedule Follow-Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
