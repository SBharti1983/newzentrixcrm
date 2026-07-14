import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Car, MessageSquare, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { projectsApi, usersApi, siteVisitsApi } from '../api/client';

interface SiteVisitSchedulerProps {
    lead: any;
    onSuccess?: () => void;
}

const SiteVisitScheduler: React.FC<SiteVisitSchedulerProps> = ({ lead, onSuccess }) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scheduled, setScheduled] = useState(false);

    const [formData, setFormData] = useState({
        project_id: lead.project_id || lead.projectId || '',
        scheduled_at: '',
        transport: 'Self',
        assigned_agent: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projData, agentData] = await Promise.all([
                projectsApi.list(),
                usersApi.list()
            ]);
            setProjects(Array.isArray(projData) ? projData : []);
            setAgents(Array.isArray(agentData) ? agentData.filter((u: any) => u.role !== 'superadmin') : []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load scheduler dependencies');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.project_id || !formData.scheduled_at) {
            toast.error('Please select a project and date/time');
            return;
        }

        try {
            setSubmitting(true);
            await siteVisitsApi.schedule({
                lead_id: lead.id,
                ...formData
            });
            toast.success('Site Visit Scheduled Successfully!');
            setScheduled(true);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error?.error || error?.message || 'Failed to schedule site visit');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-gray-500 font-medium">Preparing scheduler...</p>
            </div>
        );
    }

    if (scheduled) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Visit Confirmed!</h3>
                    <p className="text-gray-600 mt-2">Confirmation messages have been sent to <b>{lead.name}</b> via WhatsApp and Email.</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 w-full text-left">
                    <div className="flex items-center text-sm text-indigo-700 font-medium mb-2">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Automated Reminders Active
                    </div>
                    <p className="text-xs text-indigo-600/80">The system will automatically send reminders 24 hours and 1 hour before the visit.</p>
                </div>
                <button 
                    onClick={() => setScheduled(false)}
                    className="text-indigo-600 font-semibold hover:underline"
                >
                    Schedule another visit
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Schedule Site Visit</h2>
                <p className="text-sm text-gray-500">Auto-confirmations will be sent to <b>{lead.name}</b></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Project Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                        Target Project
                    </label>
                    <select
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        value={formData.project_id}
                        onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                        required
                    >
                        <option value="">Select a Project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {p.location}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date & Time */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                            Visit Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            value={formData.scheduled_at}
                            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                            required
                        />
                    </div>

                    {/* Agent */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <User className="w-4 h-4 mr-2 text-indigo-500" />
                            Assigned Agent
                        </label>
                        <select
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            value={formData.assigned_agent}
                            onChange={(e) => setFormData({ ...formData, assigned_agent: e.target.value })}
                        >
                            <option value="">Default (Me)</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Transport */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <Car className="w-4 h-4 mr-2 text-indigo-500" />
                        Transport Preference
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {['Self', 'Pickup Requested'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, transport: type })}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                                    formData.transport === type
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" />
                        Internal Notes
                    </label>
                    <textarea
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[80px]"
                        placeholder="Any special requests or instructions..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Scheduling...
                        </>
                    ) : (
                        <>
                            Confirm Site Visit
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default SiteVisitScheduler;
